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
export declare class RedisSessionStore<S = unknown> implements SessionStore<S> {
    private client;
    private opts;
    private prefix;
    constructor(client: RedisLikeClient, opts?: RedisSessionStoreOptions);
    private key;
    get(key: string): Promise<S | undefined>;
    set(key: string, value: S): Promise<void>;
    delete(key: string): Promise<void>;
}
