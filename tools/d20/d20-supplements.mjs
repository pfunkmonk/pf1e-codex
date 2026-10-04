/* SUPPLEMENTS — turns d20-lost.mjs's findings into importer input.
 *
 * d20-lost.mjs finds text on a d20pfsrd page that is in NO Codex entry: either because the page was skipped as a
 * duplicate of an existing (AoN-sourced) entry, or because it was a catalog/index page the importer never treats as an
 * entry. The importer is additive-only and never edits an original row, so the missing sections are restored as a
 * COMPANION entry per original, named "<Original> — Additional Material (d20pfsrd)", in the same bucket, filed under its
 * own sub-category (rawCat) so browse lists stay clean. The original is untouched; the app links the two (see app.js
 * "companion"). Attribution is inherited from the d20 page record (publisher / evidence / Section 15 notice) by the
 * importer exactly as for any other page, and the sections' own "Source X" tags stay in the text and are also summarised
 * in one "Sources named on the page" line.
 *
 * A catalog/index page has no matching original (no row to hang the companion on), and most of its text is rows of names
 * and one-line descriptions that merely summarise entries that exist elsewhere. Only its PROSE is content, so for those
 * pages a section is kept only when it is prose-heavy; the companion is named after the page title and notes that the
 * text is not part of any Codex entry.
 *
 * RE-RUNNABLE: with --prev <dir of an earlier run>, a group that already has a companion is MERGED into the earlier
 * body (new sections appended, exact duplicates skipped) and keeps its attribution, so the importer updates the same
 * row instead of overwriting it with only the newly-found residue.
 *
 * Usage: node tools/d20/d20-supplements.mjs [--snap D:/CODEX/d20-pilot] [--lost lost-sections.json] [--out D:/CODEX/d20-supplements]
 *                                           [--prev D:/CODEX/d20-supplements] [--min 400]
 * Then:  node tools/d20/d20-import.mjs --snap <out>           (dry run; add --apply)
 */
import fs from "node:fs";
import { loadCodex } from "../lib/api-build.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const OUT = arg("out", "D:/CODEX/d20-supplements");
const LOST = arg("lost", "lost-sections.json");
const PREV = arg("prev", "");
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");
const MIN_CHARS = Number(arg("min", 400));        // a companion must carry at least this much, or it is an orphan fragment
const IMPORTABLE = new Set(["deities", "races", "rules", "monsters", "items", "traits", "classes", "archetypes", "options", "feats", "spells"]);
const SUFFIX = " — Additional Material (d20pfsrd)";
export const SUPPLEMENT_RAWCAT = "Additional Material (d20pfsrd)";

const norm = (s) => String(s || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim();
const rows = JSON.parse(fs.readFileSync(`${SNAP}/${LOST}`, "utf8"));
const pages = new Map(fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse).map((p) => [p.file, p]));
const codex = loadCodex(ROOT);

// companions a previous run already wrote (page record with the body as it was BEFORE the importer appended the credit)
const prevByName = new Map();
if (PREV) for (const ln of fs.readFileSync(`${PREV}/pages.jsonl`, "utf8").trim().split("\n")) { const q = JSON.parse(ln); prevByName.set(q.bucket + "|" + norm(q.name), q); }
// the originals a catalog page's title can name
const origByName = new Map();
for (const r of codex.IDX) if (r[3] !== SUPPLEMENT_RAWCAT) { const k = norm(r[1]); if (!origByName.has(k)) origByName.set(k, []); origByName.get(k).push(r); }

// Prose = a sentence-style line (12+ words, no tab). The rest of a catalog page is names and one-line summaries of entries that exist elsewhere.
const isProse = (l) => l.trim().split(/\s+/).length >= 12 && !l.includes("\t") && /[.!?)\u201d"]$/.test(l.trim());
const proseChars = (t) => t.split("\n").filter(isProse).reduce((a, l) => a + l.length, 0);

// 1. filter sections ------------------------------------------------------------------------------------------
const key = (t) => norm(t).slice(0, 120);
const freq = new Map();
for (const r of rows) for (const k of new Set(r.sections.map((s) => key(s.text)))) freq.set(k, (freq.get(k) || 0) + 1);
const dropped = { navLike: 0, boilerplate: 0, small: 0, notProse: 0, mixedCredit: 0 };
function keep(s, catalogPage) {
  const ls = s.text.split("\n").filter((x) => x.trim());
  const short = ls.filter((x) => x.trim().length < 25).length;
  if (ls.length >= 8 && short / ls.length > 0.8) { dropped.navLike++; return false; }      // a list of names/links, not content
  if (freq.get(key(s.text)) >= 5) { dropped.boilerplate++; return false; }                // the same block on 5+ pages ("About This Section…")
  if (catalogPage) { const pc = proseChars(s.text); if (pc < 300 || pc / s.text.length < 0.35) { dropped.notProse++; return false; } }
  return true;
}

// 2. group by the Codex entry they supplement (or, for a catalog page, by its title) -------------------------------
const groups = new Map();
for (const r of rows) {
  const pg = pages.get(r.file); if (!pg) continue;
  const catalogPage = !r.matchId;
  const secs = r.sections.filter((s) => keep(s, catalogPage));
  if (!secs.length) continue;
  let matchName = r.matchName, matchBucket = r.matchBucket, matchId = r.matchId, hasOriginal = !!r.matchId;
  if (catalogPage) {
    const t = pg.title || r.title;
    const hit = (origByName.get(norm(t)) || []).sort((a, b) => (b[2] === pg.bucket) - (a[2] === pg.bucket))[0];
    if (hit) { matchName = hit[1]; matchBucket = hit[2]; matchId = hit[0]; hasOriginal = true; }
    else { matchName = t; matchBucket = pg.bucket; matchId = null; hasOriginal = false; }
  }
  // keyed by NAME+bucket, not entry id: two Codex entries can share a name ("Ogrekin") and the companion's name must be unique
  const gk = matchBucket + "|" + norm(matchName);
  const g = groups.get(gk) || { matchId, matchName, matchBucket, hasOriginal, pages: [] };
  g.pages.push({ r, secs });
  groups.set(gk, g);
}

const outPages = [], outMatches = []; let skippedSmall = 0, skippedBucket = 0, merged = 0, fresh = 0;
for (const g of groups.values()) {
  g.pages.sort((a, b) => a.r.file.localeCompare(b.r.file));
  const total = g.pages.reduce((a, p) => a + p.secs.reduce((x, s) => x + s.text.length, 0), 0);
  if (total < MIN_CHARS) { skippedSmall++; dropped.small += total; continue; }
  const bucket = IMPORTABLE.has(g.matchBucket) ? g.matchBucket : (IMPORTABLE.has(g.pages[0].r.bucket) ? g.pages[0].r.bucket : null);
  if (!bucket) { skippedBucket++; continue; }
  const name = g.matchName.replace(/\s+$/, "") + SUFFIX;
  const prev = prevByName.get(bucket + "|" + norm(name));
  // Attribution is CONSERVATIVE: a companion that merges several pages takes the record of a THIRD-PARTY page if any contributes
  // (crediting Paizo for third-party text is the worse error), and a page whose own title/breadcrumb says "Third-Party"/"3rd Party"/
  // "3pp" is third-party whatever its record says ("Special Materials (Third-Party)" carried publisher "Paizo, Inc."). A merged
  // companion keeps the attribution it already has.
  const thirdish = (pg) => pg.thirdParty === true || /3rd party|third.?party|3pp/i.test(`${pg.title} ${(pg.crumb || []).join(" ")}`);
  let first = prev;
  if (!first) {
    const recs = g.pages.map((p) => pages.get(p.r.file));
    const t = recs.find(thirdish);
    first = t ? (t.thirdParty === true ? t : { ...t, thirdParty: true, publisher: null, evidence: "unverified" }) : recs[0];
  }
  const tags = new Set();
  for (const p of g.pages) for (const s of p.secs) for (const m of s.text.matchAll(/^Source:?[ \t]+(.{2,70})$/gim)) tags.add(m[1].trim());
  const multi = g.pages.length > 1;
  const titles = [...new Set(g.pages.map((p) => p.r.title))].map((t) => "\"" + t + "\"");
  const parts = [];
  if (prev) {
    // MERGE: keep everything already restored, append only sections not already in it
    const have = norm(prev.body);
    const fresh_ = [];
    for (const p of g.pages) {
      // never fold third-party text into a companion that is credited as Paizo/OGL-core: its credit cannot change without the
      // importer minting a duplicate row, so those sections stay unrestored (counted, not silent)
      if (thirdish(pages.get(p.r.file)) && prev.thirdParty !== true) { dropped.mixedCredit += p.secs.length; continue; }
      for (const s of p.secs) if (!have.includes(norm(s.text).slice(0, 200))) fresh_.push([p.r.title, s.text]);
    }
    if (!fresh_.length) continue;
    parts.push(prev.body.replace(/\s+$/, ""));
    for (const [t, text] of fresh_) { parts.push(`From d20pfsrd.com: ${t}`); parts.push(text); }
    merged++;
  } else {
    // first paragraph short on purpose: it becomes the search snippet, and should not be spent on boilerplate
    parts.push(`More on ${g.matchName} from d20pfsrd.com.`);
    const where = multi ? "pages " + titles.join(", ") : "page " + titles[0];
    parts.push(`These sections appear on d20pfsrd.com's ${where} but are not part of ${g.hasOriginal ? "the " + g.matchName + " entry, which is unchanged" : "any Codex entry"}.${tags.size ? " Sources named on the page for these sections: " + [...tags].slice(0, 12).join("; ") + "." : ""}`);
    for (const p of g.pages) {
      if (multi) parts.push(`From d20pfsrd.com: ${p.r.title}`);
      for (const s of p.secs) parts.push(s.text);
    }
    fresh++;
  }
  const file = prev ? prev.file : "SUPP-" + g.pages[0].r.file;
  outPages.push({
    file, url: first.url, title: name, name, crumb: [], bucket, kind: "entry", supplement: true, rawCat: SUPPLEMENT_RAWCAT, supplementOf: g.matchId,
    publisher: first.publisher, thirdParty: first.thirdParty, s15Third: first.s15Third, evidence: first.evidence, titledSource: first.titledSource,
    license: first.license, children: [], s15: first.s15, chars: parts.join("\n\n").length, sha: "", body: parts.join("\n\n"),
  });
  outMatches.push({ file, title: name, url: first.url, bucket, third: first.thirdParty, publisher: first.publisher, verdict: "NEW", why: prev ? "merged into an existing companion" : "restored sections of a skipped page" });
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(`${OUT}/pages.jsonl`, outPages.map((p) => JSON.stringify(p)).join("\n") + "\n");
fs.writeFileSync(`${OUT}/matches.json`, JSON.stringify(outMatches));
const byB = {}; for (const p of outPages) byB[p.bucket] = (byB[p.bucket] || 0) + 1;
console.log(`pages with lost sections: ${rows.length}; sections dropped: nav-like ${dropped.navLike}, repeated boilerplate ${dropped.boilerplate}, catalog non-prose ${dropped.notProse}, third-party text kept out of a Paizo-credited companion ${dropped.mixedCredit}`);
console.log(`companions to write: ${outPages.length}  (${fresh} new, ${merged} merged into an existing companion; skipped: ${skippedSmall} under ${MIN_CHARS} chars = ${dropped.small.toLocaleString()} chars, ${skippedBucket} with no importable bucket)`);
console.log("by bucket:", byB, " total chars:", outPages.reduce((a, p) => a + p.chars, 0).toLocaleString());
console.log(`wrote ${OUT}/pages.jsonl + matches.json`);
