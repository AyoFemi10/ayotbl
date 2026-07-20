import { test } from "node:test";
import assert from "node:assert/strict";
import { Composer } from "../src/composer";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot", username: "test_bot" };
const fakeApi = new Api(new Transport("fake-token"));

function makeUpdate(overrides: Partial<Message> = {}): Update {
  const message: Message = {
    message_id: 1,
    date: Date.now() / 1000,
    chat: { id: 100, type: "private", first_name: "Alice" },
    from: { id: 200, is_bot: false, first_name: "Alice" },
    ...overrides,
  };
  return { update_id: 1, message };
}

function ctxFor(update: Update): Context {
  return new Context(update, fakeApi, fakeBotInfo);
}

test("command() matches /start and not /startx", async () => {
  const composer = new Composer();
  let hit = false;
  composer.command("start", () => { hit = true; });

  await composer.handle(ctxFor(makeUpdate({ text: "/start" })));
  assert.equal(hit, true, "/start should match the start command");

  hit = false;
  await composer.handle(ctxFor(makeUpdate({ text: "/startx" })));
  assert.equal(hit, false, "/startx should NOT match the start command");
});

test("command() strips @BotName suffix and captures args in ctx.match", async () => {
  const composer = new Composer();
  let capturedArgs: string | undefined;
  composer.command("greet", (ctx) => {
    capturedArgs = (ctx.match as unknown as string[])[1];
  });

  await composer.handle(ctxFor(makeUpdate({ text: "/greet@test_bot world" })));
  assert.equal(capturedArgs, "world");
});

test("command() accepts an array of aliases", async () => {
  const composer = new Composer();
  let count = 0;
  composer.command(["help", "h"], () => { count++; });

  await composer.handle(ctxFor(makeUpdate({ text: "/help" })));
  await composer.handle(ctxFor(makeUpdate({ text: "/h" })));
  assert.equal(count, 2);
});

test("hears() with RegExp captures groups into ctx.match", async () => {
  const composer = new Composer();
  let captured: string | undefined;
  composer.hears(/^order (\d+)$/, (ctx) => {
    captured = ctx.match?.[1];
  });

  await composer.handle(ctxFor(makeUpdate({ text: "order 42" })));
  assert.equal(captured, "42");

  captured = undefined;
  await composer.handle(ctxFor(makeUpdate({ text: "not an order" })));
  assert.equal(captured, undefined);
});

test("action() matches callback_query data, not message text", async () => {
  const composer = new Composer();
  let hit = false;
  composer.action("confirm:yes", () => { hit = true; });

  const update: Update = {
    update_id: 2,
    callback_query: {
      id: "cbq1",
      from: { id: 200, is_bot: false, first_name: "Alice" },
      chat_instance: "x",
      data: "confirm:yes",
    },
  };
  await composer.handle(ctxFor(update));
  assert.equal(hit, true);
});

test("a middleware that calls next() continues the chain; a terminal handler that ignores next stops it", async () => {
  const composer = new Composer();
  const order: string[] = [];

  composer.use(async (ctx, next) => { order.push("logger-before"); await next(); order.push("logger-after"); });
  composer.command("start", () => { order.push("start-handler"); }); // ignores its `next` param -> chain stops here
  composer.command("start", () => { order.push("should-not-run"); }); // duplicate registration; must never fire

  await composer.handle(ctxFor(makeUpdate({ text: "/start" })));
  assert.deepEqual(order, ["logger-before", "start-handler", "logger-after"]);
});

test("on('text') matches any text message; on('photo') matches only photo messages", async () => {
  const composer = new Composer();
  let textHits = 0;
  let photoHits = 0;
  composer.on("text", () => { textHits++; });
  composer.on("photo", () => { photoHits++; });

  await composer.handle(ctxFor(makeUpdate({ text: "hello" })));
  assert.equal(textHits, 1);
  assert.equal(photoHits, 0);
});

test("otherwise() only runs when nothing above matched", async () => {
  const composer = new Composer();
  let fallback = false;
  composer.command("start", () => {});
  composer.otherwise(() => { fallback = true; });

  await composer.handle(ctxFor(makeUpdate({ text: "/start" })));
  assert.equal(fallback, false, "otherwise should not run when /start matched");

  fallback = false;
  await composer.handle(ctxFor(makeUpdate({ text: "random text" })));
  assert.equal(fallback, true, "otherwise should run when nothing else matched");
});
