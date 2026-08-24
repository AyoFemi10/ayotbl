import { test } from "node:test";
import assert from "node:assert/strict";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot" };

/** Mocks global.fetch and records the last (method, url, body) it was called with. */
function withMockedFetch<T>(fn: () => Promise<T>): Promise<T> & { calls: () => { url: string; body: unknown }[] } {
  const calls: { url: string; body: unknown }[] = [];
  const original = global.fetch;
  (global as any).fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: init.body ? JSON.parse(init.body as string) : undefined });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 123 } }), { status: 200 });
  }) as typeof fetch;

  const promise = fn().finally(() => {
    (global as any).fetch = original;
  }) as Promise<T> & { calls: () => typeof calls };
  promise.calls = () => calls;
  return promise;
}

function ctxFor(overrides: Partial<Message> = {}): Context {
  const message: Message = {
    message_id: 1,
    date: Date.now() / 1000,
    chat: { id: 555, type: "private", first_name: "Alice" },
    from: { id: 777, is_bot: false, first_name: "Alice" },
    ...overrides,
  };
  const update: Update = { update_id: 1, message };
  return new Context(update, new Api(new Transport("fake-token")), fakeBotInfo);
}

test("ctx.reply() sends to the correct chat_id with the given text", async () => {
  const p = withMockedFetch(async () => {
    const ctx = ctxFor();
    return ctx.reply("Hello!", { parse_mode: "HTML" });
  });
  await p;
  const [call] = p.calls();
  assert.match(call.url, /\/sendMessage$/);
  assert.equal((call.body as any).chat_id, 555);
  assert.equal((call.body as any).text, "Hello!");
  assert.equal((call.body as any).parse_mode, "HTML");
});

test("ctx.replyWithPhoto() forwards extra options like caption and reply_markup", async () => {
  const p = withMockedFetch(async () => {
    const ctx = ctxFor();
    return ctx.replyWithPhoto("file123", { caption: "A photo" });
  });
  await p;
  const [call] = p.calls();
  assert.match(call.url, /\/sendPhoto$/);
  assert.equal((call.body as any).photo, "file123");
  assert.equal((call.body as any).caption, "A photo");
});

test("ctx.editText() targets the current message's chat_id and message_id", async () => {
  const p = withMockedFetch(async () => {
    const ctx = ctxFor({ message_id: 42 });
    return ctx.editText("Updated text");
  });
  await p;
  const [call] = p.calls();
  assert.match(call.url, /\/editMessageText$/);
  assert.equal((call.body as any).chat_id, 555);
  assert.equal((call.body as any).message_id, 42);
  assert.equal((call.body as any).text, "Updated text");
});

test("ctx.deleteMessage() defaults to the current message when no id is given", async () => {
  const p = withMockedFetch(async () => {
    const ctx = ctxFor({ message_id: 99 });
    return ctx.deleteMessage();
  });
  await p;
  const [call] = p.calls();
  assert.equal((call.body as any).message_id, 99);
});

test("ctx.answerCbQuery() uses the callback_query id, and throws without one", async () => {
  const update: Update = {
    update_id: 1,
    callback_query: { id: "cbq-1", from: { id: 2, is_bot: false, first_name: "A" }, chat_instance: "x", data: "d" },
  };
  const p = withMockedFetch(async () => {
    const ctx = new Context(update, new Api(new Transport("fake-token")), fakeBotInfo);
    return ctx.answerCbQuery("Got it!");
  });
  await p;
  const [call] = p.calls();
  assert.match(call.url, /\/answerCallbackQuery$/);
  assert.equal((call.body as any).callback_query_id, "cbq-1");
  assert.equal((call.body as any).text, "Got it!");

  const ctxNoCbq = ctxFor();
  assert.throws(() => ctxNoCbq.answerCbQuery(), /No callback_query/);
});

test("ctx.chat / ctx.from / ctx.text / ctx.chatId getters reflect the underlying update", () => {
  const ctx = ctxFor({ text: "hi there" });
  assert.equal(ctx.chatId, 555);
  assert.equal(ctx.from?.id, 777);
  assert.equal(ctx.text, "hi there");
  assert.equal(ctx.chat?.type, "private");
});

test("ctx.updateType correctly identifies the active update field", () => {
  const messageCtx = ctxFor();
  assert.equal(messageCtx.updateType, "message");

  const cbqUpdate: Update = { update_id: 1, callback_query: { id: "x", from: { id: 1, is_bot: false, first_name: "A" }, chat_instance: "y" } };
  const cbqCtx = new Context(cbqUpdate, new Api(new Transport("fake-token")), fakeBotInfo);
  assert.equal(cbqCtx.updateType, "callback_query");
});

test("ctx.editText() correctly resolves message_id from callback_query.message (previously broken — sent message_id: undefined)", async () => {
  const update: Update = {
    update_id: 1,
    callback_query: {
      id: "cbq-1",
      from: { id: 2, is_bot: false, first_name: "A" },
      chat_instance: "x",
      data: "toggle",
      message: {
        message_id: 555,
        date: Date.now() / 1000,
        chat: { id: 999, type: "private", first_name: "A" },
        text: "Original text",
      },
    },
  };
  const p = withMockedFetch(async () => {
    const ctx = new Context(update, new Api(new Transport("fake-token")), fakeBotInfo);
    return ctx.editText("Updated from a button tap");
  });
  await p;
  const [call] = p.calls();
  assert.match(call.url, /\/editMessageText$/);
  assert.equal((call.body as any).chat_id, 999, "should resolve chat_id from callback_query.message.chat");
  assert.equal((call.body as any).message_id, 555, "should resolve message_id from callback_query.message — this was undefined before the fix");
});

test("ctx.deleteMessage() throws a clear error instead of crashing when nothing is resolvable", () => {
  const update: Update = { update_id: 1, inline_query: { id: "q", from: { id: 1, is_bot: false, first_name: "A" }, query: "", offset: "" } };
  const ctx = new Context(update, new Api(new Transport("fake-token")), fakeBotInfo);
  assert.throws(() => ctx.deleteMessage(), /no message to delete/);
});

test("ctx.editCaption() / ctx.editMedia() / ctx.editReplyMarkup() also resolve from callback_query context", async () => {
  const update: Update = {
    update_id: 1,
    callback_query: {
      id: "cbq-2",
      from: { id: 2, is_bot: false, first_name: "A" },
      chat_instance: "x",
      message: { message_id: 42, date: Date.now() / 1000, chat: { id: 100, type: "private", first_name: "A" } },
    },
  };

  const p1 = withMockedFetch(async () => new Context(update, new Api(new Transport("fake-token")), fakeBotInfo).editReplyMarkup(undefined));
  await p1;
  assert.equal((p1.calls()[0].body as any).message_id, 42);

  const p2 = withMockedFetch(async () => new Context(update, new Api(new Transport("fake-token")), fakeBotInfo).editCaption("New caption"));
  await p2;
  assert.equal((p2.calls()[0].body as any).message_id, 42);
});

test("ctx.chat / ctx.chatId resolve for chat_join_request and my_chat_member updates (previously undefined)", () => {
  const joinRequestUpdate: Update = {
    update_id: 1,
    chat_join_request: {
      chat: { id: 777, type: "supergroup", title: "Test Group" },
      from: { id: 2, is_bot: false, first_name: "Applicant" },
      user_chat_id: 2,
      date: Date.now() / 1000,
    },
  };
  const ctx1 = new Context(joinRequestUpdate, new Api(new Transport("fake-token")), fakeBotInfo);
  assert.equal(ctx1.chatId, 777, "ctx.chatId should resolve for chat_join_request — was undefined before the fix");
  assert.equal(ctx1.from?.id, 2);

  const myChatMemberUpdate: Update = {
    update_id: 1,
    my_chat_member: {
      chat: { id: 888, type: "channel", title: "Test Channel" },
      from: { id: 3, is_bot: false, first_name: "Admin" },
      date: Date.now() / 1000,
      old_chat_member: { status: "left", user: fakeBotInfo },
      new_chat_member: { status: "member", user: fakeBotInfo },
    },
  };
  const ctx2 = new Context(myChatMemberUpdate, new Api(new Transport("fake-token")), fakeBotInfo);
  assert.equal(ctx2.chatId, 888, "ctx.chatId should resolve for my_chat_member — was undefined before the fix");
  assert.equal(ctx2.from?.id, 3);
});

test("ctx.reply() now works from a chat_join_request update, since chatId resolves correctly", async () => {
  const update: Update = {
    update_id: 1,
    chat_join_request: {
      chat: { id: 555, type: "supergroup", title: "G" },
      from: { id: 9, is_bot: false, first_name: "U" },
      user_chat_id: 9,
      date: Date.now() / 1000,
    },
  };
  const p = withMockedFetch(async () => new Context(update, new Api(new Transport("fake-token")), fakeBotInfo).reply("Welcome!"));
  await p;
  assert.equal((p.calls()[0].body as any).chat_id, 555);
});
test("ctx.reply() throws a clear error when there is no chat to reply to", () => {
  const inlineQueryUpdate: Update = { update_id: 1, inline_query: { id: "q1", from: { id: 1, is_bot: false, first_name: "A" }, query: "", offset: "" } };
  const ctx = new Context(inlineQueryUpdate, new Api(new Transport("fake-token")), fakeBotInfo);
  assert.throws(() => ctx.reply("hi"), /no chat to reply to/);
});
