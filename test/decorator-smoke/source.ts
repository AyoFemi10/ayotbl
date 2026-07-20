// This file is deliberately NOT run via tsx (see test/decorators.test.ts for
// why: tsx doesn't honor experimentalDecorators). It's compiled by a real
// `tsc` invocation (see package.json's test script) and run with plain
// `node`, to prove real npm consumers — who get tsc-compiled dist/ output,
// never raw source run through tsx — actually get correct decorator
// behavior. This is the actual end-to-end proof; test/decorators.test.ts
// verifies the same logic in a tsx-compatible way for fast iteration.
import { Command, Hears, getControllerHandlers } from "../../../dist/decorators";

class TestController {
  calls: string[] = [];

  @Command("start")
  start() {
    this.calls.push("start");
  }

  @Hears(/^ping$/)
  ping() {
    this.calls.push("ping");
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
    process.exit(1);
  }
  console.log(`[ok] ${message}`);
}

const instance = new TestController();
const handlers = getControllerHandlers(instance);

assertEqual(handlers.length, 2, "real @Command/@Hears decorator syntax, compiled by tsc, registers exactly 2 handlers");

const startHandler = handlers.find((h) => h.meta.kind === "command");
assertEqual(startHandler?.meta.value, "start", "the @Command decorator captured the right command name");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(startHandler as any).fn({}, async () => {});
assertEqual(instance.calls, ["start"], "invoking the handler runs the real decorated method, bound to the instance");

console.log("\nAll real-decorator-syntax smoke tests passed (compiled by tsc, run with plain node).");
