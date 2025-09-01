import { StateStore, StoreConfig } from '../types.js';
export { MemoryStore } from './memory.js';
export { FileStore } from './file.js';
export { RedisStore } from './redis.js';
export interface MemoryStoreOptions {
    maxSize?: number;
    defaultTtl?: number;
}
export interface FileStoreOptions {
    path?: string;
    compactionInterval?: number;
    snapshotOnShutdown?: boolean;
}
export interface RedisStoreOptions {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    prefix?: string;
    keyPrefix?: string;
    retryDelayOnFailover?: number;
    lazyConnect?: boolean;
}
/**
 * Creates a state store instance based on the provided configuration.
 *
 * @param config - Store configuration specifying type and options
 * @returns Promise that resolves to a StateStore instance
 * @throws Error if store type is unsupported or configuration is invalid
 */
export declare function createStore(config: StoreConfig): Promise<StateStore>;
/**
 * Creates a namespaced state store wrapper that prefixes all keys with a namespace.
 * This is used for session scoping to isolate state between different sessions.
 *
 * @param store - Base store to wrap
 * @param namespace - Namespace prefix to apply to all keys
 * @returns StateStore instance with namespaced keys
 */
export declare function createNamespacedStore(store: StateStore, namespace: string): StateStore;
