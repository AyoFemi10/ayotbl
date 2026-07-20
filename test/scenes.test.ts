import { test } from "node:test";
import assert from "node:assert/strict";
import { Composer } from "../src/composer";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import { session, MemorySessionStore } from "../src/session";
import { Stage, WizardScene } from "../src/scenes";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot", username: "test_bot" };
const fakeApi = new Api(new Transport("fake-token"));

function makeUpdate(text: string): Update {
  const message: Message = {
    message_id: Math.floor(Math.random() * 100000),
    date: Date.now() / 1000,
    chat: { id: 555, type: "private", first_name: "Alice" },
    from: { id: 777, is_bot: false, first_name: "Alice" },
    text,
  };
  return { update_id: Math.floor(Math.random() * 100000), message };
}

function ctxFor(update: Update): Context {
  return new Context(update, fakeApi, fakeBotInfo);
}

test("WizardScene collects answers across separate updates and leaves the scene at the end", async () => {
  const replies: string[] = [];

  // Stub ctx.reply so we don't hit the network — just record what would have been sent.
  const originalReply = Context.prototype.reply;
  (Context.prototype as any).reply = async function (this: Context, text: string) {
    replies.push(text);
    return {} as any;
  };

  try {
    const store = new MemorySessionStore();
    const signup = new WizardScene<Context>("signup", [
      async (ctx) => { await ctx.reply("What's your name?"); await ctx.wizard.next(); },
      async (ctx) => { ctx.wizard.state.name = ctx.text; await ctx.reply("How old are you?"); await ctx.wizard.next(); },
      async (ctx) => {
        ctx.wizard.state.age = ctx.text;
        await ctx.reply(`Thanks ${ctx.wizard.state.name}, age ${ctx.wizard.state.age}!`);
        await ctx.scene.leave();
      },
    ]);

    const composer = new Composer<Context>();
    composer.use(session({ store }));
    composer.use(new Stage<Context>([signup]).middleware());
    composer.command("signup", (ctx) => ctx.scene!.enter("signup"));

    // Turn 1: user runs /signup -> scene enters, step 0 runs (asks for name)
    await composer.handle(ctxFor(makeUpdate("/signup")));
    assert.deepEqual(replies, ["What's your name?"], "entering the scene should only ask the first question, not jump ahead");

    // Turn 2: user replies with their name -> step 1 runs (reads name, asks for age)
    await composer.handle(ctxFor(makeUpdate("Grace Hopper")));
    assert.deepEqual(replies, ["What's your name?", "How old are you?"], "step 1 should process the name and ask exactly one more question, not two");

    // Turn 3: user replies with age -> step 2 runs (reads age, confirms, leaves scene)
    await composer.handle(ctxFor(makeUpdate("85")));
    assert.deepEqual(replies, ["What's your name?", "How old are you?", "Thanks Grace Hopper, age 85!"]);

    // Turn 4: scene should be over — /signup runs the flow fresh again, plain text should not re-trigger it
    replies.length = 0;
    await composer.handle(ctxFor(makeUpdate("hello again")));
    assert.deepEqual(replies, [], "after leaving the scene, unrelated text shouldn't be swallowed by a stale scene");
  } finally {
    Context.prototype.reply = originalReply;
  }
});

test("session() persists per-chat state across separate Context instances", async () => {
  const store = new MemorySessionStore<{ count: number }>();
  const composer = new Composer<Context>();
  composer.use(session({ store, defaultSession: () => ({ count: 0 }) }));
  composer.use((ctx) => {
    (ctx.session as { count: number }).count += 1;
  });

  await composer.handle(ctxFor(makeUpdate("a")));
  await composer.handle(ctxFor(makeUpdate("b")));
  await composer.handle(ctxFor(makeUpdate("c")));

  const stored = await store.get("555"); // chat id used above
  assert.equal(stored?.count, 3, "three separate updates to the same chat should share one persisted session");
});
