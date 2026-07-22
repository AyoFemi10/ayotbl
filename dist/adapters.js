"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vercelWebhookHandler = vercelWebhookHandler;
exports.lambdaWebhookHandler = lambdaWebhookHandler;
exports.cloudflareWebhookHandler = cloudflareWebhookHandler;
/**
 * These adapters exist because `bot.webhookCallback()` speaks Node's raw
 * `http.IncomingMessage`/`ServerResponse`, which Vercel functions, Lambda,
 * and Cloudflare Workers don't use natively. Each helper below adapts
 * `bot.handleUpdate()` to that platform's actual request/response shape.
 */
function checkSecret(headerValue, expected) {
    if (!expected)
        return true;
    return headerValue === expected;
}
/**
 * For a Vercel serverless function (pages/api or app router route handler):
 *
 *   export default async function handler(req, res) {
 *     await vercelWebhookHandler(bot)(req, res);
 *   }
 */
function vercelWebhookHandler(bot, opts = {}) {
    return async (req, res) => {
        if (req.method !== "POST") {
            res.status?.(404).end?.() ?? res.end();
            return;
        }
        const headerToken = typeof req.headers?.get === "function"
            ? req.headers.get("x-telegram-bot-api-secret-token")
            : req.headers?.["x-telegram-bot-api-secret-token"];
        if (!checkSecret(Array.isArray(headerToken) ? headerToken[0] : headerToken, opts.secretToken)) {
            res.status?.(401).end?.() ?? res.end();
            return;
        }
        const update = req.body ?? (req.json ? await req.json() : undefined);
        res.status?.(200).end?.() ?? res.end();
        await bot.handleUpdate(update);
    };
}
/**
 * For AWS Lambda behind API Gateway:
 *
 *   export const handler = lambdaWebhookHandler(bot);
 */
function lambdaWebhookHandler(bot, opts = {}) {
    return async (event) => {
        if (event.httpMethod && event.httpMethod !== "POST") {
            return { statusCode: 404, body: "" };
        }
        const headerToken = event.headers?.["x-telegram-bot-api-secret-token"] ?? event.headers?.["X-Telegram-Bot-Api-Secret-Token"];
        if (!checkSecret(headerToken, opts.secretToken)) {
            return { statusCode: 401, body: "" };
        }
        const raw = event.isBase64Encoded && event.body ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
        const update = JSON.parse(raw ?? "{}");
        await bot.handleUpdate(update);
        return { statusCode: 200, body: "" };
    };
}
// ---------- Cloudflare Workers (fetch-based runtime) ----------
/**
 * For a Cloudflare Worker:
 *
 *   export default {
 *     fetch: cloudflareWebhookHandler(bot),
 *   };
 */
function cloudflareWebhookHandler(bot, opts = {}) {
    return async (request) => {
        if (request.method !== "POST")
            return new Response(null, { status: 404 });
        const headerToken = request.headers.get("x-telegram-bot-api-secret-token");
        if (!checkSecret(headerToken, opts.secretToken))
            return new Response(null, { status: 401 });
        const update = (await request.json());
        // Respond immediately, then process — Workers support this via `waitUntil` in the caller if needed.
        await bot.handleUpdate(update);
        return new Response(null, { status: 200 });
    };
}
//# sourceMappingURL=adapters.js.map