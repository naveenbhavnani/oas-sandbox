import { StateStore } from '../types.js';
import { RedisStoreOptions } from './index.js';
/**
 * Redis-based state store with prefix keys, TTL support, and pipelined operations.
 *
 * Uses Redis's native TTL support with EXPIRE commands and batches operations
 * using pipelines for better performance. All keys are prefixed to avoid
 * conflicts with other applications using the same Redis instance.
 */
export declare class RedisStore implements StateStore {
    private client?;
    private readonly options;
    private readonly keyPrefix;
    private isInitialized;
    constructor(options?: RedisStoreOptions);
    initialize(): Promise<void>;
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    del(key: string): Promise<void>;
    increment(key: string, by: number): Promise<number>;
    patch(key: string, value: any): Promise<void>;
    close(): Promise<void>;
    /**
     * Performs multiple operations in a single pipeline for better performance
     */
    pipeline(operations: Array<{
        operation: 'get' | 'set' | 'del' | 'increment';
        key: string;
        value?: any;
        ttl?: number;
        by?: number;
    }>): Promise<any[]>;
    /**
     * Gets Redis client info for monitoring
     */
    info(): Promise<string>;
    /**
     * Clears all keys with the configured prefix
     */
    clear(): Promise<void>;
    /**
     * Gets the number of keys in the store
     */
    size(): Promise<number>;
    private ensureInitialized;
    private serialize;
    private deserialize;
    private fallbackPatch;
}
//# sourceMappingURL=redis.d.ts.map