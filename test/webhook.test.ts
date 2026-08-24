/**
 * Tests for bot.webhookCallback() — the Node http.IncomingMessage/ServerResponse
 * path used when you mount the bot into Express, Fastify, or a raw http server.
 * None of these make real network calls; fetch is mocked to return a fake getMe
 * response so Bot.dispatch() can resolve botInfo without hitting Telegram.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { Bot } from "../src/bot";
import type { Update } from "../src/types";

// ---------- fetch mock ----------

const FAKE_BOT_INFO = { id: 1, is_bot: true, first_name: "TestBot", username: "test_bot" };

function withMockedFetch<T>(fn: () => Promise<T>): Promise<T> {
  const original = global.fetch;
  (global as any).fetch = (async (_url: string) =>
    new Response(JSON.stringify({ ok: true, result: FAKE_BOT_INFO }), { status: 200 })
  ) as typeof fetch;
  return fn().finally(() => { (global as any).fetch = original; });
}

// ---------- helpers ----------

function makeBot() {
  const bot = new Bot("fake-token");
  const received: Update[] = [];
  // Capture dispatched updates via a use() handler — doesn't skip dispatch or getMe.
  bot.use((ctx) => { received.push(ctx.update); });
  return { bot, received };
}

/**
 * Builds a minimal IncomingMessage that looks like a POST from Telegram,
 * with the given body JSON and optional headers.
 */
function makeReq(
  body: object,
  opts: { method?: string; path?: string; headers?: Record<string, string> } = {}
): IncomingMessage {
  const raw = JSON.stringify(body);
  const req = new Readable({
    read() {
      this.push(raw);
      this.push(null);
    },
  }) as unknown as IncomingMessage;
  (req as any).method = opts.method ?? "POST";
  (req as any).url = opts.path ?? "/";
  (req as any).headers = opts.headers ?? {};
  return req;
}

/**
 * Minimal ServerResponse stub that records the status code and whether end()
 * was called, without needing a real Socket.
 */
function makeRes(): ServerResponse & { statusCode: number; ended: boolean } {
  const res = {
    statusCode: 0,
    ended: false,
    headersSent: false,
    writeHead(code: number) {
      this.statusCode = code;
      this.headersSent = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
  return res as unknown as ServerResponse & { statusCode: number; ended: boolean };
}

// ---------- tests ----------

test("webhookCallback() dispatches a valid POST to handlers and responds 200", async () => {
  await withMockedFetch(async () => {
    const { bot, received } = makeBot();
    const handler = bot.webhookCallback("/");

    const update: Update = { update_id: 1, message: { message_id: 1, date: 0, chat: { id: 1, type: "private", first_name: "A" }, text: "hi" } };
    const req = makeReq(update);
    const res = makeRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.ended, true);
    assert.equal(received.length, 1);
    assert.equal(received[0].update_id, 1);
  });
});

test("webhookCallback() returns 404 for non-POST requests", async () => {
  const { bot, received } = makeBot();
  const handler = bot.webhookCallback("/");

  const req = makeReq({}, { method: "GET" });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(received.length, 0, "a GET should never reach any handler");
});

test("webhookCallback() returns 404 when the URL does not match the configured path", async () => {
  const { bot, received } = makeBot();
  const handler = bot.webhookCallback("/webhook");

  const req = makeReq({ update_id: 1 }, { path: "/other" });
  const res = makeRes();

  await handler(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(received.length, 0);
});

test("webhookCallback() accepts a POST to the configured path", async () => {
  await withMockedFetch(async () => {
    const { bot, received } = makeBot();
    const handler = bot.webhookCallback("/webhook");

    const update: Update = { update_id: 5 };
    const req = makeReq(update, { path: "/webhook" });
    const res = makeRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(received[0].update_id, 5);
  });
});

test("webhookCallback() enforces secretToken header when configured", async () => {
  await withMockedFetch(async () => {
    const { bot, received } = makeBot();
    const handler = bot.webhookCallback("/", { secretToken: "mysecret" });

    // Wrong token → 401
    const badReq = makeReq({ update_id: 1 }, { headers: { "x-telegram-bot-api-secret-token": "wrong" } });
    const badRes = makeRes();
    await handler(badReq, badRes);
    assert.equal(badRes.statusCode, 401);
    assert.equal(received.length, 0);

    // Correct token → 200
    const goodReq = makeReq({ update_id: 2 }, { headers: { "x-telegram-bot-api-secret-token": "mysecret" } });
    const goodRes = makeRes();
    await handler(goodReq, goodRes);
    assert.equal(goodRes.statusCode, 200);
    assert.equal(received.length, 1);
    assert.equal(received[0].update_id, 2);
  });
});

test("webhookCallback() responds 200 and processes when no secretToken is configured (open webhook)", async () => {
  await withMockedFetch(async () => {
    const { bot, received } = makeBot();
    const handler = bot.webhookCallback("/");

    const req = makeReq({ update_id: 9 }); // no secret header
    const res = makeRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(received.length, 1);
  });
});

test("webhookCallback() handles a body split across multiple stream chunks correctly", async () => {
  await withMockedFetch(async () => {
    const { bot, received } = makeBot();
    const handler = bot.webhookCallback("/");

    const update: Update = { update_id: 77 };
    const raw = JSON.stringify(update);
    // Split the body into two chunks to prove the handler reads the full stream.
    const req = new Readable({
      read() {
        this.push(raw.slice(0, 5));
        this.push(raw.slice(5));
        this.push(null);
      },
    }) as unknown as IncomingMessage;
    (req as any).method = "POST";
    (req as any).url = "/";
    (req as any).headers = {};

    const res = makeRes();
    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(received[0].update_id, 77, "chunked body should be fully reassembled before JSON parsing");
  });
});

test("webhookCallback() responds 500 and does not crash when the body is invalid JSON", async () => {
  const { bot } = makeBot();
  const handler = bot.webhookCallback("/");

  const req = new Readable({
    read() {
      this.push("not json at all");
      this.push(null);
    },
  }) as unknown as IncomingMessage;
  (req as any).method = "POST";
  (req as any).url = "/";
  (req as any).headers = {};

  const res = makeRes();
  await handler(req, res);

  assert.equal(res.statusCode, 500, "malformed body should 500, not crash the process");
});
