"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStore = exports.FileStore = exports.MemoryStore = void 0;
exports.createStore = createStore;
exports.createNamespacedStore = createNamespacedStore;
const memory_js_1 = require("./memory.js");
const file_js_1 = require("./file.js");
const redis_js_1 = require("./redis.js");
var memory_js_2 = require("./memory.js");
Object.defineProperty(exports, "MemoryStore", { enumerable: true, get: function () { return memory_js_2.MemoryStore; } });
var file_js_2 = require("./file.js");
Object.defineProperty(exports, "FileStore", { enumerable: true, get: function () { return file_js_2.FileStore; } });
var redis_js_2 = require("./redis.js");
Object.defineProperty(exports, "RedisStore", { enumerable: true, get: function () { return redis_js_2.RedisStore; } });
/**
 * Creates a state store instance based on the provided configuration.
 *
 * @param config - Store configuration specifying type and options
 * @returns Promise that resolves to a StateStore instance
 * @throws Error if store type is unsupported or configuration is invalid
 */
async function createStore(config) {
    switch (config.type) {
        case 'memory':
            return new memory_js_1.MemoryStore(config.options);
        case 'file':
            const fileStore = new file_js_1.FileStore(config.options);
            await fileStore.initialize();
            return fileStore;
        case 'redis':
            const redisStore = new redis_js_1.RedisStore(config.options);
            await redisStore.initialize();
            return redisStore;
        default:
            throw new Error(`Unsupported store type: ${config.type}`);
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
function createNamespacedStore(store, namespace) {
    const prefixKey = (key) => `${namespace}:${key}`;
    return {
        async get(key) {
            return store.get(prefixKey(key));
        },
        async set(key, value, ttl) {
            return store.set(prefixKey(key), value, ttl);
        },
        async del(key) {
            return store.del(prefixKey(key));
        },
        async increment(key, by) {
            return store.increment(prefixKey(key), by);
        },
        async patch(key, value) {
            return store.patch(prefixKey(key), value);
        },
        async close() {
            // Don't close the underlying store as it may be shared
            return Promise.resolve();
        }
    };
}
