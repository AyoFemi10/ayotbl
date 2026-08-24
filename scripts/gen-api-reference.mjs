#!/usr/bin/env node
/**
 * Generates docs/api-reference.html by parsing src/client.ts directly —
 * every method signature on the page is extracted from the real source,
 * copied verbatim, not hand-transcribed. Re-run this after adding methods:
 *
 *   node scripts/gen-api-reference.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientPath = join(__dirname, "..", "src", "client.ts");
const outPath = join(__dirname, "..", "docs", "api-reference.html");

const source = readFileSync(clientPath, "utf-8");
const lines = source.split("\n");

/** @type {{ category: string, methods: { name: string, doc: string, signature: string, returnType: string, apiMethod: string }[] }[]} */
const categories = [{ category: "Core (escape hatch & file URLs)", methods: [] }];

let pendingDoc = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];

  const categoryMatch = line.match(/^ {2}\/\/ -+\s*(.+?)\s*-+\s*$/);
  if (categoryMatch) {
    categories.push({ category: categoryMatch[1], methods: [] });
    pendingDoc = [];
    i++;
    continue;
  }

  const docLineMatch = line.match(/^\s*\/\*\*\s?(.*)/);
  if (docLineMatch && !line.includes("*/")) {
    pendingDoc = [docLineMatch[1]];
    i++;
    // Accumulate multi-line doc comments
    while (i < lines.length && !lines[i].includes("*/")) {
      pendingDoc.push(lines[i].replace(/^\s*\*\s?/, ""));
      i++;
    }
    if (i < lines.length) {
      const closing = lines[i].replace(/\s*\*\/\s*$/, "").replace(/^\s*\*\s?/, "");
      if (closing.trim()) pendingDoc.push(closing);
      i++;
    }
    continue;
  }
  const singleLineDoc = line.match(/^\s*\/\*\*\s?(.*?)\s?\*\/\s*$/);
  if (singleLineDoc) {
    pendingDoc = [singleLineDoc[1]];
    i++;
    continue;
  }

  // Method definition: 2-space-indented identifier followed by (
  const methodStart = line.match(/^ {2}(\w+)(?:<[^>]*>)?\(/);
  if (methodStart && !["constructor", "if", "for", "while"].includes(methodStart[1])) {
    const name = methodStart[1];
    // Collect the full method text until we find the matching closing brace of its body,
    // by tracking paren/brace depth from the start of the line.
    let full = "";
    let depth = 0;
    let started = false;
    let j = i;
    while (j < lines.length) {
      const l = lines[j];
      full += (full ? "\n" : "") + l;
      for (const ch of l) {
        if (ch === "(" || ch === "{") { depth++; started = true; }
        if (ch === ")" || ch === "}") depth--;
      }
      j++;
      if (started && depth <= 0) break;
      if (j - i > 20) break; // safety cap for unexpectedly long method bodies
    }

    // Extract just the signature (up to the opening `{` of the body) — use the
    // LAST `{` on the first line, since default param objects like `= {}` can
    // contain their own braces earlier in the line.
    const firstLine = full.split("\n")[0];
    const lastBraceIdx = firstLine.lastIndexOf("{");
    const signature = (lastBraceIdx !== -1 ? firstLine.slice(0, lastBraceIdx) : firstLine).trim();

    // Try to find the real Bot API method name + return type from `this.call<T>("apiName", ...)`
    const callMatch = full.match(/this\.call<([^>]*)>\(\s*"([^"]+)"/) || full.match(/this\.call<([^>]*)>\(\s*\)/);
    const returnType = callMatch ? callMatch[1] : "";
    const apiMethod = callMatch && callMatch[2] ? callMatch[2] : name;

    categories[categories.length - 1].methods.push({
      name,
      doc: pendingDoc.join(" ").trim(),
      signature,
      returnType,
      apiMethod,
    });
    pendingDoc = [];
    i = j;
    continue;
  }

  pendingDoc = [];
  i++;
}

const nonEmptyCategories = categories.filter((c) => c.methods.length > 0);
const totalMethods = nonEmptyCategories.reduce((n, c) => n + c.methods.length, 0);

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const navHtml = nonEmptyCategories
  .map((c) => `<a href="#${slug(c.category)}">${esc(c.category)} <span class="count">${c.methods.length}</span></a>`)
  .join("\n    ");

const contentHtml = nonEmptyCategories
  .map(
    (c) => `
    <section class="ref-category" id="${slug(c.category)}">
      <h2>${esc(c.category)}</h2>
      ${c.methods
        .map(
          (m) => `
      <div class="ref-method" id="method-${slug(m.name)}">
        <div class="ref-method-head">
          <code class="ref-method-name">${esc(m.name)}()</code>
          ${m.apiMethod !== m.name ? `<span class="ref-api-name">→ ${esc(m.apiMethod)}</span>` : ""}
        </div>
        ${m.doc ? `<p class="ref-doc">${esc(m.doc)}</p>` : ""}
        <pre class="ref-sig"><code>${esc(m.signature)}</code></pre>
      </div>`
        )
        .join("\n")}
    </section>`
  )
  .join("\n");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ayotbl — API reference</title>
<meta name="description" content="Auto-generated API reference for every method in ayotbl's Api class, extracted directly from source.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0B0E14; --surface: #12161F; --surface-2: #171C27; --border: #212734; --border-soft: #1A2029;
    --text: #E7E9EE; --text-muted: #8B92A3; --text-faint: #545C6C;
    --primary: #5B8DEF; --primary-soft: rgba(91,141,239,0.12);
    --success: #34D399; --success-soft: rgba(52,211,153,0.12);
    --font-display: 'Space Grotesk', sans-serif; --font-body: 'IBM Plex Sans', sans-serif; --font-mono: 'IBM Plex Mono', monospace;
    --sidebar-w: 280px;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 15px; line-height: 1.6; }
  a { color: inherit; text-decoration: none; }
  .sidebar {
    position: fixed; top: 0; left: 0; bottom: 0; width: var(--sidebar-w);
    background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; padding: 26px 18px 60px;
  }
  .sidebar-brand { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-weight: 700; font-size: 1.2rem; margin-bottom: 4px; }
  .sidebar-sub { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-faint); margin: 0 0 6px; }
  .back-link { display: inline-block; margin-bottom: 20px; font-size: 0.8rem; color: var(--primary); }
  .sidebar nav a {
    display: flex; justify-content: space-between; gap: 6px; color: var(--text-muted); font-size: 0.83rem;
    padding: 6px 10px; border-radius: 7px; margin-bottom: 1px;
  }
  .sidebar nav a:hover { background: var(--surface-2); color: var(--text); }
  .sidebar nav a .count { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-faint); background: var(--bg); padding: 1px 6px; border-radius: 20px; }
  .main { margin-left: var(--sidebar-w); max-width: 820px; padding: 40px 44px 120px; }
  .main-header { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--border-soft); }
  h1 { font-family: var(--font-display); font-weight: 700; font-size: 2rem; margin: 0 0 8px; }
  .stat { color: var(--text-muted); font-size: 0.95rem; }
  .stat strong { color: var(--success); }
  h2 { font-family: var(--font-display); font-weight: 600; font-size: 1.3rem; margin: 46px 0 18px; padding-top: 8px; scroll-margin-top: 20px; color: var(--primary); }
  .ref-method { border: 1px solid var(--border); border-radius: 10px; padding: 16px 18px; margin-bottom: 12px; background: var(--surface); scroll-margin-top: 20px; }
  .ref-method-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .ref-method-name { font-family: var(--font-mono); font-weight: 500; color: var(--text); font-size: 0.95rem; }
  .ref-api-name { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-faint); }
  .ref-doc { color: var(--text-muted); font-size: 0.86rem; margin: 8px 0; }
  .ref-sig { background: #0D1017; border: 1px solid var(--border-soft); border-radius: 7px; padding: 12px 14px; margin: 10px 0 0; overflow-x: auto; }
  .ref-sig code { font-family: var(--font-mono); font-size: 0.78rem; color: #B8C4D9; white-space: pre-wrap; word-break: break-word; }
  @media (max-width: 900px) { .sidebar { display: none; } .main { margin-left: 0; padding: 30px 20px 100px; } }
</style>
</head>
<body>
<nav class="sidebar">
  <div class="sidebar-brand"><span style="color:var(--primary)">●</span> ayotbl</div>
  <p class="sidebar-sub">API reference</p>
  <a href="index.html" class="back-link">&larr; Back to guide</a>
  <nav>
    ${navHtml}
  </nav>
</nav>
<main class="main">
  <header class="main-header">
    <h1>API Reference</h1>
    <p class="stat"><strong>${totalMethods}</strong> methods across <strong>${nonEmptyCategories.length}</strong> categories — extracted directly from <code>src/client.ts</code>, not hand-transcribed. Run <code>node scripts/gen-api-reference.mjs</code> to regenerate after adding methods.</p>
  </header>
  ${contentHtml}
</main>
</body>
</html>
`;

writeFileSync(outPath, html, "utf-8");
console.log(`Generated ${outPath}`);
console.log(`${totalMethods} methods across ${nonEmptyCategories.length} categories`);
