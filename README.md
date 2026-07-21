<div align="center">

# ayotbl

**A friendlier, fully-typed Telegram Bot API library for Node.js**

Works equally well from plain JavaScript or TypeScript. Targets **Bot API 7.0 through 10.2**.

<p>
  <a href="https://www.npmjs.com/package/ayotbl"><img src="https://img.shields.io/npm/v/ayotbl?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/ayotbl"><img src="https://img.shields.io/npm/dm/ayotbl?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/AyoFemi10/ayotbl/actions"><img src="https://img.shields.io/github/actions/workflow/status/AyoFemi10/ayotbl/test.yml?style=flat-square" alt="CI"></a>
  <img src="https://img.shields.io/badge/zero%20runtime%20deps-✓-brightgreen?style=flat-square" alt="Zero runtime dependencies">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-blue?style=flat-square&logo=node.js" alt="Node.js">
</p>

[Getting Started](#quick-start) · [Features](#features) · [Examples](#examples) · [API Docs](#api-reference) · [Coverage](#coverage-confidence)

</div>

---

## Why ayotbl?

Most Telegram bot libraries force you to choose between **ease of use** and **type safety**. `ayotbl` gives you both — and stays current with Telegram's API without waiting for library updates.

| | ayotbl | telegraf | aiogram |
|---|---|---|---|
| **Zero runtime deps** | ✅ | ❌ | ❌ |
| **Native TypeScript** | ✅ | Partial | ✅ |
| **Plain JS compatible** | ✅ | ✅ | ❌ |
| **Decorator support** | ✅ | ❌ | ✅ |
| **Escape hatch for new methods** | ✅ | ❌ | ❌ |
| **Rich Messages (Bot API 10.2)** | ✅ | ❌ | Partial |

> *Core method coverage was diffed against telegraf v4's own method inventory. Newer areas (Rich Messages, Ephemeral Messages, Communities) were built from the official changelog and cross-checked against independent sources.*

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Features](#features)
  - [Three handler styles](#three-ways-to-write-a-handler)
  - [Fluent keyboards & Rich Messages](#fluent-keyboards--rich-messages)
  - [Multi-step conversations](#multi-step-conversations-scenes)
  - [Flood control & rate limiting](#flood-control--throttling)
  - [Sessions & i18n](#sessions--i18n)
  - [Serverless deployment](#serverless-deployment)
- [API Reference](#api-reference)
- [Coverage Confidence](#coverage-confidence)
- [Project Layout](#project-layout)
- [Testing](#testing)
- [Status](#status)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```bash
npm install ayotbl
```

**Requirements:** Node.js 18+ (uses native `fetch`/`FormData`/`Blob`).

No additional dependencies to install.

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
// or mount bot.webhookCallback('/webhook') into Express/Fastify yourself
```

---

## Features

### Three ways to write a handler

Pick whichever reads best — mix freely in the same bot:

**1. Simple router** (fastest to get started)
```typescript
bot.command('start', ctx => ctx.reply('hi'));
bot.hears(/^ping$/i, ctx => ctx.reply('pong'));
```

**2. Fluent builders** (readable UI construction)
```typescript
import { Keyboard, RichMessage } from "ayotbl";

// Inline keyboard
bot.command("menu", (ctx) =>
  ctx.reply("Pick one:", {
    reply_markup: Keyboard.inline().button("Yes", "y").button("No", "n").build(),
  })
);

// Rich Message (Bot API 10.2)
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

**3. Decorator classes** (familiar to NestJS/Angular developers)
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

### Multi-step conversations (Scenes)

```typescript
import { Bot, Context, session, Stage, WizardScene } from "ayotbl";

bot.use(session());

const signup = new WizardScene<Context>("signup", [
  async (ctx) => { 
    await ctx.reply("What's your name?"); 
    await ctx.wizard.next(); 
  },
  async (ctx) => { 
    ctx.wizard.state.name = ctx.text; 
    await ctx.reply("How old are you?"); 
    await ctx.wizard.next(); 
  },
  async (ctx) => { 
    await ctx.reply(`Thanks, ${ctx.wizard.state.name}!`); 
    await ctx.scene.leave(); 
  },
]);

bot.use(new Stage([signup]).middleware());
bot.command("signup", (ctx) => ctx.scene.enter("signup"));
```

### Flood control & throttling

429s are retried automatically everywhere (not just the polling loop). Proactively space calls to stay under Telegram's rate limits:

```typescript
const bot = new Bot(token, { 
  floodControl: { maxRetries: 5 }, 
  minIntervalMs: 35 
});
```

Per-chat/per-user rate limiting for incoming updates:

```typescript
import { rateLimit } from "ayotbl";

bot.use(rateLimit({ 
  windowMs: 2000, 
  limit: 3, 
  onLimitExceeded: (ctx) => ctx.reply("Slow down!") 
}));
```

### Sessions & i18n

```typescript
import { session, RedisSessionStore, createI18n } from "ayotbl";
import Redis from "ioredis";

// Redis-backed sessions
bot.use(session({ 
  store: new RedisSessionStore(new Redis(), { ttlSeconds: 86400 }) 
}));

// i18n
const i18n = createI18n({
  defaultLocale: "en",
  locales: { 
    en: { hi: (n: string) => `Hi ${n}!` }, 
    fr: { hi: (n: string) => `Salut ${n}!` } 
  },
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

---

## API Reference

### The real reply mechanism

`reply_parameters` (`ReplyParameters`, Bot API 7.0+) — quoting part of a message, replying across chats, to poll options, checklist tasks, or ephemeral messages. Not just the old flat `reply_to_message_id`.

### Any method, typed or not

```typescript
// Fully typed and autocompleted
await bot.api.sendMessage({ chat_id, text: "typed and autocompleted" });

// Escape hatch — works the same day Telegram ships a new method
await bot.api.call("someBrandNewMethod", { chat_id, whatever: true });
```

### Composer ergonomics

Matching telegraf's familiar API: `use`, `on`, `command`, `hears`, `action`, `branch`, `optional`, `lazy`, static `Composer.compose()`, and a `Router` class for key-based dispatch.

---

## Coverage Confidence

Honest, area-by-area — so you know where to double-check before relying on something:

| Area | Confidence | How it was verified |
|---|---|---|
| Core messaging, chat admin, forum topics, stickers, games, payments | **High** | Diffed against telegraf's published method list |
| Inline mode (`InlineQueryResult` — all 20 variants) | **High** | Field-by-field against python-telegram-bot's generated docs |
| Telegram Passport | **High** | Field-by-field against python-telegram-bot's generated docs |
| `ReplyParameters`, polls, reactions, chat boosts | **High** | Cross-checked directly against official Bot API changelog |
| Rich Messages (`RichBlock`/`RichText` — 21 + 25 variants) | **High** | Field-by-field against community reference + official changelog |
| Ephemeral Messages, Communities (Bot API 10.2) | **High** | Verified against official changelog the same day it shipped |
| Gifts, Stars transactions, Business accounts | **High** | Field-by-field against python-telegram-bot's generated docs |
| `ChatBackground`/`BackgroundType`/`BackgroundFill` | **High** | Stable schema, cross-checked against generated docs |
| Checklists, Guest mode, Suggested Posts | **Medium** | Top-level shapes confirmed via changelog; some nested fields inferred |
| `StoryArea`/`InputStoryContent` (Business Stories) | **Medium-low** | General structure confirmed via changelog mentions only |
| `UniqueGiftColors`, `GiftBackground`, `UserRating` | **Low** *(explicitly)* | Confirmed to exist, but field names inferred from sibling patterns. See JSDoc warnings in `types.ts`. |
| `getManagedBotToken`/`replaceManagedBotToken`, `answerGuestQuery` | **Lower** | Implemented from changelog alone, not cross-checked |

> Every method's parameters and return values are backed by a named, field-checked type. The remaining `Record<string, unknown>` occurrences in `client.ts` are internal transport plumbing, not API surface.

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
  basic.ts           router style
  fluent.ts          keyboard/rich-message + webhook example
  decorators.ts      class-based style
  scenes.ts          multi-step signup flow
  pterodactyl-bot.ts real-world example: a Pterodactyl panel control bot
```

---

## Testing

```bash
npm test
```

Runs, in order:
1. **Real `tsc` build** to `dist/`
2. **58 unit/integration tests** via Node's built-in test runner:
   - Composer routing and combinators
   - Scenes cursor advancement
   - Transport flood-control retry
   - Context's outgoing API calls (mocked `fetch`)
   - Keyboard/RichMessage builders
   - i18n, rateLimit, serverless adapters, decorators
3. **Plain-JavaScript smoke test** — proves compiled `dist/` works with zero TypeScript
4. **Real decorator-syntax smoke test** — isolated `tsc` + plain `node` proving legacy decorators work end-to-end

> ⚠️ **Not covered:** an actual live run against Telegram's real servers with a real bot token. See [Status](#status).

---

## Status

### ✅ Verified
- Full build pipeline (`tsc` → 58 tests → JS smoke test)
- Core method coverage diffed against telegraf v4's actual published method list
- Newer areas verified against official changelog directly (caught and fixed a materially wrong Rich Messages model in the process)
- **Live-tested against real Telegram servers** (2026-07-18): `getMe()`, `getWebhookInfo()`, and the core happy path from `examples/basic.ts` confirmed working end-to-end

### ⚠️ Unverified
- Webhook mode (code is there, not live-tested)
- Scenes/sessions in live multi-turn conversations
- File uploads (sending a Buffer via `sendPhoto`/`sendDocument`)
- Newer/lower-confidence feature areas (Rich Messages, Ephemeral Messages, Gifts, Stars, Business accounts)
- Streaming file uploads (Buffers only; local file paths not yet supported)
- No production mileage or community (telegraf has years of real-world edge cases already found and fixed)
- No CI (GitHub Actions running `npm test` on every push)

---

## Contributing

Contributions are welcome! Please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

[MIT](LICENSE)

---

<div align="center">

Built with ❤️ for the Node.js Telegram bot community.

</div>
