import * as T from "./types";

export class TelegramApiError extends Error {
  constructor(
    public method: string,
    public errorCode: number,
    description: string,
    public parameters?: { retry_after?: number; migrate_to_chat_id?: number }
  ) {
    super(`${method} failed (${errorCode}): ${description}`);
    this.name = "TelegramApiError";
  }
}

export interface ClientOptions {
  /** Override the API root — useful for a local Bot API server (core.telegram.org/bots/api#using-a-local-bot-api-server). */
  apiRoot?: string;
  /** Extra headers, custom fetch agent, etc. can go here later. */
  timeoutMs?: number;
  /**
   * Automatic flood-control handling: on HTTP 429, wait `retry_after` seconds
   * and retry, up to `maxRetries` times (default 3). Applies to every call
   * through this client, not just the polling loop.
   */
  floodControl?: { maxRetries?: number };
  /**
   * Proactively space outgoing calls at least this many ms apart, globally,
   * to stay under Telegram's rate limits before you ever hit a 429. Telegram
   * allows roughly 30 messages/sec across all chats — ~35ms is a safe default
   * if you enable this. Off by default (0).
   */
  minIntervalMs?: number;
}

/**
 * Low-level transport. Every method on Api ultimately calls `call()`.
 * Because `call()` accepts any method name and params, ayotbl never goes
 * "out of date" when Telegram ships a new method — you can use it the same
 * day via `bot.api.call('newMethodName', {...})` while ayotbl catches up
 * with a typed wrapper.
 */
export class Transport {
  private root: string;
  private maxRetries: number;
  private minIntervalMs: number;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private token: string, opts: ClientOptions = {}) {
    this.root = `${opts.apiRoot ?? "https://api.telegram.org"}/bot${token}`;
    this.maxRetries = opts.floodControl?.maxRetries ?? 3;
    this.minIntervalMs = opts.minIntervalMs ?? 0;
  }

  /** Serializes calls at least `minIntervalMs` apart when that option is set; otherwise runs immediately. */
  private schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.minIntervalMs) return fn();
    const result = this.queue.then(fn);
    this.queue = result.catch(() => undefined).then(() => sleep(this.minIntervalMs));
    return result;
  }

  async call<TResult = unknown>(method: string, params: object = {}, attempt = 0): Promise<TResult> {
    return this.schedule(async () => {
      try {
        return await this.performCall<TResult>(method, params);
      } catch (err) {
        if (err instanceof TelegramApiError && err.errorCode === 429 && err.parameters?.retry_after !== undefined && attempt < this.maxRetries) {
          await sleep(err.parameters.retry_after * 1000);
          return this.call<TResult>(method, params, attempt + 1);
        }
        throw err;
      }
    });
  }

  private async performCall<TResult = unknown>(method: string, params: object = {}): Promise<TResult> {
    const p = params as Record<string, unknown>;
    const hasFile = Object.values(p).some(isInputFileValue);
    const url = `${this.root}/${method}`;

    const res = hasFile
      ? await this.callMultipart(url, p)
      : await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(stripUndefined(p)),
        });

    const body = (await res.json()) as {
      ok: boolean;
      result?: TResult;
      error_code?: number;
      description?: string;
      parameters?: { retry_after?: number; migrate_to_chat_id?: number };
    };

    if (!body.ok) {
      throw new TelegramApiError(method, body.error_code ?? 0, body.description ?? "unknown error", body.parameters);
    }
    return body.result as TResult;
  }

  private async callMultipart(url: string, params: Record<string, unknown>) {
    const form = new FormData();
    for (const [key, value] of Object.entries(stripUndefined(params))) {
      if (isInputFileValue(value)) {
        const { blob, filename } = toBlob(value);
        form.append(key, blob, filename);
      } else if (typeof value === "object") {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, String(value));
      }
    }
    return fetch(url, { method: "POST", body: form });
  }

  getFileDownloadUrl(filePath: string): string {
    const tokenPart = this.root.split("/bot")[1];
    const base = this.root.split("/bot")[0];
    return `${base}/file/bot${tokenPart}/${filePath}`;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stripUndefined(obj: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function isInputFileValue(v: unknown): v is { source: Buffer | NodeJS.ReadableStream; filename: string } {
  return !!v && typeof v === "object" && "source" in (v as Record<string, unknown>);
}

function toBlob(v: { source: Buffer | NodeJS.ReadableStream; filename: string }): { blob: Blob; filename: string } {
  if (Buffer.isBuffer(v.source)) {
    return { blob: new Blob([v.source]), filename: v.filename };
  }
  throw new Error(
    "Streaming file sources aren't converted to Blob automatically yet — read into a Buffer first, e.g. via fs.readFileSync, and pass { source: buffer, filename }."
  );
}

// ---------- Common parameter shapes shared across many methods ----------

interface CommonSendOptions {
  message_thread_id?: T.Integer;
  disable_notification?: boolean;
  protect_content?: boolean;
  /** @deprecated use reply_parameters instead — kept only for pre-7.0 style code. */
  reply_to_message_id?: T.Integer;
  /** @deprecated use reply_parameters instead — kept only for pre-7.0 style code. */
  allow_sending_without_reply?: boolean;
  /** The real Bot API 7.0+ reply mechanism — supports quoting part of the original message, replying across chats, to poll options, checklist tasks, or ephemeral messages. */
  reply_parameters?: T.ReplyParameters;
  reply_markup?: T.ReplyMarkup;
  business_connection_id?: string;
  /** Bot API 7.4+: attach one of the message effects available in Telegram clients (e.g. confetti). */
  message_effect_id?: string;
  /** Bot API 9.2+: send to a specific Direct Messages topic in a channel's linked discussion supergroup. */
  direct_messages_topic_id?: T.Integer;
  /** Bot API 9.2+: turn this send into a suggested post awaiting approval, instead of posting immediately. */
  suggested_post_parameters?: T.SuggestedPostParameters;
  /** Bot API 7.11+: send even if it would exceed the free daily broadcast limit, paying with Stars. */
  allow_paid_broadcast?: boolean;
  /** Bot API 10.2+: make this message visible only to a specific user (Ephemeral Messages). */
  receiver_user_id?: T.Integer;
  callback_query_id?: string;
}

interface SendPollParams extends CommonSendOptions {
  chat_id: T.ChatId;
  question: string;
  question_parse_mode?: T.ParseMode;
  question_entities?: T.MessageEntity[];
  options: (string | { text: string; text_parse_mode?: T.ParseMode; text_entities?: T.MessageEntity[]; media?: T.PollMedia })[];
  is_anonymous?: boolean;
  type?: "regular" | "quiz";
  allows_multiple_answers?: boolean;
  /** Bot API 9.6+: plural — a quiz can now have more than one correct answer. */
  correct_option_ids?: T.Integer[];
  explanation?: string;
  explanation_parse_mode?: T.ParseMode;
  explanation_entities?: T.MessageEntity[];
  open_period?: T.Integer;
  close_date?: T.Integer;
  is_closed?: boolean;
  /** Bot API 9.6+ */
  allows_revoting?: boolean;
  shuffle_options?: boolean;
  allow_adding_options?: boolean;
  hide_results_until_closes?: boolean;
  description?: string;
  description_parse_mode?: T.ParseMode;
  description_entities?: T.MessageEntity[];
  /** Bot API 10.0+ */
  members_only?: boolean;
  country_codes?: string[];
  media?: T.PollMedia;
}

/**
 * The full, typed Bot API surface. Grouped by category to match the official
 * docs (core.telegram.org/bots/api) so anything you're used to in aiogram or
 * telegraf has an obvious equivalent name here.
 */
export class Api {
  constructor(private transport: Transport) {}

  /** Escape hatch: call ANY method by name, typed or not. Always up to date. */
  call<TResult = unknown>(method: string, params: object = {}): Promise<TResult> {
    return this.transport.call<TResult>(method, params);
  }

  fileUrl(filePath: string): string {
    return this.transport.getFileDownloadUrl(filePath);
  }

  // ----- Getting updates -----
  getMe() { return this.call<T.User>("getMe"); }
  logOut() { return this.call<true>("logOut"); }
  close() { return this.call<true>("close"); }
  getUpdates(params: { offset?: T.Integer; limit?: T.Integer; timeout?: T.Integer; allowed_updates?: string[] } = {}) {
    return this.call<T.Update[]>("getUpdates", params);
  }
  setWebhook(params: { url: string; secret_token?: string; max_connections?: T.Integer; allowed_updates?: string[]; drop_pending_updates?: boolean }) {
    return this.call<true>("setWebhook", params);
  }
  deleteWebhook(params: { drop_pending_updates?: boolean } = {}) { return this.call<true>("deleteWebhook", params); }
  getWebhookInfo() { return this.call<T.WebhookInfo>("getWebhookInfo"); }

  // ----- Sending messages -----
  sendMessage(params: { chat_id: T.ChatId; text: string; parse_mode?: T.ParseMode; entities?: T.MessageEntity[]; link_preview_options?: T.LinkPreviewOptions } & CommonSendOptions) {
    return this.call<T.Message>("sendMessage", params);
  }
  /**
   * Streams a partial plain-text message to a private chat while it's being
   * generated — the plain-text sibling of sendRichMessageDraft. Ephemeral
   * preview (not saved in the chat); call sendMessage with the final text
   * once generation finishes. Modeled on sendRichMessageDraft's confirmed
   * shape (draft_id, private-chat-only) since I could not independently
   * verify sendMessageDraft's exact parameters beyond its existence and
   * purpose in the official changelog.
   */
  sendMessageDraft(params: { chat_id: T.Integer; message_thread_id?: T.Integer; draft_id: T.Integer; text: string; parse_mode?: T.ParseMode; entities?: T.MessageEntity[] }) {
    return this.call<true>("sendMessageDraft", params);
  }
  /** New in Bot API 10.1 — structured tables, checklists, blockquotes, inline media, streamed or not. */
  sendRichMessage(params: { chat_id: T.ChatId; rich_message: T.InputRichMessage } & CommonSendOptions) {
    return this.call<T.Message>("sendRichMessage", params);
  }
  /**
   * Streams a partial rich message to a private chat while it's being generated.
   * The draft is ephemeral (a ~30s preview, not saved in the chat) — call
   * sendRichMessage with the complete content once generation finishes.
   * draft_id must be non-zero; repeated calls with the same draft_id animate
   * between states. Private chats only (chat_id must be the numeric user id).
   */
  sendRichMessageDraft(params: { chat_id: T.Integer; message_thread_id?: T.Integer; draft_id: T.Integer; rich_message: T.InputRichMessage }) {
    return this.call<true>("sendRichMessageDraft", params);
  }
  forwardMessage(params: { chat_id: T.ChatId; from_chat_id: T.ChatId; message_id: T.Integer; message_thread_id?: T.Integer; disable_notification?: boolean; protect_content?: boolean; message_effect_id?: string; video_start_timestamp?: T.Integer }) {
    return this.call<T.Message>("forwardMessage", params);
  }
  forwardMessages(params: { chat_id: T.ChatId; from_chat_id: T.ChatId; message_ids: T.Integer[]; message_thread_id?: T.Integer; disable_notification?: boolean; protect_content?: boolean }) {
    return this.call<T.MessageId[]>("forwardMessages", params);
  }
  copyMessage(params: { chat_id: T.ChatId; from_chat_id: T.ChatId; message_id: T.Integer; caption?: string; parse_mode?: T.ParseMode; show_caption_above_media?: boolean; video_start_timestamp?: T.Integer } & CommonSendOptions) {
    return this.call<T.MessageId>("copyMessage", params);
  }
  copyMessages(params: { chat_id: T.ChatId; from_chat_id: T.ChatId; message_ids: T.Integer[]; remove_caption?: boolean }) {
    return this.call<T.MessageId[]>("copyMessages", params);
  }
  sendPhoto(params: { chat_id: T.ChatId; photo: T.InputFile; caption?: string; parse_mode?: T.ParseMode; has_spoiler?: boolean; show_caption_above_media?: boolean } & CommonSendOptions) {
    return this.call<T.Message>("sendPhoto", params);
  }
  /** Bot API 10.2+: send a short looping "live photo" (discovered via the official changelog's parameter list, not independently field-verified beyond that — the LivePhoto receive type is a best-effort model). */
  sendLivePhoto(params: { chat_id: T.ChatId; live_photo: T.InputFile; caption?: string; parse_mode?: T.ParseMode } & CommonSendOptions) {
    return this.call<T.Message>("sendLivePhoto", params);
  }
  sendAudio(params: { chat_id: T.ChatId; audio: T.InputFile; caption?: string; duration?: T.Integer; performer?: string; title?: string } & CommonSendOptions) {
    return this.call<T.Message>("sendAudio", params);
  }
  sendDocument(params: { chat_id: T.ChatId; document: T.InputFile; caption?: string; parse_mode?: T.ParseMode } & CommonSendOptions) {
    return this.call<T.Message>("sendDocument", params);
  }
  sendVideo(params: { chat_id: T.ChatId; video: T.InputFile; caption?: string; parse_mode?: T.ParseMode; width?: T.Integer; height?: T.Integer; duration?: T.Integer; has_spoiler?: boolean; show_caption_above_media?: boolean; supports_streaming?: boolean; cover?: T.InputFile; start_timestamp?: T.Integer } & CommonSendOptions) {
    return this.call<T.Message>("sendVideo", params);
  }
  sendAnimation(params: { chat_id: T.ChatId; animation: T.InputFile; caption?: string; width?: T.Integer; height?: T.Integer; duration?: T.Integer; has_spoiler?: boolean; show_caption_above_media?: boolean } & CommonSendOptions) {
    return this.call<T.Message>("sendAnimation", params);
  }
  /** Was missing entirely despite being one of the most common Bot API methods — found while auditing Context.replyWithSticker's fallback to the raw call() escape hatch. */
  sendSticker(params: { chat_id: T.ChatId; sticker: T.InputFile; emoji?: string } & CommonSendOptions) {
    return this.call<T.Message>("sendSticker", params);
  }
  sendVoice(params: { chat_id: T.ChatId; voice: T.InputFile; caption?: string; duration?: T.Integer } & CommonSendOptions) {
    return this.call<T.Message>("sendVoice", params);
  }
  sendVideoNote(params: { chat_id: T.ChatId; video_note: T.InputFile; duration?: T.Integer; length?: T.Integer } & CommonSendOptions) {
    return this.call<T.Message>("sendVideoNote", params);
  }
  sendMediaGroup(params: { chat_id: T.ChatId; media: T.InputMedia[] } & Omit<CommonSendOptions, "reply_markup">) {
    return this.call<T.Message[]>("sendMediaGroup", params);
  }
  /** Bot API 7.6+: send photos/videos that require the receiver to pay Stars to unlock. */
  sendPaidMedia(params: { chat_id: T.ChatId; star_count: T.Integer; media: T.InputPaidMedia[]; caption?: string; parse_mode?: T.ParseMode; payload?: string } & CommonSendOptions) {
    return this.call<T.Message>("sendPaidMedia", params);
  }
  sendLocation(params: { chat_id: T.ChatId; latitude: number; longitude: number; horizontal_accuracy?: number; live_period?: T.Integer; heading?: T.Integer; proximity_alert_radius?: T.Integer } & CommonSendOptions) {
    return this.call<T.Message>("sendLocation", params);
  }
  editMessageLiveLocation(params: { chat_id?: T.ChatId; message_id?: T.Integer; inline_message_id?: string; latitude: number; longitude: number; heading?: T.Integer; proximity_alert_radius?: T.Integer; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editMessageLiveLocation", params);
  }
  stopMessageLiveLocation(params: { chat_id?: T.ChatId; message_id?: T.Integer; inline_message_id?: string; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("stopMessageLiveLocation", params);
  }
  sendVenue(params: { chat_id: T.ChatId; latitude: number; longitude: number; title: string; address: string; foursquare_id?: string } & CommonSendOptions) {
    return this.call<T.Message>("sendVenue", params);
  }
  sendContact(params: { chat_id: T.ChatId; phone_number: string; first_name: string; last_name?: string; vcard?: string } & CommonSendOptions) {
    return this.call<T.Message>("sendContact", params);
  }
  sendPoll(params: SendPollParams) {
    return this.call<T.Message>("sendPoll", params);
  }
  /** Convenience: sendPoll with type "quiz" pre-filled, matching telegraf's sendQuiz. */
  sendQuiz(params: Omit<SendPollParams, "type">) {
    return this.call<T.Message>("sendPoll", { ...params, type: "quiz" });
  }
  sendDice(params: { chat_id: T.ChatId; emoji?: "🎲" | "🎯" | "🏀" | "⚽" | "🎳" | "🎰" } & CommonSendOptions) {
    return this.call<T.Message>("sendDice", params);
  }
  sendChatAction(params: { chat_id: T.ChatId; message_thread_id?: T.Integer; action: "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_video_note" | "upload_video_note" }) {
    return this.call<true>("sendChatAction", params);
  }

  // ----- Editing / deleting -----
  editMessageText(params: { chat_id?: T.ChatId; message_id?: T.Integer; inline_message_id?: string; text?: string; rich_message?: T.InputRichMessage; parse_mode?: T.ParseMode; entities?: T.MessageEntity[]; link_preview_options?: T.LinkPreviewOptions; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editMessageText", params);
  }
  editMessageCaption(params: { chat_id?: T.ChatId; message_id?: T.Integer; inline_message_id?: string; caption?: string; parse_mode?: T.ParseMode; show_caption_above_media?: boolean; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editMessageCaption", params);
  }
  editMessageMedia(params: { chat_id?: T.ChatId; message_id?: T.Integer; inline_message_id?: string; media: T.InputMedia; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editMessageMedia", params);
  }
  editMessageReplyMarkup(params: { chat_id?: T.ChatId; message_id?: T.Integer; inline_message_id?: string; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editMessageReplyMarkup", params);
  }
  stopPoll(params: { chat_id: T.ChatId; message_id: T.Integer; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Poll>("stopPoll", params);
  }
  deleteMessage(params: { chat_id: T.ChatId; message_id: T.Integer }) { return this.call<true>("deleteMessage", params); }
  deleteMessages(params: { chat_id: T.ChatId; message_ids: T.Integer[] }) { return this.call<true>("deleteMessages", params); }

  // ----- Ephemeral Messages (Bot API 10.2) -----
  editEphemeralMessageText(params: { receiver_user_id: T.Integer; chat_id?: T.ChatId; ephemeral_message_id: T.Integer; text: string; parse_mode?: T.ParseMode; entities?: T.MessageEntity[]; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editEphemeralMessageText", params);
  }
  editEphemeralMessageMedia(params: { receiver_user_id: T.Integer; chat_id?: T.ChatId; ephemeral_message_id: T.Integer; media: T.InputMedia; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editEphemeralMessageMedia", params);
  }
  editEphemeralMessageCaption(params: { receiver_user_id: T.Integer; chat_id?: T.ChatId; ephemeral_message_id: T.Integer; caption?: string; parse_mode?: T.ParseMode; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editEphemeralMessageCaption", params);
  }
  editEphemeralMessageReplyMarkup(params: { receiver_user_id: T.Integer; chat_id?: T.ChatId; ephemeral_message_id: T.Integer; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message | true>("editEphemeralMessageReplyMarkup", params);
  }
  deleteEphemeralMessage(params: { receiver_user_id: T.Integer; chat_id?: T.ChatId; ephemeral_message_id: T.Integer }) {
    return this.call<true>("deleteEphemeralMessage", params);
  }

  // ----- Files -----
  getFile(params: { file_id: T.FileId }) { return this.call<T.File>("getFile", params); }
  /** Convenience: resolve a file_id (or an already-fetched File) straight to a downloadable URL, calling getFile for you if needed. */
  async getFileLink(fileIdOrFile: T.FileId | T.File): Promise<string> {
    const file = typeof fileIdOrFile === "string" ? await this.getFile({ file_id: fileIdOrFile }) : fileIdOrFile;
    if (!file.file_path) throw new Error("ayotbl: file_path missing on File — Telegram may not have returned it yet");
    return this.transport.getFileDownloadUrl(file.file_path);
  }
  getUserProfilePhotos(params: { user_id: T.Integer; offset?: T.Integer; limit?: T.Integer }) {
    return this.call<T.UserProfilePhotos>("getUserProfilePhotos", params);
  }
  /** Bot API 9.4+ */
  getUserProfileAudios(params: { user_id: T.Integer; offset?: T.Integer; limit?: T.Integer }) {
    return this.call<T.UserProfileAudios>("getUserProfileAudios", params);
  }

  // ----- Chat administration -----
  banChatMember(params: { chat_id: T.ChatId; user_id: T.Integer; until_date?: T.Integer; revoke_messages?: boolean }) { return this.call<true>("banChatMember", params); }
  unbanChatMember(params: { chat_id: T.ChatId; user_id: T.Integer; only_if_banned?: boolean }) { return this.call<true>("unbanChatMember", params); }
  restrictChatMember(params: { chat_id: T.ChatId; user_id: T.Integer; permissions: T.ChatPermissions; until_date?: T.Integer }) { return this.call<true>("restrictChatMember", params); }
  promoteChatMember(params: { chat_id: T.ChatId; user_id: T.Integer; is_anonymous?: boolean; can_manage_chat?: boolean; can_delete_messages?: boolean; can_manage_video_chats?: boolean; can_restrict_members?: boolean; can_promote_members?: boolean; can_change_info?: boolean; can_invite_users?: boolean; can_post_messages?: boolean; can_edit_messages?: boolean; can_pin_messages?: boolean; can_post_stories?: boolean; can_edit_stories?: boolean; can_delete_stories?: boolean; can_manage_topics?: boolean; can_manage_direct_messages?: boolean; can_manage_tags?: boolean }) { return this.call<true>("promoteChatMember", params); }
  setChatAdministratorCustomTitle(params: { chat_id: T.ChatId; user_id: T.Integer; custom_title: string }) { return this.call<true>("setChatAdministratorCustomTitle", params); }
  /** Bot API 9.5+: set a member's tag, in chats that have tags enabled. */
  setChatMemberTag(params: { chat_id: T.ChatId; user_id: T.Integer; tag?: string }) { return this.call<true>("setChatMemberTag", params); }
  banChatSenderChat(params: { chat_id: T.ChatId; sender_chat_id: T.Integer }) { return this.call<true>("banChatSenderChat", params); }
  unbanChatSenderChat(params: { chat_id: T.ChatId; sender_chat_id: T.Integer }) { return this.call<true>("unbanChatSenderChat", params); }
  setChatPermissions(params: { chat_id: T.ChatId; permissions: T.ChatPermissions }) { return this.call<true>("setChatPermissions", params); }
  exportChatInviteLink(params: { chat_id: T.ChatId }) { return this.call<string>("exportChatInviteLink", params); }
  createChatInviteLink(params: { chat_id: T.ChatId; name?: string; expire_date?: T.Integer; member_limit?: T.Integer; creates_join_request?: boolean }) { return this.call<T.ChatInviteLink>("createChatInviteLink", params); }
  editChatInviteLink(params: { chat_id: T.ChatId; invite_link: string; name?: string; expire_date?: T.Integer; member_limit?: T.Integer; creates_join_request?: boolean }) { return this.call<T.ChatInviteLink>("editChatInviteLink", params); }
  revokeChatInviteLink(params: { chat_id: T.ChatId; invite_link: string }) { return this.call<T.ChatInviteLink>("revokeChatInviteLink", params); }
  approveChatJoinRequest(params: { chat_id: T.ChatId; user_id: T.Integer }) { return this.call<true>("approveChatJoinRequest", params); }
  declineChatJoinRequest(params: { chat_id: T.ChatId; user_id: T.Integer }) { return this.call<true>("declineChatJoinRequest", params); }
  /** Bot API 10.1+: respond to a join request raised as a query. */
  answerChatJoinRequestQuery(params: { query_id: string; approve: boolean }) { return this.call<true>("answerChatJoinRequestQuery", params); }
  /** Bot API 10.1+: open a Web App from a chat join request to let the user complete additional steps before approval. */
  sendChatJoinRequestWebApp(params: { query_id: string; web_app: T.WebAppInfo }) { return this.call<true>("sendChatJoinRequestWebApp", params); }
  setChatPhoto(params: { chat_id: T.ChatId; photo: T.InputFile }) { return this.call<true>("setChatPhoto", params); }
  deleteChatPhoto(params: { chat_id: T.ChatId }) { return this.call<true>("deleteChatPhoto", params); }
  setChatTitle(params: { chat_id: T.ChatId; title: string }) { return this.call<true>("setChatTitle", params); }
  setChatDescription(params: { chat_id: T.ChatId; description?: string }) { return this.call<true>("setChatDescription", params); }
  pinChatMessage(params: { chat_id: T.ChatId; message_id: T.Integer; disable_notification?: boolean }) { return this.call<true>("pinChatMessage", params); }
  unpinChatMessage(params: { chat_id: T.ChatId; message_id?: T.Integer }) { return this.call<true>("unpinChatMessage", params); }
  unpinAllChatMessages(params: { chat_id: T.ChatId }) { return this.call<true>("unpinAllChatMessages", params); }
  leaveChat(params: { chat_id: T.ChatId }) { return this.call<true>("leaveChat", params); }
  getChat(params: { chat_id: T.ChatId }) { return this.call<T.ChatFullInfo>("getChat", params); }
  getChatAdministrators(params: { chat_id: T.ChatId; return_bots?: boolean }) { return this.call<T.ChatMember[]>("getChatAdministrators", params); }
  getChatMemberCount(params: { chat_id: T.ChatId }) { return this.call<T.Integer>("getChatMemberCount", params); }
  getChatMember(params: { chat_id: T.ChatId; user_id: T.Integer }) { return this.call<T.ChatMember>("getChatMember", params); }
  setChatStickerSet(params: { chat_id: T.ChatId; sticker_set_name: string }) { return this.call<true>("setChatStickerSet", params); }
  deleteChatStickerSet(params: { chat_id: T.ChatId }) { return this.call<true>("deleteChatStickerSet", params); }
  /** React to a message with emoji/custom-emoji/paid reactions (Bot API 7.0+). */
  setMessageReaction(params: { chat_id: T.ChatId; message_id: T.Integer; reaction?: T.ReactionType[]; is_big?: boolean }) { return this.call<true>("setMessageReaction", params); }
  /** Bot API 10.0+ */
  deleteAllMessageReactions(params: { chat_id: T.ChatId; message_id: T.Integer }) { return this.call<true>("deleteAllMessageReactions", params); }
  deleteMessageReaction(params: { chat_id: T.ChatId; message_id: T.Integer; user_id: T.Integer }) { return this.call<true>("deleteMessageReaction", params); }
  getUserChatBoosts(params: { chat_id: T.ChatId; user_id: T.Integer }) { return this.call<T.UserChatBoosts>("getUserChatBoosts", params); }

  // ----- Forum topics -----
  getForumTopicIconStickers() { return this.call<T.Sticker[]>("getForumTopicIconStickers"); }
  createForumTopic(params: { chat_id: T.ChatId; name: string; icon_color?: T.Integer; icon_custom_emoji_id?: string }) { return this.call<T.ForumTopic>("createForumTopic", params); }
  editForumTopic(params: { chat_id: T.ChatId; message_thread_id: T.Integer; name?: string; icon_custom_emoji_id?: string }) { return this.call<true>("editForumTopic", params); }
  closeForumTopic(params: { chat_id: T.ChatId; message_thread_id: T.Integer }) { return this.call<true>("closeForumTopic", params); }
  reopenForumTopic(params: { chat_id: T.ChatId; message_thread_id: T.Integer }) { return this.call<true>("reopenForumTopic", params); }
  deleteForumTopic(params: { chat_id: T.ChatId; message_thread_id: T.Integer }) { return this.call<true>("deleteForumTopic", params); }
  unpinAllForumTopicMessages(params: { chat_id: T.ChatId; message_thread_id: T.Integer }) { return this.call<true>("unpinAllForumTopicMessages", params); }
  // The "General" topic (message_thread_id-less) has its own dedicated set of methods.
  editGeneralForumTopic(params: { chat_id: T.ChatId; name: string }) { return this.call<true>("editGeneralForumTopic", params); }
  closeGeneralForumTopic(params: { chat_id: T.ChatId }) { return this.call<true>("closeGeneralForumTopic", params); }
  reopenGeneralForumTopic(params: { chat_id: T.ChatId }) { return this.call<true>("reopenGeneralForumTopic", params); }
  hideGeneralForumTopic(params: { chat_id: T.ChatId }) { return this.call<true>("hideGeneralForumTopic", params); }
  unhideGeneralForumTopic(params: { chat_id: T.ChatId }) { return this.call<true>("unhideGeneralForumTopic", params); }
  unpinAllGeneralForumTopicMessages(params: { chat_id: T.ChatId }) { return this.call<true>("unpinAllGeneralForumTopicMessages", params); }

  // ----- Bot profile / commands / menu -----
  setMyCommands(params: { commands: T.BotCommand[]; scope?: T.BotCommandScope; language_code?: string }) { return this.call<true>("setMyCommands", params); }
  deleteMyCommands(params: { scope?: T.BotCommandScope; language_code?: string } = {}) { return this.call<true>("deleteMyCommands", params); }
  getMyCommands(params: { scope?: T.BotCommandScope; language_code?: string } = {}) { return this.call<T.BotCommand[]>("getMyCommands", params); }
  setChatMenuButton(params: { chat_id?: T.Integer; menu_button?: T.MenuButton } = {}) { return this.call<true>("setChatMenuButton", params); }
  getChatMenuButton(params: { chat_id?: T.Integer } = {}) { return this.call<T.MenuButton>("getChatMenuButton", params); }
  setMyDefaultAdministratorRights(params: { rights?: T.ChatAdministratorRights; for_channels?: boolean } = {}) { return this.call<true>("setMyDefaultAdministratorRights", params); }
  getMyDefaultAdministratorRights(params: { for_channels?: boolean } = {}) { return this.call<T.ChatAdministratorRights>("getMyDefaultAdministratorRights", params); }
  setMyName(params: { name?: string; language_code?: string } = {}) { return this.call<true>("setMyName", params); }
  getMyName(params: { language_code?: string } = {}) { return this.call<{ name: string }>("getMyName", params); }
  setMyDescription(params: { description?: string; language_code?: string } = {}) { return this.call<true>("setMyDescription", params); }
  getMyDescription(params: { language_code?: string } = {}) { return this.call<{ description: string }>("getMyDescription", params); }
  setMyShortDescription(params: { short_description?: string; language_code?: string } = {}) { return this.call<true>("setMyShortDescription", params); }
  getMyShortDescription(params: { language_code?: string } = {}) { return this.call<{ short_description: string }>("getMyShortDescription", params); }
  /** Bot API 9.6+ */
  setMyProfilePhoto(params: { photo: T.InputProfilePhoto }) { return this.call<true>("setMyProfilePhoto", params); }
  /** Bot API 8.0+: change a user's emoji status, if they've granted the bot permission via a Mini App. */
  setUserEmojiStatus(params: { user_id: T.Integer; emoji_status_custom_emoji_id?: string; emoji_status_expiration_date?: T.Integer }) { return this.call<true>("setUserEmojiStatus", params); }
  removeMyProfilePhoto() { return this.call<true>("removeMyProfilePhoto"); }
  /** Telegram Passport: report validation errors on a user's submitted Passport data. */
  setPassportDataErrors(params: { user_id: T.Integer; errors: T.PassportElementError[] }) { return this.call<true>("setPassportDataErrors", params); }

  // ----- Callback / inline queries -----
  answerCallbackQuery(params: { callback_query_id: string; text?: string; show_alert?: boolean; url?: string; cache_time?: T.Integer }) { return this.call<true>("answerCallbackQuery", params); }
  /** Same endpoint as answerCallbackQuery, but for opening a game's URL from a callback query. */
  answerGameQuery(params: { callback_query_id: string; url: string }) { return this.call<true>("answerCallbackQuery", params); }
  answerInlineQuery(params: { inline_query_id: string; results: T.InlineQueryResult[]; cache_time?: T.Integer; is_personal?: boolean; next_offset?: string; button?: T.InlineQueryResultsButton }) { return this.call<true>("answerInlineQuery", params); }
  /** Set the result of an interaction with a Web App and send its corresponding message to the chat. */
  answerWebAppQuery(params: { web_app_query_id: string; result: T.InlineQueryResult }) { return this.call<T.SentWebAppMessage>("answerWebAppQuery", params); }
  /** Bot API 8.0+: let a Mini App hand a pre-built inline result to the user to share, without leaving the app. */
  savePreparedInlineMessage(params: { user_id: T.Integer; result: T.InlineQueryResult; allow_user_chats?: boolean; allow_bot_chats?: boolean; allow_group_chats?: boolean; allow_channel_chats?: boolean }) {
    return this.call<T.PreparedInlineMessage>("savePreparedInlineMessage", params);
  }
  /** Bot API 9.6+: prepares a keyboard button that a Mini App can show to let the user request creating a managed bot — distinct from savePreparedInlineMessage above. */
  savePreparedKeyboardButton(params: { user_id: T.Integer; button: T.KeyboardButtonRequestManagedBot }) {
    return this.call<T.PreparedInlineMessage>("savePreparedKeyboardButton", params);
  }

  // ----- Payments -----
  sendInvoice(params: { chat_id: T.ChatId; title: string; description: string; payload: string; provider_token?: string; currency: string; prices: T.LabeledPrice[]; max_tip_amount?: T.Integer; suggested_tip_amounts?: T.Integer[]; start_parameter?: string; provider_data?: string; photo_url?: string; photo_size?: T.Integer; photo_width?: T.Integer; photo_height?: T.Integer; need_name?: boolean; need_phone_number?: boolean; need_email?: boolean; need_shipping_address?: boolean; send_phone_number_to_provider?: boolean; send_email_to_provider?: boolean; is_flexible?: boolean } & CommonSendOptions) {
    return this.call<T.Message>("sendInvoice", params);
  }
  createInvoiceLink(params: {
    business_connection_id?: string;
    title: string;
    description: string;
    payload: string;
    provider_token?: string;
    currency: string;
    prices: T.LabeledPrice[];
    subscription_period?: T.Integer;
    max_tip_amount?: T.Integer;
    suggested_tip_amounts?: T.Integer[];
    provider_data?: string;
    photo_url?: string;
    photo_size?: T.Integer;
    photo_width?: T.Integer;
    photo_height?: T.Integer;
    need_name?: boolean;
    need_phone_number?: boolean;
    need_email?: boolean;
    need_shipping_address?: boolean;
    send_phone_number_to_provider?: boolean;
    send_email_to_provider?: boolean;
    is_flexible?: boolean;
  }) {
    return this.call<string>("createInvoiceLink", params);
  }
  answerShippingQuery(params: { shipping_query_id: string; ok: boolean; shipping_options?: T.ShippingOption[]; error_message?: string }) { return this.call<true>("answerShippingQuery", params); }
  answerPreCheckoutQuery(params: { pre_checkout_query_id: string; ok: boolean; error_message?: string }) { return this.call<true>("answerPreCheckoutQuery", params); }

  // ----- Stickers -----
  getStickerSet(params: { name: string }) { return this.call<T.StickerSet>("getStickerSet", params); }
  getCustomEmojiStickers(params: { custom_emoji_ids: string[] }) { return this.call<T.Sticker[]>("getCustomEmojiStickers", params); }
  uploadStickerFile(params: { user_id: T.Integer; sticker: T.InputFile; sticker_format: "static" | "animated" | "video" }) { return this.call<T.File>("uploadStickerFile", params); }
  createNewStickerSet(params: { user_id: T.Integer; name: string; title: string; stickers: T.InputSticker[]; sticker_type?: "regular" | "mask" | "custom_emoji"; needs_repainting?: boolean }) { return this.call<true>("createNewStickerSet", params); }
  addStickerToSet(params: { user_id: T.Integer; name: string; sticker: T.InputSticker }) { return this.call<true>("addStickerToSet", params); }
  setStickerPositionInSet(params: { sticker: T.FileId; position: T.Integer }) { return this.call<true>("setStickerPositionInSet", params); }
  deleteStickerFromSet(params: { sticker: T.FileId }) { return this.call<true>("deleteStickerFromSet", params); }
  setStickerEmojiList(params: { sticker: T.FileId; emoji_list: string[] }) { return this.call<true>("setStickerEmojiList", params); }
  setStickerKeywords(params: { sticker: T.FileId; keywords?: string[] }) { return this.call<true>("setStickerKeywords", params); }
  setStickerMaskPosition(params: { sticker: T.FileId; mask_position?: T.MaskPosition }) { return this.call<true>("setStickerMaskPosition", params); }
  setStickerSetTitle(params: { name: string; title: string }) { return this.call<true>("setStickerSetTitle", params); }
  setStickerSetThumbnail(params: { name: string; user_id: T.Integer; thumbnail?: T.InputFile; format: string }) { return this.call<true>("setStickerSetThumbnail", params); }
  setCustomEmojiStickerSetThumbnail(params: { name: string; custom_emoji_id?: string }) { return this.call<true>("setCustomEmojiStickerSetThumbnail", params); }
  deleteStickerSet(params: { name: string }) { return this.call<true>("deleteStickerSet", params); }

  // ----- Games -----
  sendGame(params: { chat_id: T.Integer; game_short_name: string } & CommonSendOptions) { return this.call<T.Message>("sendGame", params); }
  setGameScore(params: { user_id: T.Integer; score: T.Integer; force?: boolean; chat_id?: T.Integer; message_id?: T.Integer; inline_message_id?: string }) { return this.call<T.Message | true>("setGameScore", params); }
  getGameHighScores(params: { user_id: T.Integer; chat_id?: T.Integer; message_id?: T.Integer; inline_message_id?: string }) { return this.call<T.GameHighScore[]>("getGameHighScores", params); }

  // ----- Checklists (Bot API 9.1) — sent/edited on behalf of a business account only -----
  sendChecklist(params: { business_connection_id: string; chat_id: T.ChatId; checklist: T.InputChecklist; disable_notification?: boolean; protect_content?: boolean; message_effect_id?: string; reply_parameters?: T.ReplyParameters; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message>("sendChecklist", params);
  }
  editMessageChecklist(params: { business_connection_id: string; chat_id: T.ChatId; message_id: T.Integer; checklist: T.InputChecklist; reply_markup?: T.InlineKeyboardMarkup }) {
    return this.call<T.Message>("editMessageChecklist", params);
  }

  // ----- Business accounts -----
  getBusinessConnection(params: { business_connection_id: string }) { return this.call<T.BusinessConnection>("getBusinessConnection", params); }
  readBusinessMessage(params: { business_connection_id: string; chat_id: T.Integer; message_id: T.Integer }) { return this.call<true>("readBusinessMessage", params); }
  deleteBusinessMessages(params: { business_connection_id: string; message_ids: T.Integer[] }) { return this.call<true>("deleteBusinessMessages", params); }
  setBusinessAccountName(params: { business_connection_id: string; first_name: string; last_name?: string }) { return this.call<true>("setBusinessAccountName", params); }
  setBusinessAccountUsername(params: { business_connection_id: string; username?: string }) { return this.call<true>("setBusinessAccountUsername", params); }
  setBusinessAccountBio(params: { business_connection_id: string; bio?: string }) { return this.call<true>("setBusinessAccountBio", params); }
  setBusinessAccountProfilePhoto(params: { business_connection_id: string; photo: T.InputProfilePhoto; is_public?: boolean }) { return this.call<true>("setBusinessAccountProfilePhoto", params); }
  removeBusinessAccountProfilePhoto(params: { business_connection_id: string; is_public?: boolean }) { return this.call<true>("removeBusinessAccountProfilePhoto", params); }
  setBusinessAccountGiftSettings(params: { business_connection_id: string; show_gift_button: boolean; accepted_gift_types: T.AcceptedGiftTypes }) { return this.call<true>("setBusinessAccountGiftSettings", params); }
  getBusinessAccountStarBalance(params: { business_connection_id: string }) { return this.call<{ amount: T.Integer; nanostar_amount?: T.Integer }>("getBusinessAccountStarBalance", params); }
  transferBusinessAccountStars(params: { business_connection_id: string; star_count: T.Integer }) { return this.call<true>("transferBusinessAccountStars", params); }
  getBusinessAccountGifts(params: { business_connection_id: string; exclude_unsaved?: boolean; exclude_saved?: boolean; exclude_unlimited?: boolean; exclude_limited_upgradable?: boolean; exclude_limited_non_upgradable?: boolean; exclude_unique?: boolean; exclude_from_blockchain?: boolean; sort_by_price?: boolean; offset?: string; limit?: T.Integer }) {
    return this.call<{ gifts: T.OwnedGift[]; next_offset?: string }>("getBusinessAccountGifts", params);
  }
  /** Bot API 9.3+ */
  getUserGifts(params: { user_id: T.Integer; offset?: string; limit?: T.Integer }) {
    return this.call<{ gifts: T.OwnedGift[]; next_offset?: string }>("getUserGifts", params);
  }
  getChatGifts(params: { chat_id: T.ChatId; offset?: string; limit?: T.Integer }) {
    return this.call<{ gifts: T.OwnedGift[]; next_offset?: string }>("getChatGifts", params);
  }
  convertGiftToStars(params: { business_connection_id: string; owned_gift_id: string }) { return this.call<true>("convertGiftToStars", params); }
  upgradeGift(params: { business_connection_id: string; owned_gift_id: string; keep_original_details?: boolean; star_count?: T.Integer }) { return this.call<true>("upgradeGift", params); }
  transferGift(params: { business_connection_id: string; owned_gift_id: string; new_owner_chat_id: T.Integer; star_count?: T.Integer }) { return this.call<true>("transferGift", params); }
  postStory(params: { business_connection_id: string; content: T.InputStoryContent; active_period: T.Integer; caption?: string; parse_mode?: T.ParseMode; caption_entities?: T.MessageEntity[]; areas?: T.StoryArea[]; post_to_chat_page?: boolean; protect_content?: boolean }) { return this.call<T.Story>("postStory", params); }
  editStory(params: { business_connection_id: string; story_id: T.Integer; content: T.InputStoryContent; caption?: string; parse_mode?: T.ParseMode; caption_entities?: T.MessageEntity[]; areas?: T.StoryArea[] }) { return this.call<T.Story>("editStory", params); }
  deleteStory(params: { business_connection_id: string; story_id: T.Integer }) { return this.call<true>("deleteStory", params); }
  /** Bot API 9.x+: repost a story across different business accounts the bot manages. */
  repostStory(params: { business_connection_id: string; story_id: T.Integer; active_period?: T.Integer }) { return this.call<T.Story>("repostStory", params); }

  // ----- Verification (Bot API 8.2+) -----
  verifyUser(params: { user_id: T.Integer; custom_description?: string }) { return this.call<true>("verifyUser", params); }
  verifyChat(params: { chat_id: T.ChatId; custom_description?: string }) { return this.call<true>("verifyChat", params); }
  removeUserVerification(params: { user_id: T.Integer }) { return this.call<true>("removeUserVerification", params); }
  removeChatVerification(params: { chat_id: T.ChatId }) { return this.call<true>("removeChatVerification", params); }

  // ----- Gifts (Bot API 8.0+) -----
  getAvailableGifts() { return this.call<T.Gifts>("getAvailableGifts"); }
  /** Send a gift to a user or channel chat (exactly one of user_id/chat_id). Can't be converted to Stars by the receiver. */
  sendGift(params: { gift_id: string; user_id?: T.Integer; chat_id?: T.ChatId; pay_for_upgrade?: boolean; text?: string; text_parse_mode?: T.ParseMode; text_entities?: T.MessageEntity[] }) {
    return this.call<true>("sendGift", params);
  }
  giftPremiumSubscription(params: { user_id: T.Integer; month_count: T.Integer; star_count: T.Integer; text?: string; text_parse_mode?: T.ParseMode; text_entities?: T.MessageEntity[] }) {
    return this.call<true>("giftPremiumSubscription", params);
  }

  // ----- Stars & Payments transactions (Bot API 7.4+) -----
  getStarTransactions(params: { offset?: T.Integer; limit?: T.Integer } = {}) { return this.call<T.StarTransactions>("getStarTransactions", params); }
  /** Bot API 9.3+: the bot's own Stars balance. */
  getMyStarBalance() { return this.call<T.StarAmount>("getMyStarBalance"); }
  refundStarPayment(params: { user_id: T.Integer; telegram_payment_charge_id: string }) { return this.call<true>("refundStarPayment", params); }
  editUserStarSubscription(params: { user_id: T.Integer; telegram_payment_charge_id: string; is_canceled: boolean }) { return this.call<true>("editUserStarSubscription", params); }

  // ----- Suggested Posts / Direct Messages in Channels (Bot API 9.2+) -----
  approveSuggestedPost(params: { chat_id: T.ChatId; message_id: T.Integer; send_date?: T.Integer }) { return this.call<true>("approveSuggestedPost", params); }
  declineSuggestedPost(params: { chat_id: T.ChatId; message_id: T.Integer; comment?: string }) { return this.call<true>("declineSuggestedPost", params); }

  // ----- Guest mode (Bot API 10.0+) — bots being mentioned/queried by users they have no direct relationship with -----
  /** Respond to a guest_message update, matching the shape of answerWebAppQuery. */
  answerGuestQuery(params: { guest_query_id: string; result: T.InlineQueryResult }) { return this.call<T.SentWebAppMessage>("answerGuestQuery", params); }

  // ----- Managed Bots (Bot API 9.5/9.6) -----
  // NOTE: these two methods are newer than telegraf v4's own coverage (telegraf hasn't
  // added them as of this writing), so they're implemented from the Bot API changelog
  // directly rather than cross-checked against telegraf. Verify against the current
  // core.telegram.org/bots/api docs before depending on them in production.
  /** Retrieve the token of a bot your bot manages, after it's created via the newbot deep link flow. */
  getManagedBotToken(params: { bot_id: T.Integer }) { return this.call<{ token: string }>("getManagedBotToken", params); }
  replaceManagedBotToken(params: { bot_id: T.Integer }) { return this.call<{ token: string }>("replaceManagedBotToken", params); }
  /** Bot API 10.0+ */
  getManagedBotAccessSettings(params: { bot_id: T.Integer }) { return this.call<T.BotAccessSettings>("getManagedBotAccessSettings", params); }
  setManagedBotAccessSettings(params: { bot_id: T.Integer; access_settings: T.BotAccessSettings }) { return this.call<true>("setManagedBotAccessSettings", params); }
  /** Bot API 10.0+: fetch messages from a user's personal chat (e.g. to display in a Mini App). */
  getUserPersonalChatMessages(params: { user_id: T.Integer; offset?: T.Integer; limit?: T.Integer }) { return this.call<T.Message[]>("getUserPersonalChatMessages", params); }
}
