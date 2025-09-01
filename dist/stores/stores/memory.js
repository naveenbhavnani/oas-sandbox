"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
/**
 * In-memory state store with TTL support using a time wheel algorithm.
 * Efficiently handles expiration of keys using a circular buffer approach.
 *
 * The TTL wheel divides time into slots and schedules cleanup operations
 * to avoid scanning all entries on every access.
 */
class MemoryStore {
    cache = new Map();
    maxSize;
    defaultTtl;
    // TTL wheel for efficient expiration management
    wheelSize = 3600; // 1 hour in seconds
    wheel = [];
    lastCleanup = Math.floor(Date.now() / 1000);
    cleanupInterval;
    constructor(options = {}) {
        this.maxSize = options.maxSize || 10000;
        this.defaultTtl = options.defaultTtl || undefined;
        // Initialize TTL wheel
        for (let i = 0; i < this.wheelSize; i++) {
            this.wheel[i] = { entries: new Map() };
        }
        // Start cleanup process every second
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 1000);
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if entry has expired
        if (entry.expiresAt && entry.expiresAt <= Date.now()) {
            this.cache.delete(key);
            return undefined;
        }
        return this.deserialize(entry.value);
    }
    async set(key, value, ttl) {
        // Ensure we don't exceed max size
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictOldest();
        }
        const effectiveTtl = ttl ?? this.defaultTtl;
        const expiresAt = effectiveTtl ? Date.now() + (effectiveTtl * 1000) : undefined;
        const entry = {
            value: this.serialize(value),
            expiresAt: expiresAt || undefined
        };
        this.cache.set(key, entry);
        // Schedule expiration in TTL wheel if TTL is set
        if (expiresAt) {
            this.scheduleExpiration(key, entry, Math.floor(expiresAt / 1000));
        }
    }
    async del(key) {
        this.cache.delete(key);
    }
    async increment(key, by) {
        const current = await this.get(key);
        const currentValue = typeof current === 'number' ? current : 0;
        const newValue = currentValue + by;
        // Preserve existing TTL if the key exists
        const existingEntry = this.cache.get(key);
        const ttl = existingEntry?.expiresAt
            ? Math.max(0, Math.floor((existingEntry.expiresAt - Date.now()) / 1000))
            : undefined;
        await this.set(key, newValue, ttl);
        return newValue;
    }
    async patch(key, value) {
        const existing = await this.get(key);
        if (existing === undefined) {
            await this.set(key, value);
            return;
        }
        let mergedValue;
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
        // Preserve existing TTL
        const existingEntry = this.cache.get(key);
        const ttl = existingEntry?.expiresAt
            ? Math.max(0, Math.floor((existingEntry.expiresAt - Date.now()) / 1000))
            : undefined;
        await this.set(key, mergedValue, ttl);
    }
    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.cache.clear();
        this.wheel.forEach(slot => slot.entries.clear());
    }
    /**
     * Gets the current size of the cache
     */
    size() {
        return this.cache.size;
    }
    /**
     * Clears all entries from the cache
     */
    clear() {
        this.cache.clear();
        this.wheel.forEach(slot => slot.entries.clear());
    }
    serialize(value) {
        // Ensure JSON serializability
        try {
            return JSON.parse(JSON.stringify(value));
        }
        catch (error) {
            throw new Error(`Value is not JSON serializable: ${error}`);
        }
    }
    deserialize(value) {
        return value;
    }
    evictOldest() {
        // Simple LRU-like eviction - remove first entry
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.cache.delete(firstKey);
        }
    }
    scheduleExpiration(key, entry, expirationTime) {
        const slot = expirationTime % this.wheelSize;
        this.wheel[slot].entries.set(key, entry);
    }
    cleanup() {
        const now = Math.floor(Date.now() / 1000);
        // Process all slots from last cleanup to now
        while (this.lastCleanup < now) {
            this.lastCleanup++;
            const slot = this.lastCleanup % this.wheelSize;
            // Process entries scheduled for this time slot
            const slotEntries = this.wheel[slot].entries;
            const expiredKeys = [];
            for (const [key, entry] of Array.from(slotEntries.entries())) {
                if (entry.expiresAt && entry.expiresAt <= Date.now()) {
                    this.cache.delete(key);
                    expiredKeys.push(key);
                }
            }
            // Remove expired keys from wheel slot
            expiredKeys.forEach(key => slotEntries.delete(key));
        }
        // Update current slot (removed currentSlot property as it wasn't needed)
    }
}
exports.MemoryStore = MemoryStore;
