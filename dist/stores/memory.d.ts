import { StateStore } from '../types.js';
import { MemoryStoreOptions } from './index.js';
/**
 * In-memory state store with TTL support using a time wheel algorithm.
 * Efficiently handles expiration of keys using a circular buffer approach.
 *
 * The TTL wheel divides time into slots and schedules cleanup operations
 * to avoid scanning all entries on every access.
 */
export declare class MemoryStore implements StateStore {
    private cache;
    private readonly maxSize;
    private readonly defaultTtl?;
    private readonly wheelSize;
    private readonly wheel;
    private lastCleanup;
    private cleanupInterval?;
    constructor(options?: MemoryStoreOptions);
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    increment(key: string, by: number): Promise<number>;
    patch(key: string, value: any): Promise<void>;
    close(): Promise<void>;
    /**
     * Gets the current size of the cache
     */
    size(): number;
    /**
     * Clears all entries from the cache
     */
    clear(): void;
    private serialize;
    private deserialize;
    private evictOldest;
    private scheduleExpiration;
    private cleanup;
}
//# sourceMappingURL=memory.d.ts.map