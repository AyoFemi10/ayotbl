import { test } from "node:test";
import assert from "node:assert/strict";
import { createI18n } from "../src/i18n";
import { Context } from "../src/context";
import { Api, Transport } from "../src/client";
import type { Update, User, Message } from "../src/types";

const fakeBotInfo: User = { id: 1, is_bot: true, first_name: "TestBot" };
const fakeApi = new Api(new Transport("fake-token"));

function ctxWithLanguage(languageCode: string | undefined): Context {
  const message: Message = {
    message_id: 1,
    date: Date.now() / 1000,
    chat: { id: 1, type: "private", first_name: "Alice" },
    from: { id: 2, is_bot: false, first_name: "Alice", language_code: languageCode },
  };
  const update: Update = { update_id: 1, message };
  return new Context(update, fakeApi, fakeBotInfo);
}

test("createI18n translates using a plain string dictionary entry", () => {
  const i18n = createI18n({ defaultLocale: "en", locales: { en: { hi: "Hello" }, fr: { hi: "Bonjour" } } });
  assert.equal(i18n.translate("en", "hi"), "Hello");
  assert.equal(i18n.translate("fr", "hi"), "Bonjour");
});

test("createI18n translates using a function dictionary entry with interpolation", () => {
  const i18n = createI18n({
    defaultLocale: "en",
    locales: { en: { greet: (name: string) => `Hello, ${name}!` } },
  });
  assert.equal(i18n.translate("en", "greet", "Alice"), "Hello, Alice!");
});

test("createI18n falls back to defaultLocale when the requested locale is missing", () => {
  const i18n = createI18n({ defaultLocale: "en", locales: { en: { hi: "Hello" } } });
  assert.equal(i18n.translate("de", "hi"), "Hello");
  assert.equal(i18n.translate(undefined, "hi"), "Hello");
});

test("createI18n returns the key itself when the translation is missing entirely", () => {
  const i18n = createI18n({ defaultLocale: "en", locales: { en: {} } });
  assert.equal(i18n.translate("en", "nonexistent_key"), "nonexistent_key");
});

test("i18n middleware attaches ctx.t() derived from the user's language_code", async () => {
  const i18n = createI18n({
    defaultLocale: "en",
    locales: { en: { hi: "Hello" }, fr: { hi: "Bonjour" } },
  });
  const mw = i18n.middleware();

  const ctxFr = ctxWithLanguage("fr") as Context & { t: (key: string) => string };
  await mw(ctxFr, async () => {});
  assert.equal(ctxFr.t("hi"), "Bonjour");

  const ctxUnknown = ctxWithLanguage("xx") as Context & { t: (key: string) => string };
  await mw(ctxUnknown, async () => {});
  assert.equal(ctxUnknown.t("hi"), "Hello", "unrecognized locale should fall back to defaultLocale");
});
