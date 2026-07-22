"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisSessionStore = void 0;
class RedisSessionStore {
    client;
    opts;
    prefix;
    constructor(client, opts = {}) {
        this.client = client;
        this.opts = opts;
        this.prefix = opts.prefix ?? "ayotbl:session:";
    }
    key(k) {
        return `${this.prefix}${k}`;
    }
    async get(key) {
        const raw = await this.client.get(this.key(key));
        return raw ? JSON.parse(raw) : undefined;
    }
    async set(key, value) {
        const raw = JSON.stringify(value);
        if (this.opts.ttlSeconds) {
            // Works for both ioredis (`set(key, val, 'EX', n)`) and node-redis v4 (`set(key, val, {EX: n})`) callers
            // who pass ttlSeconds — we call the lowest common denominator form here and let it no-op if unsupported.
            await this.client.set(this.key(key), raw, "EX", this.opts.ttlSeconds);
        }
        else {
            await this.client.set(this.key(key), raw);
        }
    }
    async delete(key) {
        await this.client.del(this.key(key));
    }
}
exports.RedisSessionStore = RedisSessionStore;
//# sourceMappingURL=session-redis.js.map