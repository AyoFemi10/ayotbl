"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mention = mention;
exports.hashtag = hashtag;
exports.cashtag = cashtag;
exports.url = url;
exports.textLink = textLink;
exports.textMention = textMention;
exports.phone = phone;
exports.email = email;
exports.botCommand = botCommand;
exports.spoiler = spoiler;
exports.customEmoji = customEmoji;
exports.reaction = reaction;
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
function hasEntityType(ctx, type) {
    const entities = ctx.message?.entities ?? ctx.message?.caption_entities ?? [];
    return entities.some((e) => e.type === type);
}
function mention() {
    return (ctx) => hasEntityType(ctx, "mention");
}
function hashtag() {
    return (ctx) => hasEntityType(ctx, "hashtag");
}
function cashtag() {
    return (ctx) => hasEntityType(ctx, "cashtag");
}
function url() {
    return (ctx) => hasEntityType(ctx, "url");
}
function textLink() {
    return (ctx) => hasEntityType(ctx, "text_link");
}
function textMention() {
    return (ctx) => hasEntityType(ctx, "text_mention");
}
function phone() {
    return (ctx) => hasEntityType(ctx, "phone_number");
}
function email() {
    return (ctx) => hasEntityType(ctx, "email");
}
function botCommand() {
    return (ctx) => hasEntityType(ctx, "bot_command");
}
function spoiler() {
    return (ctx) => hasEntityType(ctx, "spoiler");
}
function customEmoji() {
    return (ctx) => hasEntityType(ctx, "custom_emoji");
}
/**
 * Matches message_reaction updates — optionally only a specific emoji being
 * added. `reaction()` alone matches any reaction change; `reaction('👍')`
 * matches only when 👍 appears in the new reaction set.
 */
function reaction(emoji) {
    return (ctx) => {
        const r = ctx.update.message_reaction;
        if (!r)
            return false;
        if (!emoji)
            return true;
        return r.new_reaction.some((rt) => rt.type === "emoji" && rt.emoji === emoji);
    };
}
//# sourceMappingURL=filters.js.map