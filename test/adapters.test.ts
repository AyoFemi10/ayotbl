import { test } from "node:test";
import assert from "node:assert/strict";
import { lambdaWebhookHandler, cloudflareWebhookHandler } from "../src/adapters";
import { Bot } from "../src/bot";

function makeBotWithSpy() {
  const bot = new Bot("fake-token");
  const received: unknown[] = [];
  bot.handleUpdate = async (update: unknown) => {
    received.push(update);
  };
  return { bot, received };
}

test("lambdaWebhookHandler parses the event body and calls bot.handleUpdate", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = lambdaWebhookHandler(bot as any);

  const result = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ update_id: 42 }),
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(received, [{ update_id: 42 }]);
});

test("lambdaWebhookHandler decodes base64-encoded bodies", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = lambdaWebhookHandler(bot as any);
  const raw = JSON.stringify({ update_id: 7 });

  await handler({
    httpMethod: "POST",
    body: Buffer.from(raw, "utf-8").toString("base64"),
    isBase64Encoded: true,
  });

  assert.deepEqual(received, [{ update_id: 7 }]);
});

test("lambdaWebhookHandler rejects non-POST methods without calling handleUpdate", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = lambdaWebhookHandler(bot as any);

  const result = await handler({ httpMethod: "GET", body: null });

  assert.equal(result.statusCode, 404);
  assert.equal(received.length, 0);
});

test("lambdaWebhookHandler enforces the secret token header when configured", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = lambdaWebhookHandler(bot as any, { secretToken: "shh" });

  const wrongToken = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ update_id: 1 }),
    headers: { "x-telegram-bot-api-secret-token": "wrong" },
  });
  assert.equal(wrongToken.statusCode, 401);
  assert.equal(received.length, 0);

  const rightToken = await handler({
    httpMethod: "POST",
    body: JSON.stringify({ update_id: 1 }),
    headers: { "x-telegram-bot-api-secret-token": "shh" },
  });
  assert.equal(rightToken.statusCode, 200);
  assert.equal(received.length, 1);
});

test("cloudflareWebhookHandler parses a fetch-style Request and calls bot.handleUpdate", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = cloudflareWebhookHandler(bot as any);

  const request = new Request("https://worker.example.com/webhook", {
    method: "POST",
    body: JSON.stringify({ update_id: 99 }),
  });

  const response = await handler(request);

  assert.equal(response.status, 200);
  assert.deepEqual(received, [{ update_id: 99 }]);
});

test("cloudflareWebhookHandler rejects non-POST requests", async () => {
  const { bot, received } = makeBotWithSpy();
  const handler = cloudflareWebhookHandler(bot as any);

  const response = await handler(new Request("https://worker.example.com/webhook", { method: "GET" }));

  assert.equal(response.status, 404);
  assert.equal(received.length, 0);
});
