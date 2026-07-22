"use strict";
// This file is deliberately NOT run via tsx (see test/decorators.test.ts for
// why: tsx doesn't honor experimentalDecorators). It's compiled by a real
// `tsc` invocation (see package.json's test script) and run with plain
// `node`, to prove real npm consumers — who get tsc-compiled dist/ output,
// never raw source run through tsx — actually get correct decorator
// behavior. This is the actual end-to-end proof; test/decorators.test.ts
// verifies the same logic in a tsx-compatible way for fast iteration.
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("../../dist/decorators");
class TestController {
    calls = [];
    start() {
        this.calls.push("start");
    }
    ping() {
        this.calls.push("ping");
    }
}
__decorate([
    (0, decorators_1.Command)("start")
], TestController.prototype, "start", null);
__decorate([
    (0, decorators_1.Hears)(/^ping$/)
], TestController.prototype, "ping", null);
function assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.error(`FAIL: ${message}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    }
    console.log(`[ok] ${message}`);
}
async function main() {
    const instance = new TestController();
    const handlers = (0, decorators_1.getControllerHandlers)(instance);
    assertEqual(handlers.length, 2, "real @Command/@Hears decorator syntax, compiled by tsc, registers exactly 2 handlers");
    const startHandler = handlers.find((h) => h.meta.kind === "command");
    assertEqual(startHandler?.meta.value, "start", "the @Command decorator captured the right command name");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await startHandler.fn({}, async () => { });
    assertEqual(instance.calls, ["start"], "invoking the @Command handler runs the real decorated method, bound to the instance");
    const pingHandler = handlers.find((h) => h.meta.kind === "hears");
    assertEqual(String(pingHandler?.meta.value), "/^ping$/", "the @Hears decorator captured the correct RegExp");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await pingHandler.fn({}, async () => { });
    assertEqual(instance.calls, ["start", "ping"], "invoking the @Hears handler runs the real decorated method, bound to the instance");
    console.log("\nAll real-decorator-syntax smoke tests passed (compiled by tsc, run with plain node).");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
