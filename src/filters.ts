import { Context } from "./context";
import { Predicate } from "./composer";
import * as T from "./types";

/**
 * Composable predicates for common message-entity and reaction patterns,
 * matching telegraf's `telegraf/filters` module. Use with `bot.on(filter())`
 * (on() accepts a predicate directly) or `bot.filter(filter(), ...)`.
 *
 *   import { mention, hashtag } from "ayotbl";
 *   bot.on(mention(), (ctx) => ctx.reply("Someone got mentioned!"));
 *
 * Each filter maps to exactly one real Bot API entity type — mention() only
 * matches "@username" mentions, textMention() only matches the separate
 * "user without a username" mention type, url() only matches plain URL
 * text, textLink() only matches markdown-style [label](url) links. They're
 * deliberately not merged, since Telegram treats them as distinct entities.
 */

function hasEntityType(ctx: Context, type: T.MessageEntity["type"]): boolean {
  const entities = ctx.message?.entities ?? ctx.message?.caption_entities ?? [];
  return entities.some((e) => e.type === type);
}

export function mention(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "mention");
}
export function hashtag(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "hashtag");
}
export function cashtag(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "cashtag");
}
export function url(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "url");
}
export function textLink(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "text_link");
}
export function textMention(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "text_mention");
}
export function phone(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "phone_number");
}
export function email(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "email");
}
export function botCommand(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "bot_command");
}
export function spoiler(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "spoiler");
}
export function customEmoji(): Predicate<Context> {
  return (ctx) => hasEntityType(ctx, "custom_emoji");
}

/**
 * Matches message_reaction updates — optionally only a specific emoji being
 * added. `reaction()` alone matches any reaction change; `reaction('👍')`
 * matches only when 👍 appears in the new reaction set.
 */
export function reaction(emoji?: string): Predicate<Context> {
  return (ctx) => {
    const r = ctx.update.message_reaction;
    if (!r) return false;
    if (!emoji) return true;
    return r.new_reaction.some((rt) => rt.type === "emoji" && rt.emoji === emoji);
  };
}
