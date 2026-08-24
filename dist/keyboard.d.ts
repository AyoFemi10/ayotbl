import * as T from "./types";
/**
 * Fluent builders for keyboards. Chosen to read almost like English:
 *
 *   Keyboard.inline()
 *     .button('Yes', 'confirm:yes')
 *     .button('No', 'confirm:no')
 *     .row()
 *     .url('Docs', 'https://example.com')
 *     .build()
 */
export declare class InlineKeyboardBuilder {
    private rows;
    button(text: string, callback_data: string, extra?: {
        style?: "primary" | "success" | "danger";
        icon_custom_emoji_id?: string;
    }): this;
    url(text: string, url: string, extra?: {
        style?: "primary" | "success" | "danger";
        icon_custom_emoji_id?: string;
    }): this;
    /** Alias for url() — a plausible guessed name given how other libraries phrase this, so it's accepted rather than throwing "not a function". */
    urlButton(text: string, url: string, extra?: {
        style?: "primary" | "success" | "danger";
        icon_custom_emoji_id?: string;
    }): this;
    webApp(text: string, url: string): this;
    switchInline(text: string, query?: string): this;
    pay(text: string): this;
    /** Copies text to the user's clipboard when tapped (Bot API 7.11+). */
    copyText(text: string, textToCopy: string, extra?: {
        style?: "primary" | "success" | "danger";
        icon_custom_emoji_id?: string;
    }): this;
    /** Start a new row of buttons. */
    row(): this;
    private current;
    build(): T.InlineKeyboardMarkup;
}
export declare class ReplyKeyboardBuilder {
    private rows;
    text(label: string, extra?: {
        style?: "primary" | "success" | "danger";
        icon_custom_emoji_id?: string;
    }): this;
    requestContact(label: string): this;
    requestLocation(label: string): this;
    row(): this;
    private current;
    build(opts?: {
        resize?: boolean;
        oneTime?: boolean;
        placeholder?: string;
    }): T.ReplyKeyboardMarkup;
}
/** Entry points, so usage reads as `Keyboard.inline()...` / `Keyboard.reply()...` / `Keyboard.remove()`. */
export declare const Keyboard: {
    inline: () => InlineKeyboardBuilder;
    reply: () => ReplyKeyboardBuilder;
    remove: (selective?: boolean) => T.ReplyKeyboardRemove;
    forceReply: (placeholder?: string) => T.ForceReply;
};
