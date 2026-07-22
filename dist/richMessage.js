"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RichMessage = exports.RichBlocksBuilder = exports.RichHtmlBuilder = exports.RichMarkdownBuilder = void 0;
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
class RichMarkdownBuilder {
    parts = [];
    media = [];
    text(str) {
        this.parts.push(str);
        return this;
    }
    heading(str, level = 2) {
        this.parts.push(`${"#".repeat(level)} ${str}`);
        return this;
    }
    blockquote(str) {
        this.parts.push(str.split("\n").map((l) => `> ${l}`).join("\n"));
        return this;
    }
    checklist(items) {
        const normalized = items.map((i) => (typeof i === "string" ? { label: i, done: false } : i));
        this.parts.push(normalized.map((i) => `- [${i.done ? "x" : " "}] ${i.label}`).join("\n"));
        return this;
    }
    list(items, ordered = false) {
        this.parts.push(items.map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`)).join("\n"));
        return this;
    }
    table(headers, rows) {
        const line = (cells) => `| ${cells.join(" | ")} |`;
        this.parts.push([line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n"));
        return this;
    }
    codeBlock(code, language) {
        this.parts.push("```" + (language ?? "") + "\n" + code + "\n```");
        return this;
    }
    divider() {
        this.parts.push("---");
        return this;
    }
    /** Embeds a media block referenced by URL — matches the ![](url "optional caption") syntax. */
    photo(url, caption) {
        this.parts.push(caption ? `![](${url} "${caption}")` : `![](${url})`);
        return this;
    }
    build() {
        return {
            markdown: this.parts.join("\n\n"),
            media: this.media.length ? this.media : undefined,
        };
    }
}
exports.RichMarkdownBuilder = RichMarkdownBuilder;
class RichHtmlBuilder {
    parts = [];
    raw(html) {
        this.parts.push(html);
        return this;
    }
    paragraph(html) {
        this.parts.push(`<p>${html}</p>`);
        return this;
    }
    heading(html, level = 2) {
        this.parts.push(`<h${level}>${html}</h${level}>`);
        return this;
    }
    build() {
        return { html: this.parts.join("\n") };
    }
}
exports.RichHtmlBuilder = RichHtmlBuilder;
/** Structural block-based builder (Bot API 10.2+) — produces InputRichBlock[] directly. */
class RichBlocksBuilder {
    blocks = [];
    paragraph(text) {
        this.blocks.push({ type: "paragraph", text });
        return this;
    }
    heading(text, size = 2) {
        this.blocks.push({ type: "heading", text, size });
        return this;
    }
    divider() {
        this.blocks.push({ type: "divider" });
        return this;
    }
    table(cells, opts = {}) {
        this.blocks.push({ type: "table", cells, is_bordered: opts.bordered ? true : undefined, is_striped: opts.striped ? true : undefined, caption: opts.caption });
        return this;
    }
    list(items) {
        this.blocks.push({ type: "list", items });
        return this;
    }
    details(summary, blocks, open = false) {
        this.blocks.push({ type: "details", summary, blocks, is_open: open ? true : undefined });
        return this;
    }
    raw(block) {
        this.blocks.push(block);
        return this;
    }
    build() {
        return { blocks: this.blocks };
    }
}
exports.RichBlocksBuilder = RichBlocksBuilder;
exports.RichMessage = {
    markdown: () => new RichMarkdownBuilder(),
    html: () => new RichHtmlBuilder(),
    blocks: () => new RichBlocksBuilder(),
};
//# sourceMappingURL=richMessage.js.map