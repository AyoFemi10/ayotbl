import { createServer, IncomingMessage, ServerResponse } from "http";
import { Api, ClientOptions, Transport, TelegramApiError } from "./client";
import { Composer, Middleware } from "./composer";
import { Context } from "./context";
import * as T from "./types";
import { getControllerHandlers } from "./decorators";

export interface BotOptions extends ClientOptions {
  /** Provide a custom Context subclass if you want extra helpers/typing on ctx. */
  contextType?: new (update: T.Update, api: Api, botInfo: T.User) => Context;
}

/**
 * Bot ties everything together and is a Composer itself, so `bot.command(...)`,
 * `bot.on(...)`, `bot.hears(...)`, `bot.action(...)`, and `bot.use(...)` all work
 * directly on it — no separate "router" object required for small bots.
 */
export class Bot<C extends Context = Context> extends Composer<C> {
  readonly api: Api;
  private transport: Transport;
  private polling = false;
  private botInfo?: T.User;
  private ContextClass: new (update: T.Update, api: Api, botInfo: T.User) => C;

  constructor(token: string, options: BotOptions = {}) {
    super();
    this.transport = new Transport(token, options);
    this.api = new Api(this.transport);
    this.ContextClass = (options.contextType as any) ?? (Context as any);
  }

  /** Register a decorator-based controller instance (see decorators.ts) alongside your functional/fluent handlers. */
  useController(instance: object): this {
    for (const { meta, fn } of getControllerHandlers(instance)) {
      if (meta.kind === "command") this.command(meta.value, fn);
      else if (meta.kind === "hears") this.hears(meta.value, fn);
      else if (meta.kind === "action") this.action(meta.value, fn);
      else if (meta.kind === "on") this.on(meta.value as any, fn);
    }
    return this;
  }

  /** Process one Update directly — the entry point serverless adapters (adapters.ts) call after parsing the request body themselves. */
  async handleUpdate(update: T.Update): Promise<void> {
    return this.dispatch(update);
  }

  private async dispatch(update: T.Update) {
    if (!this.botInfo) this.botInfo = await this.api.getMe();
    const ctx = new this.ContextClass(update, this.api, this.botInfo);
    try {
      await this.handle(ctx as C);
    } catch (err) {
      if (this.errorHandler) await this.errorHandler(err as Error, ctx as C);
      else console.error("[ayotbl] Unhandled error in handler:", err);
    }
  }

  private errorHandler?: (err: Error, ctx: C) => unknown;
  /** Central error handler for anything thrown inside your handlers. */
  catch(fn: (err: Error, ctx: C) => unknown): this {
    this.errorHandler = fn;
    return this;
  }

  // ----- Long polling -----

  /** Start long polling. Resolves once polling has begun (it keeps running in the background). */
  async launch(opts: { dropPendingUpdates?: boolean; allowedUpdates?: string[] } = {}): Promise<void> {
    this.botInfo = await this.api.getMe();
    await this.api.deleteWebhook({ drop_pending_updates: opts.dropPendingUpdates });
    this.polling = true;
    this.pollLoop(opts.allowedUpdates).catch((err) => console.error("[ayotbl] polling loop crashed:", err));

    const stop = () => this.stop();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  }

  private lastOffset = 0;
  private async pollLoop(allowedUpdates?: string[]) {
    while (this.polling) {
      let updates: T.Update[];
      try {
        updates = await this.api.getUpdates({ offset: this.lastOffset, timeout: 30, allowed_updates: allowedUpdates });
      } catch (err) {
        if (err instanceof TelegramApiError && err.parameters?.retry_after) {
          await sleep(err.parameters.retry_after * 1000);
          continue;
        }
        console.error("[ayotbl] getUpdates failed, retrying in 3s:", err);
        await sleep(3000);
        continue;
      }
      for (const update of updates) {
        this.lastOffset = update.update_id + 1;
        // Fire-and-continue so one slow handler doesn't delay polling the rest of the batch.
        this.dispatch(update).catch((err) => console.error("[ayotbl] dispatch error:", err));
      }
    }
  }

  stop(): void {
    this.polling = false;
  }

  // ----- Webhook -----

  /** Returns an http(s).Server-compatible request handler you can mount in Express/Fastify/raw http. */
  webhookCallback(path = "/", opts: { secretToken?: string } = {}) {
    return async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== "POST" || !req.url?.startsWith(path)) {
        res.writeHead(404).end();
        return;
      }
      if (opts.secretToken && req.headers["x-telegram-bot-api-secret-token"] !== opts.secretToken) {
        res.writeHead(401).end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      try {
        const update = JSON.parse(Buffer.concat(chunks).toString("utf-8")) as T.Update;
        res.writeHead(200).end();
        await this.dispatch(update);
      } catch (err) {
        console.error("[ayotbl] webhook handler error:", err);
        if (!res.headersSent) res.writeHead(500).end();
      }
    };
  }

  /** Convenience: spin up a standalone Node http server and set the webhook in one call. */
  async launchWebhook(opts: { url: string; port: number; path?: string; secretToken?: string }): Promise<void> {
    const path = opts.path ?? "/webhook";
    this.botInfo = await this.api.getMe();
    await this.api.setWebhook({ url: opts.url.replace(/\/$/, "") + path, secret_token: opts.secretToken });
    const server = createServer(this.webhookCallback(path, { secretToken: opts.secretToken }));
    await new Promise<void>((resolve) => server.listen(opts.port, resolve));
    console.log(`[ayotbl] webhook listening on :${opts.port}${path}`);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export { Context, Composer, Middleware, Api, T as Types };
