"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStore = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
/**
 * File-based state store with periodic compaction and graceful shutdown snapshotting.
 *
 * Uses an append-only log for writes with periodic compaction to a snapshot file.
 * This provides durability while maintaining reasonable performance for reads and writes.
 *
 * Data is stored as newline-delimited JSON (NDJSON) for both the log and snapshot files.
 */
class FileStore {
    cache = new Map();
    filePath;
    logPath;
    snapshotPath;
    compactionInterval;
    snapshotOnShutdown;
    compactionTimer;
    isInitialized = false;
    logFileHandle;
    pendingWrites = Promise.resolve();
    constructor(options = {}) {
        this.filePath = options.path || './oas-sandbox-state';
        this.logPath = `${this.filePath}.log`;
        this.snapshotPath = `${this.filePath}.snapshot`;
        this.compactionInterval = options.compactionInterval || 300000; // 5 minutes
        this.snapshotOnShutdown = options.snapshotOnShutdown !== false; // default true
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            // Ensure directory exists
            await fs_1.promises.mkdir((0, path_1.dirname)(this.filePath), { recursive: true });
            // Load existing data
            await this.loadFromSnapshot();
            await this.replayLog();
            // Open log file for appending
            this.logFileHandle = await fs_1.promises.open(this.logPath, 'a');
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
        }
        catch (error) {
            throw new Error(`Failed to initialize file store: ${error}`);
        }
    }
    async get(key) {
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
    async set(key, value, ttl) {
        this.ensureInitialized();
        const now = Date.now();
        const expiresAt = ttl ? now + (ttl * 1000) : undefined;
        const entry = {
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
    async del(key) {
        this.ensureInitialized();
        this.cache.delete(key);
        await this.appendLog({
            timestamp: Date.now(),
            operation: 'del',
            key
        });
    }
    async increment(key, by) {
        this.ensureInitialized();
        const current = await this.get(key);
        const currentValue = typeof current === 'number' ? current : 0;
        const newValue = currentValue + by;
        // Preserve existing TTL and creation time
        const existingEntry = this.cache.get(key);
        const now = Date.now();
        const entry = {
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
    async patch(key, value) {
        this.ensureInitialized();
        const existing = await this.get(key);
        let mergedValue;
        if (existing === undefined) {
            mergedValue = value;
        }
        else if (typeof existing === 'object' && existing !== null && !Array.isArray(existing) &&
            typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Deep merge objects
            mergedValue = { ...existing, ...value };
        }
        else if (Array.isArray(existing) && Array.isArray(value)) {
            // Concatenate arrays
            mergedValue = [...existing, ...value];
        }
        else {
            // Replace primitive values
            mergedValue = value;
        }
        // Preserve existing TTL and creation time
        const existingEntry = this.cache.get(key);
        const now = Date.now();
        const entry = {
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
    async close() {
        if (this.compactionTimer) {
            clearInterval(this.compactionTimer);
            this.compactionTimer = undefined;
        }
        // Wait for pending writes to complete
        await this.pendingWrites;
        if (this.snapshotOnShutdown) {
            await this.snapshot();
        }
        if (this.logFileHandle) {
            await this.logFileHandle.close();
            this.logFileHandle = undefined;
        }
        this.cache.clear();
        this.isInitialized = false;
    }
    /**
     * Forces an immediate compaction
     */
    async forceCompaction() {
        await this.compact();
    }
    /**
     * Gets the current cache size
     */
    size() {
        return this.cache.size;
    }
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('FileStore not initialized. Call initialize() first.');
        }
    }
    serialize(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch (error) {
            throw new Error(`Value is not JSON serializable: ${error}`);
        }
    }
    async loadFromSnapshot() {
        try {
            const data = await fs_1.promises.readFile(this.snapshotPath, 'utf-8');
            const lines = data.trim().split('\n').filter(line => line);
            for (const line of lines) {
                try {
                    const { key, entry } = JSON.parse(line);
                    // Check if entry has expired
                    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
                        continue;
                    }
                    this.cache.set(key, entry);
                }
                catch (error) {
                    console.warn(`Failed to parse snapshot entry: ${line}`, error);
                }
            }
        }
        catch (error) {
            // Snapshot file doesn't exist or is unreadable - this is fine for first run
        }
    }
    async replayLog() {
        try {
            const data = await fs_1.promises.readFile(this.logPath, 'utf-8');
            const lines = data.trim().split('\n').filter(line => line);
            for (const line of lines) {
                try {
                    const logEntry = JSON.parse(line);
                    await this.applyLogEntry(logEntry);
                }
                catch (error) {
                    console.warn(`Failed to parse log entry: ${line}`, error);
                }
            }
        }
        catch (error) {
            // Log file doesn't exist - this is fine
        }
    }
    async applyLogEntry(entry) {
        switch (entry.operation) {
            case 'set': {
                const expiresAt = entry.ttl ? entry.timestamp + (entry.ttl * 1000) : undefined;
                const existingEntry = this.cache.get(entry.key);
                const fileEntry = {
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
                }
                else {
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
                    }
                    else if (Array.isArray(existing.value) && Array.isArray(entry.value)) {
                        mergedValue = [...existing.value, ...entry.value];
                    }
                    existing.value = mergedValue;
                    existing.updatedAt = entry.timestamp;
                }
                else {
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
    async appendLog(entry) {
        if (!this.logFileHandle) {
            return;
        }
        const logLine = JSON.stringify(entry) + '\n';
        // Chain writes to maintain order
        this.pendingWrites = this.pendingWrites.then(async () => {
            await this.logFileHandle.write(logLine);
            await this.logFileHandle.sync(); // Force write to disk
        });
        await this.pendingWrites;
    }
    async snapshot() {
        const tempPath = `${this.snapshotPath}.tmp`;
        try {
            const writeStream = await fs_1.promises.open(tempPath, 'w');
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
            await fs_1.promises.rename(tempPath, this.snapshotPath);
        }
        catch (error) {
            // Cleanup temp file on error
            try {
                await fs_1.promises.unlink(tempPath);
            }
            catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }
    async compact() {
        try {
            // Create snapshot of current state
            await this.snapshot();
            // Clear and recreate log file
            if (this.logFileHandle) {
                await this.logFileHandle.close();
            }
            await fs_1.promises.writeFile(this.logPath, '');
            this.logFileHandle = await fs_1.promises.open(this.logPath, 'a');
        }
        catch (error) {
            console.error('Compaction failed:', error);
        }
    }
    async gracefulShutdown() {
        try {
            await this.close();
        }
        catch (error) {
            console.error('Error during graceful shutdown:', error);
        }
    }
}
exports.FileStore = FileStore;
//# sourceMappingURL=file.js.map