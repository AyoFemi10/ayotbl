// Plain JS, CommonJS require — no TypeScript, no tsx, no ts-node.
// This is what a JS-only bot author's code actually looks like.
const assert = require("node:assert/strict");
const { Bot, Keyboard, RichMessage, Composer } = require("../dist/index.js");

console.log("Loaded ayotbl from dist/index.js via plain require() — no TypeScript involved.");

// Bot constructs without throwing (no network call happens until launch()/api calls).
const bot = new Bot("123456:fake-token-for-smoke-test");
assert.ok(bot instanceof Composer, "Bot should extend Composer");
assert.equal(typeof bot.command, "function");
assert.equal(typeof bot.api.sendMessage, "function");
console.log("[ok] Bot instantiates and exposes command()/api.sendMessage() from plain JS");

// Keyboard builder works with no type annotations at all.
const kb = Keyboard.inline().button("Yes", "y").button("No", "n").row().button("Cancel", "c").build();
assert.deepEqual(kb, {
  inline_keyboard: [
    [
      { text: "Yes", callback_data: "y" },
      { text: "No", callback_data: "n" },
    ],
    [{ text: "Cancel", callback_data: "c" }],
  ],
});
console.log("[ok] Keyboard.inline() builder produces the expected structure from plain JS");

// RichMessage builder likewise.
const rich = RichMessage.markdown().text("Status:").checklist(["a", "b"]).build();
assert.match(rich.markdown, /Status:/);
assert.match(rich.markdown, /- \[ \] a/);
console.log("[ok] RichMessage.markdown() builder works from plain JS");

console.log("\nAll plain-JS smoke tests passed.");
