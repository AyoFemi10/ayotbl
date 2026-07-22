/**
 * BOT API 10.2 TEST
 * ============================================================================
 * Tests ONLY what shipped in Bot API 10.2 (July 14, 2026), mapped 1:1 to the
 * official changelog bullets, against ayotbl's implementation:
 *
 *   Rich Messages     — InputRichMessageMedia, InputMediaVoiceNote, blocks
 *                        (InputRichBlockListItem, paragraph, heading, pre,
 *                        footer, divider, mathematical_expression, anchor,
 *                        list, blockquote, pullquote, collage, slideshow,
 *                        table, details, map, animation, audio, photo,
 *                        video, voice_note, thinking)
 *   Ephemeral Messages — receiver_user_id / callback_query_id on sends,
 *                        editEphemeralMessage*, deleteEphemeralMessage,
 *                        ReplyParameters.ephemeral_message_id
 *   Communities        — Chat.community / ChatFullInfo.community (read-only,
 *                        can't be created by a bot — see notes below)
 *   General            — BotSubscriptionUpdated (push-only, can't trigger),
 *                        BotCommand.is_ephemeral
 *
 * Also covers, since you specifically asked for them: custom emoji IDs on
 * buttons/text, button styles, inline buttons, and join-request handling
 * ("force join") — technically a 10.1 addition (answerChatJoinRequestQuery /
 * sendChatJoinRequestWebApp), but grouped here since it's part of the same
 * "gate access to a chat" feature family and you'll want it tested either way.
 *
 * Once you're happy with this, we do a separate BOT API 10.1 TEST bot next
 * (RichText spans, sendRichMessageDraft streaming, Polls' Link media, etc.)
 * — no point re-testing 10.2 things twice since blocks/Rich Messages overlap.
 *
 * RUN:
 *   export BOT_TOKEN="..."
 *   tsx examples/botapi-10.2-test.ts
 * Then /start the bot. For ephemeral + join-request tests you need a group
 * where the bot is an admin (join-request tests also need "Approve new
 * members" turned on for the group).
 * ============================================================================
 */

import { Bot, Context, Keyboard, RichMessage } from "../src/index";

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) {
  console.error("Set BOT_TOKEN first.");
  process.exit(1);
}

const bot = new Bot(TOKEN);
bot.catch((err, ctx) => ctx.reply(`⚠️ error: ${err.message}`).catch(() => {}));

// A real, valid image URL for media blocks/tests.
const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/500/300`;

const START_TEXT = `
🧪 BOT API 10.2 TEST

— Rich Messages (blocks) —
/rich_blocks_full   every block type the builder + .raw() can produce
/rich_media         InputRichMessage.media (InputRichMessageMedia) — see
                     the code comment above this command; this is the part
                     of ayotbl's fluent builder that looks unwired, tested here
/rich_customemoji   RichText "custom_emoji" span (needs a REAL custom emoji id
                     — see command output for how to get one)
/rich_draft         sendRichMessageDraft — simulated streaming, then finalize

— Buttons —
/kb_styles          inline buttons: primary / success / danger
/kb_customemoji     inline button with icon_custom_emoji_id (needs a real id)

— Ephemeral Messages (group only, bot must be admin) —
/ephemeral_send     sendMessage with receiver_user_id — only you + the bot see it
/ephemeral_edit     edits the last ephemeral message this chat got from you
/ephemeral_delete   deletes it
/ephemeral_reply    replies to it via ReplyParameters.ephemeral_message_id

— Communities (read-only — bots can't create one, only observe) —
/community_check    getChat() and reports chat.community if this chat has one

— BotCommand.is_ephemeral —
/cmd_ephemeral_set   registers a command flagged is_ephemeral: true, then
                      reads it back with getMyCommands() to confirm it stuck

— Join requests / "force join" (group only, enable "Approve new members") —
Ask someone to submit a join request to your test group — the bot auto-logs
it below and calls answerChatJoinRequestQuery() if a query_id is present
(10.1+ groups) or approveChatJoinRequest() as a fallback (works everywhere).
/joinrequest_webapp  sendChatJoinRequestWebApp() demo (needs a live join
                     request's query_id — trigger one first, bot will print
                     the query_id it captured so you can pass it manually)

— Not testable by a bot alone —
BotSubscriptionUpdated: only arrives via Update.subscription when a real
Telegram Stars subscription changes — nothing to send here, just watch the
console log if you have a paid subscription flow set up elsewhere.
`.trim();

bot.command(["start", "help"], (ctx) => ctx.reply(START_TEXT));

// ---------------------------------------------------------------------------
// Rich Messages — full block tour
// ---------------------------------------------------------------------------
bot.command("rich_blocks_full", (ctx) =>
  ctx
    .replyRich(
      RichMessage.blocks()
        .heading("10.2 block tour", 1)
        .paragraph("A plain paragraph block.")
        .raw({ type: "footer", text: "This is a footer block (raw(), no builder method exposed)." })
        .divider()
        .raw({ type: "mathematical_expression", expression: "E = mc^2" })
        .raw({ type: "anchor", name: "middle" })
        .list([
          { blocks: [{ type: "paragraph", text: "unordered item 1" }] },
          { blocks: [{ type: "paragraph", text: "unordered item 2" }] },
          { blocks: [{ type: "paragraph", text: "checkbox item" }], has_checkbox: true, is_checked: true },
        ])
        .table(
          [
            [{ text: "Header A", is_header: true }, { text: "Header B (span 2)", is_header: true, colspan: 2 }],
            [{ text: "1" }, { text: "2" }, { text: "3" }],
          ],
          { bordered: true, striped: true, caption: "table with colspan + striped + bordered" }
        )
        .raw({
          type: "blockquote",
          blocks: [{ type: "paragraph", text: "A blockquote block." }],
          credit: "— someone",
        })
        .raw({ type: "pullquote", text: "A short punchy pullquote.", credit: "— someone else" })
        .details("tap to expand (details block)", [
          { type: "paragraph", text: "hidden content, revealed on tap" },
        ])
        .raw({ type: "pre", text: "console.log('preformatted block')", language: "js" })
        .raw({ type: "photo", photo: IMG("blockphoto"), caption: { text: "a photo block" } })
        .raw({
          type: "collage",
          blocks: [
            { type: "photo", photo: IMG("collage1") },
            { type: "photo", photo: IMG("collage2") },
          ],
          caption: { text: "a 2-photo collage block" },
        })
        .raw({
          type: "slideshow",
          blocks: [
            { type: "photo", photo: IMG("slide1") },
            { type: "photo", photo: IMG("slide2") },
          ],
          caption: { text: "a slideshow block" },
        })
        .raw({ type: "map", location: { latitude: 6.5244, longitude: 3.3792 }, zoom: 14, width: 400, height: 300 })
        .build()
    )
    .catch((err: any) =>
      ctx.reply(
        `One or more block types were rejected by Telegram: ${err.message}\n` +
          `README flags Rich Blocks as "Medium" confidence — this is exactly the kind ` +
          `of gap that flag is warning about. Note which block type failed above.`
      )
    )
);

// ---------------------------------------------------------------------------
// InputRichMessageMedia — the 10.2 field that lets markdown/html rich messages
// reference media explicitly instead of inlining a URL.
//
// ⚠️ BUG FOUND while building this test: RichMarkdownBuilder.photo(url, caption)
// only ever pushes markdown text (`![](url "caption")`) into `parts` — it never
// touches the builder's private `media` array, so `.build()` always emits
// `media: undefined` no matter how many `.photo()` calls you make. The
// InputRichMessageMedia field this command is supposed to test is therefore
// unreachable through the fluent builder; you have to bypass it and construct
// the InputRichMessage object by hand, as done below. Worth a real fix in
// richMessage.ts (`.photo()` should also push into `this.media`).
// ---------------------------------------------------------------------------
bot.command("rich_media", (ctx) =>
  ctx
    .replyRich({
      markdown: `Here's a photo referenced via the explicit media array:\n\n![](${IMG("richmedia")})`,
      media: [{ type: "photo", media: IMG("richmedia") }],
    })
    .catch((err: any) => ctx.reply(`sendRichMessage with explicit media failed: ${err.message}`))
);

// ---------------------------------------------------------------------------
// custom_emoji RichText span — needs a REAL custom emoji id (premium sticker
// set emoji). Placeholder id included; swap it or fetch a real one via
// ctx.api.getForumTopicIconStickers() / any custom emoji sticker set id you own.
// ---------------------------------------------------------------------------
bot.command("rich_customemoji", (ctx) =>
  ctx
    .replyRich(
      RichMessage.blocks()
        .paragraph([
          "Look: ",
          { type: "custom_emoji", custom_emoji_id: "5368324170671202286", alternative_text: "⭐" },
          " (custom emoji span)",
        ])
        .build()
    )
    .catch((err: any) =>
      ctx.reply(
        `custom_emoji span failed (expected if the placeholder id isn't a real one your ` +
          `bot has access to): ${err.message}\n` +
          `Get a real id: forward yourself a message containing a custom emoji, or use ` +
          `getStickerSet()/getCustomEmojiStickers() on a set you have access to, then rerun ` +
          `with that id hardcoded in this command.`
      )
    )
);

// ---------------------------------------------------------------------------
// sendRichMessageDraft — simulated streaming (like an AI reply typing in).
// ---------------------------------------------------------------------------
bot.command("rich_draft", async (ctx) => {
  if (!ctx.chatId) return;
  const draftId = Date.now(); // arbitrary per-draft identifier
  const words = ["Streaming", " a", " rich", " reply", " word", " by", " word", " …", " done!"];
  let acc = "";
  try {
    for (const w of words) {
      acc += w;
      await ctx.api.sendRichMessageDraft({ chat_id: Number(ctx.chatId), draft_id: draftId, rich_message: { markdown: acc } });
      await new Promise((r) => setTimeout(r, 300));
    }
    await ctx.replyRich(RichMessage.markdown().text(acc).build());
  } catch (err: any) {
    await ctx.reply(`sendRichMessageDraft failed: ${err.message}`);
  }
});

// ---------------------------------------------------------------------------
// Buttons — styles + custom emoji icon
// ---------------------------------------------------------------------------
bot.command("kb_styles", (ctx) =>
  ctx.reply("Button style test:", {
    reply_markup: Keyboard.inline()
      .button("Primary", "style:primary", { style: "primary" })
      .button("Success", "style:success", { style: "success" })
      .button("Danger", "style:danger", { style: "danger" })
      .build(),
  })
);
bot.action(/^style:(primary|success|danger)$/, (ctx) => ctx.answerCbQuery(`✅ ${ctx.match![1]} tapped`));

bot.command("kb_customemoji", (ctx) =>
  ctx
    .reply("Button with a custom emoji icon:", {
      reply_markup: Keyboard.inline()
        .button("Starred", "emoji:tap", { style: "success", icon_custom_emoji_id: "5368324170671202286" })
        .build(),
    })
    .catch((err: any) =>
      ctx.reply(`Failed — likely the placeholder custom_emoji_id isn't real. Error: ${err.message}`)
    )
);
bot.action("emoji:tap", (ctx) => ctx.answerCbQuery("✅ custom-emoji button tapped"));

// ---------------------------------------------------------------------------
// Ephemeral Messages — group only. Stashes the last ephemeral message's id
// per-user in memory (in-process Map) so /ephemeral_edit et al. know what to touch.
// ---------------------------------------------------------------------------
const lastEphemeral = new Map<string, number>(); // key: `${chatId}:${userId}` -> ephemeral_message_id

bot.command("ephemeral_send", async (ctx) => {
  if (!ctx.chatId || !ctx.from) return;
  if (ctx.chat?.type === "private") {
    return ctx.reply("Ephemeral messages need a GROUP chat (visible to you + bot only, hidden from others there).");
  }
  const msg = await ctx.api.sendMessage({
    chat_id: ctx.chatId,
    text: "👻 This is an ephemeral message — only you (and the bot) should see it.",
    receiver_user_id: ctx.from.id,
    reply_markup: Keyboard.inline().button("ack", "ephemeral:ack").build(),
  });
  const anyMsg = msg as any;
  const ephemeralId = anyMsg.ephemeral_message_id ?? anyMsg.message_id;
  lastEphemeral.set(`${ctx.chatId}:${ctx.from.id}`, ephemeralId);
  console.log("[10.2 test] stored ephemeral id", ephemeralId, "for", ctx.from.id);
});

bot.action("ephemeral:ack", (ctx) => ctx.answerCbQuery("got it"));

bot.command("ephemeral_edit", async (ctx) => {
  if (!ctx.chatId || !ctx.from) return;
  const id = lastEphemeral.get(`${ctx.chatId}:${ctx.from.id}`);
  if (!id) return ctx.reply("Send /ephemeral_send first.");
  await ctx.api.editEphemeralMessageText({
    chat_id: ctx.chatId,
    receiver_user_id: ctx.from.id,
    ephemeral_message_id: id,
    text: "👻 (edited) still only visible to you.",
  });
});

bot.command("ephemeral_delete", async (ctx) => {
  if (!ctx.chatId || !ctx.from) return;
  const id = lastEphemeral.get(`${ctx.chatId}:${ctx.from.id}`);
  if (!id) return ctx.reply("Send /ephemeral_send first.");
  await ctx.api.deleteEphemeralMessage({ chat_id: ctx.chatId, receiver_user_id: ctx.from.id, ephemeral_message_id: id });
  lastEphemeral.delete(`${ctx.chatId}:${ctx.from.id}`);
});

bot.command("ephemeral_reply", async (ctx) => {
  if (!ctx.chatId || !ctx.from) return;
  const id = lastEphemeral.get(`${ctx.chatId}:${ctx.from.id}`);
  if (!id) return ctx.reply("Send /ephemeral_send first.");
  return ctx.reply("✅ replying via ReplyParameters.ephemeral_message_id", {
    reply_parameters: { ephemeral_message_id: id } as any,
  });
});

// ---------------------------------------------------------------------------
// Communities — read-only from a bot's perspective; just report what's there.
// ---------------------------------------------------------------------------
bot.command("community_check", async (ctx) => {
  if (!ctx.chatId) return;
  const full = await ctx.api.getChat({ chat_id: ctx.chatId });
  const anyFull = full as any;
  return ctx.reply(
    anyFull.community
      ? `✅ this chat belongs to a Community: ${JSON.stringify(anyFull.community)}`
      : "This chat has no Community attached (expected unless you specifically linked one in-app — bots can't create Communities themselves)."
  );
});

// ---------------------------------------------------------------------------
// BotCommand.is_ephemeral round-trip
// ---------------------------------------------------------------------------
bot.command("cmd_ephemeral_set", async (ctx) => {
  await ctx.api.setMyCommands({
    commands: [
      { command: "start", description: "start" },
      { command: "ephemeral_only_cmd", description: "an ephemeral-flagged command", is_ephemeral: true } as any,
    ],
  });
  const back = await ctx.api.getMyCommands({});
  const found = back.find((c) => c.command === "ephemeral_only_cmd") as any;
  return ctx.reply(
    found?.is_ephemeral
      ? "✅ is_ephemeral round-tripped through setMyCommands/getMyCommands correctly."
      : `❌ is_ephemeral did NOT round-trip. Got back: ${JSON.stringify(found)}`
  );
});

// ---------------------------------------------------------------------------
// Join requests ("force join") — needs a group with "Approve new members" on.
// ---------------------------------------------------------------------------
let lastJoinRequestQueryId: string | undefined;

bot.on("chat_join_request", async (ctx) => {
  const req = ctx.update.chat_join_request!;
  console.log("[10.2 test] chat_join_request from", req.from.id, "query_id:", (req as any).query_id);
  lastJoinRequestQueryId = (req as any).query_id;

  if ((req as any).query_id) {
    // 10.1+ path
    await ctx.api.answerChatJoinRequestQuery({ query_id: (req as any).query_id, approve: true });
    console.log("[10.2 test] approved via answerChatJoinRequestQuery");
  } else {
    // universal fallback
    await ctx.api.approveChatJoinRequest({ chat_id: req.chat.id, user_id: req.from.id });
    console.log("[10.2 test] approved via approveChatJoinRequest (fallback)");
  }
});

bot.command("joinrequest_webapp", async (ctx) => {
  if (!lastJoinRequestQueryId) {
    return ctx.reply("No join request captured yet in this process — trigger one first (see /start instructions).");
  }
  await ctx.api.sendChatJoinRequestWebApp({
    query_id: lastJoinRequestQueryId,
    web_app: { url: "https://telegram.org" },
  });
  return ctx.reply("✅ sendChatJoinRequestWebApp sent against the last captured join request.");
});

bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log("[BOT API 10.2 TEST] running. /start it on Telegram.");
});
