import { IncomingMessage, ServerResponse } from "http";
import { Api, ClientOptions } from "./client";
import { Composer, Middleware } from "./composer";
import { Context } from "./context";
import * as T from "./types";
export interface BotOptions extends ClientOptions {
    /** Provide a custom Context subclass if you want extra helpers/typing on ctx. */
    contextType?: new (update: T.Update, api: Api, botInfo: T.User) => Context;
}
/**
 * Bot ties everything together and is a Composer itself, so `bot.command(...)`,
 * `bot.on(...)`, `bot.hears(...)`, `bot.action(...)`, and `bot.use(...)` all work
 * directly on it — no separate "router" object required for small bots.
 */
export declare class Bot<C extends Context = Context> extends Composer<C> {
    readonly api: Api;
    private transport;
    private polling;
    private botInfo?;
    private ContextClass;
    constructor(token: string, options?: BotOptions);
    /** Register a decorator-based controller instance (see decorators.ts) alongside your functional/fluent handlers. */
    useController(instance: object): this;
    /** Process one Update directly — the entry point serverless adapters (adapters.ts) call after parsing the request body themselves. */
    handleUpdate(update: T.Update): Promise<void>;
    private dispatch;
    private errorHandler?;
    /** Central error handler for anything thrown inside your handlers. */
    catch(fn: (err: Error, ctx: C) => unknown): this;
    /** Start long polling. Resolves once polling has begun (it keeps running in the background). */
    launch(opts?: {
        dropPendingUpdates?: boolean;
        allowedUpdates?: string[];
    }): Promise<void>;
    private lastOffset;
    private pollLoop;
    stop(): void;
    /** Returns an http(s).Server-compatible request handler you can mount in Express/Fastify/raw http. */
    webhookCallback(path?: string, opts?: {
        secretToken?: string;
    }): (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    /** Convenience: spin up a standalone Node http server and set the webhook in one call. */
    launchWebhook(opts: {
        url: string;
        port: number;
        path?: string;
        secretToken?: string;
    }): Promise<void>;
}
export { Context, Composer, Middleware, Api, T as Types };
