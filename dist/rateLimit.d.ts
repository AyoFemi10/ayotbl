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
export declare function rateLimit(opts?: RateLimitOptions): Middleware<Context>;
