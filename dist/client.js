"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Api = exports.Transport = exports.TelegramApiError = void 0;
class TelegramApiError extends Error {
    method;
    errorCode;
    parameters;
    constructor(method, errorCode, description, parameters) {
        super(`${method} failed (${errorCode}): ${description}`);
        this.method = method;
        this.errorCode = errorCode;
        this.parameters = parameters;
        this.name = "TelegramApiError";
    }
}
exports.TelegramApiError = TelegramApiError;
/**
 * Low-level transport. Every method on Api ultimately calls `call()`.
 * Because `call()` accepts any method name and params, ayotbl never goes
 * "out of date" when Telegram ships a new method — you can use it the same
 * day via `bot.api.call('newMethodName', {...})` while ayotbl catches up
 * with a typed wrapper.
 */
class Transport {
    token;
    root;
    maxRetries;
    minIntervalMs;
    queue = Promise.resolve();
    constructor(token, opts = {}) {
        this.token = token;
        this.root = `${opts.apiRoot ?? "https://api.telegram.org"}/bot${token}`;
        this.maxRetries = opts.floodControl?.maxRetries ?? 3;
        this.minIntervalMs = opts.minIntervalMs ?? 0;
    }
    /** Serializes calls at least `minIntervalMs` apart when that option is set; otherwise runs immediately. */
    schedule(fn) {
        if (!this.minIntervalMs)
            return fn();
        const result = this.queue.then(fn);
        this.queue = result.catch(() => undefined).then(() => sleep(this.minIntervalMs));
        return result;
    }
    async call(method, params = {}, attempt = 0) {
        return this.schedule(async () => {
            try {
                return await this.performCall(method, params);
            }
            catch (err) {
                if (err instanceof TelegramApiError && err.errorCode === 429 && err.parameters?.retry_after !== undefined && attempt < this.maxRetries) {
                    await sleep(err.parameters.retry_after * 1000);
                    return this.call(method, params, attempt + 1);
                }
                throw err;
            }
        });
    }
    async performCall(method, params = {}) {
        const p = params;
        const hasFile = Object.values(p).some(isInputFileValue);
        const url = `${this.root}/${method}`;
        const res = hasFile
            ? await this.callMultipart(url, p)
            : await fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(stripUndefined(p)),
            });
        const body = (await res.json());
        if (!body.ok) {
            throw new TelegramApiError(method, body.error_code ?? 0, body.description ?? "unknown error", body.parameters);
        }
        return body.result;
    }
    async callMultipart(url, params) {
        const form = new FormData();
        for (const [key, value] of Object.entries(stripUndefined(params))) {
            if (isInputFileValue(value)) {
                const { blob, filename } = toBlob(value);
                form.append(key, blob, filename);
            }
            else if (typeof value === "object") {
                form.append(key, JSON.stringify(value));
            }
            else {
                form.append(key, String(value));
            }
        }
        return fetch(url, { method: "POST", body: form });
    }
    getFileDownloadUrl(filePath) {
        const tokenPart = this.root.split("/bot")[1];
        const base = this.root.split("/bot")[0];
        return `${base}/file/bot${tokenPart}/${filePath}`;
    }
}
exports.Transport = Transport;
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
function stripUndefined(obj) {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
function isInputFileValue(v) {
    return !!v && typeof v === "object" && "source" in v;
}
function toBlob(v) {
    if (Buffer.isBuffer(v.source)) {
        return { blob: new Blob([v.source]), filename: v.filename };
    }
    throw new Error("Streaming file sources aren't converted to Blob automatically yet — read into a Buffer first, e.g. via fs.readFileSync, and pass { source: buffer, filename }.");
}
/**
 * The full, typed Bot API surface. Grouped by category to match the official
 * docs (core.telegram.org/bots/api) so anything you're used to in aiogram or
 * telegraf has an obvious equivalent name here.
 */
class Api {
    transport;
    constructor(transport) {
        this.transport = transport;
    }
    /** Escape hatch: call ANY method by name, typed or not. Always up to date. */
    call(method, params = {}) {
        return this.transport.call(method, params);
    }
    fileUrl(filePath) {
        return this.transport.getFileDownloadUrl(filePath);
    }
    // ----- Getting updates -----
    getMe() { return this.call("getMe"); }
    logOut() { return this.call("logOut"); }
    close() { return this.call("close"); }
    getUpdates(params = {}) {
        return this.call("getUpdates", params);
    }
    setWebhook(params) {
        return this.call("setWebhook", params);
    }
    deleteWebhook(params = {}) { return this.call("deleteWebhook", params); }
    getWebhookInfo() { return this.call("getWebhookInfo"); }
    // ----- Sending messages -----
    sendMessage(params) {
        return this.call("sendMessage", params);
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
    sendMessageDraft(params) {
        return this.call("sendMessageDraft", params);
    }
    /** New in Bot API 10.1 — structured tables, checklists, blockquotes, inline media, streamed or not. */
    sendRichMessage(params) {
        return this.call("sendRichMessage", params);
    }
    /**
     * Streams a partial rich message to a private chat while it's being generated.
     * The draft is ephemeral (a ~30s preview, not saved in the chat) — call
     * sendRichMessage with the complete content once generation finishes.
     * draft_id must be non-zero; repeated calls with the same draft_id animate
     * between states. Private chats only (chat_id must be the numeric user id).
     */
    sendRichMessageDraft(params) {
        return this.call("sendRichMessageDraft", params);
    }
    forwardMessage(params) {
        return this.call("forwardMessage", params);
    }
    forwardMessages(params) {
        return this.call("forwardMessages", params);
    }
    copyMessage(params) {
        return this.call("copyMessage", params);
    }
    copyMessages(params) {
        return this.call("copyMessages", params);
    }
    sendPhoto(params) {
        return this.call("sendPhoto", params);
    }
    /** Bot API 10.2+: send a short looping "live photo" (discovered via the official changelog's parameter list, not independently field-verified beyond that — the LivePhoto receive type is a best-effort model). */
    sendLivePhoto(params) {
        return this.call("sendLivePhoto", params);
    }
    sendAudio(params) {
        return this.call("sendAudio", params);
    }
    sendDocument(params) {
        return this.call("sendDocument", params);
    }
    sendVideo(params) {
        return this.call("sendVideo", params);
    }
    sendAnimation(params) {
        return this.call("sendAnimation", params);
    }
    /** Was missing entirely despite being one of the most common Bot API methods — found while auditing Context.replyWithSticker's fallback to the raw call() escape hatch. */
    sendSticker(params) {
        return this.call("sendSticker", params);
    }
    sendVoice(params) {
        return this.call("sendVoice", params);
    }
    sendVideoNote(params) {
        return this.call("sendVideoNote", params);
    }
    sendMediaGroup(params) {
        return this.call("sendMediaGroup", params);
    }
    /** Bot API 7.6+: send photos/videos that require the receiver to pay Stars to unlock. */
    sendPaidMedia(params) {
        return this.call("sendPaidMedia", params);
    }
    sendLocation(params) {
        return this.call("sendLocation", params);
    }
    editMessageLiveLocation(params) {
        return this.call("editMessageLiveLocation", params);
    }
    stopMessageLiveLocation(params) {
        return this.call("stopMessageLiveLocation", params);
    }
    sendVenue(params) {
        return this.call("sendVenue", params);
    }
    sendContact(params) {
        return this.call("sendContact", params);
    }
    sendPoll(params) {
        return this.call("sendPoll", params);
    }
    /** Convenience: sendPoll with type "quiz" pre-filled, matching telegraf's sendQuiz. */
    sendQuiz(params) {
        return this.call("sendPoll", { ...params, type: "quiz" });
    }
    sendDice(params) {
        return this.call("sendDice", params);
    }
    sendChatAction(params) {
        return this.call("sendChatAction", params);
    }
    // ----- Editing / deleting -----
    editMessageText(params) {
        return this.call("editMessageText", params);
    }
    editMessageCaption(params) {
        return this.call("editMessageCaption", params);
    }
    editMessageMedia(params) {
        return this.call("editMessageMedia", params);
    }
    editMessageReplyMarkup(params) {
        return this.call("editMessageReplyMarkup", params);
    }
    stopPoll(params) {
        return this.call("stopPoll", params);
    }
    deleteMessage(params) { return this.call("deleteMessage", params); }
    deleteMessages(params) { return this.call("deleteMessages", params); }
    // ----- Ephemeral Messages (Bot API 10.2) -----
    editEphemeralMessageText(params) {
        return this.call("editEphemeralMessageText", params);
    }
    editEphemeralMessageMedia(params) {
        return this.call("editEphemeralMessageMedia", params);
    }
    editEphemeralMessageCaption(params) {
        return this.call("editEphemeralMessageCaption", params);
    }
    editEphemeralMessageReplyMarkup(params) {
        return this.call("editEphemeralMessageReplyMarkup", params);
    }
    deleteEphemeralMessage(params) {
        return this.call("deleteEphemeralMessage", params);
    }
    // ----- Files -----
    getFile(params) { return this.call("getFile", params); }
    /** Convenience: resolve a file_id (or an already-fetched File) straight to a downloadable URL, calling getFile for you if needed. */
    async getFileLink(fileIdOrFile) {
        const file = typeof fileIdOrFile === "string" ? await this.getFile({ file_id: fileIdOrFile }) : fileIdOrFile;
        if (!file.file_path)
            throw new Error("ayotbl: file_path missing on File — Telegram may not have returned it yet");
        return this.transport.getFileDownloadUrl(file.file_path);
    }
    getUserProfilePhotos(params) {
        return this.call("getUserProfilePhotos", params);
    }
    /** Bot API 9.4+ */
    getUserProfileAudios(params) {
        return this.call("getUserProfileAudios", params);
    }
    // ----- Chat administration -----
    banChatMember(params) { return this.call("banChatMember", params); }
    unbanChatMember(params) { return this.call("unbanChatMember", params); }
    restrictChatMember(params) { return this.call("restrictChatMember", params); }
    promoteChatMember(params) { return this.call("promoteChatMember", params); }
    setChatAdministratorCustomTitle(params) { return this.call("setChatAdministratorCustomTitle", params); }
    /** Bot API 9.5+: set a member's tag, in chats that have tags enabled. */
    setChatMemberTag(params) { return this.call("setChatMemberTag", params); }
    banChatSenderChat(params) { return this.call("banChatSenderChat", params); }
    unbanChatSenderChat(params) { return this.call("unbanChatSenderChat", params); }
    setChatPermissions(params) { return this.call("setChatPermissions", params); }
    exportChatInviteLink(params) { return this.call("exportChatInviteLink", params); }
    createChatInviteLink(params) { return this.call("createChatInviteLink", params); }
    editChatInviteLink(params) { return this.call("editChatInviteLink", params); }
    revokeChatInviteLink(params) { return this.call("revokeChatInviteLink", params); }
    approveChatJoinRequest(params) { return this.call("approveChatJoinRequest", params); }
    declineChatJoinRequest(params) { return this.call("declineChatJoinRequest", params); }
    /** Bot API 10.1+: respond to a join request raised as a query. */
    answerChatJoinRequestQuery(params) { return this.call("answerChatJoinRequestQuery", params); }
    /** Bot API 10.1+: open a Web App from a chat join request to let the user complete additional steps before approval. */
    sendChatJoinRequestWebApp(params) { return this.call("sendChatJoinRequestWebApp", params); }
    setChatPhoto(params) { return this.call("setChatPhoto", params); }
    deleteChatPhoto(params) { return this.call("deleteChatPhoto", params); }
    setChatTitle(params) { return this.call("setChatTitle", params); }
    setChatDescription(params) { return this.call("setChatDescription", params); }
    pinChatMessage(params) { return this.call("pinChatMessage", params); }
    unpinChatMessage(params) { return this.call("unpinChatMessage", params); }
    unpinAllChatMessages(params) { return this.call("unpinAllChatMessages", params); }
    leaveChat(params) { return this.call("leaveChat", params); }
    getChat(params) { return this.call("getChat", params); }
    getChatAdministrators(params) { return this.call("getChatAdministrators", params); }
    getChatMemberCount(params) { return this.call("getChatMemberCount", params); }
    getChatMember(params) { return this.call("getChatMember", params); }
    setChatStickerSet(params) { return this.call("setChatStickerSet", params); }
    deleteChatStickerSet(params) { return this.call("deleteChatStickerSet", params); }
    /** React to a message with emoji/custom-emoji/paid reactions (Bot API 7.0+). */
    setMessageReaction(params) { return this.call("setMessageReaction", params); }
    /** Bot API 10.0+ */
    deleteAllMessageReactions(params) { return this.call("deleteAllMessageReactions", params); }
    deleteMessageReaction(params) { return this.call("deleteMessageReaction", params); }
    getUserChatBoosts(params) { return this.call("getUserChatBoosts", params); }
    // ----- Forum topics -----
    getForumTopicIconStickers() { return this.call("getForumTopicIconStickers"); }
    createForumTopic(params) { return this.call("createForumTopic", params); }
    editForumTopic(params) { return this.call("editForumTopic", params); }
    closeForumTopic(params) { return this.call("closeForumTopic", params); }
    reopenForumTopic(params) { return this.call("reopenForumTopic", params); }
    deleteForumTopic(params) { return this.call("deleteForumTopic", params); }
    unpinAllForumTopicMessages(params) { return this.call("unpinAllForumTopicMessages", params); }
    // The "General" topic (message_thread_id-less) has its own dedicated set of methods.
    editGeneralForumTopic(params) { return this.call("editGeneralForumTopic", params); }
    closeGeneralForumTopic(params) { return this.call("closeGeneralForumTopic", params); }
    reopenGeneralForumTopic(params) { return this.call("reopenGeneralForumTopic", params); }
    hideGeneralForumTopic(params) { return this.call("hideGeneralForumTopic", params); }
    unhideGeneralForumTopic(params) { return this.call("unhideGeneralForumTopic", params); }
    unpinAllGeneralForumTopicMessages(params) { return this.call("unpinAllGeneralForumTopicMessages", params); }
    // ----- Bot profile / commands / menu -----
    setMyCommands(params) { return this.call("setMyCommands", params); }
    deleteMyCommands(params = {}) { return this.call("deleteMyCommands", params); }
    getMyCommands(params = {}) { return this.call("getMyCommands", params); }
    setChatMenuButton(params = {}) { return this.call("setChatMenuButton", params); }
    getChatMenuButton(params = {}) { return this.call("getChatMenuButton", params); }
    setMyDefaultAdministratorRights(params = {}) { return this.call("setMyDefaultAdministratorRights", params); }
    getMyDefaultAdministratorRights(params = {}) { return this.call("getMyDefaultAdministratorRights", params); }
    setMyName(params = {}) { return this.call("setMyName", params); }
    getMyName(params = {}) { return this.call("getMyName", params); }
    setMyDescription(params = {}) { return this.call("setMyDescription", params); }
    getMyDescription(params = {}) { return this.call("getMyDescription", params); }
    setMyShortDescription(params = {}) { return this.call("setMyShortDescription", params); }
    getMyShortDescription(params = {}) { return this.call("getMyShortDescription", params); }
    /** Bot API 9.6+ */
    setMyProfilePhoto(params) { return this.call("setMyProfilePhoto", params); }
    /** Bot API 8.0+: change a user's emoji status, if they've granted the bot permission via a Mini App. */
    setUserEmojiStatus(params) { return this.call("setUserEmojiStatus", params); }
    removeMyProfilePhoto() { return this.call("removeMyProfilePhoto"); }
    /** Telegram Passport: report validation errors on a user's submitted Passport data. */
    setPassportDataErrors(params) { return this.call("setPassportDataErrors", params); }
    // ----- Callback / inline queries -----
    answerCallbackQuery(params) { return this.call("answerCallbackQuery", params); }
    /** Same endpoint as answerCallbackQuery, but for opening a game's URL from a callback query. */
    answerGameQuery(params) { return this.call("answerCallbackQuery", params); }
    answerInlineQuery(params) { return this.call("answerInlineQuery", params); }
    /** Set the result of an interaction with a Web App and send its corresponding message to the chat. */
    answerWebAppQuery(params) { return this.call("answerWebAppQuery", params); }
    /** Bot API 8.0+: let a Mini App hand a pre-built inline result to the user to share, without leaving the app. */
    savePreparedInlineMessage(params) {
        return this.call("savePreparedInlineMessage", params);
    }
    /** Bot API 9.6+: prepares a keyboard button that a Mini App can show to let the user request creating a managed bot — distinct from savePreparedInlineMessage above. */
    savePreparedKeyboardButton(params) {
        return this.call("savePreparedKeyboardButton", params);
    }
    // ----- Payments -----
    sendInvoice(params) {
        return this.call("sendInvoice", params);
    }
    createInvoiceLink(params) {
        return this.call("createInvoiceLink", params);
    }
    answerShippingQuery(params) { return this.call("answerShippingQuery", params); }
    answerPreCheckoutQuery(params) { return this.call("answerPreCheckoutQuery", params); }
    // ----- Stickers -----
    getStickerSet(params) { return this.call("getStickerSet", params); }
    getCustomEmojiStickers(params) { return this.call("getCustomEmojiStickers", params); }
    uploadStickerFile(params) { return this.call("uploadStickerFile", params); }
    createNewStickerSet(params) { return this.call("createNewStickerSet", params); }
    addStickerToSet(params) { return this.call("addStickerToSet", params); }
    setStickerPositionInSet(params) { return this.call("setStickerPositionInSet", params); }
    deleteStickerFromSet(params) { return this.call("deleteStickerFromSet", params); }
    setStickerEmojiList(params) { return this.call("setStickerEmojiList", params); }
    setStickerKeywords(params) { return this.call("setStickerKeywords", params); }
    setStickerMaskPosition(params) { return this.call("setStickerMaskPosition", params); }
    setStickerSetTitle(params) { return this.call("setStickerSetTitle", params); }
    setStickerSetThumbnail(params) { return this.call("setStickerSetThumbnail", params); }
    setCustomEmojiStickerSetThumbnail(params) { return this.call("setCustomEmojiStickerSetThumbnail", params); }
    deleteStickerSet(params) { return this.call("deleteStickerSet", params); }
    // ----- Games -----
    sendGame(params) { return this.call("sendGame", params); }
    setGameScore(params) { return this.call("setGameScore", params); }
    getGameHighScores(params) { return this.call("getGameHighScores", params); }
    // ----- Checklists (Bot API 9.1) — sent/edited on behalf of a business account only -----
    sendChecklist(params) {
        return this.call("sendChecklist", params);
    }
    editMessageChecklist(params) {
        return this.call("editMessageChecklist", params);
    }
    // ----- Business accounts -----
    getBusinessConnection(params) { return this.call("getBusinessConnection", params); }
    readBusinessMessage(params) { return this.call("readBusinessMessage", params); }
    deleteBusinessMessages(params) { return this.call("deleteBusinessMessages", params); }
    setBusinessAccountName(params) { return this.call("setBusinessAccountName", params); }
    setBusinessAccountUsername(params) { return this.call("setBusinessAccountUsername", params); }
    setBusinessAccountBio(params) { return this.call("setBusinessAccountBio", params); }
    setBusinessAccountProfilePhoto(params) { return this.call("setBusinessAccountProfilePhoto", params); }
    removeBusinessAccountProfilePhoto(params) { return this.call("removeBusinessAccountProfilePhoto", params); }
    setBusinessAccountGiftSettings(params) { return this.call("setBusinessAccountGiftSettings", params); }
    getBusinessAccountStarBalance(params) { return this.call("getBusinessAccountStarBalance", params); }
    transferBusinessAccountStars(params) { return this.call("transferBusinessAccountStars", params); }
    getBusinessAccountGifts(params) {
        return this.call("getBusinessAccountGifts", params);
    }
    /** Bot API 9.3+ */
    getUserGifts(params) {
        return this.call("getUserGifts", params);
    }
    getChatGifts(params) {
        return this.call("getChatGifts", params);
    }
    convertGiftToStars(params) { return this.call("convertGiftToStars", params); }
    upgradeGift(params) { return this.call("upgradeGift", params); }
    transferGift(params) { return this.call("transferGift", params); }
    postStory(params) { return this.call("postStory", params); }
    editStory(params) { return this.call("editStory", params); }
    deleteStory(params) { return this.call("deleteStory", params); }
    /** Bot API 9.x+: repost a story across different business accounts the bot manages. */
    repostStory(params) { return this.call("repostStory", params); }
    // ----- Verification (Bot API 8.2+) -----
    verifyUser(params) { return this.call("verifyUser", params); }
    verifyChat(params) { return this.call("verifyChat", params); }
    removeUserVerification(params) { return this.call("removeUserVerification", params); }
    removeChatVerification(params) { return this.call("removeChatVerification", params); }
    // ----- Gifts (Bot API 8.0+) -----
    getAvailableGifts() { return this.call("getAvailableGifts"); }
    /** Send a gift to a user or channel chat (exactly one of user_id/chat_id). Can't be converted to Stars by the receiver. */
    sendGift(params) {
        return this.call("sendGift", params);
    }
    giftPremiumSubscription(params) {
        return this.call("giftPremiumSubscription", params);
    }
    // ----- Stars & Payments transactions (Bot API 7.4+) -----
    getStarTransactions(params = {}) { return this.call("getStarTransactions", params); }
    /** Bot API 9.3+: the bot's own Stars balance. */
    getMyStarBalance() { return this.call("getMyStarBalance"); }
    refundStarPayment(params) { return this.call("refundStarPayment", params); }
    editUserStarSubscription(params) { return this.call("editUserStarSubscription", params); }
    // ----- Suggested Posts / Direct Messages in Channels (Bot API 9.2+) -----
    approveSuggestedPost(params) { return this.call("approveSuggestedPost", params); }
    declineSuggestedPost(params) { return this.call("declineSuggestedPost", params); }
    // ----- Guest mode (Bot API 10.0+) — bots being mentioned/queried by users they have no direct relationship with -----
    /** Respond to a guest_message update, matching the shape of answerWebAppQuery. */
    answerGuestQuery(params) { return this.call("answerGuestQuery", params); }
    // ----- Managed Bots (Bot API 9.5/9.6) -----
    // NOTE: these two methods are newer than telegraf v4's own coverage (telegraf hasn't
    // added them as of this writing), so they're implemented from the Bot API changelog
    // directly rather than cross-checked against telegraf. Verify against the current
    // core.telegram.org/bots/api docs before depending on them in production.
    /** Retrieve the token of a bot your bot manages, after it's created via the newbot deep link flow. */
    getManagedBotToken(params) { return this.call("getManagedBotToken", params); }
    replaceManagedBotToken(params) { return this.call("replaceManagedBotToken", params); }
    /** Bot API 10.0+ */
    getManagedBotAccessSettings(params) { return this.call("getManagedBotAccessSettings", params); }
    setManagedBotAccessSettings(params) { return this.call("setManagedBotAccessSettings", params); }
    /** Bot API 10.0+: fetch messages from a user's personal chat (e.g. to display in a Mini App). */
    getUserPersonalChatMessages(params) { return this.call("getUserPersonalChatMessages", params); }
}
exports.Api = Api;
//# sourceMappingURL=client.js.map