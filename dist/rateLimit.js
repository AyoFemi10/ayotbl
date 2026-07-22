"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
/**
 * Simple sliding-window rate limiter. Mount it early with `bot.use(rateLimit())`
 * so spammy updates never even reach your command/hears/action handlers.
 *
 *   bot.use(rateLimit({ windowMs: 2000, limit: 1, onLimitExceeded: (ctx) => ctx.reply('Slow down!') }));
 */
function rateLimit(opts = {}) {
    const windowMs = opts.windowMs ?? 3000;
    const limit = opts.limit ?? 1;
    const keyFn = opts.keyFn ?? ((ctx) => (ctx.chat ? String(ctx.chat.id) : undefined));
    const hits = new Map();
    return async (ctx, next) => {
        const key = keyFn(ctx);
        if (key === undefined)
            return next();
        const now = Date.now();
        const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
        if (timestamps.length >= limit) {
            hits.set(key, timestamps);
            if (opts.onLimitExceeded)
                await opts.onLimitExceeded(ctx);
            return; // drop — don't call next()
        }
        timestamps.push(now);
        hits.set(key, timestamps);
        return next();
    };
}
//# sourceMappingURL=rateLimit.js.map