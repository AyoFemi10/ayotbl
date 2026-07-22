import { Api } from "./client";
import * as T from "./types";
/**
 * Context wraps one incoming Update with the bits people reach for constantly:
 * ctx.message, ctx.chat, ctx.from, ctx.reply(...), ctx.match (from hears/command regex).
 *
 * Every reply/send helper is chainable-friendly (returns the sent Message),
 * and all take the same options object shape as the underlying Api method —
 * no new vocabulary to learn on top of the Bot API docs.
 */
export declare class Context {
    readonly update: T.Update;
    readonly api: Api;
    readonly botInfo: T.User;
    /** Populated by Composer when a command/hears/action pattern captured groups. */
    match: RegExpMatchArray | null;
    /** Free-for-all bag for your own middleware to stash things (auth info, etc). */
    state: Record<string, unknown>;
    /** Populated by the `session()` middleware — persisted across updates for the same chat (or user, if configured). */
    session?: Record<string, unknown>;
    /** Populated by `Stage.middleware()` (see scenes.ts) once mounted — lets any handler call ctx.scene.enter(...)/leave(). */
    scene?: {
        enter: (sceneId: string, initialState?: Record<string, unknown>) => Promise<void>;
        leave: () => Promise<void>;
        current: string | undefined;
    };
    /** Populated by `Stage.middleware()` only while a scene is active for this update. */
    wizard?: {
        cursor: number;
        state: Record<string, unknown>;
        next: () => Promise<void>;
        selectStep: (index: number) => Promise<void>;
    };
    constructor(update: T.Update, api: Api, botInfo: T.User);
    get updateType(): T.UpdateType;
    get message(): T.Message | undefined;
    get callbackQuery(): T.CallbackQuery | undefined;
    get inlineQuery(): T.InlineQuery | undefined;
    get chat(): T.Chat | undefined;
    get from(): T.User | undefined;
    get text(): string | undefined;
    get chatId(): T.ChatId | undefined;
    private baseSend;
    reply(text: string, extra?: Omit<Parameters<Api["sendMessage"]>[0], "chat_id" | "text">): Promise<T.Message>;
    /** Send a Rich Message (Bot API 10.1) — tables, checklists, blockquotes, inline media. */
    replyRich(rich: T.InputRichMessage, extra?: Omit<Parameters<Api["sendRichMessage"]>[0], "chat_id" | "rich_message">): Promise<T.Message>;
    replyWithPhoto(photo: T.InputFile, extra?: Omit<Parameters<Api["sendPhoto"]>[0], "chat_id" | "photo">): Promise<T.Message>;
    replyWithVideo(video: T.InputFile, extra?: Omit<Parameters<Api["sendVideo"]>[0], "chat_id" | "video">): Promise<T.Message>;
    replyWithDocument(document: T.InputFile, extra?: Omit<Parameters<Api["sendDocument"]>[0], "chat_id" | "document">): Promise<T.Message>;
    replyWithAudio(audio: T.InputFile, extra?: Omit<Parameters<Api["sendAudio"]>[0], "chat_id" | "audio">): Promise<T.Message>;
    replyWithSticker(sticker: T.InputFile, extra?: Omit<Parameters<Api["sendSticker"]>[0], "chat_id" | "sticker">): Promise<T.Message>;
    replyWithPoll(question: string, options: string[], extra?: Omit<Parameters<Api["sendPoll"]>[0], "chat_id" | "question" | "options">): Promise<T.Message>;
    replyWithChatAction(action: Parameters<Api["sendChatAction"]>[0]["action"]): Promise<true>;
    /**
     * The message_id to edit/delete when no explicit one is given — resolves
     * from the current message OR, critically, from callback_query.message
     * (the "user taps a button, bot edits that message" pattern). Previously
     * editText()/deleteMessage() only checked ctx.message, which is always
     * undefined for callback_query updates, silently breaking the single most
     * common edit-on-button-tap pattern.
     */
    private get editableMessageId();
    /** Edit the message this context came from — works from a plain message context and from inside action()/callback_query handlers. */
    editText(text: string, extra?: Record<string, unknown>): Promise<true | T.Message>;
    editCaption(caption: string, extra?: Record<string, unknown>): Promise<true | T.Message>;
    editMedia(media: T.InputMedia, extra?: Record<string, unknown>): Promise<true | T.Message>;
    /** Update just the inline keyboard — e.g. toggling a selection without resending the message. */
    editReplyMarkup(reply_markup?: T.InlineKeyboardMarkup): Promise<true | T.Message>;
    deleteMessage(messageId?: T.Integer): Promise<true>;
    answerCbQuery(text?: string, extra?: Omit<Parameters<Api["answerCallbackQuery"]>[0], "callback_query_id" | "text">): Promise<true>;
    answerInlineQuery(results: T.InlineQueryResult[], extra?: Omit<Parameters<Api["answerInlineQuery"]>[0], "inline_query_id" | "results">): Promise<true>;
}
