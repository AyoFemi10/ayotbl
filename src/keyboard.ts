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
export class InlineKeyboardBuilder {
  private rows: T.InlineKeyboardButton[][] = [[]];

  button(text: string, callback_data: string, extra: { style?: "primary" | "success" | "danger"; icon_custom_emoji_id?: string } = {}): this {
    this.current().push({ text, callback_data, ...extra });
    return this;
  }
  url(text: string, url: string, extra: { style?: "primary" | "success" | "danger"; icon_custom_emoji_id?: string } = {}): this {
    this.current().push({ text, url, ...extra });
    return this;
  }
  webApp(text: string, url: string): this {
    this.current().push({ text, web_app: { url } });
    return this;
  }
  switchInline(text: string, query = ""): this {
    this.current().push({ text, switch_inline_query: query });
    return this;
  }
  pay(text: string): this {
    this.current().push({ text, pay: true });
    return this;
  }
  /** Copies text to the user's clipboard when tapped (Bot API 7.11+). */
  copyText(text: string, textToCopy: string, extra: { style?: "primary" | "success" | "danger"; icon_custom_emoji_id?: string } = {}): this {
    this.current().push({ text, copy_text: { text: textToCopy }, ...extra });
    return this;
  }
  /** Start a new row of buttons. */
  row(): this {
    this.rows.push([]);
    return this;
  }
  private current() {
    return this.rows[this.rows.length - 1];
  }
  build(): T.InlineKeyboardMarkup {
    return { inline_keyboard: this.rows.filter((r) => r.length) };
  }
}

export class ReplyKeyboardBuilder {
  private rows: T.KeyboardButton[][] = [[]];

  text(label: string, extra: { style?: "primary" | "success" | "danger"; icon_custom_emoji_id?: string } = {}): this {
    this.current().push({ text: label, ...extra });
    return this;
  }
  requestContact(label: string): this {
    this.current().push({ text: label, request_contact: true });
    return this;
  }
  requestLocation(label: string): this {
    this.current().push({ text: label, request_location: true });
    return this;
  }
  row(): this {
    this.rows.push([]);
    return this;
  }
  private current() {
    return this.rows[this.rows.length - 1];
  }
  build(opts: { resize?: boolean; oneTime?: boolean; placeholder?: string } = {}): T.ReplyKeyboardMarkup {
    return {
      keyboard: this.rows.filter((r) => r.length),
      resize_keyboard: opts.resize ?? true,
      one_time_keyboard: opts.oneTime,
      input_field_placeholder: opts.placeholder,
    };
  }
}

/** Entry points, so usage reads as `Keyboard.inline()...` / `Keyboard.reply()...` / `Keyboard.remove()`. */
export const Keyboard = {
  inline: () => new InlineKeyboardBuilder(),
  reply: () => new ReplyKeyboardBuilder(),
  remove: (selective = false): T.ReplyKeyboardRemove => ({ remove_keyboard: true, selective }),
  forceReply: (placeholder?: string): T.ForceReply => ({ force_reply: true, input_field_placeholder: placeholder }),
};
