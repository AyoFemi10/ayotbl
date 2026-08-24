"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Types = exports.Api = exports.Composer = exports.Context = exports.Bot = void 0;
const http_1 = require("http");
const client_1 = require("./client");
Object.defineProperty(exports, "Api", { enumerable: true, get: function () { return client_1.Api; } });
const composer_1 = require("./composer");
Object.defineProperty(exports, "Composer", { enumerable: true, get: function () { return composer_1.Composer; } });
const context_1 = require("./context");
Object.defineProperty(exports, "Context", { enumerable: true, get: function () { return context_1.Context; } });
const T = __importStar(require("./types"));
exports.Types = T;
const decorators_1 = require("./decorators");
/**
 * Bot ties everything together and is a Composer itself, so `bot.command(...)`,
 * `bot.on(...)`, `bot.hears(...)`, `bot.action(...)`, and `bot.use(...)` all work
 * directly on it — no separate "router" object required for small bots.
 */
class Bot extends composer_1.Composer {
    api;
    transport;
    polling = false;
    botInfo;
    ContextClass;
    constructor(token, options = {}) {
        super();
        this.transport = new client_1.Transport(token, options);
        this.api = new client_1.Api(this.transport);
        this.ContextClass = options.contextType ?? context_1.Context;
    }
    /** Register a decorator-based controller instance (see decorators.ts) alongside your functional/fluent handlers. */
    useController(instance) {
        for (const { meta, fn } of (0, decorators_1.getControllerHandlers)(instance)) {
            if (meta.kind === "command")
                this.command(meta.value, fn);
            else if (meta.kind === "hears")
                this.hears(meta.value, fn);
            else if (meta.kind === "action")
                this.action(meta.value, fn);
            else if (meta.kind === "on")
                this.on(meta.value, fn);
        }
        return this;
    }
    /** Process one Update directly — the entry point serverless adapters (adapters.ts) call after parsing the request body themselves. */
    async handleUpdate(update) {
        return this.dispatch(update);
    }
    async dispatch(update) {
        if (!this.botInfo)
            this.botInfo = await this.api.getMe();
        const ctx = new this.ContextClass(update, this.api, this.botInfo);
        try {
            await this.handle(ctx);
        }
        catch (err) {
            if (this.errorHandler)
                await this.errorHandler(err, ctx);
            else
                console.error("[ayotbl] Unhandled error in handler:", err);
        }
    }
    errorHandler;
    /** Central error handler for anything thrown inside your handlers. */
    catch(fn) {
        this.errorHandler = fn;
        return this;
    }
    // ----- Long polling -----
    /** Start long polling. Resolves once polling has begun (it keeps running in the background). */
    async launch(opts = {}) {
        this.botInfo = await this.api.getMe();
        await this.api.deleteWebhook({ drop_pending_updates: opts.dropPendingUpdates });
        this.polling = true;
        this.pollLoop(opts.allowedUpdates).catch((err) => console.error("[ayotbl] polling loop crashed:", err));
        const stop = () => this.stop();
        process.once("SIGINT", stop);
        process.once("SIGTERM", stop);
    }
    lastOffset = 0;
    async pollLoop(allowedUpdates) {
        while (this.polling) {
            let updates;
            try {
                updates = await this.api.getUpdates({ offset: this.lastOffset, timeout: 30, allowed_updates: allowedUpdates });
            }
            catch (err) {
                if (err instanceof client_1.TelegramApiError && err.parameters?.retry_after) {
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
    stop() {
        this.polling = false;
    }
    // ----- Webhook -----
    /** Returns an http(s).Server-compatible request handler you can mount in Express/Fastify/raw http. */
    webhookCallback(path = "/", opts = {}) {
        return async (req, res) => {
            if (req.method !== "POST" || !req.url?.startsWith(path)) {
                res.writeHead(404).end();
                return;
            }
            if (opts.secretToken && req.headers["x-telegram-bot-api-secret-token"] !== opts.secretToken) {
                res.writeHead(401).end();
                return;
            }
            const chunks = [];
            for await (const chunk of req)
                chunks.push(chunk);
            try {
                const update = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
                res.writeHead(200).end();
                await this.dispatch(update);
            }
            catch (err) {
                console.error("[ayotbl] webhook handler error:", err);
                if (!res.headersSent)
                    res.writeHead(500).end();
            }
        };
    }
    /** Convenience: spin up a standalone Node http server and set the webhook in one call. */
    async launchWebhook(opts) {
        const path = opts.path ?? "/webhook";
        this.botInfo = await this.api.getMe();
        await this.api.setWebhook({ url: opts.url.replace(/\/$/, "") + path, secret_token: opts.secretToken });
        const server = (0, http_1.createServer)(this.webhookCallback(path, { secretToken: opts.secretToken }));
        await new Promise((resolve) => server.listen(opts.port, resolve));
        console.log(`[ayotbl] webhook listening on :${opts.port}${path}`);
    }
}
exports.Bot = Bot;
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
//# sourceMappingURL=bot.js.map