/**
 * ayotbl — Telegram Bot API type definitions
 * Tracks Bot API 10.1 (2026-06-11), including Rich Messages and Managed Bots.
 * Not every field of every object is written by hand: `[key: string]: any`
 * escape hatches are intentionally avoided here so you get real autocomplete,
 * but `RawApiMethods` in client.ts covers any method not yet given a typed
 * wrapper, so a new Bot API release never blocks you.
 */
export type Integer = number;
export type FileId = string;
export type ChatId = number | string;
export interface User {
    id: Integer;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
    added_to_attachment_menu?: boolean;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
    can_connect_to_business?: boolean;
    has_main_web_app?: boolean;
    /** Bot API 9.6+: this bot can create and manage other bots (Managed Bots). */
    can_manage_bots?: boolean;
    /** Bot API 10.1+ */
    supports_join_request_queries?: boolean;
    /** Bot API 10.0+ (Guest mode) */
    supports_guest_queries?: boolean;
    /** Bot API 9.6+: whether forum topic mode is enabled for the bot in private chats. */
    has_topics_enabled?: boolean;
    /** Discovered via live getMe() response — whether users can create forum topics with this bot in private chats. */
    allows_users_to_create_topics?: boolean;
}
export type ChatType = "private" | "group" | "supergroup" | "channel";
export interface Chat {
    id: Integer;
    type: ChatType;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    is_forum?: boolean;
}
export interface ChatFullInfo extends Chat {
    photo?: ChatPhoto;
    active_usernames?: string[];
    bio?: string;
    has_private_forwards?: boolean;
    join_to_send_messages?: boolean;
    join_by_request?: boolean;
    description?: string;
    invite_link?: string;
    pinned_message?: Message;
    permissions?: ChatPermissions;
    slow_mode_delay?: Integer;
    message_auto_delete_time?: Integer;
    has_aggressive_anti_spam_enabled?: boolean;
    has_hidden_members?: boolean;
    has_protected_content?: boolean;
    guard_bot?: User;
    /** @deprecated replaced by accepted_gift_types (AcceptedGiftTypes) — kept only for reading old cached data. */
    can_send_gift?: boolean;
    accepted_gift_types?: AcceptedGiftTypes;
    /** Bot API 9.2+: true for a supergroup used as a channel's Direct Messages chat. */
    is_direct_messages?: boolean;
    /** Bot API 9.2+: the parent channel chat, when is_direct_messages is true. */
    parent_chat?: Chat;
    sticker_set_name?: string;
    can_set_sticker_set?: boolean;
    linked_chat_id?: Integer;
    location?: ChatLocation;
    /** Bot API 10.2+: present if this chat belongs to a Community (several linked supergroups/channels/bots around a shared topic). */
    community?: Community;
    birthdate?: {
        day: Integer;
        month: Integer;
        year?: Integer;
    };
    business_intro?: BusinessIntro;
    business_location?: BusinessLocation;
    business_opening_hours?: BusinessOpeningHours;
    personal_chat?: Chat;
    available_reactions?: ReactionType[];
    accent_color_id?: Integer;
    profile_accent_color_id?: Integer;
    has_visible_history?: boolean;
    emoji_status_custom_emoji_id?: string;
    emoji_status_expiration_date?: Integer;
    background_custom_emoji_id?: string;
    profile_background_custom_emoji_id?: string;
    custom_emoji_sticker_set_name?: string;
    unrestrict_boost_count?: Integer;
    can_send_paid_media?: boolean;
    background?: ChatBackground;
    /** Bot API 9.3+ */
    rating?: UserRating;
    paid_message_star_count?: Integer;
    unique_gift_colors?: UniqueGiftColors;
    /** Bot API 9.4+ */
    first_profile_audio?: Audio;
}
/** Several supergroups, channels, and bots linked together around a shared topic or audience. */
export interface Community {
    id: Integer;
    title: string;
    photo?: ChatPhoto;
}
export interface CommunityChatAdded {
    community: Community;
}
export interface CommunityChatRemoved {
    community: Community;
}
export interface ChatPhoto {
    small_file_id: FileId;
    small_file_unique_id: string;
    big_file_id: FileId;
    big_file_unique_id: string;
}
export interface ChatPermissions {
    can_send_messages?: boolean;
    can_send_audios?: boolean;
    can_send_documents?: boolean;
    can_send_photos?: boolean;
    can_send_videos?: boolean;
    can_send_video_notes?: boolean;
    can_send_voice_notes?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
    can_manage_topics?: boolean;
    /** Bot API 10.0+ */
    can_react_to_messages?: boolean;
    /** Bot API 9.5+ */
    can_edit_tag?: boolean;
}
export interface ChatLocation {
    location: Location;
    address: string;
}
export interface Location {
    longitude: number;
    latitude: number;
    horizontal_accuracy?: number;
    live_period?: Integer;
    heading?: Integer;
    proximity_alert_radius?: Integer;
}
export interface MessageEntity {
    type: "mention" | "hashtag" | "cashtag" | "bot_command" | "url" | "email" | "phone_number" | "bold" | "italic" | "underline" | "strikethrough" | "spoiler" | "blockquote" | "expandable_blockquote" | "code" | "pre" | "text_link" | "text_mention" | "custom_emoji" | "date_time";
    offset: Integer;
    length: Integer;
    url?: string;
    user?: User;
    language?: string;
    custom_emoji_id?: string;
}
/**
 * The structured reply mechanism introduced in Bot API 7.0, replacing the old
 * flat reply_to_message_id / allow_sending_without_reply parameters. Pass this
 * as `reply_parameters` on any send* method instead of the old flat fields.
 */
export interface ReplyParameters {
    message_id?: Integer;
    chat_id?: ChatId;
    allow_sending_without_reply?: boolean;
    quote?: string;
    quote_parse_mode?: ParseMode;
    quote_entities?: MessageEntity[];
    quote_position?: Integer;
    /** Bot API 9.1+: reply to a specific task within a checklist message. */
    checklist_task_id?: Integer;
    /** Bot API 9.6+: reply to a specific option within a poll message. */
    poll_option_id?: Integer;
    /** Bot API 10.2+: reply to an ephemeral message (message_id becomes optional when this is set). */
    ephemeral_message_id?: Integer;
}
/** The quoted portion of a replied-to message, when the reply only quotes part of it. */
export interface TextQuote {
    text: string;
    entities?: MessageEntity[];
    position: Integer;
    is_manual?: boolean;
}
/** Info about a message that is replied to, possibly from another chat/forum topic — doesn't carry the full Message. */
export interface ExternalReplyInfo {
    origin: MessageOrigin;
    chat?: Chat;
    message_id?: Integer;
    link_preview_options?: LinkPreviewOptions;
    animation?: Animation;
    audio?: Audio;
    document?: Document;
    photo?: PhotoSize[];
    live_photo?: LivePhoto;
    sticker?: Sticker;
    story?: Story;
    video?: Video;
    video_note?: VideoNote;
    voice?: Voice;
    has_media_spoiler?: boolean;
    contact?: Contact;
    dice?: Dice;
    giveaway?: Giveaway;
    giveaway_winners?: GiveawayWinners;
    invoice?: Record<string, unknown>;
    location?: Location;
    poll?: Poll;
    venue?: Venue;
    checklist?: Checklist;
}
/** Bot API 7.0+: replaced the old forward_from/forward_from_chat/forward_date flat fields on Message. */
export type MessageOrigin = MessageOriginUser | MessageOriginHiddenUser | MessageOriginChat | MessageOriginChannel;
export interface MessageOriginUser {
    type: "user";
    date: Integer;
    sender_user: User;
}
export interface MessageOriginHiddenUser {
    type: "hidden_user";
    date: Integer;
    sender_user_name: string;
}
export interface MessageOriginChat {
    type: "chat";
    date: Integer;
    sender_chat: Chat;
    author_signature?: string;
}
export interface MessageOriginChannel {
    type: "channel";
    date: Integer;
    chat: Chat;
    message_id: Integer;
    author_signature?: string;
}
export interface LinkPreviewOptions {
    is_disabled?: boolean;
    url?: string;
    prefer_small_media?: boolean;
    prefer_large_media?: boolean;
    show_above_text?: boolean;
}
/** Bot API 7.0+: getChat's pinned_message and callback_query's message can be this instead of a full Message. */
export interface InaccessibleMessage {
    chat: Chat;
    message_id: Integer;
    date: 0;
}
export type MaybeInaccessibleMessage = Message | InaccessibleMessage;
export interface Message {
    message_id: Integer;
    message_thread_id?: Integer;
    from?: User;
    sender_chat?: Chat;
    date: Integer;
    /** Present on business messages — identifies which business connection this message came through, required for calling business account methods in response. */
    business_connection_id?: string;
    chat: Chat;
    reply_to_message?: Message;
    external_reply?: ExternalReplyInfo;
    quote?: TextQuote;
    reply_to_story?: Story;
    forward_origin?: MessageOrigin;
    is_automatic_forward?: boolean;
    link_preview_options?: LinkPreviewOptions;
    edit_date?: Integer;
    text?: string;
    entities?: MessageEntity[];
    caption?: string;
    caption_entities?: MessageEntity[];
    show_caption_above_media?: boolean;
    photo?: PhotoSize[];
    video?: Video;
    animation?: Animation;
    audio?: Audio;
    document?: Document;
    sticker?: Sticker;
    voice?: Voice;
    video_note?: VideoNote;
    contact?: Contact;
    location?: Location;
    venue?: Venue;
    poll?: Poll;
    dice?: Dice;
    new_chat_members?: User[];
    left_chat_member?: User;
    new_chat_title?: string;
    new_chat_photo?: PhotoSize[];
    pinned_message?: Message;
    reply_markup?: InlineKeyboardMarkup;
    is_topic_message?: boolean;
    rich_message?: RichMessage;
    giveaway?: Giveaway;
    giveaway_created?: GiveawayCreated;
    giveaway_winners?: GiveawayWinners;
    giveaway_completed?: GiveawayCompleted;
    story?: Story;
    users_shared?: UsersShared;
    /** @deprecated replaced by users_shared — kept for reading old cached data. */
    user_shared?: UsersShared;
    chat_shared?: ChatShared;
    write_access_allowed?: WriteAccessAllowed;
    video_chat_started?: VideoChatStarted;
    video_chat_ended?: VideoChatEnded;
    video_chat_scheduled?: VideoChatScheduled;
    video_chat_participants_invited?: VideoChatParticipantsInvited;
    forum_topic_created?: ForumTopicCreated;
    forum_topic_edited?: ForumTopicEdited;
    forum_topic_closed?: ForumTopicClosed;
    forum_topic_reopened?: ForumTopicReopened;
    general_forum_topic_hidden?: GeneralForumTopicHidden;
    general_forum_topic_unhidden?: GeneralForumTopicUnhidden;
    /** Bot API 9.2+: true if this message is a suggested post that was posted after payment. */
    is_paid_post?: boolean;
    /** Bot API 9.5+: the tag of the sender, if the chat has tags enabled. */
    sender_tag?: string;
    /** Bot API 10.2+: for ephemeral messages, the one user who can see this message besides the bot. */
    receiver_user?: User;
    /** Bot API 10.2+: present on ephemeral messages. */
    ephemeral_message_id?: Integer;
    /** Bot API 10.2+ service messages for Communities. */
    community_chat_added?: CommunityChatAdded;
    community_chat_removed?: CommunityChatRemoved;
    checklist?: Checklist;
    checklist_tasks_done?: ChecklistTasksDone;
    checklist_tasks_added?: ChecklistTasksAdded;
    /** Bot API 9.1+: this message is a reply to a specific checklist task. */
    reply_to_checklist_task_id?: Integer;
    /** Bot API 9.6+: this message is a reply to a specific poll option. */
    reply_to_poll_option_id?: Integer;
    /** Bot API 9.3+: service message about a gift upgrade being sent. */
    gift_upgrade_sent?: Record<string, unknown>;
    poll_option_added?: PollOptionAdded;
    poll_option_deleted?: PollOptionDeleted;
    /** Bot API 8.0+: service message for a regular gift sent/received. */
    gift?: GiftInfo;
    /** Bot API 9.0+: service message for a unique (upgraded) gift sent/received. */
    unique_gift?: UniqueGiftInfo;
    suggested_post_approved?: SuggestedPostApproved;
    suggested_post_approval_failed?: SuggestedPostApprovalFailed;
    suggested_post_declined?: SuggestedPostDeclined;
    suggested_post_paid?: SuggestedPostPaid;
    suggested_post_refunded?: SuggestedPostRefunded;
    /** Bot API 9.2+: present when this message is itself a suggested post awaiting approval. */
    suggested_post_info?: SuggestedPostInfo;
    direct_messages_topic?: DirectMessagesTopic;
    /** Bot API 10.0+ (Guest mode): set when a non-member bot was @mentioned in a chat. */
    guest_bot_caller_user?: User;
    guest_bot_caller_chat?: Chat;
    paid_media?: PaidMediaInfo;
    /** Bot API 9.0+: number of Telegram Stars paid to send this message (paid messages / paid broadcast). */
    paid_star_count?: Integer;
    message_auto_delete_timer_changed?: MessageAutoDeleteTimerChanged;
    /** Surfaced on a bot's own channel post when someone purchases its paid media. */
    purchased_paid_media?: PaidMediaPurchased;
    chat_owner_left?: ChatOwnerLeft;
    chat_owner_changed?: ChatOwnerChanged;
    paid_message_price_changed?: PaidMessagePriceChanged;
    direct_message_price_changed?: DirectMessagePriceChanged;
    successful_payment?: SuccessfulPayment;
    refunded_payment?: RefundedPayment;
    invoice?: Invoice;
    passport_data?: PassportData;
    [extra: string]: unknown;
}
export interface PhotoSize {
    file_id: FileId;
    file_unique_id: string;
    width: Integer;
    height: Integer;
    file_size?: Integer;
}
export interface VideoQuality {
    width: Integer;
    height: Integer;
    codec: string;
    file_id: FileId;
    file_unique_id: string;
    file_size?: Integer;
    bitrate?: Integer;
}
export interface Video {
    file_id: FileId;
    file_unique_id: string;
    width: Integer;
    height: Integer;
    duration: Integer;
    thumbnail?: PhotoSize;
    cover?: PhotoSize[];
    start_timestamp?: Integer;
    file_name?: string;
    mime_type?: string;
    file_size?: Integer;
    /** Bot API 9.6+: other available qualities of this video. */
    qualities?: VideoQuality[];
}
export interface Animation extends Video {
}
export interface Audio {
    file_id: FileId;
    file_unique_id: string;
    duration: Integer;
    performer?: string;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: Integer;
    thumbnail?: PhotoSize;
}
export interface Document {
    file_id: FileId;
    file_unique_id: string;
    thumbnail?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: Integer;
}
export interface Voice {
    file_id: FileId;
    file_unique_id: string;
    duration: Integer;
    mime_type?: string;
    file_size?: Integer;
}
export interface VideoNote {
    file_id: FileId;
    file_unique_id: string;
    length: Integer;
    duration: Integer;
    thumbnail?: PhotoSize;
    file_size?: Integer;
}
export interface Sticker {
    file_id: FileId;
    file_unique_id: string;
    type: "regular" | "mask" | "custom_emoji";
    width: Integer;
    height: Integer;
    is_animated: boolean;
    is_video: boolean;
    thumbnail?: PhotoSize;
    emoji?: string;
    set_name?: string;
    premium_animation?: File;
    mask_position?: MaskPosition;
    custom_emoji_id?: string;
    needs_repainting?: boolean;
    file_size?: Integer;
}
export interface Contact {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: Integer;
    vcard?: string;
}
export interface Venue {
    location: Location;
    title: string;
    address: string;
    foursquare_id?: string;
}
export interface Poll {
    id: string;
    question: string;
    question_entities?: MessageEntity[];
    options: PollOption[];
    total_voter_count: Integer;
    is_closed: boolean;
    is_anonymous: boolean;
    type: "regular" | "quiz";
    allows_multiple_answers: boolean;
    /** @deprecated replaced by correct_option_ids (plural) in Bot API 9.6, which added multi-answer quiz support. Kept for reading old cached data only. */
    correct_option_id?: Integer;
    /** Bot API 9.6+: 0-based identifiers of correct answer options for a quiz. Plural because quizzes can now have multiple correct answers. */
    correct_option_ids?: Integer[];
    explanation?: string;
    explanation_entities?: MessageEntity[];
    explanation_media?: PollMedia;
    open_period?: Integer;
    close_date?: Integer;
    media?: PollMedia;
    allows_revoting?: boolean;
    description?: string;
    description_entities?: MessageEntity[];
    country_codes?: string[];
    members_only?: boolean;
}
export interface PollOption {
    text: string;
    text_entities?: MessageEntity[];
    voter_count: Integer;
    media?: PollMedia;
    /** Bot API 9.6+: stable identifier for this option, since options can now be added/removed after the poll is sent. */
    persistent_id?: string;
    added_by_user?: User;
    added_by_chat?: Chat;
    addition_date?: Integer;
}
/** Bot API 9.6+ service message: a poll option was added after the poll was originally sent. */
export interface PollOptionAdded {
    option: PollOption;
}
/** Bot API 9.6+ service message: a poll option was removed. */
export interface PollOptionDeleted {
    option_persistent_id: string;
}
/** New in Bot API 10.x: polls can attach media/links to options. */
export interface PollMedia {
    link?: Link;
    photo?: PhotoSize[];
    video?: Video;
}
export interface Link {
    url: string;
    title?: string;
}
export interface Dice {
    emoji: string;
    value: Integer;
}
export interface ReplyKeyboardMarkup {
    keyboard: KeyboardButton[][];
    is_persistent?: boolean;
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    input_field_placeholder?: string;
    selective?: boolean;
}
export interface KeyboardButtonPollType {
    type?: "quiz" | "regular";
}
export interface KeyboardButtonRequestUsers {
    request_id: Integer;
    user_is_bot?: boolean;
    user_is_premium?: boolean;
    max_quantity?: Integer;
    request_name?: boolean;
    request_username?: boolean;
    request_photo?: boolean;
}
export interface KeyboardButtonRequestChat {
    request_id: Integer;
    chat_is_channel: boolean;
    chat_is_forum?: boolean;
    chat_has_username?: boolean;
    chat_is_created?: boolean;
    user_administrator_rights?: ChatAdministratorRights;
    bot_administrator_rights?: ChatAdministratorRights;
    bot_is_member?: boolean;
    request_title?: boolean;
    request_username?: boolean;
    request_photo?: boolean;
}
/** Bot API 9.6+: lets a user, from a keyboard button, request creating a managed bot. */
export interface KeyboardButtonRequestManagedBot {
    request_id: Integer;
    user_id?: Integer;
}
export interface KeyboardButton {
    text: string;
    request_contact?: boolean;
    request_location?: boolean;
    request_poll?: KeyboardButtonPollType;
    request_users?: KeyboardButtonRequestUsers;
    /** @deprecated renamed to request_users — Telegram still honors this old name for backward compatibility. */
    request_user?: KeyboardButtonRequestUsers;
    request_chat?: KeyboardButtonRequestChat;
    /** Bot API 9.6+ */
    request_managed_bot?: KeyboardButtonRequestManagedBot;
    web_app?: WebAppInfo;
    icon_custom_emoji_id?: string;
    style?: "primary" | "success" | "danger";
}
/** A static (.JPG) or animated (MPEG4) profile photo to set — used by setMyProfilePhoto / setBusinessAccountProfilePhoto. */
export type InputProfilePhoto = {
    type: "static";
    photo: InputFile;
} | {
    type: "animated";
    animation: InputFile;
    main_frame_timestamp?: number;
};
export interface ReplyKeyboardRemove {
    remove_keyboard: true;
    selective?: boolean;
}
export interface ForceReply {
    force_reply: true;
    input_field_placeholder?: string;
    selective?: boolean;
}
export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
}
export interface CopyTextButton {
    text: string;
}
export interface SwitchInlineQueryChosenChat {
    query?: string;
    allow_user_chats?: boolean;
    allow_bot_chats?: boolean;
    allow_group_chats?: boolean;
    allow_channel_chats?: boolean;
}
export interface InlineKeyboardButton {
    text: string;
    url?: string;
    callback_data?: string;
    web_app?: WebAppInfo;
    login_url?: LoginUrl;
    switch_inline_query?: string;
    switch_inline_query_current_chat?: string;
    switch_inline_query_chosen_chat?: SwitchInlineQueryChosenChat;
    /** Bot API 7.11+: copies this text to the user's clipboard when tapped. */
    copy_text?: CopyTextButton;
    pay?: boolean;
    icon_custom_emoji_id?: string;
    style?: "primary" | "success" | "danger";
}
export interface WebAppInfo {
    url: string;
}
export interface LoginUrl {
    url: string;
    forward_text?: string;
    bot_username?: string;
    request_write_access?: boolean;
}
export type ReplyMarkup = InlineKeyboardMarkup | ReplyKeyboardMarkup | ReplyKeyboardRemove | ForceReply;
export type ParseMode = "MarkdownV2" | "HTML" | "Markdown";
/**
 * Describes a rich message to send. Exactly one of `html` or `markdown` is
 * used for text-based construction (Bot API 10.1); `blocks` is an alternative,
 * structural way to build the same content directly (Bot API 10.2+).
 */
export interface InputRichMessage {
    /** Content described using HTML formatting — mutually exclusive with markdown/blocks. */
    html?: string;
    /** Content described using Markdown formatting — mutually exclusive with html/blocks. */
    markdown?: string;
    /** Bot API 10.2+: build the message directly out of structured blocks instead of parsing markdown/HTML text. */
    blocks?: InputRichBlock[];
    /** Bot API 10.2+: media referenced by blocks (an alternative to inlining URLs directly in blocks). */
    media?: InputRichMessageMedia[];
    is_rtl?: boolean;
    /** Skip auto-detection of URLs/emails/mentions/hashtags/cashtags/bot commands/phone numbers. */
    skip_entity_detection?: boolean;
}
export interface InputRichMessageMedia {
    type: "photo" | "video" | "audio" | "animation" | "voice_note";
    media: InputFile;
}
/** Usable as InputMessageContent in inline/guest/Web App query results. */
export interface InputRichMessageContent {
    rich_message: InputRichMessage;
}
/** The received counterpart of InputRichMessage — Message.rich_message has this type. */
export interface RichMessage {
    blocks: RichBlock[];
    is_rtl?: boolean;
}
/**
 * Rich formatted inline text: a plain string, an array of RichText
 * (concatenation), or one of 25 tagged span types.
 */
export type RichText = string | RichText[] | RichTextTagged;
export type RichTextTagged = {
    type: "bold";
    text: RichText;
} | {
    type: "italic";
    text: RichText;
} | {
    type: "underline";
    text: RichText;
} | {
    type: "strikethrough";
    text: RichText;
} | {
    type: "spoiler";
    text: RichText;
} | {
    type: "date_time";
    text: RichText;
    unix_time: Integer;
    date_time_format: string;
} | {
    type: "text_mention";
    text: RichText;
    user: User;
} | {
    type: "subscript";
    text: RichText;
} | {
    type: "superscript";
    text: RichText;
} | {
    type: "marked";
    text: RichText;
} | {
    type: "code";
    text: RichText;
} | {
    type: "custom_emoji";
    custom_emoji_id: string;
    alternative_text: string;
} | {
    type: "mathematical_expression";
    expression: string;
} | {
    type: "url";
    text: RichText;
    url: string;
} | {
    type: "email_address";
    text: RichText;
    email_address: string;
} | {
    type: "phone_number";
    text: RichText;
    phone_number: string;
} | {
    type: "bank_card_number";
    text: RichText;
    bank_card_number: string;
} | {
    type: "mention";
    text: RichText;
    username: string;
} | {
    type: "hashtag";
    text: RichText;
    hashtag: string;
} | {
    type: "cashtag";
    text: RichText;
    cashtag: string;
} | {
    type: "bot_command";
    text: RichText;
    bot_command: string;
} | {
    type: "anchor";
    name: string;
} | {
    type: "anchor_link";
    text: RichText;
    anchor_name: string;
} | {
    type: "reference";
    text: RichText;
    name: string;
} | {
    type: "reference_link";
    text: RichText;
    reference_name: string;
};
/** Caption attached to a media/collage/slideshow/map block. */
export interface RichBlockCaption {
    text: RichText;
    credit?: RichText;
}
export interface RichBlockTableCell {
    text?: RichText;
    is_header?: true;
    colspan?: Integer;
    rowspan?: Integer;
    align?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom";
}
export interface RichBlockListItem {
    label?: string;
    blocks: RichBlock[];
    has_checkbox?: true;
    is_checked?: true;
    value?: Integer;
    /** For ordered lists: "a" | "A" | "i" | "I" | "1" — see the official spec for what each renders as. */
    type?: "a" | "A" | "i" | "I" | "1";
}
/** A block in a received rich formatted message — one of 21 types. */
export type RichBlock = {
    type: "paragraph";
    text: RichText;
} | {
    type: "heading";
    text: RichText;
    size: Integer;
} | {
    type: "pre";
    text: RichText;
    language?: string;
} | {
    type: "footer";
    text: RichText;
} | {
    type: "divider";
} | {
    type: "mathematical_expression";
    expression: string;
} | {
    type: "anchor";
    name: string;
} | {
    type: "list";
    items: RichBlockListItem[];
} | {
    type: "blockquote";
    blocks: RichBlock[];
    credit?: RichText;
} | {
    type: "pullquote";
    text: RichText;
    credit?: RichText;
} | {
    type: "collage";
    blocks: RichBlock[];
    caption?: RichBlockCaption;
} | {
    type: "slideshow";
    blocks: RichBlock[];
    caption?: RichBlockCaption;
} | {
    type: "table";
    cells: RichBlockTableCell[][];
    is_bordered?: true;
    is_striped?: true;
    caption?: RichText;
} | {
    type: "details";
    summary: RichText;
    blocks: RichBlock[];
    is_open?: true;
} | {
    type: "map";
    location: Location;
    zoom: Integer;
    width: Integer;
    height: Integer;
    caption?: RichBlockCaption;
} | {
    type: "animation";
    animation: Animation;
    has_spoiler?: true;
    caption?: RichBlockCaption;
} | {
    type: "audio";
    audio: Audio;
    caption?: RichBlockCaption;
} | {
    type: "photo";
    photo: PhotoSize[];
    has_spoiler?: true;
    caption?: RichBlockCaption;
} | {
    type: "video";
    video: Video;
    has_spoiler?: true;
    caption?: RichBlockCaption;
} | {
    type: "voice_note";
    voice_note: Voice;
    caption?: RichBlockCaption;
}
/** sendRichMessageDraft only — never appears in a received Message. */
 | {
    type: "thinking";
    text: RichText;
};
/**
 * Input (send-side) counterpart of RichBlock for Bot API 10.2's block-based
 * construction. Media blocks take an InputFile (URL/file_id/upload) instead
 * of the receive-only PhotoSize[]/Video/Audio objects. Exact input field
 * names for the media blocks weren't independently confirmed against two
 * sources the way the rest of this file was — verify against
 * core.telegram.org/bots/api if you rely on them heavily; the markdown/html
 * text-based construction path (InputRichMessage.markdown / .html) is the
 * more thoroughly-verified way to build media-containing rich messages.
 */
export type InputRichBlock = {
    type: "paragraph";
    text: RichText;
} | {
    type: "heading";
    text: RichText;
    size: Integer;
} | {
    type: "pre";
    text: RichText;
    language?: string;
} | {
    type: "footer";
    text: RichText;
} | {
    type: "divider";
} | {
    type: "mathematical_expression";
    expression: string;
} | {
    type: "anchor";
    name: string;
} | {
    type: "list";
    items: RichBlockListItem[];
} | {
    type: "blockquote";
    blocks: InputRichBlock[];
    credit?: RichText;
} | {
    type: "pullquote";
    text: RichText;
    credit?: RichText;
} | {
    type: "collage";
    blocks: InputRichBlock[];
    caption?: RichBlockCaption;
} | {
    type: "slideshow";
    blocks: InputRichBlock[];
    caption?: RichBlockCaption;
} | {
    type: "table";
    cells: RichBlockTableCell[][];
    is_bordered?: true;
    is_striped?: true;
    caption?: RichText;
} | {
    type: "details";
    summary: RichText;
    blocks: InputRichBlock[];
    is_open?: true;
} | {
    type: "map";
    location: Location;
    zoom: Integer;
    width: Integer;
    height: Integer;
    caption?: RichBlockCaption;
} | {
    type: "animation";
    animation: InputFile;
    has_spoiler?: true;
    caption?: RichBlockCaption;
} | {
    type: "audio";
    audio: InputFile;
    caption?: RichBlockCaption;
} | {
    type: "photo";
    photo: InputFile;
    has_spoiler?: true;
    caption?: RichBlockCaption;
} | {
    type: "video";
    video: InputFile;
    has_spoiler?: true;
    caption?: RichBlockCaption;
} | {
    type: "voice_note";
    voice_note: InputFile;
    caption?: RichBlockCaption;
} | {
    type: "thinking";
    text: RichText;
};
export interface Update {
    update_id: Integer;
    message?: Message;
    edited_message?: Message;
    channel_post?: Message;
    edited_channel_post?: Message;
    business_connection?: BusinessConnection;
    business_message?: Message;
    inline_query?: InlineQuery;
    chosen_inline_result?: ChosenInlineResult;
    callback_query?: CallbackQuery;
    shipping_query?: ShippingQuery;
    pre_checkout_query?: PreCheckoutQuery;
    poll?: Poll;
    poll_answer?: PollAnswer;
    my_chat_member?: ChatMemberUpdated;
    chat_member?: ChatMemberUpdated;
    chat_join_request?: ChatJoinRequest;
    subscription?: BotSubscriptionUpdated;
    managed_bot_created?: ManagedBotCreated;
    managed_bot?: ManagedBotUpdated;
    message_reaction?: MessageReactionUpdated;
    message_reaction_count?: MessageReactionCountUpdated;
    chat_boost?: ChatBoostUpdated;
    removed_chat_boost?: ChatBoostRemoved;
    /** Bot API 10.0+ (Guest mode): the bot was @mentioned in a chat it isn't a member of. Exact shape not independently verified beyond the fields below — verify against current docs. */
    guest_message?: GuestMessage;
}
export interface GuestMessage {
    message: Message;
    guest_query_id?: string;
    [extra: string]: unknown;
}
/** Bot API 10.0+: settings a managing bot can view/configure for a managed bot it created. Exact fields not independently confirmed. */
export interface BotAccessSettings {
    [key: string]: unknown;
}
export type UpdateType = keyof Omit<Update, "update_id">;
/** Confirmed complete field list (python-telegram-bot v22.1+). What the bot is allowed to do on behalf of the connected business account. */
export interface BusinessBotRights {
    can_reply?: boolean;
    can_read_messages?: boolean;
    can_delete_sent_messages?: boolean;
    /** @deprecated renamed to can_delete_sent_messages — kept only for reading old cached data. */
    can_delete_outgoing_messages?: boolean;
    can_delete_all_messages?: boolean;
    can_edit_name?: boolean;
    can_edit_bio?: boolean;
    can_edit_profile_photo?: boolean;
    can_edit_username?: boolean;
    can_change_gift_settings?: boolean;
    can_view_gifts_and_stars?: boolean;
    can_convert_gifts_to_stars?: boolean;
    can_transfer_and_upgrade_gifts?: boolean;
    can_transfer_stars?: boolean;
    can_manage_stories?: boolean;
}
export interface BusinessConnection {
    id: string;
    user: User;
    user_chat_id: Integer;
    date: Integer;
    rights?: BusinessBotRights;
    /** @deprecated replaced by rights.can_reply — kept for reading old cached data. */
    can_reply: boolean;
    is_enabled: boolean;
}
export interface BusinessIntro {
    title?: string;
    message?: string;
    sticker?: Sticker;
}
export interface BusinessLocation {
    address: string;
    location?: Location;
}
export interface BusinessOpeningHoursInterval {
    opening_minute: Integer;
    closing_minute: Integer;
}
export interface BusinessOpeningHours {
    time_zone_name: string;
    opening_hours: BusinessOpeningHoursInterval[];
}
export interface InlineQuery {
    id: string;
    from: User;
    query: string;
    offset: string;
    chat_type?: string;
    location?: Location;
}
export type InputMessageContent = InputTextMessageContent | InputLocationMessageContent | InputVenueMessageContent | InputContactMessageContent | InputInvoiceMessageContent;
export interface InputTextMessageContent {
    message_text: string;
    parse_mode?: ParseMode;
    entities?: MessageEntity[];
    link_preview_options?: LinkPreviewOptions;
}
export interface InputLocationMessageContent {
    latitude: number;
    longitude: number;
    horizontal_accuracy?: number;
    live_period?: Integer;
    heading?: Integer;
    proximity_alert_radius?: Integer;
}
export interface InputVenueMessageContent {
    latitude: number;
    longitude: number;
    title: string;
    address: string;
    foursquare_id?: string;
    foursquare_type?: string;
    google_place_id?: string;
    google_place_type?: string;
}
export interface InputContactMessageContent {
    phone_number: string;
    first_name: string;
    last_name?: string;
    vcard?: string;
}
export interface InputInvoiceMessageContent {
    title: string;
    description: string;
    payload: string;
    provider_token?: string;
    currency: string;
    prices: LabeledPrice[];
    max_tip_amount?: Integer;
    suggested_tip_amounts?: Integer[];
    provider_data?: string;
    photo_url?: string;
    photo_size?: Integer;
    photo_width?: Integer;
    photo_height?: Integer;
    need_name?: boolean;
    need_phone_number?: boolean;
    need_email?: boolean;
    need_shipping_address?: boolean;
    send_phone_number_to_provider?: boolean;
    send_email_to_provider?: boolean;
    is_flexible?: boolean;
}
interface InlineQueryResultBase {
    id: string;
    reply_markup?: InlineKeyboardMarkup;
}
export type InlineQueryResult = (InlineQueryResultBase & {
    type: "article";
    title: string;
    input_message_content: InputMessageContent;
    url?: string;
    description?: string;
    thumbnail_url?: string;
    thumbnail_width?: Integer;
    thumbnail_height?: Integer;
}) | (InlineQueryResultBase & {
    type: "photo";
    photo_url: string;
    thumbnail_url: string;
    photo_width?: Integer;
    photo_height?: Integer;
    title?: string;
    description?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "gif";
    gif_url: string;
    gif_width?: Integer;
    gif_height?: Integer;
    gif_duration?: Integer;
    thumbnail_url: string;
    thumbnail_mime_type?: string;
    title?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "mpeg4_gif";
    mpeg4_url: string;
    mpeg4_width?: Integer;
    mpeg4_height?: Integer;
    mpeg4_duration?: Integer;
    thumbnail_url: string;
    thumbnail_mime_type?: string;
    title?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "video";
    video_url: string;
    mime_type: string;
    thumbnail_url: string;
    title: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    video_width?: Integer;
    video_height?: Integer;
    video_duration?: Integer;
    description?: string;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "audio";
    audio_url: string;
    title: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    performer?: string;
    audio_duration?: Integer;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "voice";
    voice_url: string;
    title: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    voice_duration?: Integer;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "document";
    title: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    document_url: string;
    mime_type: string;
    description?: string;
    thumbnail_url?: string;
    thumbnail_width?: Integer;
    thumbnail_height?: Integer;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "location";
    latitude: number;
    longitude: number;
    title: string;
    horizontal_accuracy?: number;
    live_period?: Integer;
    heading?: Integer;
    proximity_alert_radius?: Integer;
    thumbnail_url?: string;
    thumbnail_width?: Integer;
    thumbnail_height?: Integer;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "venue";
    latitude: number;
    longitude: number;
    title: string;
    address: string;
    foursquare_id?: string;
    foursquare_type?: string;
    google_place_id?: string;
    google_place_type?: string;
    thumbnail_url?: string;
    thumbnail_width?: Integer;
    thumbnail_height?: Integer;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "contact";
    phone_number: string;
    first_name: string;
    last_name?: string;
    vcard?: string;
    thumbnail_url?: string;
    thumbnail_width?: Integer;
    thumbnail_height?: Integer;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "game";
    game_short_name: string;
}) | (InlineQueryResultBase & {
    type: "sticker";
    sticker_file_id: string;
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "photo";
    photo_file_id: string;
    title?: string;
    description?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "gif";
    gif_file_id: string;
    title?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "mpeg4_gif";
    mpeg4_file_id: string;
    title?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "video";
    video_file_id: string;
    title: string;
    description?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "audio";
    audio_file_id: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "voice";
    voice_file_id: string;
    title: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "document";
    document_file_id: string;
    title: string;
    description?: string;
    caption?: string;
    parse_mode?: ParseMode;
    caption_entities?: MessageEntity[];
    input_message_content?: InputMessageContent;
}) | (InlineQueryResultBase & {
    type: "sticker";
    sticker_file_id: string;
});
/** What a Mini App got back after saving a message via savePreparedInlineMessage. */
export interface PreparedInlineMessage {
    id: string;
    expiration_date: Integer;
}
export interface InlineQueryResultsButton {
    text: string;
    web_app?: WebAppInfo;
    start_parameter?: string;
}
export interface ChosenInlineResult {
    result_id: string;
    from: User;
    location?: Location;
    inline_message_id?: string;
    query: string;
}
export interface CallbackQuery {
    id: string;
    from: User;
    message?: MaybeInaccessibleMessage;
    inline_message_id?: string;
    chat_instance: string;
    data?: string;
    game_short_name?: string;
}
export interface ShippingQuery {
    id: string;
    from: User;
    invoice_payload: string;
    shipping_address: ShippingAddress;
}
export interface ShippingAddress {
    country_code: string;
    state: string;
    city: string;
    street_line1: string;
    street_line2: string;
    post_code: string;
}
export interface LabeledPrice {
    label: string;
    amount: Integer;
}
export interface ShippingOption {
    id: string;
    title: string;
    prices: LabeledPrice[];
}
export interface OrderInfo {
    name?: string;
    phone_number?: string;
    email?: string;
    shipping_address?: ShippingAddress;
}
export interface SuccessfulPayment {
    currency: string;
    total_amount: Integer;
    invoice_payload: string;
    subscription_expiration_date?: Integer;
    is_recurring?: boolean;
    is_first_recurring?: boolean;
    shipping_option_id?: string;
    order_info?: OrderInfo;
    telegram_payment_charge_id: string;
    provider_payment_charge_id: string;
}
export interface PreCheckoutQuery {
    id: string;
    from: User;
    currency: string;
    total_amount: Integer;
    invoice_payload: string;
    shipping_option_id?: string;
    order_info?: OrderInfo;
}
export interface Invoice {
    title: string;
    description: string;
    start_parameter: string;
    currency: string;
    total_amount: Integer;
}
export interface GameHighScore {
    position: Integer;
    user: User;
    score: Integer;
}
export type BotCommandScope = {
    type: "default";
} | {
    type: "all_private_chats";
} | {
    type: "all_group_chats";
} | {
    type: "all_chat_administrators";
} | {
    type: "chat";
    chat_id: ChatId;
} | {
    type: "chat_administrators";
    chat_id: ChatId;
} | {
    type: "chat_member";
    chat_id: ChatId;
    user_id: Integer;
};
export type MenuButton = {
    type: "default";
} | {
    type: "commands";
} | {
    type: "web_app";
    text: string;
    web_app: WebAppInfo;
};
export interface MaskPosition {
    point: "forehead" | "eyes" | "mouth" | "chin";
    x_shift: number;
    y_shift: number;
    scale: number;
}
export interface InputSticker {
    sticker: InputFile;
    format: "static" | "animated" | "video";
    emoji_list: string[];
    mask_position?: MaskPosition;
    keywords?: string[];
}
export interface ChatAdministratorRights {
    is_anonymous: boolean;
    can_manage_chat: boolean;
    can_delete_messages: boolean;
    can_manage_video_chats: boolean;
    can_restrict_members: boolean;
    can_promote_members: boolean;
    can_change_info: boolean;
    can_invite_users: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_post_stories?: boolean;
    can_edit_stories?: boolean;
    can_delete_stories?: boolean;
    can_manage_topics?: boolean;
    /** Bot API 9.2+ */
    can_manage_direct_messages?: boolean;
    /** Bot API 9.5+ */
    can_manage_tags?: boolean;
}
export interface SentWebAppMessage {
    inline_message_id?: string;
}
export interface PassportFile {
    file_id: FileId;
    file_unique_id: string;
    file_size: Integer;
    file_date: Integer;
}
export type PassportElementType = "personal_details" | "passport" | "driver_license" | "identity_card" | "internal_passport" | "address" | "utility_bill" | "bank_statement" | "rental_agreement" | "passport_registration" | "temporary_registration" | "phone_number" | "email";
export interface EncryptedPassportElement {
    type: PassportElementType;
    data?: string;
    phone_number?: string;
    email?: string;
    files?: PassportFile[];
    front_side?: PassportFile;
    reverse_side?: PassportFile;
    selfie?: PassportFile;
    translation?: PassportFile[];
    hash: string;
}
export interface EncryptedCredentials {
    data: string;
    hash: string;
    secret: string;
}
export interface PassportData {
    data: EncryptedPassportElement[];
    credentials: EncryptedCredentials;
}
/** Reported via setPassportDataErrors when a submitted Passport element fails your validation. */
export type PassportElementError = {
    source: "data";
    type: PassportElementType;
    field_name: string;
    data_hash: string;
    message: string;
} | {
    source: "front_side";
    type: PassportElementType;
    file_hash: string;
    message: string;
} | {
    source: "reverse_side";
    type: PassportElementType;
    file_hash: string;
    message: string;
} | {
    source: "selfie";
    type: PassportElementType;
    file_hash: string;
    message: string;
} | {
    source: "file";
    type: PassportElementType;
    file_hash: string;
    message: string;
} | {
    source: "files";
    type: PassportElementType;
    file_hashes: string[];
    message: string;
} | {
    source: "translation_file";
    type: PassportElementType;
    file_hash: string;
    message: string;
} | {
    source: "translation_files";
    type: PassportElementType;
    file_hashes: string[];
    message: string;
} | {
    source: "unspecified";
    type: PassportElementType;
    element_hash: string;
    message: string;
};
export interface PollAnswer {
    poll_id: string;
    voter_chat?: Chat;
    user?: User;
    option_ids: Integer[];
    /** Bot API 9.6+: stable identifiers for the chosen options, since options can now be added/removed after the poll is sent. */
    option_persistent_ids?: string[];
}
export interface ChatMemberUpdated {
    chat: Chat;
    from: User;
    date: Integer;
    old_chat_member: ChatMember;
    new_chat_member: ChatMember;
    invite_link?: ChatInviteLink;
}
export interface ChatMember {
    status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
    user: User;
    is_anonymous?: boolean;
    until_date?: Integer;
    /** Bot API 9.5+: this member's tag, in chats that have tags enabled. */
    tag?: string;
}
export interface ChatInviteLink {
    invite_link: string;
    creator: User;
    creates_join_request: boolean;
    is_primary: boolean;
    is_revoked: boolean;
    name?: string;
    expire_date?: Integer;
    member_limit?: Integer;
}
export interface ChatJoinRequest {
    chat: Chat;
    from: User;
    user_chat_id: Integer;
    date: Integer;
    bio?: string;
    invite_link?: ChatInviteLink;
    query_id?: string;
}
/** New in Bot API 10.x — payment subscription state changes. */
export interface BotSubscriptionUpdated {
    user: User;
    is_active: boolean;
    subscription_period: Integer;
}
/** New in Bot API 9.5/9.6 — bots creating and managing child bots. */
export interface ManagedBotCreated {
    bot: User;
    manager_bot: User;
}
export interface ManagedBotUpdated {
    bot: User;
    manager_bot: User;
    field: string;
}
export interface File {
    file_id: FileId;
    file_unique_id: string;
    file_size?: Integer;
    file_path?: string;
}
/** Anything ayotbl accepts as an "input file": a file_id, a URL, a Buffer, or a stream with a filename. */
export type InputFile = FileId | {
    url: string;
} | {
    source: Buffer | NodeJS.ReadableStream;
    filename: string;
};
export interface InputMediaBase {
    type: "photo" | "video" | "animation" | "audio" | "document";
    media: InputFile;
    caption?: string;
    parse_mode?: ParseMode;
}
export interface InputMediaPhoto extends InputMediaBase {
    type: "photo";
    has_spoiler?: boolean;
    show_caption_above_media?: boolean;
}
export interface InputMediaVideo extends InputMediaBase {
    type: "video";
    width?: Integer;
    height?: Integer;
    duration?: Integer;
    has_spoiler?: boolean;
    show_caption_above_media?: boolean;
    supports_streaming?: boolean;
    /** Bot API 8.3+: a cover image for the video, shown before playback. */
    cover?: InputFile;
    /** Bot API 8.3+: timestamp (seconds) from which playback starts. */
    start_timestamp?: Integer;
}
export interface InputMediaAnimation extends InputMediaBase {
    type: "animation";
    width?: Integer;
    height?: Integer;
    duration?: Integer;
    has_spoiler?: boolean;
    show_caption_above_media?: boolean;
}
export interface InputMediaAudio extends InputMediaBase {
    type: "audio";
    duration?: Integer;
    performer?: string;
    title?: string;
}
export interface InputMediaDocument extends InputMediaBase {
    type: "document";
}
export interface InputMediaVoiceNote {
    type: "voice_note";
    media: InputFile;
    caption?: string;
    parse_mode?: ParseMode;
    duration?: Integer;
}
export interface InputMediaSticker {
    type: "sticker";
    media: InputFile;
}
export interface InputMediaLocation {
    type: "location";
    latitude: number;
    longitude: number;
}
export interface InputMediaVenue {
    type: "venue";
    latitude: number;
    longitude: number;
    title: string;
    address: string;
}
export interface InputMediaLink {
    type: "link";
    link: Link;
}
export interface InputMediaLivePhoto {
    type: "live_photo";
    media: InputFile;
    caption?: string;
    parse_mode?: ParseMode;
    has_spoiler?: boolean;
    show_caption_above_media?: boolean;
}
export type InputMedia = InputMediaPhoto | InputMediaVideo | InputMediaAnimation | InputMediaAudio | InputMediaDocument | InputMediaLivePhoto;
export interface PaidMediaInfo {
    star_count: Integer;
    paid_media: PaidMedia[];
}
export type PaidMedia = {
    type: "preview";
    width?: Integer;
    height?: Integer;
    duration?: Integer;
} | {
    type: "photo";
    photo: PhotoSize[];
} | {
    type: "video";
    video: Video;
} | {
    type: "live_photo";
    live_photo: LivePhoto;
};
export type InputPaidMedia = InputPaidMediaPhoto | InputPaidMediaVideo | InputPaidMediaLivePhoto;
export interface InputPaidMediaLivePhoto {
    type: "live_photo";
    media: InputFile;
}
export interface InputPaidMediaPhoto {
    type: "photo";
    media: InputFile;
}
export interface InputPaidMediaVideo {
    type: "video";
    media: InputFile;
    width?: Integer;
    height?: Integer;
    duration?: Integer;
    supports_streaming?: boolean;
    cover?: InputFile;
    start_timestamp?: Integer;
}
export interface ReactionTypeEmoji {
    type: "emoji";
    emoji: string;
}
export interface ReactionTypeCustomEmoji {
    type: "custom_emoji";
    custom_emoji_id: string;
}
export interface ReactionTypePaid {
    type: "paid";
}
export type ReactionType = ReactionTypeEmoji | ReactionTypeCustomEmoji | ReactionTypePaid;
export interface MessageReactionUpdated {
    chat: Chat;
    message_id: Integer;
    user?: User;
    actor_chat?: Chat;
    date: Integer;
    old_reaction: ReactionType[];
    new_reaction: ReactionType[];
}
export interface MessageReactionCountUpdated {
    chat: Chat;
    message_id: Integer;
    date: Integer;
    reactions: {
        type: ReactionType;
        total_count: Integer;
    }[];
}
export type ChatBoostSource = {
    source: "premium";
    user: User;
} | {
    source: "gift_code";
    user: User;
} | {
    source: "giveaway";
    giveaway_message_id?: Integer;
    user?: User;
    prize_star_count?: Integer;
    is_unclaimed?: boolean;
};
export interface ChatBoost {
    boost_id: string;
    add_date: Integer;
    expiration_date: Integer;
    source: ChatBoostSource;
}
export interface ChatBoostUpdated {
    chat: Chat;
    boost: ChatBoost;
}
export interface ChatBoostRemoved {
    chat: Chat;
    boost_id: string;
    remove_date: Integer;
    source: ChatBoostSource;
}
export interface UserChatBoosts {
    boosts: ChatBoost[];
}
export interface Giveaway {
    chats: Chat[];
    winners_selection_date: Integer;
    winner_count: Integer;
    only_new_members?: boolean;
    has_public_winners?: boolean;
    prize_description?: string;
    country_codes?: string[];
    premium_subscription_month_count?: Integer;
    /** Bot API 7.10+: number of Telegram Stars to be split among winners, for a Stars giveaway. */
    prize_star_count?: Integer;
}
/** Bot API 7.0+: service message about the creation of a scheduled giveaway. */
export interface GiveawayCreated {
    prize_star_count?: Integer;
}
export interface GiveawayWinners {
    chat: Chat;
    giveaway_message_id: Integer;
    winners_selection_date: Integer;
    winner_count: Integer;
    winners: User[];
    additional_chat_count?: Integer;
    premium_subscription_month_count?: Integer;
    unclaimed_prize_count?: Integer;
    only_new_members?: boolean;
    was_refunded?: boolean;
    prize_description?: string;
    /** Bot API 7.10+ */
    prize_star_count?: Integer;
}
export interface GiveawayCompleted {
    winner_count: Integer;
    unclaimed_prize_count?: Integer;
    giveaway_message?: Message;
    /** Bot API 7.10+: true if the giveaway was a Telegram Star giveaway rather than a Premium giveaway. */
    is_star_giveaway?: boolean;
}
/** Bot API only exposes that a story was referenced, not its content. */
export interface Story {
    chat: Chat;
    id: Integer;
}
export interface SharedUser {
    user_id: Integer;
    first_name?: string;
    last_name?: string;
    username?: string;
    photo?: PhotoSize[];
}
export interface UsersShared {
    request_id: Integer;
    users: SharedUser[];
}
export interface ChatShared {
    request_id: Integer;
    chat_id: Integer;
    title?: string;
    username?: string;
    photo?: PhotoSize[];
}
export interface WriteAccessAllowed {
    from_request?: boolean;
    web_app_name?: string;
    from_attachment_menu?: boolean;
}
export interface VideoChatStarted {
}
export interface VideoChatEnded {
    duration: Integer;
}
export interface VideoChatScheduled {
    start_date: Integer;
}
export interface VideoChatParticipantsInvited {
    users: User[];
}
export interface ForumTopic {
    message_thread_id: Integer;
    name: string;
    icon_color: Integer;
    icon_custom_emoji_id?: string;
    /** Bot API 9.3+: true if the topic's name was auto-generated (e.g. from the first message) rather than explicitly set. */
    is_name_implicit?: boolean;
}
export interface ForumTopicCreated {
    name: string;
    icon_color: Integer;
    icon_custom_emoji_id?: string;
    is_name_implicit?: boolean;
}
export interface ForumTopicEdited {
    name?: string;
    icon_custom_emoji_id?: string;
}
export interface ForumTopicClosed {
    [key: string]: unknown;
}
export interface ForumTopicReopened {
    [key: string]: unknown;
}
export interface GeneralForumTopicHidden {
    [key: string]: unknown;
}
export interface GeneralForumTopicUnhidden {
    [key: string]: unknown;
}
export interface LocationAddress {
    country_code: string;
    state?: string;
    city?: string;
    street?: string;
}
export interface ChatOwnerLeft {
    [key: string]: unknown;
}
export interface ChatOwnerChanged {
    new_owner?: User;
    [key: string]: unknown;
}
/** Bot API 9.0+: service message when the price for sending paid messages in a chat changes. */
export interface PaidMessagePriceChanged {
    paid_message_star_count: Integer;
}
export type BackgroundFill = {
    type: "solid";
    color: Integer;
} | {
    type: "gradient";
    top_color: Integer;
    bottom_color: Integer;
    rotation_angle: Integer;
} | {
    type: "freeform_gradient";
    colors: Integer[];
};
export type BackgroundType = {
    type: "fill";
    fill: BackgroundFill;
    dark_theme_dimming: Integer;
} | {
    type: "wallpaper";
    document: Document;
    dark_theme_dimming: Integer;
    is_blurred?: boolean;
    is_moving?: boolean;
} | {
    type: "pattern";
    document: Document;
    fill: BackgroundFill;
    intensity: Integer;
    is_inverted?: boolean;
    is_moving?: boolean;
} | {
    type: "chat_theme";
    theme_name: string;
};
export interface ChatBackground {
    type: BackgroundType;
}
export type StoryAreaType = {
    type: "location";
    latitude: number;
    longitude: number;
    address?: LocationAddress;
} | {
    type: "suggested_reaction";
    reaction_type: ReactionType;
    is_dark?: boolean;
    is_flipped?: boolean;
} | {
    type: "link";
    url: string;
} | {
    type: "weather";
    temperature: number;
    emoji: string;
    background_color: Integer;
} | {
    type: "unique_gift";
    name: string;
};
export interface StoryAreaPosition {
    x_percentage: number;
    y_percentage: number;
    width_percentage: number;
    height_percentage: number;
    rotation_angle: number;
    corner_radius_percentage: number;
}
export interface StoryArea {
    position: StoryAreaPosition;
    type: StoryAreaType;
}
export type InputStoryContent = {
    type: "photo";
    photo: InputFile;
} | {
    type: "video";
    video: InputFile;
    duration?: number;
    cover_frame_timestamp?: number;
    is_animation?: boolean;
};
export interface LivePhoto {
    file_id: FileId;
    file_unique_id: string;
    width: Integer;
    height: Integer;
    thumbnail?: PhotoSize;
    file_size?: Integer;
}
export interface MessageAutoDeleteTimerChanged {
    message_auto_delete_time: Integer;
}
export interface MessageId {
    message_id: Integer;
}
export interface UserProfilePhotos {
    total_count: Integer;
    photos: PhotoSize[][];
}
export interface UserProfileAudios {
    total_count: Integer;
    audios: Audio[][];
}
export interface InputPollOption {
    text: string;
    text_parse_mode?: ParseMode;
    text_entities?: MessageEntity[];
}
/** A paid media purchase event surfaced to the bot for a channel post it made. */
export interface PaidMediaPurchased {
    from: User;
    paid_media_payload: string;
}
export interface Gift {
    id: string;
    sticker: Sticker;
    star_count: Integer;
    upgrade_star_count?: Integer;
    total_count?: Integer;
    remaining_count?: Integer;
    personal_total_count?: Integer;
    personal_remaining_count?: Integer;
    is_premium?: boolean;
    publisher_chat?: Chat;
    /** Bot API 9.6+: true if this gift, once upgraded, can carry a custom name-color scheme (see UniqueGiftColors). */
    has_colors?: boolean;
    /** Bot API 9.3+ */
    background?: GiftBackground;
    /** Bot API 9.3+: number of distinct model/symbol/backdrop variants available when this gift is upgraded. */
    unique_gift_variant_count?: Integer;
}
/**
 * Bot API 9.3+: background styling for a gift's presentation. Confirmed to
 * exist (official changelog: "Added the class GiftBackground and the field
 * background to the class Gift"), but I could not independently confirm its
 * field names after genuine effort — this shape is inferred from the
 * confirmed BackgroundType/BackgroundFill pattern used elsewhere in this
 * file, not verified against a second source. Treat as best-effort.
 */
export interface GiftBackground {
    fill?: BackgroundFill;
    [extra: string]: unknown;
}
/**
 * Bot API 9.3+: color scheme (name, message replies, link previews) derived
 * from a unique gift. Confirmed to exist (official changelog + two SDK
 * changelogs), but despite genuine effort across multiple searches I could
 * not find its exact field names in any source. This shape is inferred from
 * the confirmed sibling type UniqueGiftBackdropColors (same feature area,
 * same "named colors for UI theming" purpose) — NOT independently verified.
 * Verify against core.telegram.org/bots/api before relying on specific
 * field names here.
 */
export interface UniqueGiftColors {
    text_color?: Integer;
    background_color?: Integer;
    accent_color?: Integer;
    [extra: string]: unknown;
}
/**
 * Bot API 9.3+: a user's rating level within Telegram. Confirmed to exist
 * (official changelog: "Added the class UserRating and the field rating to
 * the class ChatFullInfo"), but exact field names weren't independently
 * confirmed — modeled on the general shape Telegram uses for tiered rating
 * systems elsewhere. Verify against current docs before relying on this.
 */
export interface UserRating {
    level: Integer;
    [extra: string]: unknown;
}
/** Bot API 9.3+: service message about a price change for Direct Messages sent to a channel chat. */
export interface DirectMessagePriceChanged {
    are_direct_messages_enabled: boolean;
    direct_message_star_count?: Integer;
}
export interface UniqueGiftModel {
    name: string;
    sticker: Sticker;
    /** Number of unique gifts that receive this model per 1000 gifts upgraded. */
    rarity_per_mille: Integer;
    /** Bot API 9.6+ */
    rarity?: Integer;
}
export interface UniqueGiftSymbol {
    name: string;
    sticker: Sticker;
    rarity_per_mille: Integer;
}
export interface UniqueGiftBackdropColors {
    center_color: Integer;
    edge_color: Integer;
    symbol_color: Integer;
    text_color: Integer;
}
export interface UniqueGiftBackdrop {
    name: string;
    colors: UniqueGiftBackdropColors;
    rarity_per_mille: Integer;
}
export interface Gifts {
    gifts: Gift[];
}
/** A gift that was upgraded to a one-of-a-kind collectible. */
export interface UniqueGift {
    base_name: string;
    name: string;
    number: Integer;
    model: UniqueGiftModel;
    symbol: UniqueGiftSymbol;
    backdrop: UniqueGiftBackdrop;
    is_premium?: boolean;
    is_from_blockchain?: boolean;
    publisher_chat?: Chat;
    /** Bot API 9.6+: true if this gift was destroyed ("burned"). */
    is_burned?: boolean;
    /** Bot API 9.3+ */
    colors?: UniqueGiftColors;
    /** Bot API 9.3+: the identifier of the regular Gift this was upgraded from. */
    gift_id?: string;
}
export interface GiftInfo {
    gift: Gift;
    owned_gift_id?: string;
    convert_star_count?: Integer;
    prepaid_upgrade_star_count?: Integer;
    can_be_upgraded?: boolean;
    text?: string;
    entities?: MessageEntity[];
    is_private?: boolean;
    is_upgrade_separate?: boolean;
    /** Bot API 9.3+: which variant number this gift would become if upgraded. */
    unique_gift_number?: Integer;
}
export interface UniqueGiftInfo {
    gift: UniqueGift;
    origin: "upgrade" | "transfer" | "resale" | "gifted_upgrade" | "offer";
    owned_gift_id?: string;
    transfer_star_count?: Integer;
    next_transfer_date?: Integer;
    /** @deprecated replaced by last_resale_currency + last_resale_amount — kept for reading old cached data. */
    last_resale_star_count?: Integer;
    /** Bot API 9.3+ */
    last_resale_currency?: string;
    last_resale_amount?: Integer;
}
export type OwnedGift = OwnedGiftRegular | OwnedGiftUnique;
export interface OwnedGiftRegular {
    type: "regular";
    gift: Gift;
    owned_gift_id?: string;
    sender_user?: User;
    send_date: Integer;
    text?: string;
    entities?: MessageEntity[];
    is_private?: boolean;
    is_saved?: boolean;
    can_be_upgraded?: boolean;
    was_refunded?: boolean;
    convert_star_count?: Integer;
    prepaid_upgrade_star_count?: Integer;
    is_upgrade_separate?: boolean;
    /** Bot API 9.3+ */
    unique_gift_number?: Integer;
}
export interface OwnedGiftUnique {
    type: "unique";
    gift: UniqueGift;
    owned_gift_id?: string;
    sender_user?: User;
    send_date: Integer;
    is_saved?: boolean;
    can_be_transferred?: boolean;
    transfer_star_count?: Integer;
    next_transfer_date?: Integer;
}
export interface AcceptedGiftTypes {
    unlimited_gifts: boolean;
    limited_gifts: boolean;
    unique_gifts: boolean;
    premium_subscription: boolean;
    /** Bot API 9.3+ */
    gifts_from_channels: boolean;
}
export interface StarAmount {
    amount: Integer;
    nanostar_amount?: Integer;
}
export interface AffiliateInfo {
    affiliate_user?: User;
    affiliate_chat?: Chat;
    commission_per_mille: Integer;
    amount: Integer;
    nanostar_amount?: Integer;
}
/** Which counterparty was on the other end of a Stars transaction. */
export type TransactionPartner = {
    type: "user";
    transaction_type: "invoice_payment" | "paid_media_payment" | "gift_purchase" | "premium_purchase" | "business_account_transfer" | string;
    user: User;
    affiliate?: AffiliateInfo;
    invoice_payload?: string;
    subscription_period?: Integer;
    paid_media?: PaidMedia[];
    paid_media_payload?: string;
    gift?: Gift;
    premium_subscription_duration?: Integer;
} | {
    type: "chat";
    chat: Chat;
    gift?: Gift;
} | {
    type: "affiliate_program";
    sponsor_user?: User;
    commission_per_mille: Integer;
} | {
    type: "fragment";
    withdrawal_state?: Record<string, unknown>;
} | {
    type: "telegram_ads";
} | {
    type: "telegram_api";
    request_count: Integer;
} | {
    type: "other";
};
export interface StarTransaction {
    id: string;
    amount: Integer;
    nanostar_amount?: Integer;
    date: Integer;
    source?: TransactionPartner;
    receiver?: TransactionPartner;
}
export interface StarTransactions {
    transactions: StarTransaction[];
}
export interface RefundedPayment {
    currency: string;
    total_amount: Integer;
    invoice_payload: string;
    telegram_payment_charge_id: string;
    provider_payment_charge_id?: string;
}
export interface SuggestedPostPrice {
    currency: "XTR" | "TON";
    amount: Integer;
}
export interface SuggestedPostParameters {
    price?: SuggestedPostPrice;
    send_date?: Integer;
}
export interface SuggestedPostInfo {
    state: "pending" | "approved" | "declined";
    price?: SuggestedPostPrice;
    send_date?: Integer;
}
export interface SuggestedPostApproved {
    suggested_post_message?: Message;
    price?: SuggestedPostPrice;
    send_date: Integer;
}
export interface SuggestedPostApprovalFailed {
    suggested_post_message?: Message;
    price?: SuggestedPostPrice;
}
export interface SuggestedPostDeclined {
    suggested_post_message?: Message;
    comment?: string;
}
export interface SuggestedPostPaid {
    suggested_post_message?: Message;
    currency: string;
    amount?: Integer;
    star_amount?: StarAmount;
}
export interface SuggestedPostRefunded {
    suggested_post_message?: Message;
    reason: "post_deleted" | "payment_refunded";
}
export interface DirectMessagesTopic {
    topic_id: Integer;
    user?: User;
}
export interface SentGuestMessage {
    message: Message;
}
export interface ChecklistTask {
    id: Integer;
    text: string;
    text_entities?: MessageEntity[];
    completed_by_user?: User;
    /** Bot API 9.6+: the chat that completed this task, when completed on behalf of a chat rather than a user. */
    completed_by_chat?: Chat;
    completion_date?: Integer;
}
export interface Checklist {
    title: string;
    title_entities?: MessageEntity[];
    tasks: ChecklistTask[];
    others_can_add_tasks?: boolean;
    others_can_mark_tasks_as_done?: boolean;
}
export interface InputChecklistTask {
    id: Integer;
    text: string;
    parse_mode?: ParseMode;
    text_entities?: MessageEntity[];
}
/** Describes a checklist to create — 1 to 30 tasks. */
export interface InputChecklist {
    title: string;
    parse_mode?: ParseMode;
    title_entities?: MessageEntity[];
    tasks: InputChecklistTask[];
    others_can_add_tasks?: boolean;
    others_can_mark_tasks_as_done?: boolean;
}
/** Service message: one or more tasks were marked done/not-done. */
export interface ChecklistTasksDone {
    checklist_message?: Message;
    marked_as_done_task_ids?: Integer[];
    marked_as_not_done_task_ids?: Integer[];
}
/** Service message: new tasks were added to an existing checklist. */
export interface ChecklistTasksAdded {
    checklist_message?: Message;
    tasks: ChecklistTask[];
}
export interface BotCommand {
    command: string;
    description: string;
    /** Bot API 10.2+: if true, this command's replies are only visible to the user who sent it (Ephemeral Messages). */
    is_ephemeral?: boolean;
}
export interface WebhookInfo {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: Integer;
    last_error_date?: Integer;
    last_error_message?: string;
    max_connections?: Integer;
    allowed_updates?: string[];
}
export interface StickerSet {
    name: string;
    title: string;
    sticker_type: "regular" | "mask" | "custom_emoji";
    stickers: Sticker[];
    thumbnail?: PhotoSize;
}
export {};
