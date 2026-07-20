import { Bot, Context, BotController, Command, Hears, Action, RichMessage } from "../src";

@BotController()
class MainController {
  @Command("start")
  async start(ctx: Context) {
    await ctx.reply("Welcome! I'm a class-based ayotbl bot.");
  }

  @Command("report")
  async report(ctx: Context) {
    const rich = RichMessage.markdown()
      .text("Here's today's build report:")
      .table(["Step", "Status"], [["Install", "✅"], ["Test", "✅"], ["Deploy", "⏳"]])
      .checklist(["Install deps", "Run tests", { label: "Deploy", done: false }])
      .build();
    await ctx.replyRich(rich);
  }

  @Hears(/^thanks?$/i)
  async thanks(ctx: Context) {
    await ctx.reply("You're welcome!");
  }

  @Action(/^confirm:(yes|no)$/)
  async confirm(ctx: Context) {
    const choice = ctx.match?.[1];
    await ctx.answerCbQuery();
    await ctx.reply(choice === "yes" ? "Confirmed ✅" : "Cancelled ❌");
  }
}

const bot = new Bot(process.env.BOT_TOKEN!);
bot.useController(new MainController());
bot.launch().then(() => console.log("ayotbl bot (decorator style) is running"));
