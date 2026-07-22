<div align="center">

# ayotbl

**A friendlier, fully-typed Telegram Bot API library for Node.js**

Works equally well from plain JavaScript or TypeScript. Targets **Bot API 7.0 through 10.2**.

<p>
  <a href="https://www.npmjs.com/package/ayotbl"><img src="https://img.shields.io/npm/v/ayotbl?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/ayotbl"><img src="https://img.shields.io/npm/dm/ayotbl?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/yourusername/ayotbl/actions"><img src="https://img.shields.io/github/actions/workflow/status/AyoFemi10/ayotbl/test.yml?style=flat-square" alt="CI"></a>
  <img src="https://img.shields.io/badge/zero%20runtime%20deps-✓-brightgreen?style=flat-square" alt="Zero runtime dependencies">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-blue?style=flat-square&logo=node.js" alt="Node.js">
</p>

[Quick Start](#quick-start) · [Features](#features) · [Coverage Confidence](#coverage-confidence) · [Testing](#testing) · [Status](#status) · [Full Docs Site](docs/index.html)

</div>

> **Before the CI badge works**, replace `yourusername` in this README with your actual GitHub username once you push the repo — otherwise it links nowhere. The workflow file itself (`.github/workflows/test.yml`) is real and will run on push.

---

## Why ayotbl?

Most Telegram bot libraries make you choose between ease of use and type safety. `ayotbl` aims for both, and tries to stay current with Telegram's API without waiting on a library release cycle.

| | ayotbl | telegraf | aiogram |
|---|---|---|---|
| Zero runtime deps | ✅ | ❌ | ❌ |
| Native TypeScript | ✅ | Partial | ✅ |
| Plain JS compatible | ✅ | ✅ | ❌ (Python) |
| Decorator support | ✅ | ❌ | ✅ |
| Escape hatch for brand-new methods | ✅ (`api.call()`) | Partial (`telegram.callApi()`) | Partial |
| Rich Messages (Bot API 10.2) | ✅ | ❌ | Partial |
| Production track record | ❌ — brand new | ✅ years, many real bots | ✅ years, many real bots |

That last row matters more than the others. See [Status](#status) for what that actually means in practice.

---

## Installation

```bash
npm install ayotbl
```

Requires Node.js 18+ (uses the native `fetch`/`FormData`/`Blob` globals — no runtime dependencies to install).

---

## Quick Start

```typescript
import { Bot } from "ayotbl";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) => ctx.reply(`Hey ${ctx.from?.first_name}!`));
bot.hears(/^ping$/i, (ctx) => ctx.reply("pong"));
bot.on("photo", (ctx) => ctx.reply("Nice photo!"));

bot.launch(); // long polling
```

### Webhooks (one line)

```typescript
await bot.launchWebhook({ url: "https://your-domain.com", port: 8080 });
// or mount bot.webhookCallback('/webhook') into Express/Fastify/raw http yourself
```

---

## Features

### Three ways to write a handler

Pick whichever reads best — mix freely in the same bot.

**1. Simple router**
```typescript
bot.command('start', ctx => ctx.reply('hi'));
bot.hears(/^ping$/i, ctx => ctx.reply('pong'));
```

**2. Fluent builders**
```typescript
import { Keyboard, RichMessage } from "ayotbl";

bot.command("menu", (ctx) =>
  ctx.reply("Pick one:", {
    reply_markup: Keyboard.inline()
      .button("Confirm", "yes", { style: "success" })
      .button("Cancel", "no", { style: "danger" })
      .build(),
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

**3. Decorator classes**
```typescript
import { Bot, Context, Command, Hears } from "ayotbl";

class MainController {
  @Command("start")
  start(ctx: Context) { return ctx.reply("Welcome!"); }

  @Hears(/^thanks?$/i)
  thanks(ctx: Context) { return ctx.reply("You're welcome!"); }
}

bot.useController(new MainController());
```

### Editing messages from button taps

The most common Telegram UI pattern — button tap edits the message it's attached to — works directly from a callback handler:

```typescript
bot.action(/^confirm:(yes|no)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editText(ctx.match![1] === "yes" ? "Confirmed ✅" : "Cancelled ❌");
  // ctx.editCaption(), ctx.editMedia(), ctx.editReplyMarkup() work the same way
});
```

### Multi-step conversations (Scenes)

```typescript
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

### Flood control & throttling

429s are retried automatically everywhere (not just the polling loop):

```typescript
const bot = new Bot(token, { floodControl: { maxRetries: 5 }, minIntervalMs: 35 });
```

Per-chat/per-user rate limiting for incoming updates:

```typescript
import { rateLimit } from "ayotbl";
bot.use(rateLimit({ windowMs: 2000, limit: 3, onLimitExceeded: (ctx) => ctx.reply("Slow down!") }));
```

### Sessions & i18n

```typescript
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

### Serverless deployment

```typescript
// Vercel
export default vercelWebhookHandler(bot);
// AWS Lambda
export const handler = lambdaWebhookHandler(bot);
// Cloudflare Workers
export default { fetch: cloudflareWebhookHandler(bot) };
```

### Any method, typed or not

```typescript
await bot.api.sendMessage({ chat_id, text: "typed and autocompleted" });
await bot.api.call("someBrandNewMethod", { chat_id, whatever: true }); // always works, even the same day Telegram ships it
```

### The real reply mechanism

`reply_parameters` (`ReplyParameters`, Bot API 7.0+) — quoting part of a message, replying across chats, to poll options, checklist tasks, or ephemeral messages — not just the old flat `reply_to_message_id`.

### Composer ergonomics

`use`, `on`, `command`, `hears`, `action`, `branch`, `optional`, `lazy`, static `Composer.compose()`, and a `Router` class for key-based dispatch.

---

## Coverage Confidence

Honest, area-by-area — so you know where to double-check before relying on something:

| Area | Confidence | How it was verified |
|---|---|---|
| Core messaging, chat admin, forum topics, stickers, games, payments | High | Diffed against telegraf's published method list |
| Inline mode (`InlineQueryResult` — all 20 variants), Telegram Passport | High | Field-by-field against python-telegram-bot's generated docs |
| `ReplyParameters`, polls, reactions, chat boosts | High | Cross-checked directly against the official Bot API changelog |
| Rich Messages (`RichBlock`/`RichText` — 21 + 25 variants) | High | Field-by-field against a community reference + the official changelog |
| Ephemeral Messages, Communities (Bot API 10.2) | High | Verified against the official changelog the same day it shipped |
| Gifts, Stars transactions, Business accounts | High | Field-by-field against python-telegram-bot's generated docs |
| `ChatBackground`/`BackgroundType`/`BackgroundFill` | High | Stable schema, cross-checked against generated docs |
| Checklists, Guest mode, Suggested Posts | Medium | Top-level shapes confirmed via changelog; some nested fields inferred |
| `StoryArea`/`InputStoryContent` (Business Stories) | Medium-low | General structure confirmed via changelog mentions only |
| `UniqueGiftColors`, `GiftBackground`, `UserRating` | Low, explicitly | Confirmed to exist; field names inferred from a sibling type's pattern, not verified. Flagged in `types.ts`'s JSDoc. |
| `getManagedBotToken`/`replaceManagedBotToken`, `answerGuestQuery` | Lower | Implemented from the changelog alone, not cross-checked against a second source |

Every method's parameters and return values are backed by a named, field-checked type — the remaining `Record<string, unknown>` occurrences in `client.ts` are internal transport plumbing (multipart encoding), not API surface.

---

## Project Layout

```
src/
  types.ts           Telegram Bot API type definitions (Bot API 7.0-10.2)
  client.ts          Transport (HTTP + multipart + flood control) + typed API surface
  context.ts         Context — fluent ctx.reply()/ctx.editText()/etc.
  composer.ts        Middleware engine: use/on/command/hears/action/branch/lazy/Router
  keyboard.ts        Fluent inline/reply keyboard builders
  richMessage.ts     Rich Message builders — markdown/html text or structured blocks (10.2)
  decorators.ts      @Command/@Hears/@Action/@On class decorators
  session.ts         session() middleware + MemorySessionStore
  session-redis.ts   RedisSessionStore (duck-typed against any Redis client)
  scenes.ts          WizardScene + Stage — multi-step conversations
  rateLimit.ts       Per-chat/user rate limiting middleware
  i18n.ts            Minimal i18n (translate by Telegram language_code)
  adapters.ts        Vercel / Lambda / Cloudflare Workers webhook handlers
  bot.ts             Bot — polling, webhook, ties it all together
examples/
  basic.ts             router style
  fluent.ts            keyboard/rich-message + webhook example
  decorators.ts        class-based style
  scenes.ts            multi-step signup flow
  pterodactyl-bot.ts   real-world example: a Pterodactyl panel control bot
test/
  *.test.ts            66 tests — Composer, Context, Scenes, Keyboard, RichMessage,
                        i18n, rateLimit, adapters, decorators, Transport flood control
  decorator-smoke/      real @Command syntax, compiled by real tsc, run with plain node
  smoke.plain-js.test.js  plain-require() proof the compiled output works with zero TS
```

---

### Chat & role gates

```typescript
bot.privateChat(bot.command("start", (ctx) => ctx.reply("Welcome!")));
bot.admin(bot.command("ban", (ctx) => ctx.reply("Banning…"))); // gates on getChatMember status
bot.creator(bot.command("shutdown", (ctx) => ctx.reply("Shutting down…")));
```

---

## Testing

```bash
npm test
```

Runs, in order: a real `tsc` build to `dist/`, 66 unit/integration tests via Node's
built-in test runner, a plain-JavaScript smoke test proving the compiled output
works with zero TypeScript involved, and a real-decorator-syntax smoke test
(isolated `tsc` compile + plain `node`, proving legacy decorators work end-to-end
for real consumers — `tsx`, used for the fast test suite, doesn't honor
`experimentalDecorators`, which is a test-runner quirk, not a library bug; see
`test/decorators.test.ts`'s comment for the full explanation).

**Not covered by `npm test`:** an actual live run against Telegram's real servers.
See [Status](#status).

---

## Status

### Verified
- Full build pipeline (`tsc` → 66 tests → JS smoke test → real-decorator smoke test)
- Newer/higher-confidence feature areas (Rich Messages, Ephemeral Messages, Gifts,
  Stars, Business accounts)
- Core method coverage diffed against telegraf v4's actual published method list
- Newer areas verified against the official changelog directly
- **Live-tested against real Telegram servers**: `getMe()`, `getWebhookInfo()`, and the
  core happy path (commands, inline keyboards, callback queries, `hears()` matching,
  text echo, photo receipt) confirmed working end-to-end via real long polling
- Three real bugs found and fixed by porting an actual working bot into ayotbl
  (see `CHANGELOG.md`'s 0.2.0 entry) — `ctx.editText()`/`ctx.deleteMessage()` from
  callback_query handlers, and `ctx.chat`/`ctx.from` missing several update types

### Not yet verified
- Webhook mode (code is there, not live-tested)
- Scenes/sessions in a live multi-turn conversation
- File uploads (sending a Buffer via `sendPhoto`/`sendDocument`)
- Streaming file uploads (Buffers only; local file *paths* aren't supported yet,
  unlike telegraf's `{ source: path }` form)
- Production mileage or community — telegraf and aiogram have years of real-world
  edge cases already found and fixed; that only comes from real usage over time,
  and can't be written in ahead of time

CI now runs the full suite on every push (Node 18/20/22) — see `.github/workflows/test.yml`.

---

## Contributing

Issues and PRs welcome. Given how new this project is, the most valuable
contribution right now is simply **using it and reporting what breaks** —
see "Not yet verified" above for where the real risk currently is.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/thing`)
3. `npm test` before committing
4. Open a PR

---

## License

[MIT](LICENSE)
