import { Bot, Keyboard } from "../src";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("menu", (ctx) =>
  ctx.reply(
    "Choose an option:",
    { reply_markup: Keyboard.inline().button("Profile", "menu:profile").row().button("Settings", "menu:settings").button("Close", "menu:close").build() }
  )
);

bot.action(/^menu:(.+)$/, async (ctx) => {
  const [, choice] = ctx.match!;
  await ctx.answerCbQuery();
  await ctx.editText(`You picked: ${choice}`);
});

// Fluent, chainable send — same underlying api.sendPhoto call, just easier to read top-to-bottom.
bot.command("photo", (ctx) =>
  ctx.replyWithPhoto(
    { url: "https://picsum.photos/400" },
    { caption: "Random photo", reply_markup: Keyboard.inline().button("Another one", "menu:profile").build() }
  )
);

// Deploy with a webhook instead of polling — one call, no Express required.
bot.launchWebhook({ url: "https://your-domain.example.com", port: 8080 }).then(() => console.log("webhook mode running"));
