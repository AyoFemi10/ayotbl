import { Context } from "./context";
import { Middleware } from "./composer";

export interface RateLimitOptions {
  /** Time window in ms. Default 3000 (3s). */
  windowMs?: number;
  /** Max updates allowed per window per key. Default 1. */
  limit?: number;
  /** Defaults to limiting per chat. Use `ctx => String(ctx.from?.id)` to limit per user instead. */
  keyFn?: (ctx: Context) => string | undefined;
  /** Called instead of silently dropping the update when the limit is hit. Defaults to doing nothing. */
  onLimitExceeded?: (ctx: Context) => unknown | Promise<unknown>;
}

/**
 * Simple sliding-window rate limiter. Mount it early with `bot.use(rateLimit())`
 * so spammy updates never even reach your command/hears/action handlers.
 *
 *   bot.use(rateLimit({ windowMs: 2000, limit: 1, onLimitExceeded: (ctx) => ctx.reply('Slow down!') }));
 */
export function rateLimit(opts: RateLimitOptions = {}): Middleware<Context> {
  const windowMs = opts.windowMs ?? 3000;
  const limit = opts.limit ?? 1;
  const keyFn = opts.keyFn ?? ((ctx: Context) => (ctx.chat ? String(ctx.chat.id) : undefined));
  const hits = new Map<string, number[]>();

  return async (ctx, next) => {
    const key = keyFn(ctx);
    if (key === undefined) return next();

    const now = Date.now();
    const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      hits.set(key, timestamps);
      if (opts.onLimitExceeded) await opts.onLimitExceeded(ctx);
      return; // drop — don't call next()
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    return next();
  };
}
