import { Context } from "./context";
import { Middleware } from "./composer";
/**
 * Pluggable session storage. Swap MemorySessionStore for RedisSessionStore
 * (see session-redis.ts) in production — same interface, no other code changes.
 */
export interface SessionStore<S = unknown> {
    get(key: string): Promise<S | undefined> | S | undefined;
    set(key: string, value: S): Promise<void> | void;
    delete(key: string): Promise<void> | void;
}
/** Default store: fine for local dev/single-process bots. State is lost on restart. */
export declare class MemorySessionStore<S = unknown> implements SessionStore<S> {
    private map;
    get(key: string): S | undefined;
    set(key: string, value: S): void;
    delete(key: string): void;
}
export interface SessionOptions<S> {
    store?: SessionStore<S>;
    /** Defaults to one session per chat. Use e.g. `ctx => ctx.from?.id` for a per-user session instead. */
    getSessionKey?: (ctx: Context) => string | undefined;
    defaultSession?: () => S;
}
/**
 * Attaches `ctx.session` (persisted via `store` across updates, keyed per chat
 * by default) and saves it back automatically after your handlers run —
 * you just read/write `ctx.session.whatever` like a plain object.
 */
export declare function session<S extends object = Record<string, unknown>>(opts?: SessionOptions<S>): Middleware<Context>;
