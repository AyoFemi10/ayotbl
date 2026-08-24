import { Context } from "./context";
import * as T from "./types";
export type Middleware<C extends Context = Context> = (ctx: C, next: () => Promise<void>) => unknown | Promise<unknown>;
export type Predicate<C extends Context = Context> = (ctx: C) => boolean;
/**
 * Composer is the router/handler-chain layer: `bot.command(...)`, `bot.on(...)`,
 * `bot.hears(...)`, `bot.action(...)` all boil down to "run this middleware if a
 * predicate matches, otherwise fall through to the next one" — same mental model
 * as telegraf/Express, but every helper here is a plain method, not a class you
 * must extend, so a beginner never needs to know the word "middleware" to start.
 *
 * Every matching method below (filter/on/command/hears/action) also has a
 * `static` counterpart that builds the same middleware WITHOUT registering it
 * on a Composer — use those to nest matchers inside gates like admin()/
 * privateChat(): `bot.privateChat(Composer.command("start", handler))`.
 */
export declare class Composer<C extends Context = Context> {
    private stack;
    /** Register any middleware. Everything else on this class is sugar over `use`. */
    use(...fns: Middleware<C>[]): this;
    /** Mount a sub-composer (or another bot) as a nested module. */
    mount(composer: Composer<C>): this;
    /** Build a standalone predicate-gated middleware — falls through (calls next()) when the predicate doesn't match. Nestable inside gates like admin()/privateChat(). */
    static filter<C extends Context = Context>(predicate: Predicate<C>, ...fns: Middleware<C>[]): Middleware<C>;
    /** Only run `fn` when `predicate(ctx)` is true; otherwise continue down the stack. */
    filter(predicate: Predicate<C>, ...fns: Middleware<C>[]): this;
    static on<C extends Context = Context>(type: T.UpdateType | MessageSubType | Predicate<C>, ...fns: Middleware<C>[]): Middleware<C>;
    /** Restrict to a specific update type: on('message'), on('photo' as a message sub-type), on(customPredicate), etc. */
    on(type: T.UpdateType | MessageSubType | Predicate<C>, ...fns: Middleware<C>[]): this;
    static command<C extends Context = Context>(cmd: string | string[], ...fns: Middleware<C>[]): Middleware<C>;
    /** Match /command or /command@BotName, optionally with args captured in ctx.match. */
    command(cmd: string | string[], ...fns: Middleware<C>[]): this;
    static hears<C extends Context = Context>(trigger: string | RegExp, ...fns: Middleware<C>[]): Middleware<C>;
    /** Match message text against a string (exact) or RegExp (captures land in ctx.match). */
    hears(trigger: string | RegExp, ...fns: Middleware<C>[]): this;
    static action<C extends Context = Context>(trigger: string | RegExp, ...fns: Middleware<C>[]): Middleware<C>;
    /** Match callback_query data against a string (exact) or RegExp (captures land in ctx.match). */
    action(trigger: string | RegExp, ...fns: Middleware<C>[]): this;
    /** Catch-all fallback if nothing above matched — put this last. */
    otherwise(...fns: Middleware<C>[]): this;
    /** Only run fns when the update's chat is one of the given types — e.g. chatType('private'), chatType(['group', 'supergroup']). */
    chatType(type: T.ChatType | T.ChatType[], ...fns: Middleware<C>[]): this;
    /** Only run fns in a private (1:1) chat with the bot. */
    privateChat(...fns: Middleware<C>[]): this;
    /** Only run fns in a group or supergroup. */
    groupChat(...fns: Middleware<C>[]): this;
    /**
     * Only run fns if the sender is an admin or the creator of the chat.
     * Makes one getChatMember call per matching update — for high-traffic
     * chats, consider caching admin lists yourself instead.
     */
    admin(...fns: Middleware<C>[]): this;
    /** Only run fns if the sender is the creator (owner) of the chat. */
    creator(...fns: Middleware<C>[]): this;
    /** Alias for filter() matching telegraf's naming — run fns only when predicate(ctx) is true. */
    optional(predicate: Predicate<C>, ...fns: Middleware<C>[]): this;
    /** Route to one of two middleware branches depending on predicate(ctx), telegraf-style. */
    branch(predicate: Predicate<C> | ((ctx: C) => Promise<boolean>), whenTrue: Middleware<C> | Middleware<C>[], whenFalse: Middleware<C> | Middleware<C>[]): this;
    /** Resolve which middleware to run at dispatch time — e.g. per-tenant config, feature flags, A/B tests. */
    lazy(factory: (ctx: C) => Middleware<C> | Promise<Middleware<C>>): this;
    /** Combine several middlewares into one, without needing a Composer instance — matches telegraf's static Composer.compose. */
    static compose<C extends Context = Context>(fns: Middleware<C>[]): Middleware<C>;
    /** Run the whole stack for a context. Used internally by Bot; exposed for testing. */
    handle(ctx: C, done?: () => Promise<void>): Promise<void>;
}
/**
 * Routes to a different sub-middleware based on a key derived from ctx —
 * e.g. multi-tenant bots, or dispatching by a stored "current step" value
 * that doesn't fit the Scenes model. Falls through via otherwise() (or the
 * outer chain) if no route matches.
 *
 *   const router = new Router<Context>((ctx) => ctx.session?.lang);
 *   router.on('en', (ctx) => ctx.reply('Hi!'));
 *   router.on('fr', (ctx) => ctx.reply('Salut!'));
 *   router.otherwise((ctx) => ctx.reply('Hi!'));
 *   bot.use(router.middleware());
 */
export declare class Router<C extends Context = Context> {
    private keyFn;
    private routes;
    private fallback?;
    constructor(keyFn: (ctx: C) => string | undefined | Promise<string | undefined>);
    on(key: string, ...fns: Middleware<C>[]): this;
    otherwise(...fns: Middleware<C>[]): this;
    middleware(): Middleware<C>;
}
type MessageSubType = "text" | "photo" | "video" | "document" | "audio" | "voice" | "sticker" | "location" | "contact" | "poll" | "dice" | "video_note" | "rich_message";
export {};
