import { test } from "node:test";
import assert from "node:assert/strict";
import { Keyboard } from "../src/keyboard";

test("InlineKeyboardBuilder produces rows correctly with row()", () => {
  const kb = Keyboard.inline().button("A", "a").button("B", "b").row().button("C", "c").build();
  assert.deepEqual(kb, {
    inline_keyboard: [
      [{ text: "A", callback_data: "a" }, { text: "B", callback_data: "b" }],
      [{ text: "C", callback_data: "c" }],
    ],
  });
});

test("InlineKeyboardBuilder supports url/webApp/switchInline/pay button types", () => {
  const kb = Keyboard.inline()
    .url("Docs", "https://example.com")
    .row()
    .webApp("Open", "https://example.com/app")
    .row()
    .switchInline("Search", "query")
    .row()
    .pay("Buy")
    .build();
  assert.deepEqual(kb.inline_keyboard, [
    [{ text: "Docs", url: "https://example.com" }],
    [{ text: "Open", web_app: { url: "https://example.com/app" } }],
    [{ text: "Search", switch_inline_query: "query" }],
    [{ text: "Buy", pay: true }],
  ]);
});

test("InlineKeyboardBuilder drops trailing empty rows from unnecessary row() calls", () => {
  const kb = Keyboard.inline().button("Only", "x").row().row().build();
  assert.equal(kb.inline_keyboard.length, 1, "empty trailing rows should be filtered out");
});

test("ReplyKeyboardBuilder builds rows and respects resize/oneTime/placeholder options", () => {
  const kb = Keyboard.reply().text("Yes").text("No").row().requestContact("Share contact").build({
    resize: true,
    oneTime: true,
    placeholder: "Choose one",
  });
  assert.deepEqual(kb.keyboard, [[{ text: "Yes" }, { text: "No" }], [{ text: "Share contact", request_contact: true }]]);
  assert.equal(kb.resize_keyboard, true);
  assert.equal(kb.one_time_keyboard, true);
  assert.equal(kb.input_field_placeholder, "Choose one");
});

test("ReplyKeyboardBuilder defaults resize_keyboard to true when not specified", () => {
  const kb = Keyboard.reply().text("Hi").build();
  assert.equal(kb.resize_keyboard, true);
});

test("InlineKeyboardBuilder.urlButton() is an alias for .url()", () => {
  const kb = Keyboard.inline().urlButton("Join Channel", "https://t.me/example").build();
  assert.deepEqual(kb.inline_keyboard[0][0], { text: "Join Channel", url: "https://t.me/example" });
});

test("Keyboard.remove() and Keyboard.forceReply() produce the expected shapes", () => {
  assert.deepEqual(Keyboard.remove(), { remove_keyboard: true, selective: false });
  assert.deepEqual(Keyboard.remove(true), { remove_keyboard: true, selective: true });
  assert.deepEqual(Keyboard.forceReply("Type here"), { force_reply: true, input_field_placeholder: "Type here" });
});

test("InlineKeyboardBuilder.button() accepts style and icon_custom_emoji_id", () => {
  const kb = Keyboard.inline().button("Danger!", "d", { style: "danger", icon_custom_emoji_id: "5368324170671202286" }).build();
  assert.deepEqual(kb.inline_keyboard[0][0], {
    text: "Danger!",
    callback_data: "d",
    style: "danger",
    icon_custom_emoji_id: "5368324170671202286",
  });
});

test("InlineKeyboardBuilder.copyText() produces a copy_text button", () => {
  const kb = Keyboard.inline().copyText("Copy code", "AB12-CD34").build();
  assert.deepEqual(kb.inline_keyboard[0][0], { text: "Copy code", copy_text: { text: "AB12-CD34" } });
});

test("ReplyKeyboardBuilder.text() accepts style and icon_custom_emoji_id", () => {
  const kb = Keyboard.reply().text("Primary", { style: "primary" }).build();
  assert.deepEqual(kb.keyboard[0][0], { text: "Primary", style: "primary" });
});
