/**
 * Additional scene tests covering flows not exercised in scenes.test.ts:
 *   - selectStep() jumps back to a specific step immediately
 *   - re-entering a scene mid-flow resets state from scratch
 *   - scene.current reflects active/inactive state correctly
 *   - handler outside a scene still runs after the scene leaves
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Composer } from "../src/composer";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import { session, MemorySessionStore } from "../src/session";
import { Stage, WizardScene, WizardContext } from "../src/scenes";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot", username: "test_bot" };
const fakeApi = new Api(new Transport("fake-token"));

function makeUpdate(text: string, chatId = 555): Update {
  const message: Message = {
    message_id: Math.floor(Math.random() * 100000),
    date: Date.now() / 1000,
    chat: { id: chatId, type: "private", first_name: "Alice" },
    from: { id: 777, is_bot: false, first_name: "Alice" },
    text,
  };
  return { update_id: Math.floor(Math.random() * 100000), message };
}

function ctxFor(update: Update): Context {
  return new Context(update, fakeApi, fakeBotInfo);
}

/** Stubs ctx.reply so we capture what the bot "sends" without hitting the network. */
function withReplyStub(fn: () => Promise<void>): Promise<string[]> {
  return new Promise(async (resolve, reject) => {
    const replies: string[] = [];
    const original = Context.prototype.reply;
    (Context.prototype as any).reply = async function (_text: string) {
      replies.push(_text);
      return {} as any;
    };
    try {
      await fn();
      resolve(replies);
    } catch (e) {
      reject(e);
    } finally {
      Context.prototype.reply = original;
    }
  });
}

test("selectStep() jumps to the specified step immediately and runs it in the same update", async () => {
  const stepped: number[] = [];

  const scene = new WizardScene<Context>("jump-test", [
    async (ctx) => { stepped.push(0); await ctx.wizard.selectStep(2); },
    async (ctx) => { stepped.push(1); await ctx.wizard.next(); },
    async (ctx) => { stepped.push(2); await ctx.scene.leave(); },
  ]);

  const store = new MemorySessionStore();
  const composer = new Composer<Context>();
  composer.use(session({ store }));
  composer.use(new Stage<Context>([scene]).middleware());
  composer.command("start", (ctx) => ctx.scene!.enter("jump-test"));

  const replies = await withReplyStub(async () => {
    // Turn 1: /start → enters scene, step 0 runs, calls selectStep(2), step 2 runs immediately
    await composer.handle(ctxFor(makeUpdate("/start")));
  });

  assert.deepEqual(stepped, [0, 2], "selectStep(2) should skip step 1 and run step 2 in the same turn");
  void replies; // reply count not the focus here
});

test("re-entering a scene mid-flow resets cursor and state to zero", async () => {
  const replies: string[] = [];
  const original = Context.prototype.reply;
  (Context.prototype as any).reply = async function (text: string) { replies.push(text); return {} as any; };

  try {
    const store = new MemorySessionStore();
    const scene = new WizardScene<Context>("re-enter-test", [
      async (ctx) => { await ctx.reply("step 0"); await ctx.wizard.next(); },
      async (ctx) => {
        ctx.wizard.state.name = ctx.text;
        // Re-enter the scene from within a step — this should reset cursor + state
        await ctx.scene.enter("re-enter-test");
      },
      async (ctx) => { await ctx.reply(`done: ${ctx.wizard.state.name}`); await ctx.scene.leave(); },
    ]);

    const composer = new Composer<Context>();
    composer.use(session({ store }));
    composer.use(new Stage<Context>([scene]).middleware());
    composer.command("go", (ctx) => ctx.scene!.enter("re-enter-test"));

    // Turn 1: /go → enter scene, step 0 fires → asks "step 0"
    await composer.handle(ctxFor(makeUpdate("/go")));
    assert.equal(replies.at(-1), "step 0");

    // Turn 2: reply triggers step 1, which calls scene.enter() — resetting to step 0
    await composer.handle(ctxFor(makeUpdate("Alice")));
    assert.equal(replies.at(-1), "step 0", "re-entering from step 1 should restart at step 0");

    // Turn 3: step 0 again — advance past it
    await composer.handle(ctxFor(makeUpdate("anything")));

    // Turn 4: step 1 again, this time provide "Bob" and let it reach step 2
    await composer.handle(ctxFor(makeUpdate("Bob")));
    // step 1 re-enters again, step 0 fires
    assert.equal(replies.at(-1), "step 0");
  } finally {
    Context.prototype.reply = original;
  }
});

test("scene.current is the scene id while inside the scene and undefined after leaving", async () => {
  let currentInsideStep: string | undefined = "not-set";
  let currentAfterLeave: string | undefined = "not-set";

  const store = new MemorySessionStore();
  const scene = new WizardScene<Context>("current-test", [
    async (ctx) => {
      // scene.current must be a live getter — reads from sess.current after enter() set it
      currentInsideStep = (ctx as WizardContext<Context>).scene.current;
      await (ctx as WizardContext<Context>).scene.leave();
    },
  ]);

  const composer = new Composer<Context>();
  composer.use(session({ store }));
  composer.use(new Stage<Context>([scene]).middleware());
  composer.command("go", async (ctx) => {
    await ctx.scene!.enter("current-test");
  });

  // A plain handler that runs after the scene has left
  composer.use((ctx) => {
    currentAfterLeave = (ctx as WizardContext<Context>).scene?.current;
  });

  await composer.handle(ctxFor(makeUpdate("/go")));
  assert.equal(currentInsideStep, "current-test", "scene.current should be the scene id while inside the step (live getter, not a stale snapshot)");

  // Next plain update — scene is over, should fall through to the plain handler
  await composer.handle(ctxFor(makeUpdate("hello")));
  assert.equal(currentAfterLeave, undefined, "scene.current should be undefined after the scene has left");
});

test("two concurrent users in different chats have independent scene state", async () => {
  const replies: Record<number, string[]> = { 100: [], 200: [] };
  const original = Context.prototype.reply;
  (Context.prototype as any).reply = async function (this: Context, text: string) {
    const chatId = this.chatId ?? 0;
    replies[chatId] ??= [];
    replies[chatId].push(text);
    return {} as any;
  };

  try {
    const store = new MemorySessionStore();
    const scene = new WizardScene<Context>("parallel-test", [
      async (ctx) => { await ctx.reply("q1"); await ctx.wizard.next(); },
      async (ctx) => { ctx.wizard.state.answer = ctx.text; await ctx.reply(`a: ${ctx.wizard.state.answer}`); await ctx.scene.leave(); },
    ]);

    const composer = new Composer<Context>();
    composer.use(session({ store }));
    composer.use(new Stage<Context>([scene]).middleware());
    composer.command("go", (ctx) => ctx.scene!.enter("parallel-test"));

    // Both users enter the scene
    await composer.handle(ctxFor(makeUpdate("/go", 100)));
    await composer.handle(ctxFor(makeUpdate("/go", 200)));

    // User 100 answers first
    await composer.handle(ctxFor(makeUpdate("apple", 100)));
    // User 200 answers with something different
    await composer.handle(ctxFor(makeUpdate("banana", 200)));

    assert.equal(replies[100].at(-1), "a: apple", "user 100 should see their own answer, not user 200's");
    assert.equal(replies[200].at(-1), "a: banana", "user 200 should see their own answer, not user 100's");
  } finally {
    Context.prototype.reply = original;
  }
});
