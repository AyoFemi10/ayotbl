import { test } from "node:test";
import assert from "node:assert/strict";
import { RichMessage } from "../src/richMessage";

test("RichMarkdownBuilder produces the markdown field, not a text/format shape", () => {
  const rich = RichMessage.markdown().text("Hello").build();
  assert.ok("markdown" in rich, "should use the real markdown field");
  assert.equal(rich.markdown, "Hello");
  assert.equal(rich.html, undefined);
  assert.equal(rich.blocks, undefined);
});

test("RichMarkdownBuilder.checklist() produces GFM-style task list syntax", () => {
  const rich = RichMessage.markdown().checklist([{ label: "Done task", done: true }, "Not done task"]).build();
  assert.match(rich.markdown!, /- \[x\] Done task/);
  assert.match(rich.markdown!, /- \[ \] Not done task/);
});

test("RichMarkdownBuilder.table() produces a GFM pipe table with header separator", () => {
  const rich = RichMessage.markdown().table(["A", "B"], [["1", "2"]]).build();
  const lines = rich.markdown!.split("\n");
  assert.equal(lines[0], "| A | B |");
  assert.equal(lines[1], "| --- | --- |");
  assert.equal(lines[2], "| 1 | 2 |");
});

test("RichMarkdownBuilder.blockquote() prefixes every line with '>'", () => {
  const rich = RichMessage.markdown().blockquote("line one\nline two").build();
  assert.match(rich.markdown!, /> line one/);
  assert.match(rich.markdown!, /> line two/);
});

test("RichMarkdownBuilder.heading()/list()/divider()/codeBlock() produce expected markdown", () => {
  const rich = RichMessage.markdown()
    .heading("Title", 2)
    .list(["a", "b"], false)
    .list(["c", "d"], true)
    .divider()
    .codeBlock("const x = 1;", "js")
    .build();
  assert.match(rich.markdown!, /^## Title/m);
  assert.match(rich.markdown!, /^- a$/m);
  assert.match(rich.markdown!, /^1\. c$/m);
  assert.match(rich.markdown!, /^---$/m);
  assert.match(rich.markdown!, /```js\nconst x = 1;\n```/);
});

test("RichHtmlBuilder produces the html field with wrapped tags", () => {
  const rich = RichMessage.html().heading("Title", 1).paragraph("Body text").build();
  assert.equal(rich.html, "<h1>Title</h1>\n<p>Body text</p>");
  assert.equal(rich.markdown, undefined);
});

test("RichBlocksBuilder produces a blocks array with real InputRichBlock shapes", () => {
  const rich = RichMessage.blocks()
    .heading("Title", 2)
    .paragraph("Body")
    .divider()
    .table([[{ text: "H1", is_header: true }], [{ text: "cell" }]], { bordered: true })
    .build();
  assert.ok(Array.isArray(rich.blocks));
  assert.deepEqual(rich.blocks![0], { type: "heading", text: "Title", size: 2 });
  assert.deepEqual(rich.blocks![1], { type: "paragraph", text: "Body" });
  assert.deepEqual(rich.blocks![2], { type: "divider" });
  const tableBlock = rich.blocks![3] as { type: string; is_bordered?: boolean };
  assert.equal(tableBlock.type, "table");
  assert.equal(tableBlock.is_bordered, true);
});

test("RichBlocksBuilder.details() nests child blocks correctly", () => {
  const rich = RichMessage.blocks().details("Summary", [{ type: "paragraph", text: "Hidden content" }], true).build();
  const detailsBlock = rich.blocks![0] as { type: string; summary: unknown; blocks: unknown[]; is_open?: boolean };
  assert.equal(detailsBlock.type, "details");
  assert.equal(detailsBlock.summary, "Summary");
  assert.equal(detailsBlock.is_open, true);
  assert.deepEqual(detailsBlock.blocks, [{ type: "paragraph", text: "Hidden content" }]);
});

test("RichMarkdownBuilder no longer produces a broken/dead media field — confirmed working path is inline markdown image syntax only", () => {
  const rich = RichMessage.markdown().photo("https://example.com/a.jpg", "caption").build();
  assert.match(rich.markdown!, /!\[\]\(https:\/\/example\.com\/a\.jpg "caption"\)/);
  assert.equal("media" in rich, false, "markdown builder should not emit a media field at all — that mechanism is blocks-only");
});

test("RichBlocksBuilder.photo() declares a media item with a real id and references it correctly — fixes two confirmed live 400 errors", () => {
  const rich = RichMessage.blocks().photo("https://example.com/a.jpg", { caption: { text: "A photo" } }).build();

  assert.ok(rich.media && rich.media.length === 1, "should declare exactly one media item");
  const mediaItem = rich.media![0];
  assert.equal(typeof mediaItem.id, "string", "media item must have an id — Telegram rejects it without one");
  assert.equal(mediaItem.type, "photo");
  assert.equal(mediaItem.media, "https://example.com/a.jpg");

  const photoBlock = rich.blocks![0] as { type: string; photo: { id: string } };
  assert.equal(photoBlock.type, "photo");
  assert.deepEqual(photoBlock.photo, { id: mediaItem.id }, "block must reference media by { id }, not embed the file inline");
});

test("RichBlocksBuilder.video()/.audio()/.animation()/.voiceNote() all declare and reference media correctly", () => {
  const rich = RichMessage.blocks()
    .video("v.mp4")
    .audio("a.mp3")
    .animation("anim.gif")
    .voiceNote("voice.ogg")
    .build();

  assert.equal(rich.media!.length, 4);
  assert.equal((rich.blocks![0] as any).video.id, rich.media![0].id);
  assert.equal((rich.blocks![1] as any).audio.id, rich.media![1].id);
  assert.equal((rich.blocks![2] as any).animation.id, rich.media![2].id);
  assert.equal((rich.blocks![3] as any).voiceNote?.id ?? (rich.blocks![3] as any).voice_note.id, rich.media![3].id);
});

test("RichBlocksBuilder.build() throws a clear local error for a raw block referencing an undeclared media id, instead of a Telegram 400", () => {
  const builder = RichMessage.blocks().raw({ type: "photo", photo: { id: "never-declared" } } as any);
  assert.throws(() => builder.build(), /references media id "never-declared" that was never declared/);
});

test("RichBlocksBuilder.media() can be used directly for a manually-built raw block", () => {
  const builder = RichMessage.blocks();
  const id = builder.media("photo", "https://example.com/manual.jpg");
  builder.raw({ type: "photo", photo: { id } } as any);
  const rich = builder.build();
  assert.equal(rich.media![0].id, id);
  assert.equal((rich.blocks![0] as any).photo.id, id);
});
