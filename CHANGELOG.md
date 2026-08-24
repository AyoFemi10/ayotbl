# Changelog

## 0.2.1 — Bug fixes from live testing

### Fixed (confirmed by real Telegram 400 errors)
- **`InputRichMessageMedia` was missing the required `id` field** — Telegram rejected it with `Can't find field "id"`. Fixed: `{ id: string; type: ...; media: ... }`.
- **`InputRichBlock` media fields (`photo`/`video`/`audio`/`animation`/`voice_note`) were typed as `InputFile`**, but Telegram expects `{ id: string }` — a reference to a declared `InputRichMessage.media` entry, not an inline file. Fixed in both `types.ts` and the `RichBlocksBuilder` (which now handles the id bookkeeping via `.photo()`/`.video()`/etc. convenience methods).
- **`RichMarkdownBuilder.photo()` had a dead `media` array** that was never populated — `.build()` always emitted `media: undefined`. Fixed: the markdown builder no longer emits a `media` field at all (the working path is inline `![](url)` syntax in the markdown text). The `media` field is now exclusively a blocks-builder concern, properly.
- **`RichBlocksBuilder` had no way to declare top-level media entries** — `.build()` never emitted `media`. Fixed: `.photo()`/`.video()`/`.audio()`/`.animation()`/`.voiceNote()` convenience methods declare and reference media correctly, and a `.media(type, file)` escape hatch is available for raw blocks. A dev-time check throws a clear error if a raw block references an undeclared media id, instead of letting Telegram's 400 be the first signal.
- **`bot.privateChat(bot.command(...))` / `bot.admin(bot.command(...))` etc. didn't work** — `command()`/`hears()`/`action()` return `this` (the Composer instance), not a `Middleware`. Passing `this` to a gate silently did the wrong thing. Fixed by adding `Composer.command()`/`.hears()`/`.action()`/`.on()`/`.filter()` as static methods that build a standalone, nestable middleware. README examples updated to match.

## 0.2.0

### Fixed
- **`ctx.editText()` and `ctx.deleteMessage()` silently broke when called from inside a callback_query handler** — the single most common "user taps a button, bot edits that message" pattern. `Context` only ever resolved `message_id` from `ctx.message`, which is always `undefined` for callback_query updates; `editText()` was sending `message_id: undefined`, and `deleteMessage()` threw a raw `TypeError` when called without an explicit ID. Both now correctly resolve from `callback_query.message` too.
- **`ctx.chat` / `ctx.chatId` / `ctx.from` didn't cover several common update types** — `chat_join_request`, `my_chat_member`, `chat_member`, `chat_boost`, `removed_chat_boost`, `poll_answer`, `shipping_query`, `pre_checkout_query`. Bots handling join requests or detecting group membership changes would find `ctx.chatId` undefined and `ctx.reply()` would throw. All now resolve correctly.
- **`CallbackQuery.message`** was typed as always a full `Message`. It can be an `InaccessibleMessage` (Telegram's own type for messages older than 24h or in chats the bot no longer has full access to) — now typed as `MaybeInaccessibleMessage`, matching the real Bot API.

### Added
- `sendSticker` as a real, typed `Api` method (previously entirely absent — `ctx.replyWithSticker()` was silently falling back to the untyped `api.call()` escape hatch).
- `ctx.editCaption()`, `ctx.editMedia()`, `ctx.editReplyMarkup()` — same callback-aware message resolution as the fixed `editText()`.
- `InlineKeyboardBuilder`/`ReplyKeyboardBuilder` now accept `{ style, icon_custom_emoji_id }` on `.button()`, `.url()`, `.text()` — previously the underlying types supported button styles and custom emoji icons, but the fluent builder never exposed a way to set them.
- `InlineKeyboardBuilder.copyText()` for Bot API 7.11's clipboard-copy buttons.
- Fixed an incorrect `InlineKeyboardButton.style`/`KeyboardButton.style` value: the real values are `"primary" | "success" | "danger"` — this library had `"default"` instead of `"success"`.
- **New composer middleware helpers**, matching telegraf's most commonly used gates: `chatType()`, `privateChat()`, `groupChat()`, `admin()`, `creator()` — restrict handlers by chat type or by sender role without hand-rolling a `getChatMember` check every time.
- **`Message.business_connection_id`** was missing entirely — without it, a bot has no way to know which business connection an incoming business message belongs to, making it impossible to correctly respond via any Business Account method. Found while fact-checking documentation examples, not by request.
- 8 new tests specifically covering the callback_query resolution bugs above, plus tests for the new middleware helpers (including `admin()`/`creator()` verified against mocked `getChatMember` responses).
- CI: GitHub Actions workflow running the full test suite on Node 18/20/22.
- `CHANGELOG.md` (this file).
- **`InlineKeyboardBuilder.urlButton()`** added as an alias for `.url()` — found via a real deployment crashing with `kb.urlButton is not a function`. Not a documented method name, but a plausible enough guess that it's cheaper to accept than to let it keep breaking bots.
- A full documentation website (`docs/index.html`) covering every guide topic plus a version-by-version Bot API 7.0–10.2 walkthrough with real, verified code examples.
- **Real streaming file uploads.** `sendPhoto`/`sendDocument`/etc. previously only accepted in-memory `Buffer`s — a local file path (`{ source: './photo.jpg' }`) crashed with a clear "not implemented" error, and a real Node stream crashed the same way. Both now work, and neither buffers the whole file into memory: large uploads are streamed via a hand-built multipart encoder. Buffer uploads are untouched — they still use the original, already-proven `FormData` path, so there's no regression risk to what was already working. Verified with real runtime tests (an actual temp file on disk, an actual multi-chunk Node `Readable`), not just type-checked.
- **Entity/content filters** (`src/filters.ts`): `mention()`, `hashtag()`, `cashtag()`, `url()`, `textLink()`, `textMention()`, `phone()`, `email()`, `botCommand()`, `spoiler()`, `customEmoji()`, and `reaction(emoji?)`. Each maps to exactly one real Bot API entity type rather than merging similar-sounding ones. `Composer.on()` now also accepts a predicate directly (`bot.on(mention(), ...)`), matching telegraf's filter ergonomics, alongside its existing string-based form.
- **`SqliteSessionStore`** (`src/session-sqlite.ts`) — duck-typed against `better-sqlite3`'s synchronous API, no hard dependency, matching the existing `RedisSessionStore` pattern. Serves self-hosted bots that don't want to run Redis.
- **A real, auto-generated API reference** (`docs/api-reference.html`, via `npm run docs:api`) — every method signature and doc comment is parsed directly out of `src/client.ts`, not hand-transcribed, so it can't silently drift out of sync. 187 methods across 21 categories, spot-checked against source after generation.

### How these were found
Every fix in this release came from actually trying to use `ayotbl` for something real — porting a working bot, writing documentation examples that turned out to reference a missing field, and a real deployment crash — not from more type-checking or changelog-diffing. That's a deliberate signal: static verification (diffing against telegraf's method list, the official Bot API changelog, generated SDK docs) is what got this library's *type coverage* this far, but it doesn't exercise runtime behavior. Real usage found six genuine issues that months of static work hadn't.

## 0.1.0

Initial release. Full Bot API 7.0–10.2 method and type coverage (diffed against telegraf v4's method inventory and the official Bot API changelog), three handler styles (functional/fluent/decorator), Scenes, sessions (memory + Redis), rate limiting, i18n, serverless adapters (Vercel/Lambda/Cloudflare Workers), zero runtime dependencies. Live-tested against real Telegram servers for the core happy path (commands, keyboards, callbacks, text echo, photo receipt).
