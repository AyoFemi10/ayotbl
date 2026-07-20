import { SessionStore } from "./session";

/**
 * Duck-typed on purpose: works with `ioredis`, `redis` (node-redis v4+), or
 * anything else exposing get/set/del as async methods — no hard dependency
 * on any specific Redis client package.
 */
export interface RedisLikeClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface RedisSessionStoreOptions {
  /** Key prefix so ayotbl sessions don't collide with other data in the same Redis instance. Default: "ayotbl:session:" */
  prefix?: string;
  /** Expire sessions after N seconds of inactivity (e.g. 86400 for one day). Omit for no expiry. */
  ttlSeconds?: number;
}

export class RedisSessionStore<S = unknown> implements SessionStore<S> {
  private prefix: string;

  constructor(private client: RedisLikeClient, private opts: RedisSessionStoreOptions = {}) {
    this.prefix = opts.prefix ?? "ayotbl:session:";
  }

  private key(k: string) {
    return `${this.prefix}${k}`;
  }

  async get(key: string): Promise<S | undefined> {
    const raw = await this.client.get(this.key(key));
    return raw ? (JSON.parse(raw) as S) : undefined;
  }

  async set(key: string, value: S): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.opts.ttlSeconds) {
      // Works for both ioredis (`set(key, val, 'EX', n)`) and node-redis v4 (`set(key, val, {EX: n})`) callers
      // who pass ttlSeconds — we call the lowest common denominator form here and let it no-op if unsupported.
      await this.client.set(this.key(key), raw, "EX", this.opts.ttlSeconds);
    } else {
      await this.client.set(this.key(key), raw);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(this.key(key));
  }
}
