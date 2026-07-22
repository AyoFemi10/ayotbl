import { Bot } from "./bot";
import { Context } from "./context";
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
export declare function vercelWebhookHandler<C extends Context>(bot: Bot<C>, opts?: {
    secretToken?: string;
}): (req: any, res: any) => Promise<void>;
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
export declare function lambdaWebhookHandler<C extends Context>(bot: Bot<C>, opts?: {
    secretToken?: string;
}): (event: LambdaProxyEvent) => Promise<LambdaProxyResult>;
/**
 * For a Cloudflare Worker:
 *
 *   export default {
 *     fetch: cloudflareWebhookHandler(bot),
 *   };
 */
export declare function cloudflareWebhookHandler<C extends Context>(bot: Bot<C>, opts?: {
    secretToken?: string;
}): (request: Request) => Promise<Response>;
