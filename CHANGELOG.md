# Changelog

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

### How these were found
Every fix in this release came from actually trying to use `ayotbl` for something real — porting a working bot, writing documentation examples that turned out to reference a missing field, and a real deployment crash — not from more type-checking or changelog-diffing. That's a deliberate signal: static verification (diffing against telegraf's method list, the official Bot API changelog, generated SDK docs) is what got this library's *type coverage* this far, but it doesn't exercise runtime behavior. Real usage found six genuine issues that months of static work hadn't.

## 0.1.0

Initial release. Full Bot API 7.0–10.2 method and type coverage (diffed against telegraf v4's method inventory and the official Bot API changelog), three handler styles (functional/fluent/decorator), Scenes, sessions (memory + Redis), rate limiting, i18n, serverless adapters (Vercel/Lambda/Cloudflare Workers), zero runtime dependencies. Live-tested against real Telegram servers for the core happy path (commands, keyboards, callbacks, text echo, photo receipt).
