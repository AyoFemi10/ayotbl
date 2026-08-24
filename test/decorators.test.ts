import { test } from "node:test";
import assert from "node:assert/strict";
import { Command, Hears, Action, On, getControllerHandlers } from "../src/decorators";
import { Context } from "../src/context";

/**
 * IMPORTANT: these tests call the decorator factory functions (Command(),
 * Hears(), etc.) directly as plain functions with legacy-style
 * (target, propertyKey) arguments, instead of using `@Command(...)` syntax
 * on the class below.
 *
 * Why: `tsx` (used to run this test suite) transforms decorators using the
 * new ECMAScript Stage 3 decorator semantics regardless of this project's
 * `experimentalDecorators: true` tsconfig setting — confirmed by direct
 * testing (a real `tsc` build honors the flag correctly; `tsx` does not).
 * Under the Stage 3 transform, the second argument decorators receive is a
 * context *object* (`{ kind, name, ... }`), not a plain `propertyKey`
 * string — which silently breaks this module's registry lookup (it keys
 * off `target.constructor`, and under Stage 3 semantics `target` is the
 * method itself, not the prototype).
 *
 * This is NOT a bug in the shipped library: a real `tsc` build (what npm
 * consumers actually get in dist/) produces correct legacy decorator
 * behavior — verified separately. It's specifically a blind spot in this
 * test runner's decorator transform, worked around here by testing the
 * exact function calls a real `tsc`-compiled `@Command("start")` produces,
 * without going through `tsx`'s broken transform of the `@` syntax itself.
 */

class TestController {
  calls: string[] = [];
  start(ctx: Context) { this.calls.push("start"); }
  help(ctx: Context) { this.calls.push("help"); }
  ping(ctx: Context) { this.calls.push("ping"); }
  confirmed(ctx: Context) { this.calls.push("confirmed"); }
  photo(ctx: Context) { this.calls.push("photo"); }
}

// Apply decorators the way compiled legacy-decorator output actually does:
// decorator(target.prototype, propertyKey, descriptor) at class-definition time.
Command("start")(TestController.prototype, "start", Object.getOwnPropertyDescriptor(TestController.prototype, "start")!);
Command(["help", "h"])(TestController.prototype, "help", Object.getOwnPropertyDescriptor(TestController.prototype, "help")!);
Hears(/^ping$/)(TestController.prototype, "ping", Object.getOwnPropertyDescriptor(TestController.prototype, "ping")!);
Action("confirm:yes")(TestController.prototype, "confirmed", Object.getOwnPropertyDescriptor(TestController.prototype, "confirmed")!);
On("photo")(TestController.prototype, "photo", Object.getOwnPropertyDescriptor(TestController.prototype, "photo")!);

test("decorators register the correct handler kinds and values", () => {
  const instance = new TestController();
  const handlers = getControllerHandlers(instance);

  const byKind = Object.fromEntries(handlers.map((h) => [h.meta.kind + ":" + JSON.stringify(h.meta.value), h]));
  assert.ok(byKind['command:"start"']);
  assert.ok(byKind['command:["help","h"]']);
  assert.ok(handlers.some((h) => h.meta.kind === "hears"));
  assert.ok(handlers.some((h) => h.meta.kind === "action" && h.meta.value === "confirm:yes"));
  assert.ok(handlers.some((h) => h.meta.kind === "on" && h.meta.value === "photo"));
});

test("decorator handler functions call through to the original instance method, preserving `this`", async () => {
  const instance = new TestController();
  const handlers = getControllerHandlers(instance);
  const startHandler = handlers.find((h) => h.meta.kind === "command" && h.meta.value === "start")!;

  await startHandler.fn({} as Context, async () => {});

  assert.deepEqual(instance.calls, ["start"], "the decorated method should run bound to the controller instance, mutating its own state");
});

test("invoking one controller instance's handler does not mutate a different instance's state", async () => {
  const a = new TestController();
  const b = new TestController();

  const startHandlerA = getControllerHandlers(a).find((h) => h.meta.kind === "command" && h.meta.value === "start")!;
  await startHandlerA.fn({} as Context, async () => {});

  assert.deepEqual(a.calls, ["start"]);
  assert.deepEqual(b.calls, [], "instance b should be untouched — the handler registry is per-class, but execution is bound per-instance");
});
