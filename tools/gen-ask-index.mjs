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
import { cleanFootnoteNames } from "./lib/footnote-names.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const MIN_TERM_LEN = 2;

const { IDX, BODIES, isJunk, dataVersion } = loadCodex(ROOT);
// the 30 item names that carry a scraped footnote digit ("Cloak of Resistance1") are indexed and cited by their clean name — the same
// in-memory clean-up app.js applies — so a question that says "cloak of resistance" matches the title.
cleanFootnoteNames(IDX);

// Same tokenizer must be used at query time (netlify/functions/ask.mjs) — kept here as the single
// definition and copied there in a comment-linked block, since a Netlify Function ships standalone
// (no shared-module bundling assumed) and importing across the two runtimes is not worth the
// coupling for one small function.
// Plural/possessive folding. Without it "immediate action" (how a person asks) never matched the
// entry titled "Immediate Actions" — neither in the term index nor in the exact-name boost — and the
// core rule for flat-footed + immediate actions was retrieved 45th or not at all. Deliberately tiny:
// only plural "s"/"ies"/"es"-after-s,x,z,ch,sh and "'s"; verb endings are left alone. Applied to
// the title, the body and the query alike, so it only has to be CONSISTENT, not linguistically perfect.
function stem(t) {
  if (t.length > 3 && t.endsWith("'s")) t = t.slice(0, -2);
  else if (t.endsWith("'")) t = t.slice(0, -1);
  if (t.length < 4) return t;
  if (t.endsWith("ies") && t.length > 4) return t.slice(0, -3) + "y";
  if (/(ss|us|is)$/.test(t)) return t;
  if (/(sses|ches|shes|xes|zes)$/.test(t)) return t.slice(0, -2);
  if (t.endsWith("s")) return t.slice(0, -1);
  return t;
}
function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length >= MIN_TERM_LEN)
    .map(stem);
}

// SECTION TERMS. A rule often lives as a section INSIDE a big entry — "Stunned: A stunned creature
// drops everything held…" inside Conditions, "Standard Actions" inside Actions in Combat,
// "Disabled (0 Hit Points)" inside Injury and Death — and only the entry's own title was boosted at
// query time, so those containers ranked 60th–300th for the exact question they answer. Collected
// here: a line that opens "Term:" or "Term (aside):", and a short heading line followed by a
// "Source …" line. A parenthetical aside is indexed as its own term too ("0 hit point"). Labels that
// head sections in many entries ("Benefit", "Special", "Prerequisites") carry no signal — they are
// dropped after the whole corpus is counted (SECTION_TERM_MAX_DOCS), not by a hand-written list.
const SECTION_TERM_MAX_DOCS = 40;
function headingTerms(text, ownName) {
  const found = new Set();
  const lines = String(text).split("\n");
  const add = (raw) => { const t = tokenize(raw); if (t.length && t.length <= 5 && t.join(" ").length >= 4) found.add(t.join(" ")); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m = /^([A-Z][A-Za-z'’\- ]{2,40}?)(?:\s*\(([^)]{1,40})\))?:\s/.exec(l);
    if (!m && l.length < 60 && l.split(" ").length <= 7 && !/[.:]$/.test(l) && /^Source /.test(lines[i + 1] || "")) m = /^([A-Za-z][^()]*?)(?:\s*\(([^)]{1,40})\))?$/.exec(l);
    if (m) { add(m[1]); if (m[2]) add(m[2]); }
  }
  // A title that joins topics — "Energy Drain and Negative Levels", "Disabled (0 Hit Points)" — is
  // also each of its parts: a question about "negative levels" should find the first one.
  const parts = String(ownName).split(/\s+(?:and|or)\s+|,|&|\//i).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) parts.forEach(add);
  const aside = /^([^()]+?)\s*\(([^)]{1,40})\)\s*$/.exec(String(ownName));
  if (aside) { add(aside[1]); add(aside[2]); }
  const own = tokenize(ownName).join(" ");
  found.delete(own);
  return [...found];
}
const docs = [];          // [id, name, bucket, source, termCount, bodyChars, sectionTerms]
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
  docs.push([id, name, bucket, source, terms.length, body.length, headingTerms(withoutCredit, name)]);
  const tf = new Map();
  for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
  for (const [t, f] of tf) {
    let p = postings.get(t);
    if (!p) postings.set(t, (p = new Map()));
    p.set(docIndex, f);
  }
}

// Drop section terms that head sections in more than SECTION_TERM_MAX_DOCS entries, and store the
// rest compactly (an empty list becomes 0 so most rows stay tiny).
const termDf = new Map();
for (const d of docs) for (const t of d[6]) termDf.set(t, (termDf.get(t) || 0) + 1);
let keptTerms = 0;
for (const d of docs) { const keep = d[6].filter((t) => termDf.get(t) <= SECTION_TERM_MAX_DOCS); keptTerms += keep.length; d[6] = keep.length ? keep : 0; }

const avgLen = docs.reduce((s, d) => s + d[4], 0) / docs.length;

// Drop terms that appear in a single doc AND are longer than typical rules jargon has any business
// being (e.g. run-on OCR artifacts) — a cheap corpus-quality filter, not a stopword list.
let droppedJunkTerms = 0;
for (const [t, p] of postings) {
  if (p.size === 1 && t.length > 40) { postings.delete(t); droppedJunkTerms++; }
}

// POSTINGS ARE BINARY (SIZE-PLAN.md step 3). The old file held every posting as a JSON [docIndex, tf] pair — 80 MB of text that JSON.parse turned into millions of tiny
// JS arrays (the reason ask.mjs needed 4 GB of memory). Now data/ask-index.json holds only the header + docs + a term dictionary {term: [byteOffset, df]}, and
// data/ask-postings.bin holds, per term, df pairs of unsigned LEB128 varints: (docIndex - previousDocIndex, tf), docs ascending. ask.mjs decodes ONLY the
// query's terms on demand. Same numbers, same ranking (check-ask + the old-vs-new equality proof in SIZE-PLAN.md).
const terms = Object.create(null);
const chunks = []; let offset = 0;
const varint = (n, out) => { while (n >= 0x80) { out.push((n & 0x7f) | 0x80); n = Math.floor(n / 128); } out.push(n); };
for (const [t, p] of postings) {
  const list = [...p.entries()].sort((a, b) => a[0] - b[0]);
  const bytes = []; let prev = 0;
  for (const [d, f] of list) { varint(d - prev, bytes); varint(f, bytes); prev = d; }
  terms[t] = [offset, list.length];
  chunks.push(Buffer.from(bytes)); offset += bytes.length;
}
const binPath = path.join(ROOT, "data/ask-postings.bin");
fs.writeFileSync(binPath, Buffer.concat(chunks));

const out = {
  dataVersion,
  builtFrom: "tools/gen-ask-index.mjs",
  N: docs.length,
  avgLen: Math.round(avgLen * 100) / 100,
  postingsFile: "ask-postings.bin",
  postingsBytes: offset,
  docs,
  terms,
};

const outPath = path.join(ROOT, "data/ask-index.json");
fs.writeFileSync(outPath, JSON.stringify(out));
const bytes = fs.statSync(outPath).size;

console.log(`docs indexed: ${docs.length} (of ${IDX.length} rows)`);
console.log(`unique terms: ${Object.keys(terms).length} (dropped ${droppedJunkTerms} single-doc junk terms); postings.bin ${(offset / 1048576).toFixed(1)} MB`);
console.log(`avg indexed terms/doc: ${out.avgLen}`);
console.log(`section terms kept: ${keptTerms} (of ${termDf.size} distinct; dropped any heading >${SECTION_TERM_MAX_DOCS} entries share)`);
console.log(`total body chars indexed: ${(docs.reduce((s, d) => s + d[5], 0) / 1e6).toFixed(1)}M`);
console.log(`wrote ${outPath} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
