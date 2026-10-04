/* LOST-SECTION AUDIT — what text on a d20pfsrd page that was judged a DUPLICATE exists in NO Codex entry?
 *
 * The importer is additive-only: a page matched as DUP of an existing (AoN-sourced) entry is skipped whole,
 * so any EXTRA material the d20 page carries — a source-tagged supplement section ("Dense Smoke Inhalation",
 * Source PAP25, appended to "Environmental Rules") — vanishes with it. Found 2026-10-03 when the Ask AI
 * could not answer a dense-smoke question: the sentence was on the d20 page and in no Codex entry.
 *
 * METHOD (deliberately not "first N characters of a line", which a label prefix like "Bleed: …" breaks):
 * every 5-word shingle of every Codex body goes into a Bloom filter (2^30 bits, 2 hashes, ~0.2% false-
 * positive rate); a d20 line is LOST when >= LOST_FRAC of its shingles are absent from the WHOLE corpus —
 * not merely from the matched entry — so text that the Codex merely files under another entry never counts.
 * Consecutive lost lines are grouped into sections, extended upward over their heading / "Source" line.
 *
 * Usage: node --max-old-space-size=8192 tools/d20/d20-lost.mjs [--snap D:/CODEX/d20-pilot] [--root <repo>] [--show 40]
 * Writes <snap>/lost-sections.json.  Read-only with respect to the Codex.
 */
import fs from "node:fs";
import { loadCodex } from "../lib/api-build.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");
const SHOW = Number(arg("show", 40));
const LOST_FRAC = Number((process.argv.indexOf("--lost-frac") >= 0 ? process.argv[process.argv.indexOf("--lost-frac") + 1] : 0.8));   // share of a line's shingles absent from the whole corpus
// Tunable so the detector's blind spots can be MEASURED: the defaults are the ones the restoration used (5-word shingles, lines of
// 10+ words); `--sh 3 --min-words 5` also judges short lines (stat-block fragments, table rows) and `--all-kinds` also scans the
// catalog/index/stub pages the importer never classed as entries. `--out` keeps a measuring run from overwriting the real file.
const MIN_WORDS = Number(arg("min-words", 10));   // a line shorter than this is judged only by adjacency to lost lines
const SH = Number(arg("sh", 5));
const ALL_KINDS = argv.includes("--all-kinds");
const OUT = arg("out", "lost-sections.json");

const BITS = 1 << 30, MASK = BITS - 1;
const bloom = new Uint8Array(BITS >>> 3);
const setBit = (i) => { bloom[i >>> 3] |= 1 << (i & 7); };
const getBit = (i) => (bloom[i >>> 3] >>> (i & 7)) & 1;
function words(s) { return String(s).toLowerCase().replace(/[\u2019\u2018]/g, "'").match(/[a-z0-9']+/g) || []; }
function h2(str) {
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 0x01000193 ^ 0x5bd1e995); }
  return [(a >>> 0) & MASK, ((b ^ (b >>> 15)) >>> 0) & MASK];
}
function shingles(w) { const out = []; for (let i = 0; i + SH <= w.length; i++) out.push(w.slice(i, i + SH).join(" ")); return out; }
function addText(t) { for (const ln of String(t).split("\n")) { const w = words(ln); for (const s of shingles(w)) { const [x, y] = h2(s); setBit(x); setBit(y); } } }
function present(s) { const [x, y] = h2(s); return getBit(x) && getBit(y); }

const codex = loadCodex(ROOT);
let nBodies = 0;
for (const b of Object.keys(codex.BODIES)) for (const id in codex.BODIES[b]) { const t = codex.BODIES[b][id]; if (typeof t === "string") { addText(t); nBodies++; } }
console.log(`bloom built from ${nBodies} Codex bodies`);

const matches = JSON.parse(fs.readFileSync(`${SNAP}/matches.json`, "utf8"));
const pages = new Map(fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse).map((p) => [p.file, p]));
const JUNK = /patreon|discord|copyright notice|section 15|fan labs|open game licen|report a problem|new pages|recent changes|name's games|back me on|^discuss!?$|^contents? \[/i;

// Every page whose entry was NOT written: verdict DUP, plus any NEW/NAMESAKE/AMBIGUOUS page the importer's own guards
// skipped (name collision, inverted-name duplicate, held duplicate) — those carry the same risk.
const imported = new Set(JSON.parse(fs.readFileSync(`${SNAP}/import-report.json`, "utf8")).imported.map((x) => x.file));
const rows = []; let dupPages = 0, withLoss = 0, lostChars = 0;
const matched = new Set(matches.map((m) => m.file));
const verdictRows = ALL_KINDS ? [...matches, ...[...pages.keys()].filter((f) => !matched.has(f)).map((f) => ({ file: f, verdict: "UNCLASSED", match: null }))] : matches;
for (const m of verdictRows) {
  if (m.verdict !== "DUP" && !(ALL_KINDS && m.verdict === "UNCLASSED") && (imported.has(m.file) || !m.match)) continue;
  if (m.verdict === "INTRA_DUP") continue;
  const p = pages.get(m.file); if (!p) continue;
  dupPages++;
  const lines = String(p.body || "").split("\n");
  // per line: 2 = clearly in the Codex (prose, < 50% of shingles missing), 1 = LOST (>= LOST_FRAC missing), 0 = anything else
  const kind = lines.map((ln) => {
    const t = ln.trim(); if (!t || JUNK.test(t)) return 0;
    const w = words(t); if (w.length < MIN_WORDS) return 0;
    const sh = shingles(w); if (!sh.length) return 0;
    let miss = 0; for (const s of sh) if (!present(s)) miss++;
    const f = miss / sh.length;
    return f >= LOST_FRAC ? 1 : f < 0.5 ? 2 : 0;
  });
  // A section = a maximal run of lines between two clearly-present prose lines, kept only if it holds a LOST line.
  // That keeps the short lines INSIDE it (headings, table rows, "Source X") which no single-line test could judge.
  const secs = []; let i = 0;
  while (i < lines.length) {
    if (kind[i] === 2) { i++; continue; }
    let j = i; while (j < lines.length && kind[j] !== 2) j++;
    let s0 = i, e0 = j - 1;
    if (kind.slice(s0, e0 + 1).includes(1)) {
      // a trailing heading-like line belongs to the NEXT (present) section, not this one
      while (e0 > s0) { const t = lines[e0].trim(); if (!t || (t.length < 60 && !/[.!?:)]$/.test(t) && j < lines.length)) e0--; else break; }
      while (s0 < e0 && !lines[s0].trim()) s0++;
      secs.push([s0, e0]);
    }
    i = j;
  }
  if (!secs.length) continue;
  const out = secs.map(([s, e]) => ({ s, e, text: lines.slice(s, e + 1).join("\n").trim() })).filter((x) => x.text.length >= 160);
  if (!out.length) continue;
  withLoss++; const chars = out.reduce((a, x) => a + x.text.length, 0); lostChars += chars;
  rows.push({ file: m.file, title: p.title, bucket: p.bucket, matchId: m.match && m.match.id, matchName: m.match && m.match.name, matchBucket: m.match && m.match.bucket, url: p.url, pageChars: (p.body || "").length, lostChars: chars, sections: out });
}
rows.sort((a, b) => b.lostChars - a.lostChars);
console.log(`not-imported pages scanned: ${dupPages};  with text found in NO Codex entry: ${withLoss};  lost characters: ${lostChars.toLocaleString()}  (${rows.reduce((a, r) => a + r.sections.length, 0)} sections)`);
const byB = {}; for (const r of rows) byB[r.bucket] = (byB[r.bucket] || 0) + 1; console.log("pages by bucket:", byB);
const buckets = [0, 500, 2000, 10000, 50000]; const hist = buckets.map((lo, i) => rows.filter((r) => r.lostChars >= lo && r.lostChars < (buckets[i + 1] ?? Infinity)).length);
console.log("pages by lost chars  [<500, 500-2k, 2k-10k, 10k-50k, 50k+]:", hist);
console.log(`\nlargest ${SHOW}:`);
rows.slice(0, SHOW).forEach((r) => console.log(String(r.lostChars).padStart(7), String(r.sections.length).padStart(3), r.bucket.padEnd(9), r.title.slice(0, 40).padEnd(40), "|", r.sections[0].text.split("\n")[0].slice(0, 70)));
fs.writeFileSync(`${SNAP}/${OUT}`, JSON.stringify(rows));
console.log(`\nwrote ${SNAP}/${OUT}`);
