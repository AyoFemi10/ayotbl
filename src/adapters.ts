import { Bot } from "./bot";
import { Context } from "./context";
import { Update } from "./types";

/**
 * These adapters exist because `bot.webhookCallback()` speaks Node's raw
 * `http.IncomingMessage`/`ServerResponse`, which Vercel functions, Lambda,
 * and Cloudflare Workers don't use natively. Each helper below adapts
 * `bot.handleUpdate()` to that platform's actual request/response shape.
 */

function checkSecret(headerValue: string | null | undefined, expected?: string): boolean {
  if (!expected) return true;
  return headerValue === expected;
}

// ---------- Vercel / Next.js (Node runtime, Request/Response-style) ----------

export interface VercelLikeRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined> | Headers;
  body?: unknown;
  json?: () => Promise<unknown>;
}

/**
 * For a Vercel serverless function (pages/api or app router route handler):
 *
 *   export default async function handler(req, res) {
 *     await vercelWebhookHandler(bot)(req, res);
 *   }
 */
export function vercelWebhookHandler<C extends Context>(bot: Bot<C>, opts: { secretToken?: string } = {}) {
  return async (req: any, res: any) => {
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
    const update: Update = req.body ?? (req.json ? await req.json() : undefined);
    res.status?.(200).end?.() ?? res.end();
    await bot.handleUpdate(update);
  };
}

// ---------- AWS Lambda (API Gateway proxy integration) ----------

export interface LambdaProxyEvent {
  httpMethod?: string;
  headers?: Record<string, string | undefined>;
  body: string | null;
  isBase64Encoded?: boolean;
}

export interface LambdaProxyResult {
  statusCode: number;
  body: string;
}

/**
 * For AWS Lambda behind API Gateway:
 *
 *   export const handler = lambdaWebhookHandler(bot);
 */
export function lambdaWebhookHandler<C extends Context>(bot: Bot<C>, opts: { secretToken?: string } = {}) {
  return async (event: LambdaProxyEvent): Promise<LambdaProxyResult> => {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return { statusCode: 404, body: "" };
    }
    const headerToken = event.headers?.["x-telegram-bot-api-secret-token"] ?? event.headers?.["X-Telegram-Bot-Api-Secret-Token"];
    if (!checkSecret(headerToken, opts.secretToken)) {
      return { statusCode: 401, body: "" };
    }
    const raw = event.isBase64Encoded && event.body ? Buffer.from(event.body, "base64").toString("utf-8") : event.body;
    const update = JSON.parse(raw ?? "{}") as Update;
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
export function cloudflareWebhookHandler<C extends Context>(bot: Bot<C>, opts: { secretToken?: string } = {}) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response(null, { status: 404 });
    const headerToken = request.headers.get("x-telegram-bot-api-secret-token");
    if (!checkSecret(headerToken, opts.secretToken)) return new Response(null, { status: 401 });

    const update = (await request.json()) as Update;
    // Respond immediately, then process — Workers support this via `waitUntil` in the caller if needed.
    await bot.handleUpdate(update);
    return new Response(null, { status: 200 });
  };
}
