/* SUPPLEMENTS — turns d20-lost.mjs's findings into importer input.
 *
 * d20-lost.mjs finds text on a d20pfsrd page that is in NO Codex entry because the page itself was skipped as a
 * duplicate of an existing (AoN-sourced) entry. The importer is additive-only and never edits an original row, so
 * the missing sections are restored as a COMPANION entry per original, named "<Original> — Additional Material
 * (d20pfsrd)", in the same bucket, filed under its own sub-category (rawCat) so browse lists stay clean. The original
 * is untouched; the app links the two (see app.js "companion"). Attribution is inherited from the d20 page record
 * (publisher / evidence / Section 15 notice) by the importer exactly as for any other page, and the sections' own
 * "Source X" tags stay in the text and are also summarised in one "Sources named on the page" line.
 *
 * Usage: node tools/d20/d20-supplements.mjs [--snap D:/CODEX/d20-pilot] [--out D:/CODEX/d20-supplements] [--min 400]
 * Then:  node tools/d20/d20-import.mjs --snap D:/CODEX/d20-supplements           (dry run; add --apply)
 */
import fs from "node:fs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const OUT = arg("out", "D:/CODEX/d20-supplements");
const MIN_CHARS = Number(arg("min", 400));        // a companion must carry at least this much, or it is an orphan fragment
const IMPORTABLE = new Set(["deities", "races", "rules", "monsters", "items", "traits", "classes", "archetypes", "options", "feats", "spells"]);
const SUFFIX = " — Additional Material (d20pfsrd)";
export const SUPPLEMENT_RAWCAT = "Additional Material (d20pfsrd)";

const norm = (s) => String(s || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim();
const rows = JSON.parse(fs.readFileSync(`${SNAP}/lost-sections.json`, "utf8"));
const pages = new Map(fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse).map((p) => [p.file, p]));

// 1. filter sections ------------------------------------------------------------------------------------------
const key = (t) => norm(t).slice(0, 120);
const freq = new Map();
for (const r of rows) for (const k of new Set(r.sections.map((s) => key(s.text)))) freq.set(k, (freq.get(k) || 0) + 1);
const dropped = { navLike: 0, boilerplate: 0, small: 0 };
function keep(s) {
  const ls = s.text.split("\n").filter((x) => x.trim());
  const short = ls.filter((x) => x.trim().length < 25).length;
  if (ls.length >= 8 && short / ls.length > 0.8) { dropped.navLike++; return false; }      // a list of names/links, not content
  if (freq.get(key(s.text)) >= 5) { dropped.boilerplate++; return false; }                // the same block on 5+ pages ("About This Section…")
  return true;
}

// 2. group by the Codex entry they supplement --------------------------------------------------------------------
const groups = new Map();
for (const r of rows) {
  const secs = r.sections.filter(keep);
  if (!secs.length || !r.matchId || !r.matchName) continue;
  // keyed by NAME+bucket, not entry id: two Codex entries can share a name ("Ogrekin") and the companion's name must be unique
  const gk = r.matchBucket + "|" + norm(r.matchName);
  const g = groups.get(gk) || { matchId: r.matchId, matchName: r.matchName, matchBucket: r.matchBucket, pages: [] };
  g.pages.push({ r, secs });
  groups.set(gk, g);
}

const outPages = [], outMatches = []; let skippedSmall = 0, skippedBucket = 0;
for (const g of groups.values()) {
  g.pages.sort((a, b) => a.r.file.localeCompare(b.r.file));
  const total = g.pages.reduce((a, p) => a + p.secs.reduce((x, s) => x + s.text.length, 0), 0);
  if (total < MIN_CHARS) { skippedSmall++; dropped.small += total; continue; }
  const bucket = IMPORTABLE.has(g.matchBucket) ? g.matchBucket : (IMPORTABLE.has(g.pages[0].r.bucket) ? g.pages[0].r.bucket : null);
  if (!bucket) { skippedBucket++; continue; }
  const first = pages.get(g.pages[0].r.file);
  const tags = new Set();
  for (const p of g.pages) for (const s of p.secs) for (const m of s.text.matchAll(/^Source:?[ \t]+(.{2,70})$/gim)) tags.add(m[1].trim());
  const multi = g.pages.length > 1;
  const parts = [];
  // first paragraph short on purpose: it becomes the search snippet, and should not be spent on boilerplate
  parts.push(`More on ${g.matchName} from d20pfsrd.com.`);
  parts.push(`These sections appear on d20pfsrd.com's ${multi ? "pages " + g.pages.map((p) => "\"" + p.r.title + "\"").join(", ") : "page \"" + g.pages[0].r.title + "\""} but are not part of the ${g.matchName} entry, which is unchanged.${tags.size ? " Sources named on the page for these sections: " + [...tags].slice(0, 12).join("; ") + "." : ""}`);
  for (const p of g.pages) {
    if (multi) parts.push(`From d20pfsrd.com: ${p.r.title}`);
    for (const s of p.secs) parts.push(s.text);
  }
  const file = "SUPP-" + g.pages[0].r.file;
  const name = g.matchName.replace(/\s+$/, "") + SUFFIX;
  outPages.push({
    file, url: first.url, title: name, name, crumb: [], bucket, kind: "entry", supplement: true, rawCat: SUPPLEMENT_RAWCAT, supplementOf: g.matchId,
    publisher: first.publisher, thirdParty: first.thirdParty, s15Third: first.s15Third, evidence: first.evidence, titledSource: first.titledSource,
    license: first.license, children: [], s15: first.s15, chars: parts.join("\n\n").length, sha: "", body: parts.join("\n\n"),
  });
  outMatches.push({ file, title: name, url: first.url, bucket, third: first.thirdParty, publisher: first.publisher, verdict: "NEW", why: "restored sections of a duplicate page" });
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/pages.jsonl`, outPages.map((p) => JSON.stringify(p)).join("\n") + "\n");
fs.writeFileSync(`${OUT}/matches.json`, JSON.stringify(outMatches));
const byB = {}; for (const p of outPages) byB[p.bucket] = (byB[p.bucket] || 0) + 1;
console.log(`pages with lost sections: ${rows.length}; sections dropped as noise: nav-like ${dropped.navLike}, repeated boilerplate ${dropped.boilerplate}`);
console.log(`companions to write: ${outPages.length}  (skipped: ${skippedSmall} under ${MIN_CHARS} chars = ${dropped.small.toLocaleString()} chars, ${skippedBucket} with no importable bucket)`);
console.log("by bucket:", byB, " total chars:", outPages.reduce((a, p) => a + p.chars, 0).toLocaleString());
console.log(`wrote ${OUT}/pages.jsonl + matches.json`);
