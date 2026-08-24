/**
 * Pterodactyl "cpanel" bot — list your servers and start/stop/restart them
 * from Telegram. Uses the Pterodactyl **Client API** (an API key generated
 * under Account -> API Credentials on your panel), not the Application API
 * (that one's for admins managing users/nodes across the whole panel).
 *
 * NOTE: response field names below match the commonly-documented Pterodactyl
 * Client API shape, but Pterodactyl versions do vary — check your panel's own
 * /api docs (usually at https://your-panel.example.com/api or the official
 * docs site) if something doesn't line up.
 *
 * Env vars required:
 *   BOT_TOKEN              — Telegram bot token from @BotFather
 *   PTERODACTYL_URL        — e.g. https://panel.example.com  (no trailing slash)
 *   PTERODACTYL_API_KEY    — Client API key (starts with "ptlc_")
 *   TELEGRAM_ADMIN_IDS     — comma-separated Telegram user IDs allowed to use the bot
 */

import { Bot, Context, Keyboard } from "../src"; // once published: import from "ayotbl"

// ---------- Minimal Pterodactyl Client API wrapper ----------

interface PteroServerEntry {
  attributes: {
    identifier: string;
    name: string;
    description: string;
  };
}

interface PteroResources {
  current_state: "running" | "starting" | "stopping" | "offline";
  is_suspended: boolean;
  resources: {
    memory_bytes: number;
    cpu_absolute: number;
    disk_bytes: number;
    uptime: number;
  };
}

type PowerSignal = "start" | "stop" | "restart" | "kill";

class PterodactylClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/client${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Pterodactyl API ${path} -> ${res.status}: ${body.slice(0, 200)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  listServers() {
    return this.request<{ data: PteroServerEntry[] }>("?per_page=50");
  }

  getResources(identifier: string) {
    return this.request<{ attributes: PteroResources }>(`/servers/${identifier}/resources`);
  }

  sendPower(identifier: string, signal: PowerSignal) {
    return this.request<void>(`/servers/${identifier}/power`, {
      method: "POST",
      body: JSON.stringify({ signal }),
    });
  }
}

// ---------- Bot ----------

const ptero = new PterodactylClient(process.env.PTERODACTYL_URL!, process.env.PTERODACTYL_API_KEY!);
const adminIds = (process.env.TELEGRAM_ADMIN_IDS ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);

const bot = new Bot(process.env.BOT_TOKEN!);

// This is a control panel, not a public bot — lock it down to an allowlist.
bot.use(async (ctx, next) => {
  const id = String(ctx.from?.id ?? "");
  if (adminIds.length > 0 && !adminIds.includes(id)) {
    await ctx.reply("You're not authorized to use this bot.");
    return;
  }
  return next();
});

bot.command(["start", "help"], (ctx) => ctx.reply("Pterodactyl control bot.\nUse /servers to list and manage your servers."));

bot.command("servers", async (ctx) => {
  const { data } = await ptero.listServers();
  if (data.length === 0) return ctx.reply("No servers found on this panel.");

  const kb = Keyboard.inline();
  for (const s of data) kb.button(s.attributes.name, `server:${s.attributes.identifier}`).row();

  await ctx.reply("Your servers:", { reply_markup: kb.build() });
});

bot.action(/^server:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showServer(ctx, ctx.match![1]);
});

bot.action(/^power:(.+):(start|stop|restart|kill)$/, async (ctx) => {
  const [, id, signal] = ctx.match!;
  await ptero.sendPower(id, signal as PowerSignal);
  await ctx.answerCbQuery(`Sent "${signal}"`);
  // Give the panel a moment to reflect the new state before refreshing the card.
  setTimeout(() => showServer(ctx, id).catch((err) => console.error(err)), 2000);
});

async function showServer(ctx: Context, id: string) {
  const { attributes } = await ptero.getResources(id);
  const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(0);

  const text =
    `*Status:* ${attributes.current_state}\n` +
    `*CPU:* ${attributes.resources.cpu_absolute.toFixed(1)}%\n` +
    `*Memory:* ${mb(attributes.resources.memory_bytes)} MB\n` +
    `*Uptime:* ${(attributes.resources.uptime / 1000 / 60).toFixed(0)} min`;

  const reply_markup = Keyboard.inline()
    .button("▶️ Start", `power:${id}:start`)
    .button("🔁 Restart", `power:${id}:restart`)
    .row()
    .button("⏹ Stop", `power:${id}:stop`)
    .button("⛔ Kill", `power:${id}:kill`)
    .row()
    .button("🔄 Refresh", `server:${id}`)
    .build();

  if (ctx.callbackQuery) await ctx.editText(text, { parse_mode: "Markdown", reply_markup });
  else await ctx.reply(text, { parse_mode: "Markdown", reply_markup });
}

bot.catch((err, ctx) => {
  console.error("[pterodactyl-bot] error:", err);
  if (ctx.chat) ctx.reply("Something went wrong talking to the panel.").catch(() => {});
});

bot.launch().then(() => console.log("Pterodactyl control bot running (long polling)"));
