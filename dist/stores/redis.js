"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStore = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Redis-based state store with prefix keys, TTL support, and pipelined operations.
 *
 * Uses Redis's native TTL support with EXPIRE commands and batches operations
 * using pipelines for better performance. All keys are prefixed to avoid
 * conflicts with other applications using the same Redis instance.
 */
class RedisStore {
    client;
    options;
    keyPrefix;
    isInitialized = false;
    constructor(options = {}) {
        this.options = {
            host: 'localhost',
            port: 6379,
            db: 0,
            keyPrefix: 'oas-sandbox:',
            retryDelayOnFailover: 100,
            lazyConnect: true,
            ...options
        };
        this.keyPrefix = this.options.keyPrefix || 'oas-sandbox:';
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            const redisConfig = {
                host: this.options.host,
                port: this.options.port,
                db: this.options.db,
                lazyConnect: this.options.lazyConnect,
                maxRetriesPerRequest: 3,
                enableOfflineQueue: false,
                keyPrefix: this.keyPrefix
            };
            if (this.options.password) {
                redisConfig.password = this.options.password;
            }
            this.client = new ioredis_1.default(redisConfig);
            // Test connection
            await this.client.ping();
            this.isInitialized = true;
        }
        catch (error) {
            throw new Error(`Failed to initialize Redis store: ${error}`);
        }
    }
    async get(key) {
        this.ensureInitialized();
        try {
            const value = await this.client.get(key);
            if (value === null) {
                return undefined;
            }
            return this.deserialize(value);
        }
        catch (error) {
            throw new Error(`Failed to get key "${key}": ${error}`);
        }
    }
    async set(key, value, ttl) {
        this.ensureInitialized();
        try {
            const serialized = this.serialize(value);
            if (ttl) {
                // Use SETEX for atomic set with expiration
                await this.client.setex(key, Math.floor(ttl), serialized);
            }
            else {
                await this.client.set(key, serialized);
            }
        }
        catch (error) {
            throw new Error(`Failed to set key "${key}": ${error}`);
        }
    }
    async del(key) {
        this.ensureInitialized();
        try {
            await this.client.del(key);
        }
        catch (error) {
            throw new Error(`Failed to delete key "${key}": ${error}`);
        }
    }
    async increment(key, by) {
        this.ensureInitialized();
        try {
            // Redis INCRBYFLOAT supports both integers and floats
            const result = await this.client.incrbyfloat(key, by);
            // If the result is a whole number, return as integer
            return Number.isInteger(Number(result)) ? Math.round(Number(result)) : Number(result);
        }
        catch (error) {
            throw new Error(`Failed to increment key "${key}": ${error}`);
        }
    }
    async patch(key, value) {
        this.ensureInitialized();
        try {
            // Use a Lua script for atomic patch operation
            const luaScript = `
        local key = KEYS[1]
        local patchValue = ARGV[1]
        
        local existing = redis.call('GET', key)
        local merged = patchValue
        
        if existing then
          local existingData = cjson.decode(existing)
          local patchData = cjson.decode(patchValue)
          
          -- Simple merge logic for objects
          if type(existingData) == 'table' and type(patchData) == 'table' then
            for k, v in pairs(patchData) do
              existingData[k] = v
            end
            merged = cjson.encode(existingData)
          else
            merged = patchValue
          end
        end
        
        local ttl = redis.call('TTL', key)
        redis.call('SET', key, merged)
        
        if ttl > 0 then
          redis.call('EXPIRE', key, ttl)
        end
        
        return merged
      `;
            const serializedPatch = this.serialize(value);
            try {
                await this.client.eval(luaScript, 1, key, serializedPatch);
            }
            catch (luaError) {
                // Fallback to non-atomic implementation if Lua script fails
                console.warn('Lua script failed, falling back to non-atomic patch:', luaError);
                await this.fallbackPatch(key, value);
            }
        }
        catch (error) {
            throw new Error(`Failed to patch key "${key}": ${error}`);
        }
    }
    async close() {
        if (this.client) {
            await this.client.quit();
            this.client = undefined;
        }
        this.isInitialized = false;
    }
    /**
     * Performs multiple operations in a single pipeline for better performance
     */
    async pipeline(operations) {
        this.ensureInitialized();
        try {
            const pipeline = this.client.pipeline();
            for (const op of operations) {
                switch (op.operation) {
                    case 'get':
                        pipeline.get(op.key);
                        break;
                    case 'set':
                        if (op.ttl) {
                            pipeline.setex(op.key, Math.floor(op.ttl), this.serialize(op.value));
                        }
                        else {
                            pipeline.set(op.key, this.serialize(op.value || ''));
                        }
                        break;
                    case 'del':
                        pipeline.del(op.key);
                        break;
                    case 'increment':
                        pipeline.incrbyfloat(op.key, op.by || 1);
                        break;
                }
            }
            const results = await pipeline.exec();
            if (!results) {
                throw new Error('Pipeline execution failed');
            }
            // Process results and handle errors
            const processedResults = [];
            for (let i = 0; i < results.length; i++) {
                const [error, result] = results[i];
                if (error) {
                    throw new Error(`Pipeline operation ${i} failed: ${error}`);
                }
                const op = operations[i];
                if (op.operation === 'get') {
                    processedResults.push(result === null ? undefined : this.deserialize(result));
                }
                else if (op.operation === 'increment') {
                    const numResult = Number(result);
                    processedResults.push(Number.isInteger(numResult) ? Math.round(numResult) : numResult);
                }
                else {
                    processedResults.push(result);
                }
            }
            return processedResults;
        }
        catch (error) {
            throw new Error(`Pipeline operation failed: ${error}`);
        }
    }
    /**
     * Gets Redis client info for monitoring
     */
    async info() {
        this.ensureInitialized();
        try {
            return await this.client.info();
        }
        catch (error) {
            throw new Error(`Failed to get Redis info: ${error}`);
        }
    }
    /**
     * Clears all keys with the configured prefix
     */
    async clear() {
        this.ensureInitialized();
        try {
            // Find all keys with our prefix
            const keys = await this.client.keys('*');
            if (keys.length > 0) {
                // Use pipeline for efficient deletion
                const pipeline = this.client.pipeline();
                for (const key of keys) {
                    pipeline.del(key);
                }
                await pipeline.exec();
            }
        }
        catch (error) {
            throw new Error(`Failed to clear Redis store: ${error}`);
        }
    }
    /**
     * Gets the number of keys in the store
     */
    async size() {
        this.ensureInitialized();
        try {
            const keys = await this.client.keys('*');
            return keys.length;
        }
        catch (error) {
            throw new Error(`Failed to get store size: ${error}`);
        }
    }
    ensureInitialized() {
        if (!this.isInitialized || !this.client) {
            throw new Error('RedisStore not initialized. Call initialize() first.');
        }
    }
    serialize(value) {
        try {
            return JSON.stringify(value);
        }
        catch (error) {
            throw new Error(`Value is not JSON serializable: ${error}`);
        }
    }
    deserialize(value) {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            throw new Error(`Failed to deserialize value: ${error}`);
        }
    }
    async fallbackPatch(key, value) {
        // Non-atomic fallback implementation
        const pipeline = this.client.pipeline();
        // Get current value and TTL
        pipeline.get(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();
        if (!results) {
            throw new Error('Failed to get current value for patch');
        }
        const [getError, existingValue] = results[0];
        const [ttlError, currentTtl] = results[1];
        if (getError || ttlError) {
            throw new Error('Failed to get current value or TTL for patch');
        }
        let mergedValue;
        if (existingValue === null) {
            mergedValue = value;
        }
        else {
            const existing = this.deserialize(existingValue);
            if (typeof existing === 'object' && existing !== null && !Array.isArray(existing) &&
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
        }
        // Set the merged value
        if (typeof currentTtl === 'number' && currentTtl > 0) {
            await this.client.setex(key, Math.floor(currentTtl), this.serialize(mergedValue));
        }
        else {
            await this.client.set(key, this.serialize(mergedValue));
        }
    }
}
exports.RedisStore = RedisStore;
//# sourceMappingURL=redis.js.map