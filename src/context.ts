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
export class Context {
  /** Populated by Composer when a command/hears/action pattern captured groups. */
  match: RegExpMatchArray | null = null;
  /** Free-for-all bag for your own middleware to stash things (auth info, etc). */
  state: Record<string, unknown> = {};
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

  constructor(public readonly update: T.Update, public readonly api: Api, public readonly botInfo: T.User) {}

  get updateType(): T.UpdateType {
    const known: T.UpdateType[] = [
      "message", "edited_message", "channel_post", "edited_channel_post",
      "business_message", "inline_query", "chosen_inline_result", "callback_query",
      "shipping_query", "pre_checkout_query", "poll", "poll_answer",
      "my_chat_member", "chat_member", "chat_join_request", "subscription",
      "managed_bot_created", "managed_bot",
    ];
    return known.find((k) => this.update[k] !== undefined) as T.UpdateType;
  }

  get message(): T.Message | undefined {
    return this.update.message ?? this.update.channel_post ?? this.update.business_message ?? this.update.edited_message;
  }
  get callbackQuery(): T.CallbackQuery | undefined { return this.update.callback_query; }
  get inlineQuery(): T.InlineQuery | undefined { return this.update.inline_query; }
  get chat(): T.Chat | undefined { return this.message?.chat ?? this.callbackQuery?.message?.chat; }
  get from(): T.User | undefined {
    return this.message?.from ?? this.callbackQuery?.from ?? this.inlineQuery?.from ?? this.update.chat_join_request?.from;
  }
  get text(): string | undefined { return this.message?.text; }
  get chatId(): T.ChatId | undefined { return this.chat?.id; }

  // ----- Reply helpers (auto-fill chat_id + reply_to_message_id) -----

  private baseSend() {
    if (this.chatId === undefined) throw new Error("ctx has no chat to reply to for this update type");
    return { chat_id: this.chatId };
  }

  reply(text: string, extra: Omit<Parameters<Api["sendMessage"]>[0], "chat_id" | "text"> = {}) {
    return this.api.sendMessage({ ...this.baseSend(), text, ...extra });
  }

  /** Send a Rich Message (Bot API 10.1) — tables, checklists, blockquotes, inline media. */
  replyRich(rich: T.InputRichMessage, extra: Omit<Parameters<Api["sendRichMessage"]>[0], "chat_id" | "rich_message"> = {}) {
    return this.api.sendRichMessage({ ...this.baseSend(), rich_message: rich, ...extra });
  }

  replyWithPhoto(photo: T.InputFile, extra: Omit<Parameters<Api["sendPhoto"]>[0], "chat_id" | "photo"> = {}) {
    return this.api.sendPhoto({ ...this.baseSend(), photo, ...extra });
  }
  replyWithVideo(video: T.InputFile, extra: Omit<Parameters<Api["sendVideo"]>[0], "chat_id" | "video"> = {}) {
    return this.api.sendVideo({ ...this.baseSend(), video, ...extra });
  }
  replyWithDocument(document: T.InputFile, extra: Omit<Parameters<Api["sendDocument"]>[0], "chat_id" | "document"> = {}) {
    return this.api.sendDocument({ ...this.baseSend(), document, ...extra });
  }
  replyWithAudio(audio: T.InputFile, extra: Omit<Parameters<Api["sendAudio"]>[0], "chat_id" | "audio"> = {}) {
    return this.api.sendAudio({ ...this.baseSend(), audio, ...extra });
  }
  replyWithSticker(sticker: T.InputFile) { return this.api.call<T.Message>("sendSticker", { ...this.baseSend(), sticker }); }
  replyWithPoll(question: string, options: string[], extra: Omit<Parameters<Api["sendPoll"]>[0], "chat_id" | "question" | "options"> = {}) {
    return this.api.sendPoll({ ...this.baseSend(), question, options, ...extra });
  }
  replyWithChatAction(action: Parameters<Api["sendChatAction"]>[0]["action"]) {
    return this.api.sendChatAction({ ...this.baseSend(), action });
  }

  /** Edit the message this context came from (if it's editable — e.g. inside an action() handler). */
  editText(text: string, extra: Record<string, unknown> = {}) {
    return this.api.editMessageText({ chat_id: this.chatId, message_id: this.message?.message_id, text, ...extra });
  }
  deleteMessage(messageId?: T.Integer) {
    return this.api.deleteMessage({ chat_id: this.chatId!, message_id: messageId ?? this.message!.message_id });
  }

  // ----- Callback query -----
  answerCbQuery(text?: string, extra: Omit<Parameters<Api["answerCallbackQuery"]>[0], "callback_query_id" | "text"> = {}) {
    if (!this.callbackQuery) throw new Error("No callback_query on this update");
    return this.api.answerCallbackQuery({ callback_query_id: this.callbackQuery.id, text, ...extra });
  }

  // ----- Inline query -----
  answerInlineQuery(results: T.InlineQueryResult[], extra: Omit<Parameters<Api["answerInlineQuery"]>[0], "inline_query_id" | "results"> = {}) {
    if (!this.inlineQuery) throw new Error("No inline_query on this update");
    return this.api.answerInlineQuery({ inline_query_id: this.inlineQuery.id, results, ...extra });
  }
}
