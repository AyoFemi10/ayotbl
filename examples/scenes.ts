import { Bot, Context, session, Stage, WizardScene, rateLimit } from "../src";

const bot = new Bot(process.env.BOT_TOKEN!);

bot.use(rateLimit({ windowMs: 2000, limit: 3 }));
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
    ctx.wizard.state.age = ctx.text;
    await ctx.reply(`Thanks ${ctx.wizard.state.name}, age ${ctx.wizard.state.age} noted!`);
    await ctx.scene.leave();
  },
]);

const stage = new Stage<Context>([signup]);
bot.use(stage.middleware());

bot.command("signup", (ctx) => ctx.scene!.enter("signup"));
bot.command("cancel", (ctx) => ctx.scene!.leave());

bot.launch().then(() => console.log("ayotbl bot (scenes example) running"));
