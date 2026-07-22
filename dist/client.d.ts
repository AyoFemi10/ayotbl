import * as T from "./types";
export declare class TelegramApiError extends Error {
    method: string;
    errorCode: number;
    parameters?: {
        retry_after?: number;
        migrate_to_chat_id?: number;
    } | undefined;
    constructor(method: string, errorCode: number, description: string, parameters?: {
        retry_after?: number;
        migrate_to_chat_id?: number;
    } | undefined);
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
    floodControl?: {
        maxRetries?: number;
    };
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
export declare class Transport {
    private token;
    private root;
    private maxRetries;
    private minIntervalMs;
    private queue;
    constructor(token: string, opts?: ClientOptions);
    /** Serializes calls at least `minIntervalMs` apart when that option is set; otherwise runs immediately. */
    private schedule;
    call<TResult = unknown>(method: string, params?: object, attempt?: number): Promise<TResult>;
    private performCall;
    private callMultipart;
    getFileDownloadUrl(filePath: string): string;
}
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
    options: (string | {
        text: string;
        text_parse_mode?: T.ParseMode;
        text_entities?: T.MessageEntity[];
        media?: T.PollMedia;
    })[];
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
export declare class Api {
    private transport;
    constructor(transport: Transport);
    /** Escape hatch: call ANY method by name, typed or not. Always up to date. */
    call<TResult = unknown>(method: string, params?: object): Promise<TResult>;
    fileUrl(filePath: string): string;
    getMe(): Promise<T.User>;
    logOut(): Promise<true>;
    close(): Promise<true>;
    getUpdates(params?: {
        offset?: T.Integer;
        limit?: T.Integer;
        timeout?: T.Integer;
        allowed_updates?: string[];
    }): Promise<T.Update[]>;
    setWebhook(params: {
        url: string;
        secret_token?: string;
        max_connections?: T.Integer;
        allowed_updates?: string[];
        drop_pending_updates?: boolean;
    }): Promise<true>;
    deleteWebhook(params?: {
        drop_pending_updates?: boolean;
    }): Promise<true>;
    getWebhookInfo(): Promise<T.WebhookInfo>;
    sendMessage(params: {
        chat_id: T.ChatId;
        text: string;
        parse_mode?: T.ParseMode;
        entities?: T.MessageEntity[];
        link_preview_options?: T.LinkPreviewOptions;
    } & CommonSendOptions): Promise<T.Message>;
    /**
     * Streams a partial plain-text message to a private chat while it's being
     * generated — the plain-text sibling of sendRichMessageDraft. Ephemeral
     * preview (not saved in the chat); call sendMessage with the final text
     * once generation finishes. Modeled on sendRichMessageDraft's confirmed
     * shape (draft_id, private-chat-only) since I could not independently
     * verify sendMessageDraft's exact parameters beyond its existence and
     * purpose in the official changelog.
     */
    sendMessageDraft(params: {
        chat_id: T.Integer;
        message_thread_id?: T.Integer;
        draft_id: T.Integer;
        text: string;
        parse_mode?: T.ParseMode;
        entities?: T.MessageEntity[];
    }): Promise<true>;
    /** New in Bot API 10.1 — structured tables, checklists, blockquotes, inline media, streamed or not. */
    sendRichMessage(params: {
        chat_id: T.ChatId;
        rich_message: T.InputRichMessage;
    } & CommonSendOptions): Promise<T.Message>;
    /**
     * Streams a partial rich message to a private chat while it's being generated.
     * The draft is ephemeral (a ~30s preview, not saved in the chat) — call
     * sendRichMessage with the complete content once generation finishes.
     * draft_id must be non-zero; repeated calls with the same draft_id animate
     * between states. Private chats only (chat_id must be the numeric user id).
     */
    sendRichMessageDraft(params: {
        chat_id: T.Integer;
        message_thread_id?: T.Integer;
        draft_id: T.Integer;
        rich_message: T.InputRichMessage;
    }): Promise<true>;
    forwardMessage(params: {
        chat_id: T.ChatId;
        from_chat_id: T.ChatId;
        message_id: T.Integer;
        message_thread_id?: T.Integer;
        disable_notification?: boolean;
        protect_content?: boolean;
        message_effect_id?: string;
        video_start_timestamp?: T.Integer;
    }): Promise<T.Message>;
    forwardMessages(params: {
        chat_id: T.ChatId;
        from_chat_id: T.ChatId;
        message_ids: T.Integer[];
        message_thread_id?: T.Integer;
        disable_notification?: boolean;
        protect_content?: boolean;
    }): Promise<T.MessageId[]>;
    copyMessage(params: {
        chat_id: T.ChatId;
        from_chat_id: T.ChatId;
        message_id: T.Integer;
        caption?: string;
        parse_mode?: T.ParseMode;
        show_caption_above_media?: boolean;
        video_start_timestamp?: T.Integer;
    } & CommonSendOptions): Promise<T.MessageId>;
    copyMessages(params: {
        chat_id: T.ChatId;
        from_chat_id: T.ChatId;
        message_ids: T.Integer[];
        remove_caption?: boolean;
    }): Promise<T.MessageId[]>;
    sendPhoto(params: {
        chat_id: T.ChatId;
        photo: T.InputFile;
        caption?: string;
        parse_mode?: T.ParseMode;
        has_spoiler?: boolean;
        show_caption_above_media?: boolean;
    } & CommonSendOptions): Promise<T.Message>;
    /** Bot API 10.2+: send a short looping "live photo" (discovered via the official changelog's parameter list, not independently field-verified beyond that — the LivePhoto receive type is a best-effort model). */
    sendLivePhoto(params: {
        chat_id: T.ChatId;
        live_photo: T.InputFile;
        caption?: string;
        parse_mode?: T.ParseMode;
    } & CommonSendOptions): Promise<T.Message>;
    sendAudio(params: {
        chat_id: T.ChatId;
        audio: T.InputFile;
        caption?: string;
        duration?: T.Integer;
        performer?: string;
        title?: string;
    } & CommonSendOptions): Promise<T.Message>;
    sendDocument(params: {
        chat_id: T.ChatId;
        document: T.InputFile;
        caption?: string;
        parse_mode?: T.ParseMode;
    } & CommonSendOptions): Promise<T.Message>;
    sendVideo(params: {
        chat_id: T.ChatId;
        video: T.InputFile;
        caption?: string;
        parse_mode?: T.ParseMode;
        width?: T.Integer;
        height?: T.Integer;
        duration?: T.Integer;
        has_spoiler?: boolean;
        show_caption_above_media?: boolean;
        supports_streaming?: boolean;
        cover?: T.InputFile;
        start_timestamp?: T.Integer;
    } & CommonSendOptions): Promise<T.Message>;
    sendAnimation(params: {
        chat_id: T.ChatId;
        animation: T.InputFile;
        caption?: string;
        width?: T.Integer;
        height?: T.Integer;
        duration?: T.Integer;
        has_spoiler?: boolean;
        show_caption_above_media?: boolean;
    } & CommonSendOptions): Promise<T.Message>;
    /** Was missing entirely despite being one of the most common Bot API methods — found while auditing Context.replyWithSticker's fallback to the raw call() escape hatch. */
    sendSticker(params: {
        chat_id: T.ChatId;
        sticker: T.InputFile;
        emoji?: string;
    } & CommonSendOptions): Promise<T.Message>;
    sendVoice(params: {
        chat_id: T.ChatId;
        voice: T.InputFile;
        caption?: string;
        duration?: T.Integer;
    } & CommonSendOptions): Promise<T.Message>;
    sendVideoNote(params: {
        chat_id: T.ChatId;
        video_note: T.InputFile;
        duration?: T.Integer;
        length?: T.Integer;
    } & CommonSendOptions): Promise<T.Message>;
    sendMediaGroup(params: {
        chat_id: T.ChatId;
        media: T.InputMedia[];
    } & Omit<CommonSendOptions, "reply_markup">): Promise<T.Message[]>;
    /** Bot API 7.6+: send photos/videos that require the receiver to pay Stars to unlock. */
    sendPaidMedia(params: {
        chat_id: T.ChatId;
        star_count: T.Integer;
        media: T.InputPaidMedia[];
        caption?: string;
        parse_mode?: T.ParseMode;
        payload?: string;
    } & CommonSendOptions): Promise<T.Message>;
    sendLocation(params: {
        chat_id: T.ChatId;
        latitude: number;
        longitude: number;
        horizontal_accuracy?: number;
        live_period?: T.Integer;
        heading?: T.Integer;
        proximity_alert_radius?: T.Integer;
    } & CommonSendOptions): Promise<T.Message>;
    editMessageLiveLocation(params: {
        chat_id?: T.ChatId;
        message_id?: T.Integer;
        inline_message_id?: string;
        latitude: number;
        longitude: number;
        heading?: T.Integer;
        proximity_alert_radius?: T.Integer;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    stopMessageLiveLocation(params: {
        chat_id?: T.ChatId;
        message_id?: T.Integer;
        inline_message_id?: string;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    sendVenue(params: {
        chat_id: T.ChatId;
        latitude: number;
        longitude: number;
        title: string;
        address: string;
        foursquare_id?: string;
    } & CommonSendOptions): Promise<T.Message>;
    sendContact(params: {
        chat_id: T.ChatId;
        phone_number: string;
        first_name: string;
        last_name?: string;
        vcard?: string;
    } & CommonSendOptions): Promise<T.Message>;
    sendPoll(params: SendPollParams): Promise<T.Message>;
    /** Convenience: sendPoll with type "quiz" pre-filled, matching telegraf's sendQuiz. */
    sendQuiz(params: Omit<SendPollParams, "type">): Promise<T.Message>;
    sendDice(params: {
        chat_id: T.ChatId;
        emoji?: "🎲" | "🎯" | "🏀" | "⚽" | "🎳" | "🎰";
    } & CommonSendOptions): Promise<T.Message>;
    sendChatAction(params: {
        chat_id: T.ChatId;
        message_thread_id?: T.Integer;
        action: "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location" | "record_video_note" | "upload_video_note";
    }): Promise<true>;
    editMessageText(params: {
        chat_id?: T.ChatId;
        message_id?: T.Integer;
        inline_message_id?: string;
        text?: string;
        rich_message?: T.InputRichMessage;
        parse_mode?: T.ParseMode;
        entities?: T.MessageEntity[];
        link_preview_options?: T.LinkPreviewOptions;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    editMessageCaption(params: {
        chat_id?: T.ChatId;
        message_id?: T.Integer;
        inline_message_id?: string;
        caption?: string;
        parse_mode?: T.ParseMode;
        show_caption_above_media?: boolean;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    editMessageMedia(params: {
        chat_id?: T.ChatId;
        message_id?: T.Integer;
        inline_message_id?: string;
        media: T.InputMedia;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    editMessageReplyMarkup(params: {
        chat_id?: T.ChatId;
        message_id?: T.Integer;
        inline_message_id?: string;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    stopPoll(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<T.Poll>;
    deleteMessage(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
    }): Promise<true>;
    deleteMessages(params: {
        chat_id: T.ChatId;
        message_ids: T.Integer[];
    }): Promise<true>;
    editEphemeralMessageText(params: {
        receiver_user_id: T.Integer;
        chat_id?: T.ChatId;
        ephemeral_message_id: T.Integer;
        text: string;
        parse_mode?: T.ParseMode;
        entities?: T.MessageEntity[];
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    editEphemeralMessageMedia(params: {
        receiver_user_id: T.Integer;
        chat_id?: T.ChatId;
        ephemeral_message_id: T.Integer;
        media: T.InputMedia;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    editEphemeralMessageCaption(params: {
        receiver_user_id: T.Integer;
        chat_id?: T.ChatId;
        ephemeral_message_id: T.Integer;
        caption?: string;
        parse_mode?: T.ParseMode;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    editEphemeralMessageReplyMarkup(params: {
        receiver_user_id: T.Integer;
        chat_id?: T.ChatId;
        ephemeral_message_id: T.Integer;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<true | T.Message>;
    deleteEphemeralMessage(params: {
        receiver_user_id: T.Integer;
        chat_id?: T.ChatId;
        ephemeral_message_id: T.Integer;
    }): Promise<true>;
    getFile(params: {
        file_id: T.FileId;
    }): Promise<T.File>;
    /** Convenience: resolve a file_id (or an already-fetched File) straight to a downloadable URL, calling getFile for you if needed. */
    getFileLink(fileIdOrFile: T.FileId | T.File): Promise<string>;
    getUserProfilePhotos(params: {
        user_id: T.Integer;
        offset?: T.Integer;
        limit?: T.Integer;
    }): Promise<T.UserProfilePhotos>;
    /** Bot API 9.4+ */
    getUserProfileAudios(params: {
        user_id: T.Integer;
        offset?: T.Integer;
        limit?: T.Integer;
    }): Promise<T.UserProfileAudios>;
    banChatMember(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
        until_date?: T.Integer;
        revoke_messages?: boolean;
    }): Promise<true>;
    unbanChatMember(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
        only_if_banned?: boolean;
    }): Promise<true>;
    restrictChatMember(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
        permissions: T.ChatPermissions;
        until_date?: T.Integer;
    }): Promise<true>;
    promoteChatMember(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
        is_anonymous?: boolean;
        can_manage_chat?: boolean;
        can_delete_messages?: boolean;
        can_manage_video_chats?: boolean;
        can_restrict_members?: boolean;
        can_promote_members?: boolean;
        can_change_info?: boolean;
        can_invite_users?: boolean;
        can_post_messages?: boolean;
        can_edit_messages?: boolean;
        can_pin_messages?: boolean;
        can_post_stories?: boolean;
        can_edit_stories?: boolean;
        can_delete_stories?: boolean;
        can_manage_topics?: boolean;
        can_manage_direct_messages?: boolean;
        can_manage_tags?: boolean;
    }): Promise<true>;
    setChatAdministratorCustomTitle(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
        custom_title: string;
    }): Promise<true>;
    /** Bot API 9.5+: set a member's tag, in chats that have tags enabled. */
    setChatMemberTag(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
        tag?: string;
    }): Promise<true>;
    banChatSenderChat(params: {
        chat_id: T.ChatId;
        sender_chat_id: T.Integer;
    }): Promise<true>;
    unbanChatSenderChat(params: {
        chat_id: T.ChatId;
        sender_chat_id: T.Integer;
    }): Promise<true>;
    setChatPermissions(params: {
        chat_id: T.ChatId;
        permissions: T.ChatPermissions;
    }): Promise<true>;
    exportChatInviteLink(params: {
        chat_id: T.ChatId;
    }): Promise<string>;
    createChatInviteLink(params: {
        chat_id: T.ChatId;
        name?: string;
        expire_date?: T.Integer;
        member_limit?: T.Integer;
        creates_join_request?: boolean;
    }): Promise<T.ChatInviteLink>;
    editChatInviteLink(params: {
        chat_id: T.ChatId;
        invite_link: string;
        name?: string;
        expire_date?: T.Integer;
        member_limit?: T.Integer;
        creates_join_request?: boolean;
    }): Promise<T.ChatInviteLink>;
    revokeChatInviteLink(params: {
        chat_id: T.ChatId;
        invite_link: string;
    }): Promise<T.ChatInviteLink>;
    approveChatJoinRequest(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
    }): Promise<true>;
    declineChatJoinRequest(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
    }): Promise<true>;
    /** Bot API 10.1+: respond to a join request raised as a query. */
    answerChatJoinRequestQuery(params: {
        query_id: string;
        approve: boolean;
    }): Promise<true>;
    /** Bot API 10.1+: open a Web App from a chat join request to let the user complete additional steps before approval. */
    sendChatJoinRequestWebApp(params: {
        query_id: string;
        web_app: T.WebAppInfo;
    }): Promise<true>;
    setChatPhoto(params: {
        chat_id: T.ChatId;
        photo: T.InputFile;
    }): Promise<true>;
    deleteChatPhoto(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    setChatTitle(params: {
        chat_id: T.ChatId;
        title: string;
    }): Promise<true>;
    setChatDescription(params: {
        chat_id: T.ChatId;
        description?: string;
    }): Promise<true>;
    pinChatMessage(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
        disable_notification?: boolean;
    }): Promise<true>;
    unpinChatMessage(params: {
        chat_id: T.ChatId;
        message_id?: T.Integer;
    }): Promise<true>;
    unpinAllChatMessages(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    leaveChat(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    getChat(params: {
        chat_id: T.ChatId;
    }): Promise<T.ChatFullInfo>;
    getChatAdministrators(params: {
        chat_id: T.ChatId;
        return_bots?: boolean;
    }): Promise<T.ChatMember[]>;
    getChatMemberCount(params: {
        chat_id: T.ChatId;
    }): Promise<number>;
    getChatMember(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
    }): Promise<T.ChatMember>;
    setChatStickerSet(params: {
        chat_id: T.ChatId;
        sticker_set_name: string;
    }): Promise<true>;
    deleteChatStickerSet(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    /** React to a message with emoji/custom-emoji/paid reactions (Bot API 7.0+). */
    setMessageReaction(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
        reaction?: T.ReactionType[];
        is_big?: boolean;
    }): Promise<true>;
    /** Bot API 10.0+ */
    deleteAllMessageReactions(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
    }): Promise<true>;
    deleteMessageReaction(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
        user_id: T.Integer;
    }): Promise<true>;
    getUserChatBoosts(params: {
        chat_id: T.ChatId;
        user_id: T.Integer;
    }): Promise<T.UserChatBoosts>;
    getForumTopicIconStickers(): Promise<T.Sticker[]>;
    createForumTopic(params: {
        chat_id: T.ChatId;
        name: string;
        icon_color?: T.Integer;
        icon_custom_emoji_id?: string;
    }): Promise<T.ForumTopic>;
    editForumTopic(params: {
        chat_id: T.ChatId;
        message_thread_id: T.Integer;
        name?: string;
        icon_custom_emoji_id?: string;
    }): Promise<true>;
    closeForumTopic(params: {
        chat_id: T.ChatId;
        message_thread_id: T.Integer;
    }): Promise<true>;
    reopenForumTopic(params: {
        chat_id: T.ChatId;
        message_thread_id: T.Integer;
    }): Promise<true>;
    deleteForumTopic(params: {
        chat_id: T.ChatId;
        message_thread_id: T.Integer;
    }): Promise<true>;
    unpinAllForumTopicMessages(params: {
        chat_id: T.ChatId;
        message_thread_id: T.Integer;
    }): Promise<true>;
    editGeneralForumTopic(params: {
        chat_id: T.ChatId;
        name: string;
    }): Promise<true>;
    closeGeneralForumTopic(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    reopenGeneralForumTopic(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    hideGeneralForumTopic(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    unhideGeneralForumTopic(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    unpinAllGeneralForumTopicMessages(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    setMyCommands(params: {
        commands: T.BotCommand[];
        scope?: T.BotCommandScope;
        language_code?: string;
    }): Promise<true>;
    deleteMyCommands(params?: {
        scope?: T.BotCommandScope;
        language_code?: string;
    }): Promise<true>;
    getMyCommands(params?: {
        scope?: T.BotCommandScope;
        language_code?: string;
    }): Promise<T.BotCommand[]>;
    setChatMenuButton(params?: {
        chat_id?: T.Integer;
        menu_button?: T.MenuButton;
    }): Promise<true>;
    getChatMenuButton(params?: {
        chat_id?: T.Integer;
    }): Promise<T.MenuButton>;
    setMyDefaultAdministratorRights(params?: {
        rights?: T.ChatAdministratorRights;
        for_channels?: boolean;
    }): Promise<true>;
    getMyDefaultAdministratorRights(params?: {
        for_channels?: boolean;
    }): Promise<T.ChatAdministratorRights>;
    setMyName(params?: {
        name?: string;
        language_code?: string;
    }): Promise<true>;
    getMyName(params?: {
        language_code?: string;
    }): Promise<{
        name: string;
    }>;
    setMyDescription(params?: {
        description?: string;
        language_code?: string;
    }): Promise<true>;
    getMyDescription(params?: {
        language_code?: string;
    }): Promise<{
        description: string;
    }>;
    setMyShortDescription(params?: {
        short_description?: string;
        language_code?: string;
    }): Promise<true>;
    getMyShortDescription(params?: {
        language_code?: string;
    }): Promise<{
        short_description: string;
    }>;
    /** Bot API 9.6+ */
    setMyProfilePhoto(params: {
        photo: T.InputProfilePhoto;
    }): Promise<true>;
    /** Bot API 8.0+: change a user's emoji status, if they've granted the bot permission via a Mini App. */
    setUserEmojiStatus(params: {
        user_id: T.Integer;
        emoji_status_custom_emoji_id?: string;
        emoji_status_expiration_date?: T.Integer;
    }): Promise<true>;
    removeMyProfilePhoto(): Promise<true>;
    /** Telegram Passport: report validation errors on a user's submitted Passport data. */
    setPassportDataErrors(params: {
        user_id: T.Integer;
        errors: T.PassportElementError[];
    }): Promise<true>;
    answerCallbackQuery(params: {
        callback_query_id: string;
        text?: string;
        show_alert?: boolean;
        url?: string;
        cache_time?: T.Integer;
    }): Promise<true>;
    /** Same endpoint as answerCallbackQuery, but for opening a game's URL from a callback query. */
    answerGameQuery(params: {
        callback_query_id: string;
        url: string;
    }): Promise<true>;
    answerInlineQuery(params: {
        inline_query_id: string;
        results: T.InlineQueryResult[];
        cache_time?: T.Integer;
        is_personal?: boolean;
        next_offset?: string;
        button?: T.InlineQueryResultsButton;
    }): Promise<true>;
    /** Set the result of an interaction with a Web App and send its corresponding message to the chat. */
    answerWebAppQuery(params: {
        web_app_query_id: string;
        result: T.InlineQueryResult;
    }): Promise<T.SentWebAppMessage>;
    /** Bot API 8.0+: let a Mini App hand a pre-built inline result to the user to share, without leaving the app. */
    savePreparedInlineMessage(params: {
        user_id: T.Integer;
        result: T.InlineQueryResult;
        allow_user_chats?: boolean;
        allow_bot_chats?: boolean;
        allow_group_chats?: boolean;
        allow_channel_chats?: boolean;
    }): Promise<T.PreparedInlineMessage>;
    /** Bot API 9.6+: prepares a keyboard button that a Mini App can show to let the user request creating a managed bot — distinct from savePreparedInlineMessage above. */
    savePreparedKeyboardButton(params: {
        user_id: T.Integer;
        button: T.KeyboardButtonRequestManagedBot;
    }): Promise<T.PreparedInlineMessage>;
    sendInvoice(params: {
        chat_id: T.ChatId;
        title: string;
        description: string;
        payload: string;
        provider_token?: string;
        currency: string;
        prices: T.LabeledPrice[];
        max_tip_amount?: T.Integer;
        suggested_tip_amounts?: T.Integer[];
        start_parameter?: string;
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
    } & CommonSendOptions): Promise<T.Message>;
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
    }): Promise<string>;
    answerShippingQuery(params: {
        shipping_query_id: string;
        ok: boolean;
        shipping_options?: T.ShippingOption[];
        error_message?: string;
    }): Promise<true>;
    answerPreCheckoutQuery(params: {
        pre_checkout_query_id: string;
        ok: boolean;
        error_message?: string;
    }): Promise<true>;
    getStickerSet(params: {
        name: string;
    }): Promise<T.StickerSet>;
    getCustomEmojiStickers(params: {
        custom_emoji_ids: string[];
    }): Promise<T.Sticker[]>;
    uploadStickerFile(params: {
        user_id: T.Integer;
        sticker: T.InputFile;
        sticker_format: "static" | "animated" | "video";
    }): Promise<T.File>;
    createNewStickerSet(params: {
        user_id: T.Integer;
        name: string;
        title: string;
        stickers: T.InputSticker[];
        sticker_type?: "regular" | "mask" | "custom_emoji";
        needs_repainting?: boolean;
    }): Promise<true>;
    addStickerToSet(params: {
        user_id: T.Integer;
        name: string;
        sticker: T.InputSticker;
    }): Promise<true>;
    setStickerPositionInSet(params: {
        sticker: T.FileId;
        position: T.Integer;
    }): Promise<true>;
    deleteStickerFromSet(params: {
        sticker: T.FileId;
    }): Promise<true>;
    setStickerEmojiList(params: {
        sticker: T.FileId;
        emoji_list: string[];
    }): Promise<true>;
    setStickerKeywords(params: {
        sticker: T.FileId;
        keywords?: string[];
    }): Promise<true>;
    setStickerMaskPosition(params: {
        sticker: T.FileId;
        mask_position?: T.MaskPosition;
    }): Promise<true>;
    setStickerSetTitle(params: {
        name: string;
        title: string;
    }): Promise<true>;
    setStickerSetThumbnail(params: {
        name: string;
        user_id: T.Integer;
        thumbnail?: T.InputFile;
        format: string;
    }): Promise<true>;
    setCustomEmojiStickerSetThumbnail(params: {
        name: string;
        custom_emoji_id?: string;
    }): Promise<true>;
    deleteStickerSet(params: {
        name: string;
    }): Promise<true>;
    sendGame(params: {
        chat_id: T.Integer;
        game_short_name: string;
    } & CommonSendOptions): Promise<T.Message>;
    setGameScore(params: {
        user_id: T.Integer;
        score: T.Integer;
        force?: boolean;
        chat_id?: T.Integer;
        message_id?: T.Integer;
        inline_message_id?: string;
    }): Promise<true | T.Message>;
    getGameHighScores(params: {
        user_id: T.Integer;
        chat_id?: T.Integer;
        message_id?: T.Integer;
        inline_message_id?: string;
    }): Promise<T.GameHighScore[]>;
    sendChecklist(params: {
        business_connection_id: string;
        chat_id: T.ChatId;
        checklist: T.InputChecklist;
        disable_notification?: boolean;
        protect_content?: boolean;
        message_effect_id?: string;
        reply_parameters?: T.ReplyParameters;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<T.Message>;
    editMessageChecklist(params: {
        business_connection_id: string;
        chat_id: T.ChatId;
        message_id: T.Integer;
        checklist: T.InputChecklist;
        reply_markup?: T.InlineKeyboardMarkup;
    }): Promise<T.Message>;
    getBusinessConnection(params: {
        business_connection_id: string;
    }): Promise<T.BusinessConnection>;
    readBusinessMessage(params: {
        business_connection_id: string;
        chat_id: T.Integer;
        message_id: T.Integer;
    }): Promise<true>;
    deleteBusinessMessages(params: {
        business_connection_id: string;
        message_ids: T.Integer[];
    }): Promise<true>;
    setBusinessAccountName(params: {
        business_connection_id: string;
        first_name: string;
        last_name?: string;
    }): Promise<true>;
    setBusinessAccountUsername(params: {
        business_connection_id: string;
        username?: string;
    }): Promise<true>;
    setBusinessAccountBio(params: {
        business_connection_id: string;
        bio?: string;
    }): Promise<true>;
    setBusinessAccountProfilePhoto(params: {
        business_connection_id: string;
        photo: T.InputProfilePhoto;
        is_public?: boolean;
    }): Promise<true>;
    removeBusinessAccountProfilePhoto(params: {
        business_connection_id: string;
        is_public?: boolean;
    }): Promise<true>;
    setBusinessAccountGiftSettings(params: {
        business_connection_id: string;
        show_gift_button: boolean;
        accepted_gift_types: T.AcceptedGiftTypes;
    }): Promise<true>;
    getBusinessAccountStarBalance(params: {
        business_connection_id: string;
    }): Promise<{
        amount: T.Integer;
        nanostar_amount?: T.Integer;
    }>;
    transferBusinessAccountStars(params: {
        business_connection_id: string;
        star_count: T.Integer;
    }): Promise<true>;
    getBusinessAccountGifts(params: {
        business_connection_id: string;
        exclude_unsaved?: boolean;
        exclude_saved?: boolean;
        exclude_unlimited?: boolean;
        exclude_limited_upgradable?: boolean;
        exclude_limited_non_upgradable?: boolean;
        exclude_unique?: boolean;
        exclude_from_blockchain?: boolean;
        sort_by_price?: boolean;
        offset?: string;
        limit?: T.Integer;
    }): Promise<{
        gifts: T.OwnedGift[];
        next_offset?: string;
    }>;
    /** Bot API 9.3+ */
    getUserGifts(params: {
        user_id: T.Integer;
        offset?: string;
        limit?: T.Integer;
    }): Promise<{
        gifts: T.OwnedGift[];
        next_offset?: string;
    }>;
    getChatGifts(params: {
        chat_id: T.ChatId;
        offset?: string;
        limit?: T.Integer;
    }): Promise<{
        gifts: T.OwnedGift[];
        next_offset?: string;
    }>;
    convertGiftToStars(params: {
        business_connection_id: string;
        owned_gift_id: string;
    }): Promise<true>;
    upgradeGift(params: {
        business_connection_id: string;
        owned_gift_id: string;
        keep_original_details?: boolean;
        star_count?: T.Integer;
    }): Promise<true>;
    transferGift(params: {
        business_connection_id: string;
        owned_gift_id: string;
        new_owner_chat_id: T.Integer;
        star_count?: T.Integer;
    }): Promise<true>;
    postStory(params: {
        business_connection_id: string;
        content: T.InputStoryContent;
        active_period: T.Integer;
        caption?: string;
        parse_mode?: T.ParseMode;
        caption_entities?: T.MessageEntity[];
        areas?: T.StoryArea[];
        post_to_chat_page?: boolean;
        protect_content?: boolean;
    }): Promise<T.Story>;
    editStory(params: {
        business_connection_id: string;
        story_id: T.Integer;
        content: T.InputStoryContent;
        caption?: string;
        parse_mode?: T.ParseMode;
        caption_entities?: T.MessageEntity[];
        areas?: T.StoryArea[];
    }): Promise<T.Story>;
    deleteStory(params: {
        business_connection_id: string;
        story_id: T.Integer;
    }): Promise<true>;
    /** Bot API 9.x+: repost a story across different business accounts the bot manages. */
    repostStory(params: {
        business_connection_id: string;
        story_id: T.Integer;
        active_period?: T.Integer;
    }): Promise<T.Story>;
    verifyUser(params: {
        user_id: T.Integer;
        custom_description?: string;
    }): Promise<true>;
    verifyChat(params: {
        chat_id: T.ChatId;
        custom_description?: string;
    }): Promise<true>;
    removeUserVerification(params: {
        user_id: T.Integer;
    }): Promise<true>;
    removeChatVerification(params: {
        chat_id: T.ChatId;
    }): Promise<true>;
    getAvailableGifts(): Promise<T.Gifts>;
    /** Send a gift to a user or channel chat (exactly one of user_id/chat_id). Can't be converted to Stars by the receiver. */
    sendGift(params: {
        gift_id: string;
        user_id?: T.Integer;
        chat_id?: T.ChatId;
        pay_for_upgrade?: boolean;
        text?: string;
        text_parse_mode?: T.ParseMode;
        text_entities?: T.MessageEntity[];
    }): Promise<true>;
    giftPremiumSubscription(params: {
        user_id: T.Integer;
        month_count: T.Integer;
        star_count: T.Integer;
        text?: string;
        text_parse_mode?: T.ParseMode;
        text_entities?: T.MessageEntity[];
    }): Promise<true>;
    getStarTransactions(params?: {
        offset?: T.Integer;
        limit?: T.Integer;
    }): Promise<T.StarTransactions>;
    /** Bot API 9.3+: the bot's own Stars balance. */
    getMyStarBalance(): Promise<T.StarAmount>;
    refundStarPayment(params: {
        user_id: T.Integer;
        telegram_payment_charge_id: string;
    }): Promise<true>;
    editUserStarSubscription(params: {
        user_id: T.Integer;
        telegram_payment_charge_id: string;
        is_canceled: boolean;
    }): Promise<true>;
    approveSuggestedPost(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
        send_date?: T.Integer;
    }): Promise<true>;
    declineSuggestedPost(params: {
        chat_id: T.ChatId;
        message_id: T.Integer;
        comment?: string;
    }): Promise<true>;
    /** Respond to a guest_message update, matching the shape of answerWebAppQuery. */
    answerGuestQuery(params: {
        guest_query_id: string;
        result: T.InlineQueryResult;
    }): Promise<T.SentWebAppMessage>;
    /** Retrieve the token of a bot your bot manages, after it's created via the newbot deep link flow. */
    getManagedBotToken(params: {
        bot_id: T.Integer;
    }): Promise<{
        token: string;
    }>;
    replaceManagedBotToken(params: {
        bot_id: T.Integer;
    }): Promise<{
        token: string;
    }>;
    /** Bot API 10.0+ */
    getManagedBotAccessSettings(params: {
        bot_id: T.Integer;
    }): Promise<T.BotAccessSettings>;
    setManagedBotAccessSettings(params: {
        bot_id: T.Integer;
        access_settings: T.BotAccessSettings;
    }): Promise<true>;
    /** Bot API 10.0+: fetch messages from a user's personal chat (e.g. to display in a Mini App). */
    getUserPersonalChatMessages(params: {
        user_id: T.Integer;
        offset?: T.Integer;
        limit?: T.Integer;
    }): Promise<T.Message[]>;
}
export {};
