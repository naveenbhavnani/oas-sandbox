import { StateStore, StoreConfig } from '../types.js';
import { MemoryStore } from './memory.js';
import { FileStore } from './file.js';
import { RedisStore } from './redis.js';

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
export async function createStore(config: StoreConfig): Promise<StateStore> {
  switch (config.type) {
    case 'memory':
      return new MemoryStore(config.options as MemoryStoreOptions);
    
    case 'file':
      const fileStore = new FileStore(config.options as FileStoreOptions);
      await fileStore.initialize();
      return fileStore;
    
    case 'redis':
      const redisStore = new RedisStore(config.options as RedisStoreOptions);
      await redisStore.initialize();
      return redisStore;
    
    default:
      throw new Error(`Unsupported store type: ${(config as any).type}`);
  }
}

/**
 * Creates a namespaced state store wrapper that prefixes all keys with a namespace.
 * This is used for session scoping to isolate state between different sessions.
 * 
 * @param store - Base store to wrap
 * @param namespace - Namespace prefix to apply to all keys
 * @returns StateStore instance with namespaced keys
 */
export function createNamespacedStore(store: StateStore, namespace: string): StateStore {
  const prefixKey = (key: string): string => `${namespace}:${key}`;
  
  return {
    async get(key: string): Promise<any> {
      return store.get(prefixKey(key));
    },
    
    async set(key: string, value: any, ttl?: number): Promise<void> {
      return store.set(prefixKey(key), value, ttl);
    },
    
    async del(key: string): Promise<void> {
      return store.del(prefixKey(key));
    },
    
    async increment(key: string, by: number): Promise<number> {
      return store.increment(prefixKey(key), by);
    },
    
    async patch(key: string, value: any): Promise<void> {
      return store.patch(prefixKey(key), value);
    },
    
    async close(): Promise<void> {
      // Don't close the underlying store as it may be shared
      return Promise.resolve();
    }
  };
}