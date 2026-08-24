"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemorySessionStore = void 0;
exports.session = session;
/** Default store: fine for local dev/single-process bots. State is lost on restart. */
class MemorySessionStore {
    map = new Map();
    get(key) { return this.map.get(key); }
    set(key, value) { this.map.set(key, value); }
    delete(key) { this.map.delete(key); }
}
exports.MemorySessionStore = MemorySessionStore;
/**
 * Attaches `ctx.session` (persisted via `store` across updates, keyed per chat
 * by default) and saves it back automatically after your handlers run —
 * you just read/write `ctx.session.whatever` like a plain object.
 */
function session(opts = {}) {
    const store = opts.store ?? new MemorySessionStore();
    const getKey = opts.getSessionKey ?? ((ctx) => (ctx.chat ? String(ctx.chat.id) : undefined));
    const makeDefault = opts.defaultSession ?? (() => ({}));
    return async (ctx, next) => {
        const key = getKey(ctx);
        if (key === undefined)
            return next();
        const existing = await store.get(key);
        ctx.session = (existing ?? makeDefault());
        await next();
        if (ctx.session === undefined)
            await store.delete(key);
        else
            await store.set(key, ctx.session);
    };
}
//# sourceMappingURL=session.js.map