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
 */
export class Composer<C extends Context = Context> {
  private stack: Middleware<C>[] = [];

  /** Register any middleware. Everything else on this class is sugar over `use`. */
  use(...fns: Middleware<C>[]): this {
    this.stack.push(...fns);
    return this;
  }

  /** Mount a sub-composer (or another bot) as a nested module. */
  mount(composer: Composer<C>): this {
    return this.use((ctx, next) => composer.handle(ctx, next));
  }

  /** Only run `fn` when `predicate(ctx)` is true; otherwise continue down the stack. */
  filter(predicate: Predicate<C>, ...fns: Middleware<C>[]): this {
    return this.use(async (ctx, next) => {
      if (predicate(ctx)) return runChain(fns, ctx, next);
      return next();
    });
  }

  /** Restrict to a specific update type: on('message'), on('callback_query'), on('photo' as a message sub-type), etc. */
  on(type: T.UpdateType | MessageSubType, ...fns: Middleware<C>[]): this {
    return this.filter((ctx) => matchesUpdateType(ctx, type), ...fns);
  }

  /** Match /command or /command@BotName, optionally with args captured in ctx.match. */
  command(cmd: string | string[], ...fns: Middleware<C>[]): this {
    const cmds = (Array.isArray(cmd) ? cmd : [cmd]).map((c) => c.replace(/^\//, ""));
    return this.filter(
      (ctx) => {
        const text = ctx.message?.text;
        if (!text?.startsWith("/")) return false;
        const [used, ...rest] = text.slice(1).split(/\s+/);
        const [name] = used.split("@");
        if (!cmds.includes(name)) return false;
        ctx.match = [text, rest.join(" ")] as unknown as RegExpMatchArray;
        return true;
      },
      ...fns
    );
  }

  /** Match message text against a string (exact) or RegExp (captures land in ctx.match). */
  hears(trigger: string | RegExp, ...fns: Middleware<C>[]): this {
    return this.filter(
      (ctx) => {
        const text = ctx.message?.text;
        if (text === undefined) return false;
        if (typeof trigger === "string") return text === trigger;
        const m = text.match(trigger);
        if (m) ctx.match = m;
        return !!m;
      },
      ...fns
    );
  }

  /** Match callback_query data against a string (exact) or RegExp (captures land in ctx.match). */
  action(trigger: string | RegExp, ...fns: Middleware<C>[]): this {
    return this.filter(
      (ctx) => {
        const data = ctx.callbackQuery?.data;
        if (data === undefined) return false;
        if (typeof trigger === "string") return data === trigger;
        const m = data.match(trigger);
        if (m) ctx.match = m;
        return !!m;
      },
      ...fns
    );
  }

  /** Catch-all fallback if nothing above matched — put this last. */
  otherwise(...fns: Middleware<C>[]): this {
    return this.use(...fns);
  }

  /** Only run fns when the update's chat is one of the given types — e.g. chatType('private'), chatType(['group', 'supergroup']). */
  chatType(type: T.ChatType | T.ChatType[], ...fns: Middleware<C>[]): this {
    const types = Array.isArray(type) ? type : [type];
    return this.filter((ctx) => !!ctx.chat && types.includes(ctx.chat.type), ...fns);
  }

  /** Only run fns in a private (1:1) chat with the bot. */
  privateChat(...fns: Middleware<C>[]): this {
    return this.chatType("private", ...fns);
  }

  /** Only run fns in a group or supergroup. */
  groupChat(...fns: Middleware<C>[]): this {
    return this.chatType(["group", "supergroup"], ...fns);
  }

  /**
   * Only run fns if the sender is an admin or the creator of the chat.
   * Makes one getChatMember call per matching update — for high-traffic
   * chats, consider caching admin lists yourself instead.
   */
  admin(...fns: Middleware<C>[]): this {
    const inner = Composer.compose(fns);
    return this.use(async (ctx, next) => {
      if (!ctx.chat || !ctx.from) return;
      const member = await ctx.api.getChatMember({ chat_id: ctx.chat.id, user_id: ctx.from.id }).catch(() => null);
      if (member?.status === "administrator" || member?.status === "creator") return inner(ctx, next);
    });
  }

  /** Only run fns if the sender is the creator (owner) of the chat. */
  creator(...fns: Middleware<C>[]): this {
    const inner = Composer.compose(fns);
    return this.use(async (ctx, next) => {
      if (!ctx.chat || !ctx.from) return;
      const member = await ctx.api.getChatMember({ chat_id: ctx.chat.id, user_id: ctx.from.id }).catch(() => null);
      if (member?.status === "creator") return inner(ctx, next);
    });
  }

  /** Alias for filter() matching telegraf's naming — run fns only when predicate(ctx) is true. */
  optional(predicate: Predicate<C>, ...fns: Middleware<C>[]): this {
    return this.filter(predicate, ...fns);
  }

  /** Route to one of two middleware branches depending on predicate(ctx), telegraf-style. */
  branch(predicate: Predicate<C> | ((ctx: C) => Promise<boolean>), whenTrue: Middleware<C> | Middleware<C>[], whenFalse: Middleware<C> | Middleware<C>[]): this {
    const trueMw = Composer.compose(Array.isArray(whenTrue) ? whenTrue : [whenTrue]);
    const falseMw = Composer.compose(Array.isArray(whenFalse) ? whenFalse : [whenFalse]);
    return this.use(async (ctx, next) => {
      const result = await predicate(ctx);
      return result ? trueMw(ctx, next) : falseMw(ctx, next);
    });
  }

  /** Resolve which middleware to run at dispatch time — e.g. per-tenant config, feature flags, A/B tests. */
  lazy(factory: (ctx: C) => Middleware<C> | Promise<Middleware<C>>): this {
    return this.use(async (ctx, next) => {
      const mw = await factory(ctx);
      return mw(ctx, next);
    });
  }

  /** Combine several middlewares into one, without needing a Composer instance — matches telegraf's static Composer.compose. */
  static compose<C extends Context = Context>(fns: Middleware<C>[]): Middleware<C> {
    return (ctx, next) => runChain(fns, ctx, next);
  }

  /** Run the whole stack for a context. Used internally by Bot; exposed for testing. */
  async handle(ctx: C, done: () => Promise<void> = async () => {}): Promise<void> {
    await runChain(this.stack, ctx, done);
  }
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
export class Router<C extends Context = Context> {
  private routes = new Map<string, Middleware<C>>();
  private fallback?: Middleware<C>;

  constructor(private keyFn: (ctx: C) => string | undefined | Promise<string | undefined>) {}

  on(key: string, ...fns: Middleware<C>[]): this {
    this.routes.set(key, Composer.compose(fns));
    return this;
  }

  otherwise(...fns: Middleware<C>[]): this {
    this.fallback = Composer.compose(fns);
    return this;
  }

  middleware(): Middleware<C> {
    return async (ctx, next) => {
      const key = await this.keyFn(ctx);
      const route = key !== undefined ? this.routes.get(key) : undefined;
      if (route) return route(ctx, next);
      if (this.fallback) return this.fallback(ctx, next);
      return next();
    };
  }
}

async function runChain<C extends Context>(fns: Middleware<C>[], ctx: C, done: () => Promise<void>): Promise<void> {
  let i = -1;
  async function dispatch(idx: number): Promise<void> {
    if (idx <= i) throw new Error("next() called multiple times");
    i = idx;
    const fn = fns[idx];
    if (!fn) return done();
    await fn(ctx, () => dispatch(idx + 1));
  }
  await dispatch(0);
}

type MessageSubType = "text" | "photo" | "video" | "document" | "audio" | "voice" | "sticker" | "location" | "contact" | "poll" | "dice" | "video_note" | "rich_message";

function matchesUpdateType(ctx: Context, type: T.UpdateType | MessageSubType): boolean {
  if (ctx.updateType === type) return true;
  if (ctx.message && type in ctx.message) return true;
  return false;
}
