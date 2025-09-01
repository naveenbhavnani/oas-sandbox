import { StateStore } from '../types.js';
import { FileStoreOptions } from './index.js';
import { promises as fs } from 'fs';
import { dirname } from 'path';

interface FileEntry {
  value: any;
  expiresAt?: number | undefined;
  createdAt: number;
  updatedAt: number;
}

interface LogEntry {
  timestamp: number;
  operation: 'set' | 'del' | 'increment' | 'patch';
  key: string;
  value?: any;
  ttl?: number | undefined;
}

/**
 * File-based state store with periodic compaction and graceful shutdown snapshotting.
 * 
 * Uses an append-only log for writes with periodic compaction to a snapshot file.
 * This provides durability while maintaining reasonable performance for reads and writes.
 * 
 * Data is stored as newline-delimited JSON (NDJSON) for both the log and snapshot files.
 */
export class FileStore implements StateStore {
  private cache = new Map<string, FileEntry>();
  private readonly filePath: string;
  private readonly logPath: string;
  private readonly snapshotPath: string;
  private readonly compactionInterval: number;
  private readonly snapshotOnShutdown: boolean;
  
  private compactionTimer?: NodeJS.Timeout | undefined;
  private isInitialized = false;
  private logFileHandle?: fs.FileHandle | undefined;
  private pendingWrites: Promise<void> = Promise.resolve();

  constructor(options: FileStoreOptions = {}) {
    this.filePath = options.path || './oas-sandbox-state';
    this.logPath = `${this.filePath}.log`;
    this.snapshotPath = `${this.filePath}.snapshot`;
    this.compactionInterval = options.compactionInterval || 300000; // 5 minutes
    this.snapshotOnShutdown = options.snapshotOnShutdown !== false; // default true
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure directory exists
      await fs.mkdir(dirname(this.filePath), { recursive: true });

      // Load existing data
      await this.loadFromSnapshot();
      await this.replayLog();

      // Open log file for appending
      this.logFileHandle = await fs.open(this.logPath, 'a');

      // Start periodic compaction
      this.compactionTimer = setInterval(() => {
        this.compact().catch(console.error);
      }, this.compactionInterval);

      // Setup graceful shutdown
      if (this.snapshotOnShutdown) {
        process.on('SIGINT', this.gracefulShutdown.bind(this));
        process.on('SIGTERM', this.gracefulShutdown.bind(this));
        process.on('exit', this.gracefulShutdown.bind(this));
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize file store: ${error}`);
    }
  }

  async get(key: string): Promise<any> {
    this.ensureInitialized();
    
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check expiration
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      await this.appendLog({ timestamp: Date.now(), operation: 'del', key });
      return undefined;
    }
    
    return entry.value;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.ensureInitialized();
    
    const now = Date.now();
    const expiresAt = ttl ? now + (ttl * 1000) : undefined;
    
    const entry: FileEntry = {
      value: this.serialize(value),
      expiresAt: expiresAt || undefined,
      createdAt: this.cache.get(key)?.createdAt || now,
      updatedAt: now
    };
    
    this.cache.set(key, entry);
    
    await this.appendLog({
      timestamp: now,
      operation: 'set',
      key,
      value: entry.value,
      ttl: ttl || undefined
    });
  }

  async del(key: string): Promise<void> {
    this.ensureInitialized();
    
    this.cache.delete(key);
    
    await this.appendLog({
      timestamp: Date.now(),
      operation: 'del',
      key
    });
  }

  async increment(key: string, by: number): Promise<number> {
    this.ensureInitialized();
    
    const current = await this.get(key);
    const currentValue = typeof current === 'number' ? current : 0;
    const newValue = currentValue + by;
    
    // Preserve existing TTL and creation time
    const existingEntry = this.cache.get(key);
    
    const now = Date.now();
    const entry: FileEntry = {
      value: newValue,
      expiresAt: existingEntry?.expiresAt || undefined,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now
    };
    
    this.cache.set(key, entry);
    
    await this.appendLog({
      timestamp: now,
      operation: 'increment',
      key,
      value: by
    });
    
    return newValue;
  }

  async patch(key: string, value: any): Promise<void> {
    this.ensureInitialized();
    
    const existing = await this.get(key);
    
    let mergedValue: any;
    
    if (existing === undefined) {
      mergedValue = value;
    } else if (typeof existing === 'object' && existing !== null && !Array.isArray(existing) &&
               typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Deep merge objects
      mergedValue = { ...existing, ...value };
    } else if (Array.isArray(existing) && Array.isArray(value)) {
      // Concatenate arrays
      mergedValue = [...existing, ...value];
    } else {
      // Replace primitive values
      mergedValue = value;
    }
    
    // Preserve existing TTL and creation time
    const existingEntry = this.cache.get(key);
    
    const now = Date.now();
    const entry: FileEntry = {
      value: this.serialize(mergedValue),
      expiresAt: existingEntry?.expiresAt || undefined,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now
    };
    
    this.cache.set(key, entry);
    
    await this.appendLog({
      timestamp: now,
      operation: 'patch',
      key,
      value: this.serialize(value)
    });
  }

  async close(): Promise<void> {
    if (this.compactionTimer) {
      clearInterval(this.compactionTimer);
      this.compactionTimer = undefined as NodeJS.Timeout | undefined;
    }

    // Wait for pending writes to complete
    await this.pendingWrites;

    if (this.snapshotOnShutdown) {
      await this.snapshot();
    }

    if (this.logFileHandle) {
      await this.logFileHandle.close();
      this.logFileHandle = undefined as fs.FileHandle | undefined;
    }

    this.cache.clear();
    this.isInitialized = false;
  }

  /**
   * Forces an immediate compaction
   */
  async forceCompaction(): Promise<void> {
    await this.compact();
  }

  /**
   * Gets the current cache size
   */
  size(): number {
    return this.cache.size;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('FileStore not initialized. Call initialize() first.');
    }
  }

  private serialize(value: any): any {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      throw new Error(`Value is not JSON serializable: ${error}`);
    }
  }

  private async loadFromSnapshot(): Promise<void> {
    try {
      const data = await fs.readFile(this.snapshotPath, 'utf-8');
      const lines = data.trim().split('\n').filter(line => line);
      
      for (const line of lines) {
        try {
          const { key, entry }: { key: string; entry: FileEntry } = JSON.parse(line);
          
          // Check if entry has expired
          if (entry.expiresAt && entry.expiresAt <= Date.now()) {
            continue;
          }
          
          this.cache.set(key, entry);
        } catch (error) {
          console.warn(`Failed to parse snapshot entry: ${line}`, error);
        }
      }
    } catch (error) {
      // Snapshot file doesn't exist or is unreadable - this is fine for first run
    }
  }

  private async replayLog(): Promise<void> {
    try {
      const data = await fs.readFile(this.logPath, 'utf-8');
      const lines = data.trim().split('\n').filter(line => line);
      
      for (const line of lines) {
        try {
          const logEntry: LogEntry = JSON.parse(line);
          await this.applyLogEntry(logEntry);
        } catch (error) {
          console.warn(`Failed to parse log entry: ${line}`, error);
        }
      }
    } catch (error) {
      // Log file doesn't exist - this is fine
    }
  }

  private async applyLogEntry(entry: LogEntry): Promise<void> {
    
    switch (entry.operation) {
      case 'set': {
        const expiresAt = entry.ttl ? entry.timestamp + (entry.ttl * 1000) : undefined;
        const existingEntry = this.cache.get(entry.key);
        
        const fileEntry: FileEntry = {
          value: entry.value,
          expiresAt: expiresAt || undefined,
          createdAt: existingEntry?.createdAt || entry.timestamp,
          updatedAt: entry.timestamp
        };
        
        this.cache.set(entry.key, fileEntry);
        break;
      }
      
      case 'del':
        this.cache.delete(entry.key);
        break;
      
      case 'increment': {
        const existing = this.cache.get(entry.key);
        const currentValue = existing?.value || 0;
        const newValue = typeof currentValue === 'number' ? currentValue + entry.value : entry.value;
        
        if (existing) {
          existing.value = newValue;
          existing.updatedAt = entry.timestamp;
        } else {
          this.cache.set(entry.key, {
            value: newValue,
            createdAt: entry.timestamp,
            updatedAt: entry.timestamp
          });
        }
        break;
      }
      
      case 'patch': {
        const existing = this.cache.get(entry.key);
        let mergedValue = entry.value;
        
        if (existing) {
          if (typeof existing.value === 'object' && existing.value !== null && !Array.isArray(existing.value) &&
              typeof entry.value === 'object' && entry.value !== null && !Array.isArray(entry.value)) {
            mergedValue = { ...existing.value, ...entry.value };
          } else if (Array.isArray(existing.value) && Array.isArray(entry.value)) {
            mergedValue = [...existing.value, ...entry.value];
          }
          
          existing.value = mergedValue;
          existing.updatedAt = entry.timestamp;
        } else {
          this.cache.set(entry.key, {
            value: mergedValue,
            createdAt: entry.timestamp,
            updatedAt: entry.timestamp
          });
        }
        break;
      }
    }
  }

  private async appendLog(entry: LogEntry): Promise<void> {
    if (!this.logFileHandle) {
      return;
    }

    const logLine = JSON.stringify(entry) + '\n';
    
    // Chain writes to maintain order
    this.pendingWrites = this.pendingWrites.then(async () => {
      await this.logFileHandle!.write(logLine);
      await this.logFileHandle!.sync(); // Force write to disk
    });
    
    await this.pendingWrites;
  }

  private async snapshot(): Promise<void> {
    const tempPath = `${this.snapshotPath}.tmp`;
    
    try {
      const writeStream = await fs.open(tempPath, 'w');
      
      for (const [key, entry] of Array.from(this.cache.entries())) {
        // Skip expired entries
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
          continue;
        }
        
        const line = JSON.stringify({ key, entry }) + '\n';
        await writeStream.write(line);
      }
      
      await writeStream.sync();
      await writeStream.close();
      
      // Atomic replace
      await fs.rename(tempPath, this.snapshotPath);
    } catch (error) {
      // Cleanup temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async compact(): Promise<void> {
    try {
      // Create snapshot of current state
      await this.snapshot();
      
      // Clear and recreate log file
      if (this.logFileHandle) {
        await this.logFileHandle.close();
      }
      
      await fs.writeFile(this.logPath, '');
      this.logFileHandle = await fs.open(this.logPath, 'a');
      
    } catch (error) {
      console.error('Compaction failed:', error);
    }
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      await this.close();
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
    }
  }
}