/* REVIEW REPORT — the bounded, human-judgment leftovers after matching and attribution.
 *
 * Two kinds of page need a person, not a rule, and both are scoped to what actually MATTERS: only
 * pages the importer would otherwise IMPORT (verdict NEW). A DUP page's attribution is moot — its
 * text never enters the Codex, we keep AoN's own copy — so a DUP-and-unverified page is not a
 * finding here even though d20-clean.mjs still reports it (see below).
 *
 *   1. AMBIGUOUS — same name as an existing Codex entry, content agreement in the middle band. Not
 *      demoted to NEW (it's not new) or promoted to DUP (not enough evidence): a same-entity call
 *      needs a person. d20-match.mjs already auto-promotes the ones POSITIVE evidence can decide
 *      (matching stat-block fields, a known skill name) — what is left here could not be decided
 *      from evidence alone, not merely "wasn't tried".
 *   2. NEW + unverified attribution — would be imported, but nothing on the page, its folder, or an
 *      inline citation says whose work it is. Small on purpose: d20-clean.mjs's own report counts
 *      EVERY unverified page (62 of 2,000 pilot pages); most of those are DUP and never get imported,
 *      so they don't belong on a list someone has to act on. This report re-scopes to the ~17 that do.
 *
 * Output: <snap>/review.json (machine-readable, carries a `decision` field for a human or a later
 * pass to fill in and feed back) + a console report with enough text to judge each one without
 * opening the source file.
 *
 * Usage: node tools/d20/d20-review.mjs [--snap D:/CODEX/d20-pilot]
 */
import fs from "node:fs";
import { loadCodex } from "../lib/api-build.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const ROOT = "C:/Users/mailp/dev/pf1e-codex";
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);

const d = loadCodex(ROOT);
const rows = new Map(d.IDX.map((r) => [r[0], r]));
const bodyOf = (id) => { const r = rows.get(id); return r ? (d.BODIES[r[2]] || {})[id] || "" : ""; };
const matches = JSON.parse(fs.readFileSync(`${SNAP}/matches.json`, "utf8"));
const pages = new Map(fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse).map((p) => [p.file, p]));

const ambiguous = matches.filter((r) => r.verdict === "AMBIGUOUS").map((r) => {
  const p = pages.get(r.file), cand = r.match || r.near;                 // r.match carries the id; r.near is a name-only fallback
  const id = cand && (cand.id || (d.IDX.find((x) => x[1] === cand.name && x[2] === cand.bucket) || [])[0]);
  const aon = id ? bodyOf(id) : "";
  return { kind: "ambiguous", title: r.title, url: r.url, bucket: r.bucket, third: r.third,
    candidate: cand && cand.name, candidateBucket: cand && cand.bucket,
    nameSim: cand && cand.nameSim, cos: cand && cand.cos, cont: cand && cand.cont, numJ: cand && cand.numJ,
    d20Text: clip(p.body, 300), aonText: clip(aon, 300), decision: null };
});

const unverified = matches.filter((r) => r.verdict === "NEW" && pages.get(r.file).evidence === "unverified").map((r) => {
  const p = pages.get(r.file);
  return { kind: "unverified", title: r.title, url: r.url, bucket: r.bucket,
    d20Text: clip(p.body, 400), decision: null };
});

const out = [...ambiguous, ...unverified];
fs.writeFileSync(`${SNAP}/review.json`, JSON.stringify(out, null, 1));

console.log(`=== REVIEW: ${ambiguous.length} ambiguous match${ambiguous.length === 1 ? "" : "es"}, ${unverified.length} unattributed NEW page${unverified.length === 1 ? "" : "s"} ===`);
console.log(`(of ${matches.filter((r) => r.verdict === "NEW").length} NEW and ${matches.filter((r) => r.verdict === "AMBIGUOUS").length} AMBIGUOUS total — everything else was decided by evidence)\n`);

console.log(`--- AMBIGUOUS: same name, unclear if it's the same thing ---`);
for (const r of ambiguous) {
  console.log(`\n[${r.bucket}]${r.third ? " (3P)" : ""} ${r.title}  ~  ${r.candidate} [${r.candidateBucket}]`);
  console.log(`   name ${r.nameSim}  cos ${r.cos}  cont ${r.cont}  numJ ${r.numJ}`);
  console.log(`   d20: ${r.d20Text}`);
  console.log(`   AoN: ${r.aonText}`);
}

console.log(`\n--- UNVERIFIED: would be imported, no attribution evidence anywhere ---`);
for (const r of unverified) {
  console.log(`\n[${r.bucket}] ${r.title}  —  ${r.url.replace("https://www.d20pfsrd.com", "")}`);
  console.log(`   ${r.d20Text}`);
}
