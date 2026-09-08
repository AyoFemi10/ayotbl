import * as T from "./types";
/**
 * Two ways to build a Rich Message (Bot API 10.1, block API added 10.2):
 *
 * 1. `RichMessage.markdown()` / `.html()` — write "Rich Markdown"/"Rich HTML"
 *    text (GFM-flavored markdown: **bold**, ==marked==, ||spoiler||, `- [ ]`
 *    task items, GFM tables, etc. — see the official docs for the full
 *    syntax). Simplest for AI-generated or hand-written content. Inline
 *    photos here (`.photo()`) use Rich Markdown's own `![](url)` image
 *    syntax directly in the text — confirmed working against a real server.
 * 2. `RichMessage.blocks()` — build the structured block tree directly
 *    (Bot API 10.2+), for when you want guaranteed structure (e.g. a table
 *    with real colspan/rowspan) rather than round-tripping through text.
 *    Media blocks (photo/video/audio/animation/voice_note) reference a
 *    separately-declared media item by id — confirmed via two live 400
 *    errors that Telegram rejects both a missing `id` on the media item and
 *    an inline file where it expects an `{ id }` reference. Use `.photo()`/
 *    `.video()`/etc. here (not the markdown builder's `.photo()`) and the id
 *    bookkeeping is handled for you.
 *
 * Both produce an `InputRichMessage` for `ctx.replyRich()` / `api.sendRichMessage()`.
 */
export declare class RichMarkdownBuilder {
    private parts;
    text(str: string): this;
    heading(str: string, level?: 1 | 2 | 3 | 4 | 5 | 6): this;
    blockquote(str: string): this;
    checklist(items: (string | {
        label: string;
        done?: boolean;
    })[]): this;
    list(items: string[], ordered?: boolean): this;
    table(headers: string[], rows: string[][]): this;
    codeBlock(code: string, language?: string): this;
    divider(): this;
    /**
     * Embeds a photo inline via Rich Markdown's own `![](url "caption")`
     * image syntax. This does NOT use InputRichMessage.media — that field is
     * only for RichMessage.blocks()'s structured media blocks, and is a
     * separate mechanism. This method's output is the confirmed-working path.
     */
    photo(url: string, caption?: string): this;
    build(): T.InputRichMessage;
}
export declare class RichHtmlBuilder {
    private parts;
    raw(html: string): this;
    paragraph(html: string): this;
    heading(html: string, level?: 1 | 2 | 3 | 4 | 5 | 6): this;
    build(): T.InputRichMessage;
}
/** Structural block-based builder (Bot API 10.2+) — produces InputRichBlock[] directly. */
export declare class RichBlocksBuilder {
    private blocks;
    private mediaItems;
    private mediaCounter;
    /**
     * Declares a media item, returning its id. Prefer the .photo()/.video()/
     * .audio()/.animation()/.voiceNote() convenience methods below, which call
     * this for you and add the referencing block in one step — use this
     * directly only if you're building a raw block yourself via .raw().
     */
    media(type: T.InputRichMessageMedia["type"], file: T.InputFile): string;
    paragraph(text: T.RichText): this;
    heading(text: T.RichText, size?: 1 | 2 | 3 | 4 | 5 | 6): this;
    divider(): this;
    table(cells: T.RichBlockTableCell[][], opts?: {
        bordered?: boolean;
        striped?: boolean;
        caption?: T.RichText;
    }): this;
    list(items: T.RichBlockListItem[]): this;
    details(summary: T.RichText, blocks: T.InputRichBlock[], open?: boolean): this;
    /** Adds a photo block, declaring its media item for you. */
    photo(file: T.InputFile, opts?: {
        hasSpoiler?: boolean;
        caption?: T.RichBlockCaption;
    }): this;
    video(file: T.InputFile, opts?: {
        hasSpoiler?: boolean;
        caption?: T.RichBlockCaption;
    }): this;
    audio(file: T.InputFile, opts?: {
        caption?: T.RichBlockCaption;
    }): this;
    animation(file: T.InputFile, opts?: {
        hasSpoiler?: boolean;
        caption?: T.RichBlockCaption;
    }): this;
    voiceNote(file: T.InputFile, opts?: {
        caption?: T.RichBlockCaption;
    }): this;
    /** Bot API 10.3+: adds a document (file) block. */
    document(file: T.InputFile, opts?: {
        caption?: T.RichBlockCaption;
    }): this;
    /** Bot API 10.3+: adds a row of buttons to the rich message. */
    buttons(buttons: T.RichMessageButton[]): this;
    /** Bot API 10.3+: adds an expandable/collapsible block quotation. */
    expandableBlockquote(blocks: T.InputRichBlock[], opts?: {
        credit?: T.RichText;
    }): this;
    /** Escape hatch for block types without a dedicated method. If it references media by id, declare that media via .media() first, or build() will throw before you ever hit Telegram's 400. */
    raw(block: T.InputRichBlock): this;
    build(): T.InputRichMessage;
}
export declare const RichMessage: {
    markdown: () => RichMarkdownBuilder;
    html: () => RichHtmlBuilder;
    blocks: () => RichBlocksBuilder;
};
