/* Build the retrieval index for the "Ask" AI FAQ (netlify/functions/ask.mjs) from the Codex data.
 *
 * WHY LEXICAL, NOT EMBEDDINGS. PF1e rules content is name-dense and precisely worded (spell names,
 * feat names, class features): a term-frequency index over the text this repo already generates
 * beats a vector index for this corpus, and it needs no embedding pipeline to keep in sync with
 * every d20pfsrd batch. See memory tth-ask-rules-lookup for the sibling project's version of this
 * — and the bug this design deliberately avoids: `websearch_to_tsquery` ANDs every term, so
 * "how does flanking work?" excludes its own answer (the flanking rule never says "work"). This
 * index is scored OR-style (any query term can hit) and weighted by IDF, so a common word
 * contributes almost nothing on its own — no hand-curated stopword list to maintain.
 *
 * FULL BODIES ARE INDEXED, NO PER-DOC CHARACTER CAP (2026-09-28: an earlier 3,000-char cap was
 * removed after it was measured to matter — a question ("what's the DC to stabilize when dying")
 * whose answer was findable was still missed downstream not because of the cap but because a fixed
 * top-8 result count left it out at rank 26; the fix there is retrieval BREADTH, in ask.mjs. This
 * cap is removed anyway, on request, because "the first 3,000 characters only" is exactly the kind
 * of arbitrary ceiling that turns a genuine miss into "well, it was cut off" — a whole rules
 * chapter's content past character 3,000 is now just as findable by keyword as its opening.
 *
 * FORMAT (data/ask-index.json, fetched once per warm Netlify Function instance, never by the
 * browser): an inverted index. `docs` is parallel to doc index: [id, name, bucket, source,
 * termCount, bodyChars] (termCount for BM25 length normalization; bodyChars lets the function
 * budget how many full entries it can afford to pull into one answer's context WITHOUT fetching
 * every candidate's body first just to find out how big it is). `postings` maps a term to
 * [[docIndex, termFrequency], ...], sorted by docIndex.
 *
 * Usage: node tools/gen-ask-index.mjs .   (writes data/ask-index.json; run after gen-api)
 */
import fs from "node:fs";
import path from "node:path";
import { loadCodex } from "./lib/api-build.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const MIN_TERM_LEN = 2;

const { IDX, BODIES, isJunk, dataVersion } = loadCodex(ROOT);

// Same tokenizer must be used at query time (netlify/functions/ask.mjs) — kept here as the single
// definition and copied there in a comment-linked block, since a Netlify Function ships standalone
// (no shared-module bundling assumed) and importing across the two runtimes is not worth the
// coupling for one small function.
function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length >= MIN_TERM_LEN);
}

const docs = [];          // [id, name, bucket, source, termCount, bodyChars]
const postings = new Map(); // term -> Map(docIndex -> tf)

for (const r of IDX) {
  if (isJunk(r)) continue;
  const [id, name, bucket, , source] = r;
  const body = String(BODIES[bucket]?.[id] || "");
  if (!body) continue;
  // Exclude the trailing credit/license paragraph the importer appends — it is publisher names and
  // book titles, not rules content, and would otherwise dominate term frequency across the corpus.
  const lastBreak = body.lastIndexOf("\n\n");
  const withoutCredit = lastBreak > 0 && lastBreak > body.length - 500 ? body.slice(0, lastBreak) : body;

  // Index the name at extra weight (repeated) so a direct "what does <name> do" question scores
  // that entry far above incidental mentions elsewhere.
  const terms = [...tokenize(name), ...tokenize(name), ...tokenize(name), ...tokenize(withoutCredit)];
  if (!terms.length) continue;

  const docIndex = docs.length;
  docs.push([id, name, bucket, source, terms.length, body.length]);
  const tf = new Map();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [t, f] of tf) {
    let p = postings.get(t);
    if (!p) postings.set(t, (p = new Map()));
    p.set(docIndex, f);
  }
}

const avgLen = docs.reduce((s, d) => s + d[4], 0) / docs.length;

// Drop terms that appear in a single doc AND are longer than typical rules jargon has any business
// being (e.g. run-on OCR artifacts) — a cheap corpus-quality filter, not a stopword list.
let droppedJunkTerms = 0;
for (const [t, p] of postings) {
  if (p.size === 1 && t.length > 40) { postings.delete(t); droppedJunkTerms++; }
}

const postingsOut = {};
for (const [t, p] of postings) postingsOut[t] = [...p.entries()].sort((a, b) => a[0] - b[0]);

const out = {
  dataVersion,
  builtFrom: "tools/gen-ask-index.mjs",
  N: docs.length,
  avgLen: Math.round(avgLen * 100) / 100,
  docs,
  postings: postingsOut,
};

const outPath = path.join(ROOT, "data/ask-index.json");
fs.writeFileSync(outPath, JSON.stringify(out));
const bytes = fs.statSync(outPath).size;

console.log(`docs indexed: ${docs.length} (of ${IDX.length} rows)`);
console.log(`unique terms: ${Object.keys(postingsOut).length} (dropped ${droppedJunkTerms} single-doc junk terms)`);
console.log(`avg indexed terms/doc: ${out.avgLen}`);
console.log(`total body chars indexed: ${(docs.reduce((s, d) => s + d[5], 0) / 1e6).toFixed(1)}M`);
console.log(`wrote ${outPath} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
