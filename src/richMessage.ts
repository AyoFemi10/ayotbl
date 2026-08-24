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

export class RichMarkdownBuilder {
  private parts: string[] = [];

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

  /**
   * Embeds a photo inline via Rich Markdown's own `![](url "caption")`
   * image syntax. This does NOT use InputRichMessage.media — that field is
   * only for RichMessage.blocks()'s structured media blocks, and is a
   * separate mechanism. This method's output is the confirmed-working path.
   */
  photo(url: string, caption?: string): this {
    this.parts.push(caption ? `![](${url} "${caption}")` : `![](${url})`);
    return this;
  }

  build(): T.InputRichMessage {
    return { markdown: this.parts.join("\n\n") };
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

function findMediaRef(b: T.InputRichBlock): T.InputRichMediaRef | undefined {
  switch (b.type) {
    case "photo": return b.photo;
    case "video": return b.video;
    case "audio": return b.audio;
    case "animation": return b.animation;
    case "voice_note": return b.voice_note;
    default: return undefined;
  }
}

/** Structural block-based builder (Bot API 10.2+) — produces InputRichBlock[] directly. */
export class RichBlocksBuilder {
  private blocks: T.InputRichBlock[] = [];
  private mediaItems: T.InputRichMessageMedia[] = [];
  private mediaCounter = 0;

  /**
   * Declares a media item, returning its id. Prefer the .photo()/.video()/
   * .audio()/.animation()/.voiceNote() convenience methods below, which call
   * this for you and add the referencing block in one step — use this
   * directly only if you're building a raw block yourself via .raw().
   */
  media(type: T.InputRichMessageMedia["type"], file: T.InputFile): string {
    const id = `media-${++this.mediaCounter}`;
    this.mediaItems.push({ id, type, media: file });
    return id;
  }

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

  /** Adds a photo block, declaring its media item for you. */
  photo(file: T.InputFile, opts: { hasSpoiler?: boolean; caption?: T.RichBlockCaption } = {}): this {
    const id = this.media("photo", file);
    this.blocks.push({ type: "photo", photo: { id }, has_spoiler: opts.hasSpoiler ? true : undefined, caption: opts.caption });
    return this;
  }
  video(file: T.InputFile, opts: { hasSpoiler?: boolean; caption?: T.RichBlockCaption } = {}): this {
    const id = this.media("video", file);
    this.blocks.push({ type: "video", video: { id }, has_spoiler: opts.hasSpoiler ? true : undefined, caption: opts.caption });
    return this;
  }
  audio(file: T.InputFile, opts: { caption?: T.RichBlockCaption } = {}): this {
    const id = this.media("audio", file);
    this.blocks.push({ type: "audio", audio: { id }, caption: opts.caption });
    return this;
  }
  animation(file: T.InputFile, opts: { hasSpoiler?: boolean; caption?: T.RichBlockCaption } = {}): this {
    const id = this.media("animation", file);
    this.blocks.push({ type: "animation", animation: { id }, has_spoiler: opts.hasSpoiler ? true : undefined, caption: opts.caption });
    return this;
  }
  voiceNote(file: T.InputFile, opts: { caption?: T.RichBlockCaption } = {}): this {
    const id = this.media("voice_note", file);
    this.blocks.push({ type: "voice_note", voice_note: { id }, caption: opts.caption });
    return this;
  }

  /** Escape hatch for block types without a dedicated method. If it references media by id, declare that media via .media() first, or build() will throw before you ever hit Telegram's 400. */
  raw(block: T.InputRichBlock): this {
    this.blocks.push(block);
    return this;
  }

  build(): T.InputRichMessage {
    // Dev-time check: catch a block referencing an undeclared media id
    // locally, with a clear message, instead of letting Telegram's 400 be
    // the first signal.
    const declaredIds = new Set(this.mediaItems.map((m) => m.id));
    const walk = (blocks: T.InputRichBlock[]) => {
      for (const b of blocks) {
        const ref = findMediaRef(b);
        if (ref && !declaredIds.has(ref.id)) {
          throw new Error(
            `ayotbl: RichBlocksBuilder block references media id "${ref.id}" that was never declared. ` +
              `Use .photo()/.video()/.audio()/.animation()/.voiceNote() (which declare the media for you), ` +
              `or call .media(type, file) yourself first and use the returned id.`
          );
        }
        if ("blocks" in b && Array.isArray((b as { blocks?: unknown }).blocks)) {
          walk((b as { blocks: T.InputRichBlock[] }).blocks);
        }
      }
    };
    walk(this.blocks);

    return { blocks: this.blocks, media: this.mediaItems.length ? this.mediaItems : undefined };
  }
}

export const RichMessage = {
  markdown: () => new RichMarkdownBuilder(),
  html: () => new RichHtmlBuilder(),
  blocks: () => new RichBlocksBuilder(),
};
