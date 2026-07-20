import { Bot, Keyboard } from "../src";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.command("start", (ctx) =>
  ctx.reply(`Hey ${ctx.from?.first_name}! Try /help or press a button:`, {
    reply_markup: Keyboard.inline().button("Say hi", "hi").button("Roll a dice", "dice").build(),
  })
);

bot.command(["help", "h"], (ctx) => ctx.reply("Commands: /start, /help. Send any text and I'll echo it back."));

bot.action("hi", async (ctx) => {
  await ctx.answerCbQuery("👋");
  await ctx.reply("Hello there!");
});

bot.action("dice", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.api.sendDice({ chat_id: ctx.chatId! });
});

bot.hears(/^ping$/i, (ctx) => ctx.reply("pong"));

bot.on("photo", (ctx) => ctx.reply("Nice photo!"));

bot.on("text", (ctx) => ctx.reply(`You said: ${ctx.text}`));

bot.catch((err, ctx) => {
  console.error("Error handling update", ctx.updateType, err);
});

bot.launch().then(() => console.log("ayotbl bot is running (long polling)"));
