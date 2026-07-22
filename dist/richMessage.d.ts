import * as T from "./types";
/**
 * Two ways to build a Rich Message (Bot API 10.1, block API added 10.2):
 *
 * 1. `RichMessage.markdown()` / `.html()` — write "Rich Markdown"/"Rich HTML"
 *    text (GFM-flavored markdown: **bold**, ==marked==, ||spoiler||, `- [ ]`
 *    task items, GFM tables, etc. — see the official docs for the full
 *    syntax). Simplest for AI-generated or hand-written content.
 * 2. `RichMessage.blocks()` — build the structured block tree directly
 *    (Bot API 10.2+), for when you want guaranteed structure (e.g. a table
 *    with real colspan/rowspan) rather than round-tripping through text.
 *
 * Both produce an `InputRichMessage` for `ctx.replyRich()` / `api.sendRichMessage()`.
 */
export declare class RichMarkdownBuilder {
    private parts;
    private media;
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
    /** Embeds a media block referenced by URL — matches the ![](url "optional caption") syntax. */
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
    raw(block: T.InputRichBlock): this;
    build(): T.InputRichMessage;
}
export declare const RichMessage: {
    markdown: () => RichMarkdownBuilder;
    html: () => RichHtmlBuilder;
    blocks: () => RichBlocksBuilder;
};
