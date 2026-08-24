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
export class MemorySessionStore<S = unknown> implements SessionStore<S> {
  private map = new Map<string, S>();
  get(key: string) { return this.map.get(key); }
  set(key: string, value: S) { this.map.set(key, value); }
  delete(key: string) { this.map.delete(key); }
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
export function session<S extends object = Record<string, unknown>>(opts: SessionOptions<S> = {}): Middleware<Context> {
  const store = opts.store ?? new MemorySessionStore<S>();
  const getKey = opts.getSessionKey ?? ((ctx: Context) => (ctx.chat ? String(ctx.chat.id) : undefined));
  const makeDefault = opts.defaultSession ?? ((): S => ({} as S));

  return async (ctx, next) => {
    const key = getKey(ctx);
    if (key === undefined) return next();

    const existing = await store.get(key);
    ctx.session = (existing ?? makeDefault()) as unknown as Record<string, unknown>;

    await next();

    if (ctx.session === undefined) await store.delete(key);
    else await store.set(key, ctx.session as unknown as S);
  };
}
