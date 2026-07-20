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

export class RichMarkdownBuilder {
  private parts: string[] = [];
  private media: T.InputRichMessageMedia[] = [];

  text(str: string): this {
    this.parts.push(str);
    return this;
  }

  heading(str: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2): this {
    this.parts.push(`${"#".repeat(level)} ${str}`);
    return this;
  }

  blockquote(str: string): this {
    this.parts.push(str.split("\n").map((l) => `> ${l}`).join("\n"));
    return this;
  }

  checklist(items: (string | { label: string; done?: boolean })[]): this {
    const normalized = items.map((i) => (typeof i === "string" ? { label: i, done: false } : i));
    this.parts.push(normalized.map((i) => `- [${i.done ? "x" : " "}] ${i.label}`).join("\n"));
    return this;
  }

  list(items: string[], ordered = false): this {
    this.parts.push(items.map((item, i) => (ordered ? `${i + 1}. ${item}` : `- ${item}`)).join("\n"));
    return this;
  }

  table(headers: string[], rows: string[][]): this {
    const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
    this.parts.push([line(headers), line(headers.map(() => "---")), ...rows.map(line)].join("\n"));
    return this;
  }

  codeBlock(code: string, language?: string): this {
    this.parts.push("```" + (language ?? "") + "\n" + code + "\n```");
    return this;
  }

  divider(): this {
    this.parts.push("---");
    return this;
  }

  /** Embeds a media block referenced by URL — matches the ![](url "optional caption") syntax. */
  photo(url: string, caption?: string): this {
    this.parts.push(caption ? `![](${url} "${caption}")` : `![](${url})`);
    return this;
  }

  build(): T.InputRichMessage {
    return {
      markdown: this.parts.join("\n\n"),
      media: this.media.length ? this.media : undefined,
    };
  }
}

export class RichHtmlBuilder {
  private parts: string[] = [];

  raw(html: string): this {
    this.parts.push(html);
    return this;
  }

  paragraph(html: string): this {
    this.parts.push(`<p>${html}</p>`);
    return this;
  }

  heading(html: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 2): this {
    this.parts.push(`<h${level}>${html}</h${level}>`);
    return this;
  }

  build(): T.InputRichMessage {
    return { html: this.parts.join("\n") };
  }
}

/** Structural block-based builder (Bot API 10.2+) — produces InputRichBlock[] directly. */
export class RichBlocksBuilder {
  private blocks: T.InputRichBlock[] = [];

  paragraph(text: T.RichText): this {
    this.blocks.push({ type: "paragraph", text });
    return this;
  }
  heading(text: T.RichText, size: 1 | 2 | 3 | 4 | 5 | 6 = 2): this {
    this.blocks.push({ type: "heading", text, size });
    return this;
  }
  divider(): this {
    this.blocks.push({ type: "divider" });
    return this;
  }
  table(cells: T.RichBlockTableCell[][], opts: { bordered?: boolean; striped?: boolean; caption?: T.RichText } = {}): this {
    this.blocks.push({ type: "table", cells, is_bordered: opts.bordered ? true : undefined, is_striped: opts.striped ? true : undefined, caption: opts.caption });
    return this;
  }
  list(items: T.RichBlockListItem[]): this {
    this.blocks.push({ type: "list", items });
    return this;
  }
  details(summary: T.RichText, blocks: T.InputRichBlock[], open = false): this {
    this.blocks.push({ type: "details", summary, blocks, is_open: open ? true : undefined });
    return this;
  }
  raw(block: T.InputRichBlock): this {
    this.blocks.push(block);
    return this;
  }
  build(): T.InputRichMessage {
    return { blocks: this.blocks };
  }
}

export const RichMessage = {
  markdown: () => new RichMarkdownBuilder(),
  html: () => new RichHtmlBuilder(),
  blocks: () => new RichBlocksBuilder(),
};
