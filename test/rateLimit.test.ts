import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "../src/rateLimit";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot" };
const fakeApi = new Api(new Transport("fake-token"));

function ctxFor(chatId: number): Context {
  const message: Message = {
    message_id: 1,
    date: Date.now() / 1000,
    chat: { id: chatId, type: "private", first_name: "Alice" },
    from: { id: chatId, is_bot: false, first_name: "Alice" },
  };
  const update: Update = { update_id: 1, message };
  return new Context(update, fakeApi, fakeBotInfo);
}

test("rateLimit() allows updates up to the limit within the window, then blocks", async () => {
  const mw = rateLimit({ windowMs: 10_000, limit: 2 });
  let nextCalls = 0;
  const next = async () => { nextCalls++; };

  await mw(ctxFor(1), next);
  await mw(ctxFor(1), next);
  await mw(ctxFor(1), next); // should be blocked — limit is 2

  assert.equal(nextCalls, 2, "the third update within the window should be dropped");
});

test("rateLimit() tracks separate chats independently", async () => {
  const mw = rateLimit({ windowMs: 10_000, limit: 1 });
  let nextCalls = 0;
  const next = async () => { nextCalls++; };

  await mw(ctxFor(1), next);
  await mw(ctxFor(2), next);
  await mw(ctxFor(1), next); // blocked, chat 1 already used its slot
  await mw(ctxFor(2), next); // blocked, chat 2 already used its slot

  assert.equal(nextCalls, 2, "each chat should get its own independent allowance");
});

test("rateLimit() calls onLimitExceeded instead of next() when the limit is hit", async () => {
  let exceededCalls = 0;
  const mw = rateLimit({ windowMs: 10_000, limit: 1, onLimitExceeded: async () => { exceededCalls++; } });
  let nextCalls = 0;
  const next = async () => { nextCalls++; };

  await mw(ctxFor(1), next);
  await mw(ctxFor(1), next);

  assert.equal(nextCalls, 1);
  assert.equal(exceededCalls, 1);
});

test("rateLimit() allows requests again once the window has passed", async () => {
  const mw = rateLimit({ windowMs: 20, limit: 1 });
  let nextCalls = 0;
  const next = async () => { nextCalls++; };

  await mw(ctxFor(1), next);
  await new Promise((r) => setTimeout(r, 30));
  await mw(ctxFor(1), next);

  assert.equal(nextCalls, 2, "after the window elapses, the chat should be allowed again");
});
