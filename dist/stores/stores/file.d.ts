import { StateStore } from '../types.js';
import { FileStoreOptions } from './index.js';
/**
 * File-based state store with periodic compaction and graceful shutdown snapshotting.
 *
 * Uses an append-only log for writes with periodic compaction to a snapshot file.
 * This provides durability while maintaining reasonable performance for reads and writes.
 *
 * Data is stored as newline-delimited JSON (NDJSON) for both the log and snapshot files.
 */
export declare class FileStore implements StateStore {
    private cache;
    private readonly filePath;
    private readonly logPath;
    private readonly snapshotPath;
    private readonly compactionInterval;
    private readonly snapshotOnShutdown;
    private compactionTimer?;
    private isInitialized;
    private logFileHandle?;
    private pendingWrites;
    constructor(options?: FileStoreOptions);
    initialize(): Promise<void>;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    increment(key: string, by: number): Promise<number>;
    patch(key: string, value: any): Promise<void>;
    close(): Promise<void>;
    /**
     * Forces an immediate compaction
     */
    forceCompaction(): Promise<void>;
    /**
     * Gets the current cache size
     */
    size(): number;
    private ensureInitialized;
    private serialize;
    private loadFromSnapshot;
    private replayLog;
    private applyLogEntry;
    private appendLog;
    private snapshot;
    private compact;
    private gracefulShutdown;
}
