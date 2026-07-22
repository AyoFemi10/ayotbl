"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Context = void 0;
/**
 * Context wraps one incoming Update with the bits people reach for constantly:
 * ctx.message, ctx.chat, ctx.from, ctx.reply(...), ctx.match (from hears/command regex).
 *
 * Every reply/send helper is chainable-friendly (returns the sent Message),
 * and all take the same options object shape as the underlying Api method —
 * no new vocabulary to learn on top of the Bot API docs.
 */
class Context {
    update;
    api;
    botInfo;
    /** Populated by Composer when a command/hears/action pattern captured groups. */
    match = null;
    /** Free-for-all bag for your own middleware to stash things (auth info, etc). */
    state = {};
    /** Populated by the `session()` middleware — persisted across updates for the same chat (or user, if configured). */
    session;
    /** Populated by `Stage.middleware()` (see scenes.ts) once mounted — lets any handler call ctx.scene.enter(...)/leave(). */
    scene;
    /** Populated by `Stage.middleware()` only while a scene is active for this update. */
    wizard;
    constructor(update, api, botInfo) {
        this.update = update;
        this.api = api;
        this.botInfo = botInfo;
    }
    get updateType() {
        const known = [
            "message", "edited_message", "channel_post", "edited_channel_post",
            "business_message", "inline_query", "chosen_inline_result", "callback_query",
            "shipping_query", "pre_checkout_query", "poll", "poll_answer",
            "my_chat_member", "chat_member", "chat_join_request", "subscription",
            "managed_bot_created", "managed_bot",
        ];
        return known.find((k) => this.update[k] !== undefined);
    }
    get message() {
        return this.update.message ?? this.update.channel_post ?? this.update.business_message ?? this.update.edited_message;
    }
    get callbackQuery() { return this.update.callback_query; }
    get inlineQuery() { return this.update.inline_query; }
    get chat() {
        return (this.message?.chat ??
            this.callbackQuery?.message?.chat ??
            this.update.my_chat_member?.chat ??
            this.update.chat_member?.chat ??
            this.update.chat_join_request?.chat ??
            this.update.chat_boost?.chat ??
            this.update.removed_chat_boost?.chat ??
            this.update.poll_answer?.voter_chat);
    }
    get from() {
        return (this.message?.from ??
            this.callbackQuery?.from ??
            this.inlineQuery?.from ??
            this.update.chat_join_request?.from ??
            this.update.my_chat_member?.from ??
            this.update.chat_member?.from ??
            this.update.shipping_query?.from ??
            this.update.pre_checkout_query?.from ??
            this.update.poll_answer?.user);
    }
    get text() { return this.message?.text; }
    get chatId() { return this.chat?.id; }
    // ----- Reply helpers (auto-fill chat_id + reply_to_message_id) -----
    baseSend() {
        if (this.chatId === undefined)
            throw new Error("ctx has no chat to reply to for this update type");
        return { chat_id: this.chatId };
    }
    reply(text, extra = {}) {
        return this.api.sendMessage({ ...this.baseSend(), text, ...extra });
    }
    /** Send a Rich Message (Bot API 10.1) — tables, checklists, blockquotes, inline media. */
    replyRich(rich, extra = {}) {
        return this.api.sendRichMessage({ ...this.baseSend(), rich_message: rich, ...extra });
    }
    replyWithPhoto(photo, extra = {}) {
        return this.api.sendPhoto({ ...this.baseSend(), photo, ...extra });
    }
    replyWithVideo(video, extra = {}) {
        return this.api.sendVideo({ ...this.baseSend(), video, ...extra });
    }
    replyWithDocument(document, extra = {}) {
        return this.api.sendDocument({ ...this.baseSend(), document, ...extra });
    }
    replyWithAudio(audio, extra = {}) {
        return this.api.sendAudio({ ...this.baseSend(), audio, ...extra });
    }
    replyWithSticker(sticker, extra = {}) {
        return this.api.sendSticker({ ...this.baseSend(), sticker, ...extra });
    }
    replyWithPoll(question, options, extra = {}) {
        return this.api.sendPoll({ ...this.baseSend(), question, options, ...extra });
    }
    replyWithChatAction(action) {
        return this.api.sendChatAction({ ...this.baseSend(), action });
    }
    /**
     * The message_id to edit/delete when no explicit one is given — resolves
     * from the current message OR, critically, from callback_query.message
     * (the "user taps a button, bot edits that message" pattern). Previously
     * editText()/deleteMessage() only checked ctx.message, which is always
     * undefined for callback_query updates, silently breaking the single most
     * common edit-on-button-tap pattern.
     */
    get editableMessageId() {
        return this.message?.message_id ?? this.callbackQuery?.message?.message_id;
    }
    /** Edit the message this context came from — works from a plain message context and from inside action()/callback_query handlers. */
    editText(text, extra = {}) {
        return this.api.editMessageText({ chat_id: this.chatId, message_id: this.editableMessageId, text, ...extra });
    }
    editCaption(caption, extra = {}) {
        return this.api.editMessageCaption({ chat_id: this.chatId, message_id: this.editableMessageId, caption, ...extra });
    }
    editMedia(media, extra = {}) {
        return this.api.editMessageMedia({ chat_id: this.chatId, message_id: this.editableMessageId, media, ...extra });
    }
    /** Update just the inline keyboard — e.g. toggling a selection without resending the message. */
    editReplyMarkup(reply_markup) {
        return this.api.editMessageReplyMarkup({ chat_id: this.chatId, message_id: this.editableMessageId, reply_markup });
    }
    deleteMessage(messageId) {
        const id = messageId ?? this.editableMessageId;
        if (this.chatId === undefined || id === undefined) {
            throw new Error("ctx has no message to delete for this update type — pass a message_id explicitly");
        }
        return this.api.deleteMessage({ chat_id: this.chatId, message_id: id });
    }
    // ----- Callback query -----
    answerCbQuery(text, extra = {}) {
        if (!this.callbackQuery)
            throw new Error("No callback_query on this update");
        return this.api.answerCallbackQuery({ callback_query_id: this.callbackQuery.id, text, ...extra });
    }
    // ----- Inline query -----
    answerInlineQuery(results, extra = {}) {
        if (!this.inlineQuery)
            throw new Error("No inline_query on this update");
        return this.api.answerInlineQuery({ inline_query_id: this.inlineQuery.id, results, ...extra });
    }
}
exports.Context = Context;
//# sourceMappingURL=context.js.map