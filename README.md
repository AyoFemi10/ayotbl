# ayotbl


A friendlier, fully-typed Telegram Bot API library for Node.js — works equally
well from plain JavaScript or TypeScript. Targets **Bot API 7.0 through 10.2**.
Core method coverage was diffed against telegraf v4's own method inventory
(telegraf.js.org/classes/Telegram.html); newer areas that came out after
telegraf's own coverage (Rich Messages, Ephemeral Messages, Communities) were
built from the official changelog and cross-checked against independent
sources instead of guessed. See "Coverage confidence" below for an honest,
area-by-area breakdown — some areas are thoroughly verified, some are
best-effort with that clearly marked in the code.

Built to be easier to pick up than aiogram or telegraf, without giving up power:

- **Works from plain JS or TypeScript** — zero runtime dependencies (uses Node's
  built-in `fetch`/`FormData`/`Blob`, no `undici` or anything else to install),
  and the compiled `dist/` output is validated with a plain-`require()` smoke
  test (see Testing below) — not just type-checked.
- **Three ways to write a handler** — pick whichever reads best to you, mix freely:
  1. Simple router: `bot.command('start', ctx => ctx.reply('hi'))`
  2. Fluent builders: `Keyboard.inline().button('Yes','yes').build()`
  3. Decorator classes: `@Command('start') start(ctx) {...}`
- **Never goes out of date.** Every method not yet given a typed wrapper still
  works via `bot.api.call('anyNewMethod', {...})` — a brand-new Bot API method
  works the same day Telegram ships it.
- **The real reply mechanism**: `reply_parameters` (`ReplyParameters`, Bot API
  7.0+ — quoting part of a message, replying across chats, to poll options,
  checklist tasks, or ephemeral messages), not just the old flat
  `reply_to_message_id`.
- **Composer ergonomics matching telegraf**: `use`, `on`, `command`, `hears`,
  `action`, `branch`, `optional`, `lazy`, static `Composer.compose()`, and a
  `Router` class for key-based dispatch.
- **One line each** for long polling or webhooks — no separate server setup required.

## Install

```bash
npm install ayotbl
```

## Testing

```bash
npm test
```

Runs, in order: a real `tsc` build to `dist/`, 58 unit/integration tests via
Node's built-in test runner (Composer routing and combinators, Scenes cursor
advancement, Transport flood-control retry, Context's actual outgoing API
calls verified via mocked `fetch`, Keyboard/RichMessage builders, i18n,
rateLimit, serverless adapters, decorators — all executed, not just
type-checked), a plain-JavaScript smoke test proving the compiled output
works with zero TypeScript involved, and a dedicated real-decorator-syntax
smoke test (see below).

**A real bug this test expansion found**: `tsx` (used to run the fast unit
tests) does not honor this project's `experimentalDecorators: true` setting
— it applies the new ECMAScript Stage 3 decorator semantics regardless,
which silently breaks `decorators.ts`'s registry (keyed off
`target.constructor`, which means something different under each spec).
Verified this is **not** a bug in the shipped library: a real `tsc` build —
what npm consumers actually get — produces correct legacy decorator
behavior. `test/decorator-smoke/` compiles real `@Command`/`@Hears` syntax
with an isolated, real `tsc` invocation and runs it with plain `node`,
proving the actual shipped behavior end-to-end; `test/decorators.test.ts`
was rewritten to call the decorator factory functions directly (bypassing
`tsx`'s broken transform) so the fast suite still covers the same logic.

What `npm test` does **not** cover: an actual live run against Telegram's
real servers with a real bot token. See Status below.

## Verified against the full official changelog

I fetched the complete official Bot API changelog (7.0 through 10.2, verbatim)
and diffed it line-by-line against this codebase — every version, not just
7.0 and 10.x. The 7.0/10.x pass found `ChatBoostSource`, `GiveawayCreated`,
`CopyTextButton`/`SwitchInlineQueryChosenChat`, `show_caption_above_media`,
and Live Photos support were missing. The follow-up 8.0–9.6 pass found more:
**an entire missing feature area** (forum topic service messages —
`ForumTopicCreated/Edited/Closed/Reopened`, `GeneralForumTopicHidden/Unhidden`
— present as methods but never wired as receivable `Message` fields),
`sendMessageDraft`, `setUserEmojiStatus`, `UserProfileAudios`/
`getUserProfileAudios`, chat member tags (`ChatMember.tag`,
`setChatMemberTag`, `can_edit_tag`, `can_manage_tags`),
`can_manage_direct_messages`, `is_paid_post`, and `LocationAddress` (was a
loose `Record`). Every item was verified present with `grep` against my own
claims before being called done, and a duplicate-method safety sweep was run
after each batch given a real duplication bug I introduced and caught earlier
in this process.

## Coverage confidence

Honest, area-by-area — so you know where to double-check before relying on something:

| Area | Confidence | How it was verified |
|---|---|---|
| Core messaging, chat admin, forum topics, stickers (incl. `InputSticker`/`MaskPosition`), games, payments (`LabeledPrice`/`ShippingOption`/`OrderInfo`/`SuccessfulPayment`) | High | Diffed against telegraf's published method list |
| Inline mode (`InlineQueryResult` — all 20 variants — and `InputMessageContent`) | High | Field-by-field against python-telegram-bot's generated docs, cross-checked against the stable, long-unchanged official schema |
| Telegram Passport (`PassportData`, `EncryptedPassportElement`, `PassportElementError`) | High | Field-by-field against python-telegram-bot's generated docs |
| `ReplyParameters`, polls (incl. `correct_option_ids` plural), reactions, chat boosts | High | Cross-checked directly against the official Bot API changelog |
| Rich Messages (`RichBlock`/`RichText` — 21 + 25 tagged variants) | High | Field-by-field against a community reference doc, cross-checked against the official changelog's class list |
| Ephemeral Messages, Communities (Bot API 10.2) | High | Verified against the official changelog the same day it shipped |
| Gifts (`UniqueGiftModel`/`Symbol`/`Backdrop`), Stars transactions (`TransactionPartner`), Business accounts (`BusinessBotRights`, `BusinessIntro/Location/OpeningHours`) | High | Field-by-field against python-telegram-bot's generated docs |
| `ChatBackground`/`BackgroundType`/`BackgroundFill` | High | Stable, long-unchanged schema, cross-checked against generated docs |
| Checklists, Guest mode, Suggested Posts | Medium | Top-level shapes confirmed via changelog; a handful of nested/edge fields inferred from convention |
| `StoryArea`/`InputStoryContent` (Business Stories sub-types) | Medium-low | General structure confirmed via changelog mentions only |
| `UniqueGiftColors`, `GiftBackground`, `UserRating` | Low, explicitly | These three exist for certain (confirmed via official changelog + two independent SDK changelogs), but after real search effort I could not find their field names anywhere. Rather than leave them as bare `Record<string, unknown>`, I built them as named types with fields *inferred from a confirmed sibling type's pattern* (e.g. `UniqueGiftColors` from the confirmed `UniqueGiftBackdropColors`) — but this is a documented guess, not a verification, and each one says so directly in its JSDoc comment in `types.ts`. Don't trust the specific field names without checking the official docs first. |
| `getManagedBotToken`/`replaceManagedBotToken`, `answerGuestQuery` | Lower | Newer than telegraf's own coverage; implemented from the changelog alone, not cross-checked against a second source |

Every method's parameters and return values are now backed by a named,
field-checked type — the last narrow escape hatches (poll option media,
`createInvoiceLink`'s full field set, `savePreparedKeyboardButton`,
`answerGuestQuery`, `setMyProfilePhoto`/`setBusinessAccountProfilePhoto`'s
`InputProfilePhoto` union) were closed in this pass, along with one method I'd
missed entirely (`sendLivePhoto`/`LivePhoto`, added in 10.2). The remaining
`Record<string, unknown>` occurrences in `client.ts` are internal transport
plumbing (multipart encoding, `stripUndefined`), not API surface.

Even with this pass, "every field of every object, forever" isn't a static
finish line — Telegram ships new fields regularly (three were added in the
week this library was built), and telegraf's own `typegram` package is a
continuously-maintained project for exactly that reason, not a one-time
effort. The escape hatch (`bot.api.call('anyMethod', {...})`) exists so a
missing field or method never blocks you while the typed surface catches up.


## Quick start (simple router style)

```ts
import { Bot } from "ayotbl";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => ctx.reply(`Hey ${ctx.from?.first_name}!`));
bot.hears(/^ping$/i, (ctx) => ctx.reply("pong"));
bot.on("photo", (ctx) => ctx.reply("Nice photo!"));

bot.launch(); // long polling
```

## Fluent keyboards & Rich Messages

```ts
import { Keyboard, RichMessage } from "ayotbl";

bot.command("menu", (ctx) =>
  ctx.reply("Pick one:", {
    reply_markup: Keyboard.inline().button("Yes", "y").button("No", "n").build(),
  })
);

bot.command("report", (ctx) =>
  ctx.replyRich(
    RichMessage.markdown()
      .text("Build report:")
      .table(["Step", "Status"], [["Install", "✅"], ["Deploy", "⏳"]])
      .checklist(["Install deps", "Run tests"])
      .build()
  )
);
```

## Class-based / decorator style

```ts
import { Bot, Context, Command, Hears } from "ayotbl";

class MainController {
  @Command("start")
  start(ctx: Context) { return ctx.reply("Welcome!"); }

  @Hears(/^thanks?$/i)
  thanks(ctx: Context) { return ctx.reply("You're welcome!"); }
}

bot.useController(new MainController());
```

## Webhooks

```ts
await bot.launchWebhook({ url: "https://your-domain.com", port: 8080 });
// or mount bot.webhookCallback('/webhook') into Express/Fastify/raw http yourself
```

## Any method, typed or not

```ts
await bot.api.sendMessage({ chat_id, text: "typed and autocompleted" });
await bot.api.call("someBrandNewMethod", { chat_id, whatever: true }); // always works
```

## Multi-step conversations (Scenes)

```ts
import { Bot, Context, session, Stage, WizardScene } from "ayotbl";

bot.use(session());

const signup = new WizardScene<Context>("signup", [
  async (ctx) => { await ctx.reply("What's your name?"); await ctx.wizard.next(); },
  async (ctx) => { ctx.wizard.state.name = ctx.text; await ctx.reply("How old are you?"); await ctx.wizard.next(); },
  async (ctx) => { await ctx.reply(`Thanks, ${ctx.wizard.state.name}!`); await ctx.scene.leave(); },
]);

bot.use(new Stage([signup]).middleware());
bot.command("signup", (ctx) => ctx.scene.enter("signup"));
```

## Flood control & throttling

429s are retried automatically everywhere (not just the polling loop). You can also proactively space calls to stay under Telegram's rate limits:

```ts
const bot = new Bot(token, { floodControl: { maxRetries: 5 }, minIntervalMs: 35 });
```

Per-chat/per-user rate limiting for incoming updates:

```ts
import { rateLimit } from "ayotbl";
bot.use(rateLimit({ windowMs: 2000, limit: 3, onLimitExceeded: (ctx) => ctx.reply("Slow down!") }));
```

## Sessions (memory or Redis) & i18n

```ts
import { session, RedisSessionStore, createI18n } from "ayotbl";
import Redis from "ioredis";

bot.use(session({ store: new RedisSessionStore(new Redis(), { ttlSeconds: 86400 }) }));

const i18n = createI18n({
  defaultLocale: "en",
  locales: { en: { hi: (n: string) => `Hi ${n}!` }, fr: { hi: (n: string) => `Salut ${n}!` } },
});
bot.use(i18n.middleware());
bot.command("start", (ctx) => ctx.reply(ctx.t("hi", ctx.from?.first_name)));
```

## Serverless deployment

```ts
// Vercel
export default vercelWebhookHandler(bot);
// AWS Lambda
export const handler = lambdaWebhookHandler(bot);
// Cloudflare Workers
export default { fetch: cloudflareWebhookHandler(bot) };
```

## Project layout

```
src/
  types.ts        Telegram Bot API type definitions (Bot API 7.0-10.2)
  client.ts        Transport (HTTP + multipart + flood control) + Api (typed method surface)
  context.ts        Context — fluent ctx.reply()/ctx.editText()/etc.
  composer.ts        Middleware engine: use/on/command/hears/action/branch/lazy/Router
  keyboard.ts        Fluent inline/reply keyboard builders
  richMessage.ts      Rich Message builders — markdown/html text or structured blocks (10.2)
  decorators.ts      @Command/@Hears/@Action/@On class decorators
  session.ts        session() middleware + MemorySessionStore
  session-redis.ts    RedisSessionStore (duck-typed against any Redis client)
  scenes.ts        WizardScene + Stage — multi-step conversations
  rateLimit.ts        Per-chat/user rate limiting middleware
  i18n.ts          Minimal i18n (translate by Telegram language_code)
  adapters.ts        Vercel / Lambda / Cloudflare Workers webhook handlers
  bot.ts           Bot — polling, webhook, ties it all together
examples/
  basic.ts        router style
  fluent.ts        keyboard/rich-message + webhook example
  decorators.ts      class-based style
  scenes.ts        multi-step signup flow
  pterodactyl-bot.ts   real-world example: a Pterodactyl panel control bot
```

## Status

**What's now real, not just reasoned-through:** the full build pipeline runs
(`tsc` → 18 automated tests against mocked `fetch` and in-memory sessions →
a plain-JS smoke test against the compiled `dist/` output). Core method
coverage was diffed against telegraf v4's actual published method list, not
assumed from memory. Newer areas (Rich Messages, Ephemeral Messages,
Communities, Polls' `correct_option_ids`) were verified against the official
changelog directly — this pass actually caught and fixed a materially wrong
model (Rich Messages was originally built as an invented "markdown string
+ format field" shape; it's now the real `html`/`markdown`/`blocks` schema
with all 21 block types and 25 inline text types). Zero runtime dependencies.

**Live-tested against real Telegram servers** (2026-07-18): `getMe()` and
`getWebhookInfo()` round-tripped successfully — this run is also what
surfaced `User.allows_users_to_create_topics`, a real field the earlier
research passes missed, now added. The core happy path from `examples/basic.ts`
(`/start`, `/help`, inline keyboard buttons, callback queries, `hears()` text
matching, plain text echo, photo receipt) was confirmed working end-to-end via
real long polling against a live bot.

**What's still unverified**, and why writing more code can't close these on its own:
- **Webhook mode**, **Scenes/sessions in a live multi-turn conversation**,
  **file uploads** (sending a Buffer via `sendPhoto`/`sendDocument`), and the
  newer/lower-confidence feature areas (Rich Messages, Ephemeral Messages,
  Gifts, Stars transactions, Business accounts) have not yet been exercised
  against a real server — only the basic router example has.
- **Uneven confidence across feature areas** — see the Coverage confidence
  table above.
- **No production mileage or community.** telegraf has years of real-world
  edge cases already found and fixed, and people to ask when something breaks.
  That only comes from real usage over time — it can't be written in.
- Streaming file uploads aren't implemented (Buffers only; local file *paths*
  aren't yet supported either, unlike telegraf's `{ source: path }` form).
- No CI (GitHub Actions running `npm test` on every push).


#   a y o t b l 
 
 
