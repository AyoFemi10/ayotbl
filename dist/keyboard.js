"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Keyboard = exports.ReplyKeyboardBuilder = exports.InlineKeyboardBuilder = void 0;
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
class InlineKeyboardBuilder {
    rows = [[]];
    button(text, callback_data, extra = {}) {
        this.current().push({ text, callback_data, ...extra });
        return this;
    }
    url(text, url, extra = {}) {
        this.current().push({ text, url, ...extra });
        return this;
    }
    /** Alias for url() — a plausible guessed name given how other libraries phrase this, so it's accepted rather than throwing "not a function". */
    urlButton(text, url, extra = {}) {
        return this.url(text, url, extra);
    }
    webApp(text, url) {
        this.current().push({ text, web_app: { url } });
        return this;
    }
    switchInline(text, query = "") {
        this.current().push({ text, switch_inline_query: query });
        return this;
    }
    pay(text) {
        this.current().push({ text, pay: true });
        return this;
    }
    /** Copies text to the user's clipboard when tapped (Bot API 7.11+). */
    copyText(text, textToCopy, extra = {}) {
        this.current().push({ text, copy_text: { text: textToCopy }, ...extra });
        return this;
    }
    /** Start a new row of buttons. */
    row() {
        this.rows.push([]);
        return this;
    }
    current() {
        return this.rows[this.rows.length - 1];
    }
    build() {
        return { inline_keyboard: this.rows.filter((r) => r.length) };
    }
}
exports.InlineKeyboardBuilder = InlineKeyboardBuilder;
class ReplyKeyboardBuilder {
    rows = [[]];
    text(label, extra = {}) {
        this.current().push({ text: label, ...extra });
        return this;
    }
    requestContact(label) {
        this.current().push({ text: label, request_contact: true });
        return this;
    }
    requestLocation(label) {
        this.current().push({ text: label, request_location: true });
        return this;
    }
    row() {
        this.rows.push([]);
        return this;
    }
    current() {
        return this.rows[this.rows.length - 1];
    }
    build(opts = {}) {
        return {
            keyboard: this.rows.filter((r) => r.length),
            resize_keyboard: opts.resize ?? true,
            one_time_keyboard: opts.oneTime,
            input_field_placeholder: opts.placeholder,
        };
    }
}
exports.ReplyKeyboardBuilder = ReplyKeyboardBuilder;
/** Entry points, so usage reads as `Keyboard.inline()...` / `Keyboard.reply()...` / `Keyboard.remove()`. */
exports.Keyboard = {
    inline: () => new InlineKeyboardBuilder(),
    reply: () => new ReplyKeyboardBuilder(),
    remove: (selective = false) => ({ remove_keyboard: true, selective }),
    forceReply: (placeholder) => ({ force_reply: true, input_field_placeholder: placeholder }),
};
//# sourceMappingURL=keyboard.js.map