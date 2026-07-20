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
