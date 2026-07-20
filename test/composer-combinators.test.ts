import { test } from "node:test";
import assert from "node:assert/strict";
import { Composer, Router } from "../src/composer";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot" };
const fakeApi = new Api(new Transport("fake-token"));

function ctxFor(text: string): Context {
  const message: Message = {
    message_id: 1,
    date: Date.now() / 1000,
    chat: { id: 1, type: "private", first_name: "Alice" },
    from: { id: 2, is_bot: false, first_name: "Alice" },
    text,
  };
  const update: Update = { update_id: 1, message };
  return new Context(update, fakeApi, fakeBotInfo);
}

test("branch() routes to the true or false middleware based on the predicate", async () => {
  const composer = new Composer<Context>();
  const hits: string[] = [];
  composer.branch(
    (ctx) => ctx.text === "vip",
    (ctx) => { hits.push("vip-path"); },
    (ctx) => { hits.push("normal-path"); }
  );

  await composer.handle(ctxFor("vip"));
  await composer.handle(ctxFor("anything else"));
  assert.deepEqual(hits, ["vip-path", "normal-path"]);
});

test("lazy() resolves the middleware to run at dispatch time", async () => {
  const composer = new Composer<Context>();
  let resolvedWith = "";
  composer.lazy((ctx) => {
    resolvedWith = ctx.text ?? "";
    return async () => {};
  });

  await composer.handle(ctxFor("resolved-value"));
  assert.equal(resolvedWith, "resolved-value");
});

test("Composer.compose() combines middlewares into one that can be reused elsewhere", async () => {
  const order: string[] = [];
  const combined = Composer.compose<Context>([
    async (ctx, next) => { order.push("first"); await next(); },
    async () => { order.push("second"); },
  ]);

  await combined(ctxFor("hi"), async () => {});
  assert.deepEqual(order, ["first", "second"]);
});

test("Router dispatches based on a derived key, falling back to otherwise()", async () => {
  const router = new Router<Context>((ctx) => (ctx.text === "en" ? "en" : ctx.text === "fr" ? "fr" : undefined));
  const seen: string[] = [];
  router.on("en", () => { seen.push("english"); });
  router.on("fr", () => { seen.push("french"); });
  router.otherwise(() => { seen.push("fallback"); });

  const composer = new Composer<Context>();
  composer.use(router.middleware());

  await composer.handle(ctxFor("en"));
  await composer.handle(ctxFor("fr"));
  await composer.handle(ctxFor("de"));

  assert.deepEqual(seen, ["english", "french", "fallback"]);
});
