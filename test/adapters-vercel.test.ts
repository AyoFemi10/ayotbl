/**
 * Tests for vercelWebhookHandler() — the one adapter not covered by adapters.test.ts.
 * Two flavors are tested:
 *   - Pages Router / plain req.body style (the common case)
 *   - App Router / web-fetch Request style (req.json())
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { vercelWebhookHandler } from "../src/adapters";
import { Bot } from "../src/bot";
import type { Update } from "../src/types";

function makeBotWithSpy() {
  const bot = new Bot("fake-token");
  const received: Update[] = [];
  bot.handleUpdate = async (u: Update) => { received.push(u); };
  return { bot, received };
}

/** Simulates Vercel Pages Router request (req.body is already parsed by Vercel's runtime). */
function pagesReq(body: object, opts: { method?: string; headers?: Record<string, string> } = {}) {
  return {
    method: opts.method ?? "POST",
    headers: opts.headers ?? {},
    body,
  };
}

/** Simulates Vercel App Router request (req.json() returns a Promise). */
function appReq(body: object, opts: { method?: string; headers?: Record<string, string | string[]> } = {}) {
  return {
    method: opts.method ?? "POST",
    headers: {
      get: (key: string) => (opts.headers ?? {})[key.toLowerCase()] ?? null,
    },
    json: async () => body,
  };
}

/** Minimal res stub used in Pages Router style. */
function makeRes() {
  const res = {
    statusCode: 0,
    ended: false,
    status(code: number) { this.statusCode = code; return this; },
    end() { this.ended = true; return this; },
  };
  return res;
}

// ---------- Pages Router style ----------

test("vercelWebhookHandler (pages style): dispatches req.body and calls handleUpdate", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = vercelWebhookHandler(bot as any);

  const res = makeRes();
  await handler(pagesReq({ update_id: 1 }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].update_id, 1);
});

test("vercelWebhookHandler (pages style): rejects non-POST with 404", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = vercelWebhookHandler(bot as any);

  const res = makeRes();
  await handler(pagesReq({}, { method: "GET" }), res);

  assert.equal(res.statusCode, 404);
  assert.equal(received.length, 0);
});

test("vercelWebhookHandler (pages style): enforces secretToken, rejects bad token with 401", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = vercelWebhookHandler(bot as any, { secretToken: "s3cr3t" });
  const res = makeRes();

  await handler(
    pagesReq({ update_id: 2 }, { headers: { "x-telegram-bot-api-secret-token": "wrong" } }),
    res
  );

  assert.equal(res.statusCode, 401);
  assert.equal(received.length, 0);
});

test("vercelWebhookHandler (pages style): accepts correct secretToken", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = vercelWebhookHandler(bot as any, { secretToken: "s3cr3t" });
  const res = makeRes();

  await handler(
    pagesReq({ update_id: 3 }, { headers: { "x-telegram-bot-api-secret-token": "s3cr3t" } }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(received.length, 1);
  assert.equal(received[0].update_id, 3);
});

// ---------- App Router style ----------

test("vercelWebhookHandler (app router style): calls req.json() and dispatches the update", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = vercelWebhookHandler(bot as any);

  const res = makeRes();
  await handler(appReq({ update_id: 10 }), res);

  assert.equal(received.length, 1);
  assert.equal(received[0].update_id, 10);
});

test("vercelWebhookHandler (app router style): enforces secretToken via headers.get()", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = vercelWebhookHandler(bot as any, { secretToken: "tok" });

  const res = makeRes();
  await handler(
    appReq({ update_id: 11 }, { headers: { "x-telegram-bot-api-secret-token": "tok" } }),
    res
  );
  assert.equal(received.length, 1);

  const res2 = makeRes();
  await handler(
    appReq({ update_id: 12 }, { headers: { "x-telegram-bot-api-secret-token": "bad" } }),
    res2
  );
  assert.equal(res2.statusCode, 401);
  assert.equal(received.length, 1, "second call with wrong token should not reach handleUpdate");
});
