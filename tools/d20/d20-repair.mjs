/* One-off + re-runnable repair of already-imported d20 rows (see d20-attrib.mjs for why). Dry run by default.
 *   1. Source column / license paragraph corrections (repairSource, repairNote).
 *   2. Removes d20 rows that duplicate an ORIGINAL Codex row under an inverted name (nameKeys). Only rows this
 *      importer minted are ever touched: a row is d20's iff its id === mintId(bucket, name).
 * Usage: node tools/d20/d20-repair.mjs [--apply] [--root C:/Users/mailp/dev/pf1e-codex] */
import fs from "node:fs";
import crypto from "node:crypto";
import { commaListShare, AD_MARK, isGodSummaryTable, blankTemplateSlots } from "./d20-clean.mjs";
import { contentOverlap, SAME_TEXT, shortSuffix, snippetOf, tidyDividers, stripTemplateJunk, breakFlatStatBlocks, isFlatStatLine, isGodBody, repairSource, repairNote, nameKeys, VARIANT_QUAL, isPaizoish, UNVERIFIED_SOURCE, buildBookIndex, bookSource, canonicalPaizoBook, translateCodes, productSource, thirdPartyProduct, thirdPartyProducts, unifyPublishers, setProductLexicon, addToLexicon } from "./d20-attrib.mjs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ROOT = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : "C:/Users/mailp/dev/pf1e-codex";
const norm = (s) => String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();   // must equal d20-import.mjs's norm
const mintId = (bucket, name) => crypto.createHash("sha256").update(`pf1e-codex-d20pfsrd|${bucket}|${norm(name)}`).digest("hex").slice(0, 16);

const idxPath = `${ROOT}/data/index.js`;
const im = /^window\.PF_INDEX=(\[.*\]);\r?\n?$/s.exec(fs.readFileSync(idxPath, "utf8"));
if (!im) throw new Error("cannot parse data/index.js");
const rows = JSON.parse(im[1]);
const buckets = [...new Set(rows.map((r) => r[2]))];
const bodies = {};
for (const b of buckets) {
  const text = fs.readFileSync(`${ROOT}/data/cat/${b}.js`, "utf8");
  const open = `window.PF_REG("${b}",`;
  if (!text.startsWith(open) || !text.trimEnd().endsWith(");")) throw new Error("cannot parse " + b);
  bodies[b] = JSON.parse(text.slice(open.length, text.trimEnd().length - 2));
}
// ---- 0. gods filed under `options`/`classes` -> `deities` (d20 files them under Classes > Cleric > Gods; see bucketOf) ----
const godBody = isGodBody;
const isD20 = (r) => r[0] === mintId(r[2], r[1]);
{
  const have = new Set(rows.filter((r) => r[2] === "deities").map((r) => norm(r[1])));
  let moved = 0;
  for (const r of rows) {
    if (r[2] === "deities" || !["options", "classes"].includes(r[2]) || !isD20(r)) continue;
    const body = String(bodies[r[2]][r[0]]);
    if (!godBody(body)) continue;
    const src = repairSource(r[4], body.split(/\n\n/).pop());
    const newName = have.has(norm(r[1])) ? `${r[1]} (${src})` : r[1];
    const newId = mintId("deities", newName);
    delete bodies[r[2]][r[0]];
    (bodies.deities ||= {})[newId] = body;
    have.add(norm(newName));
    if (newName !== r[1]) console.log(`  move ${r[1]} -> deities as "${newName}"`);
    r[0] = newId; r[1] = newName; r[2] = "deities"; r[3] = "Deities"; r[6] = { bk: src };
    moved++;
  }
  console.log(`gods moved into deities: ${moved}`);
}
// ---- 0b. "(Publisher)" suffixes that are citations or Paizo book titles -> short form (see shortSuffix / isPaizoish) ----
{
  const taken = new Set(rows.map((r) => r[2] + "|" + norm(r[1])));
  let renamed = 0, blocked = 0;
  for (const r of rows) {
    if (!isD20(r)) continue;
    const m = /^(.*\S) \(([^()]+)\)$/.exec(r[1]); if (!m) continue;
    const [, base, sfx] = m;
    const want = isPaizoish(sfx) ? "d20pfsrd" : shortSuffix(sfx);
    if (want === sfx) continue;
    // only names this importer gave a publisher/citation suffix: a real "(Su)"/"(CR 3)" tag is short and never matches the rules above
    if (sfx.length <= 28 && !isPaizoish(sfx) && !/ from the /i.test(sfx)) continue;
    const newName = `${base} (${want})`, newId = mintId(r[2], newName);
    if (taken.has(r[2] + "|" + norm(newName))) { blocked++; continue; }
    bodies[r[2]][newId] = bodies[r[2]][r[0]]; delete bodies[r[2]][r[0]];
    taken.delete(r[2] + "|" + norm(r[1])); taken.add(r[2] + "|" + norm(newName));
    r[0] = newId; r[1] = newName; renamed++;
  }
  console.log(`long/citation suffixes shortened: ${renamed}${blocked ? ` (${blocked} left: the short name is taken)` : ""}`);
}
// ---- 0c. facet-label normalization: the SAME category filed under two different spellings because
// AoN's and d20pfsrd's own sites label it differently (AoN: "Region" — its own URL/type key; d20pfsrd's
// breadcrumb literally reads "Regional Traits", so traitFacets() in d20-import.mjs stripped it to
// "Regional"). Found 2026-09-29 auditing for missed content: not missing, just split across two facet
// values, so the trait-category filter showed it as two near-duplicate options instead of one. Extend
// this map if another such pair turns up — it's the general fix, not a one-off patch for this pair. ----
const CAT_ALIAS = { traits: { Regional: "Region" } };
{
  let renamed = 0;
  for (const r of rows.filter(isD20)) {
    const want = CAT_ALIAS[r[2]] && r[6] && CAT_ALIAS[r[2]][r[6].cat];
    if (!want) continue;
    if (APPLY) r[6].cat = want;
    renamed++;
  }
  console.log(`facet labels normalized: ${renamed}`);
}
// ---- 0d. third-party traits mislabeled with the generic "3rd Party"/"3rd Party Drawbacks" wrapper
// when their OWN publisher's crumb names a real, recognized type one level deeper (traitFacets() in
// d20-import.mjs only read crumb[1] — see that file's comment). A trait's mechanical type doesn't
// depend on its publisher, so this is the same class of fix as 0c, just by name instead of by label
// (this script can't re-read the original crumb, only the already-imported facet). Found + this exact
// list built 2026-09-29 by re-deriving each name's category from D:/CODEX/d20-pilot/pages.jsonl.
// Guarded on the row STILL carrying a wrapper cat, so a re-run is a no-op and this can never clobber
// a category someone corrected by hand for a different reason. ----
const TRAIT_CAT_WRAPPERS_REPAIR = new Set(["3rd Party", "3rd Party Drawbacks"]);
const RECLASSIFY_3P_TRAIT = {
  "Bad Day in Town": "Campaign", "Company Lumberjack": "Campaign", "Family Hero (Dwarf only)": "Campaign",
  "Infected Family Member": "Campaign", "Scion of the Light": "Campaign", "Werewolf Hunter": "Campaign",
  "Expert Scribe": "Magic",
  "Arcanum College Dropout": "Region", "Arcanum College Graduate": "Region",
  "Exiled (Abbey of the Golden Sparrow)": "Region", "Goblin Signs (Abbey of the Golden Sparrow)": "Region",
  "Improvised Healer (Abbey of the Golden Sparrow)": "Region", "Practiced Thrower (Abbey of the Golden Sparrow)": "Region",
  "Raised Since Birth (Abbey of the Golden Sparrow)": "Region", "Seeker of Enlightenment (Abbey of the Golden Sparrow)": "Region",
  "Student of the Air (Abbey of the Golden Sparrow)": "Region", "Well-Guarded Mind (Abbey of the Golden Sparrow)": "Region",
  "Eager to Please": "Social", "Early Education": "Social", "Progressive (Social)": "Social",
  "Scavenger (Race)": "Race",
};
{
  let renamed = 0;
  for (const r of rows.filter(isD20)) {
    if (r[2] !== "traits" || !r[6]) continue;
    const want = RECLASSIFY_3P_TRAIT[r[1]];
    if (!want || !TRAIT_CAT_WRAPPERS_REPAIR.has(r[6].cat)) continue;
    if (APPLY) r[6].cat = want;
    renamed++;
  }
  console.log(`3rd-party traits reclassified to their real type: ${renamed}`);
}
const d20 = rows.filter(isD20), orig = rows.filter((r) => !isD20(r));
// The books the AoN-sourced originals already cite (all Paizo), by key — also registers them with isPaizoish() so a book-titled source still reads as Paizo below.
const BOOKS = buildBookIndex(rows, (r) => !isD20(r));
console.log(`rows ${rows.length}: d20-minted ${d20.length}, original ${orig.length}`);

const drop = new Map();
// ---- 3. structure: navigation-list "entries" and stat blocks flattened onto one line ----
const listPages = d20.filter((r) => r[3] !== "Additional Material (d20pfsrd)" && commaListShare(String(bodies[r[2]][r[0]]).split("\n").filter((l) => l.trim())) > 0.6);
console.log(`\nname-list navigation pages posing as entries: ${listPages.length}`);
for (const r of listPages) { console.log("  drop", r[1], `[${r[2]}]`); }
let rebroke = 0;
for (const r of d20) {
  const b = String(bodies[r[2]][r[0]]);
  if (!b.split("\n").some(isFlatStatLine)) continue;
  const nb = breakFlatStatBlocks(b);
  console.log(`  re-broke flattened stat block: ${r[1]} (${b.split("\n").length} -> ${nb.split("\n").length} lines)`);
  if (APPLY) { bodies[r[2]][r[0]] = nb; r[5] = snippetOf(nb); }
  rebroke++;
}
// Crawler-captured ad widget: cut it; a row that was NOTHING but the ad (or a god summary table) is dropped.
let adStripped = 0;
for (const r of d20) {
  const b = String(bodies[r[2]][r[0]]), cutAt = b.lastIndexOf("\n\n"), head = b.slice(0, cutAt), tail = b.slice(cutAt + 2);
  const adAt = head.split("\n").findIndex((l) => AD_MARK.test(l.trim()));
  const nh = adAt >= 0 ? head.split("\n").slice(0, adAt).join("\n").trim() : head;
  const godTable = isGodSummaryTable(nh);
  if (adAt < 0 && !godTable) continue;
  if (nh.length < 100 || godTable) { drop.set(r[0], `${r[1]}  <>  (${nh.length < 100 ? "nothing but a publisher ad" : "a god summary table; every god has its own page"})`); console.log(`  drop ${r[1]} [${r[2]}]: ${drop.get(r[0]).split("<>")[1].trim()}`); }
  else { console.log(`  stripped ad block: ${r[1]} (${head.length - nh.length} chars)`); if (APPLY) bodies[r[2]][r[0]] = nh + "\n\n" + tail; }
  adStripped++;
}
for (const r of d20) { if (blankTemplateSlots(String(bodies[r[2]][r[0]])) >= 20) { drop.set(r[0], `${r[1]}  <>  (a blank stat-block template)`); console.log(`  drop ${r[1]} [${r[2]}]: a blank stat-block template`); } }
let cleaned = 0, dividers = 0;
for (const r of d20) { const b = String(bodies[r[2]][r[0]]); const nb = tidyDividers(b); if (nb !== b) { console.log(`  tidied ~~~ dividers: ${r[1]}`); if (APPLY) bodies[r[2]][r[0]] = nb; dividers++; } }   // snippets are re-derived by the drift step below
for (const r of d20) { const b = String(bodies[r[2]][r[0]]); const nb = stripTemplateJunk(b); if (nb !== b) { console.log(`  stripped template text: ${r[1]} (${b.length - nb.length} chars)`); if (APPLY) { bodies[r[2]][r[0]] = nb; r[5] = snippetOf(nb); } cleaned++; } }
// The index snippet is derived from the body; any drift between the two (a body cleaned without its snippet) is repaired here.
let snipFixed = 0;
for (const r of d20) {
  const bd = String(bodies[r[2]][r[0]]);
  const want = snippetOf(bd.slice(0, bd.lastIndexOf("\n\n")));   // the importer snippets the body BEFORE the license paragraph is appended
  if (r[5] === want) continue;
  if (snipFixed < 6) console.log(`  snippet drift: ${r[1]}: «${String(r[5]).slice(0, 60)}» -> «${want.slice(0, 60)}»`);
  if (APPLY) r[5] = want;
  snipFixed++;
}
console.log(`snippets out of step with their body: ${snipFixed}`);
for (const r of listPages) drop.set(r[0], `${r[1]}  <>  (a list of names, no content of its own)`);

// ---- 2b. suffixed namesakes ("Name (d20pfsrd)", "Name (Publisher)") that repeat their plain-name twin's TEXT ----
// d20-match called these "different content" because the AoN original carries extra "Source …" lines; the text is the same.
{
  const byNameBucket = new Map(rows.map((r) => [r[2] + "|" + norm(r[1]), r]));
  let n = 0;
  for (const r of d20) {
    if (drop.has(r[0])) continue;
    const m = /^(.*\S) \(([^()]+)\)$/.exec(r[1]); if (!m) continue;
    if (m[2] !== "d20pfsrd" && m[2] !== shortSuffix(r[4])) continue;   // only suffixes the importer generated; "(Mythic)", "(3.5E)", "(Teamwork)" are real variants that legitimately contain their base's text
    const twin = byNameBucket.get(r[2] + "|" + norm(m[1]));
    if (!twin || twin[0] === r[0]) continue;
    if (contentOverlap(bodies[r[2]][r[0]], bodies[twin[2]][twin[0]]) >= SAME_TEXT) { drop.set(r[0], `${r[1]}  <>  (same text as "${twin[1]}")`); n++; }
  }
  console.log(`\nsuffixed namesakes that repeat their twin's text: ${n}`);
}
// ---- 2. inverted-name duplicates of ORIGINAL rows ----
const origByKey = new Map();
for (const r of orig) for (const k of nameKeys(r[1])) { const a = origByKey.get(r[2] + "|" + k); a ? a.push(r) : origByKey.set(r[2] + "|" + k, [r]); }
for (const r of d20) {
  if (VARIANT_QUAL.test(r[1])) continue;
  const tail = String(bodies[r[2]][r[0]]).split(/\n\n/).pop();
  const src = repairSource(r[4], tail);
  if (!isPaizoish(src) && src !== UNVERIFIED_SOURCE) continue;                     // a third-party page with a familiar name is a namesake, not a duplicate
  for (const k of nameKeys(r[1])) for (const o of origByKey.get(r[2] + "|" + k) || []) {
    if (VARIANT_QUAL.test(o[1]) || o[1] === r[1]) continue;
    drop.set(r[0], `${r[1]}  <>  original "${o[1]}"`);
  }
}
console.log(`\nduplicates of an original row under an inverted name: ${drop.size}`);
for (const v of drop.values()) console.log("  drop", v);

// ---- 1. source / license repairs (on rows that stay) ----
let srcChanged = 0, noteChanged = 0; const tally = {};
// third-party PRODUCT names ("Ultimate Battle (Legendary Games)", see productSource): first pass finds every row's product + publisher so the SAME product gets
// ONE publisher spelling across the site (unifyPublishers); the loop below applies it.
const SOURCE_OVERRIDES = JSON.parse(fs.readFileSync(new URL("./source-overrides.json", import.meta.url), "utf8")).overrides;
const PRODUCT_SRC =/^(.+) \(([^()]+)\)$/;
// a crawler once filed the heading "Section 15" as the source of a page whose notice is Paizo's: the books it names are the source
const srcOfRow = (r, tail, head) => { const cur = (/^Section 15:?$/i.test(String(r[4])) || /^Pathfinder \d+$/.test(String(r[4]))) && /Paizo/.test(tail) ? "Paizo, Inc." : r[4]; const s0 = canonicalPaizoBook(bookSource(repairSource(cur, tail), tail, BOOKS), BOOKS); return r[3] === "Additional Material (d20pfsrd)" ? s0 : productSource(s0, tail, head, r[1]).replace(/,\s*All rights reserved\)$/i, ")"); };
{
  // titles that split cleanly anywhere on the site: they settle where a title starts when an author list runs straight into it (see parseNotices)
  const lex = new Map(); setProductLexicon(lex);
  for (const r of d20) {
    if (drop.has(r[0])) continue;
    const b = String(bodies[r[2]][r[0]]), tl = b.slice(b.lastIndexOf("\n\n") + 2), p1 = thirdPartyProduct(tl);
    if (p1) addToLexicon(lex, p1.title); else for (const p of thirdPartyProducts(tl) || []) addToLexicon(lex, p.title);
  }
}
const pubMap = (() => {
  const items = [];
  for (const r of d20) {
    if (drop.has(r[0])) continue;
    const body = String(bodies[r[2]][r[0]]), tail = body.slice(body.lastIndexOf("\n\n") + 2), m = PRODUCT_SRC.exec(srcOfRow(r, tail, body.slice(0, body.lastIndexOf("\n\n"))));
    if (m && !isPaizoish(m[1]) && (thirdPartyProduct(tail) || (thirdPartyProducts(tail) || []).some((p) => p.title === m[1]))) items.push({ title: m[1], publisher: m[2] });
  }
  return unifyPublishers(items);
})();
for (const r of d20) {
  if (drop.has(r[0])) continue;
  const body = String(bodies[r[2]][r[0]]); const cut = body.lastIndexOf("\n\n");
  const head = body.slice(0, cut), tail = body.slice(cut + 2);
  // "Paizo, Inc." alone -> the BOOK its own Section 15 notice names (see bookSource in d20-attrib.mjs)
  let newSrc = srcOfRow(r, tail, head);
  { const m = PRODUCT_SRC.exec(newSrc), canon = m && (thirdPartyProduct(tail) || thirdPartyProducts(tail)) && pubMap.get(m[1]) && pubMap.get(m[1]).get(m[2]); if (canon && canon !== m[2]) newSrc = `${m[1]} (${canon})`; }
  { const ov = SOURCE_OVERRIDES.find((o) => o.name === r[1] && o.bucket === r[2] && o.requires.every((x) => tail.toLowerCase().includes(x.toLowerCase()))); if (ov) newSrc = ov.source; }   // researched per-entry sources (source-overrides.json)
  const newTail = repairNote(newSrc, tail);
  if (newSrc !== r[4]) { const k = `${r[4]} -> ${/^Source unconfirmed/.test(newSrc) ? newSrc : r[4] === "Third-party (unattributed)" ? "(publisher from own Section 15)" : r[4] === "Paizo, Inc." || r[4] === "Paizo" ? "(book from own Section 15)" : newSrc}`; tally[k] = (tally[k] || 0) + 1; srcChanged++; }
  if (newTail !== tail) noteChanged++;
  if (APPLY) {
    // the facet is ONE book (the filter lists distinct values); a two-notice page keeps both in the source string and its first as the facet
    if (newSrc !== r[4]) { if (r[6] && r[6].bk === r[4]) r[6].bk = newSrc.split(";")[0].trim(); r[4] = newSrc; }
    if (newTail !== tail) bodies[r[2]][r[0]] = head + "\n\n" + newTail;
  }
}
console.log(`\nsource column corrected: ${srcChanged} | license paragraph corrected: ${noteChanged}`);
Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

// ---- 4. product codes -> book names ("Source PZO1115" -> "Source Advanced Player's Guide"; see translateCodes). Originals (AoN rows) are never edited. ----
{
  const n = { d20: 0, companion: 0, originalSkipped: 0 };
  for (const r of rows) {
    if (drop.has(r[0])) continue;
    const body = String(bodies[r[2]][r[0]]), nb = translateCodes(body, BOOKS);
    if (nb === body) continue;
    if (!isD20(r) && r[3] !== "Additional Material (d20pfsrd)") { n.originalSkipped++; continue; }
    n[isD20(r) ? "d20" : "companion"]++;
    if (APPLY) { bodies[r[2]][r[0]] = nb; r[5] = snippetOf(nb.slice(0, nb.lastIndexOf("\n\n"))); }
  }
  console.log(`\nproduct codes translated in body text: ${n.d20} d20 rows, ${n.companion} companion rows (${n.originalSkipped} original rows left as written)`);
}

if (APPLY) {
  const kept = rows.filter((r) => !drop.has(r[0]));
  for (const id of drop.keys()) { const r = rows.find((x) => x[0] === id); delete bodies[r[2]][id]; }
  for (const b of buckets) fs.writeFileSync(`${ROOT}/data/cat/${b}.js`, `window.PF_REG("${b}",${JSON.stringify(bodies[b])});\n`);
  fs.writeFileSync(idxPath, `window.PF_INDEX=${JSON.stringify(kept)};\n`);
  console.log(`\nAPPLIED: ${kept.length} rows written (${drop.size} removed).`);
} else console.log("\nDry run — nothing written.");
