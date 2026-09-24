/* IMPORTER — the d20pfsrd pilot's payoff. Takes matches.json + pages.jsonl (already decided: DUP,
 * NEW, NAMESAKE, AMBIGUOUS) and writes every NEW page into the Codex in its own shape: minted id,
 * bucket-appropriate facets, a source/license line, snippet, additive to data/cat/<bucket>.js and
 * data/index.js. NAMESAKE and AMBIGUOUS are never imported by this tool — they need a person, and
 * importing them silently under a name that collides with an existing entry is exactly the kind of
 * thing this whole pilot exists to prevent.
 *
 * ADDITIVE ONLY, ALWAYS: nothing here ever rewrites or removes an EXISTING (non-d20) Codex row —
 * checked at import time (`existingIds`/`existingNames`, computed before any d20 row is added).
 * Idempotent: ids are minted from (bucket, canonical name), so re-running after a re-clean of the
 * archive UPDATES the same rows rather than duplicating them.
 *
 * DRY RUN BY DEFAULT — writes a report only. --apply writes data/cat/*.js and data/index.js.
 *
 * Usage: node tools/d20/d20-import.mjs [--snap D:/CODEX/d20-pilot] [--root <repo>] [--apply] [--show 20]
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadCodex } from "../lib/api-build.mjs";
import { snippetOf, tidyDividers, stripTemplateJunk, breakFlatStatBlocks, isGodBody, repairSource, repairNote, nameKeys, VARIANT_QUAL, isPaizoish, UNVERIFIED_SOURCE } from "./d20-attrib.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const APPLY = argv.includes("--apply");
const SHOW = Number(arg("show", 20));
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");   // --root lets a scratch copy be written and diffed before touching the repo

/* ---------- shared helpers (ported from fix-duplicate-bodies.mjs / import-typed-orphans.mjs) ---- */
// The archiver's encoding pass occasionally mangles a character it couldn't map: U+FFFD (the
// replacement character) shows up where a minus sign belonged ("suffers a \ufffd1 penalty" \u2014 found
// in "Fate Denied"), a stray control character where a hyphen belonged ("language\x02dependent"
// \u2014 found in "Jester"), a bare "'s" possessive apostrophe went missing ("Ocean\ufffds Army",
// "Shadow\ufffds Blessing"), and a copyright symbol in a source-book credit line ("Deep Magic.
// \ufffd 2014 Open Design LLC." \u2014 found across 6 Open Design spells). import-typed-orphans.mjs
// already has precedent for this exact class of defect (U+FFFD standing in for a typographic
// apostrophe); this generalizes it with the narrowest context match first, falling back to the
// coarser digit/letter rules, and finally stripping anything still unaccounted for (counted,
// never silent) so a broken character never ships even if some future context is not covered yet.
let sanitizeFallbackHits = 0;
function sanitizeText(s) {
  return String(s || "")
    // credit-line copyright: "... . \ufffd  2014 Open Design LLC" -> copyright symbol
    .replace(/(\s)[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f](\s(?=\d{4}\b))/g, "$1\u00a9$2")
    // bare possessive "'s": "Ocean\ufffds Army" -> "Ocean\u2019s Army"
    .replace(/(\p{L})[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f]s(?=[\s.,;:!?)'"\u2019-]|$)/gu, "$1\u2019s")
    .replace(/[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f](?=\d)/g, "-")
    .replace(/(\p{L})[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f](\p{L})/gu, "$1-$2")
    .replace(/[\ufffd\x00-\x08\x0b\x0c\x0e-\x1f]/g, () => { sanitizeFallbackHits++; return ""; }); // anything left: strip, never ship a broken char, but count it
}
const norm = (s) => String(s || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim();
function field(raw, label) {
  const m = new RegExp(String.raw`(?:^|\n)${label}[ \t]+(.+?)(?=\n|$)`, "i").exec(raw);
  return m ? m[1].trim() : "";
}
const bookOf = (src) => String(src || "").replace(/\s*pg\.\s*\d+.*$/, "").trim();
// snippetOf() now lives in d20-attrib.mjs (shared with d20-repair.mjs).

/* ---------- facets, per bucket. "bk" (book/publisher) is the one every bucket gets; the rest match
 * what EXISTING rows already carry for that bucket (checked against data/index.js before writing this,
 * not guessed) — spells get school/level/save/sr, items get price, traits get category, archetypes get
 * class, feats get type. Everything else (classes/options/races/monsters/rules) gets {bk} alone,
 * because that is what the majority of real rows in those buckets already carry. */
const SAVE_TYPES = ["fortitude", "reflex", "will"];
// d20's own "Source X" line is often a raw Paizo product CODE ("AP91", "PRG:OB", "PZO1140"), not a
// readable title — fine for the attribution-tier logic in d20-clean.mjs (which only needs to know
// Paizo-or-not), useless as a display string ("📖 Source: PRG:OB" tells a reader nothing). Only trust
// it here when it actually looks like a title (has a space, isn't a short all-caps/code token);
// otherwise fall back to the already-clean p.publisher, or a generic label.
// A third-party page with evidence:"section15" and no other signal (no Source line, no hub folder,
// no breadcrumb tag) still names its own book right in the notice itself — "Mythic Options: The
// Missing Core Feats. © 2013, Owen K.C. Stephens; Author: Owen K.C. Stephens" — but bkOf() never read
// p.s15 at all, so 138 correctly-third-party entries in this batch showed the generic "Third-party
// (unattributed)" when a real title was sitting right there. Extract everything before the first
// copyright mark; empty or copyright-first text (a bare "© 2003, Wizards of the Coast" SRD notice
// with no title of its own) correctly yields nothing, falling through to the existing generic label.
const CR_MARK = /©|Copyright|\(c\)\s*\d{4}/i;
function s15TitleOf(s15) {
  if (!s15 || !s15.length) return null;
  const first = s15[0].split(CR_MARK)[0].replace(/[.,;\s]+$/, "").trim();
  return first && first.length <= 80 ? first : null;
}
function bkOf(p) {
  const src = field(p.body, "Source");
  // A real title is short ("Advanced Player's Guide"); a few third-party pages instead put their WHOLE
  // Section 15 copyright line after "Source" ("Sutra Scrolls Copyright (c) 2010-2012 Necromancers of
  // the Northwest, LLC") — found reading the dry run. Reject anything long or copyright-shaped too.
  const looksLikeTitle = src && src.length <= 60 && / /.test(src) && !/^[A-Z0-9:&]+$/.test(src) && !/copyright|\(c\)|©/i.test(src);
  if (looksLikeTitle) return bookOf(src);
  if (p.publisher) return p.publisher;
  if (p.thirdParty && p.evidence === "section15") { const t = s15TitleOf(p.s15); if (t) return t; }
  return p.thirdParty ? "Third-party (unattributed)" : "Paizo, Inc.";
}
function spellFacets(p, bk) {
  let sl = field(p.body, "School").split(/;\s*Level/i)[0].trim();
  if (!sl) { const m = /(?:^|\n)School\s+(.+?);\s*Level\s+(.+)/i.exec(p.body); sl = m ? m[1].trim() : ""; }
  const m = /^([^\s([]+)(?:\s*\(([^)]*)\))?\s*(?:\[([^\]]*)])?/.exec(sl);
  const school = m ? m[1].toLowerCase() : "";
  const desc = m && m[3] ? m[3].split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : [];
  const lm = /\bLevel\s+(.+?)(?:\n|$)/i.exec(p.body);
  const levels = {};
  for (const cm of (lm ? lm[1] : "").matchAll(/([A-Za-z][A-Za-z -]*(?:\(unchained\))?)\s+(\d+)(?:\s*\([^)]*\))?(?:,|$)/gi)) {
    let cls = cm[1].trim().toLowerCase(); if (cls === "redmantisassassin") cls = "red mantis assassin";
    levels[cls] = Number(cm[2]);
  }
  const saveSr = field(p.body, "Saving Throw");
  let save = "", sr = "";
  if (saveSr) { const parts = saveSr.split(/;\s*Spell Resistance\s+/i); save = parts[0].trim(); sr = (parts[1] || "").trim(); }
  const saveType = save && save.toLowerCase() !== "none" ? (SAVE_TYPES.find((v) => save.toLowerCase().includes(v)) || "special") : "none";
  const f = {};
  if (school) f.sch = school;
  if (Object.keys(levels).length) f.lv = levels;
  if (desc.length) f.desc = desc;
  f.save = saveType !== "none" ? { fortitude: "Fort", reflex: "Ref", will: "Will", special: "special" }[saveType] : "None";
  f.sr = sr || "no";
  if (bk) f.bk = bk;
  return f;
}
function itemFacets(p, bk) {
  const f = {};
  const priceStr = field(p.body, "Price") || field(p.body, "Cost");
  const pm = /([\d,]+)\s*gp/i.exec(priceStr);
  if (pm) f.pr = Number(pm[1].replace(/,/g, ""));
  if (bk) f.bk = bk;
  return f;
}
function traitFacets(p, bk) {
  const f = {};
  const seg = p.crumb[1] || "";                     // ["Traits","Combat Traits"] -> "Combat Traits"
  const cat = seg.replace(/\s*Traits\s*$/i, "").trim();
  if (cat) f.cat = cat;
  if (bk) f.bk = bk;
  return f;
}
function archetypeFacets(p, bk) {
  const f = {};
  const ai = p.crumb.findIndex((s) => /^archetypes$/i.test(s));
  const cls = ai > 0 ? p.crumb[ai - 1] : null;
  if (cls) f.cls = cls;
  if (bk) f.bk = bk;
  return f;
}
function featFacets(p, bk) {
  const f = {};
  const tm = /\(([^)]+)\)\s*$/.exec(p.name);
  if (tm) f.t = tm[1].trim();
  if (bk) f.bk = bk;
  return f;
}

/* ---------- rawCat (subcategory filter/badge), reasonable per-bucket defaults — most existing rows
 * in every bucket already carry the generic label used here; only items/classes get a light heuristic. */
function rawCatOf(p) {
  switch (p.bucket) {
    case "spells": return "Spells";
    case "feats": return "Feats";
    case "traits": return "Traits";
    case "races": return "Races";
    case "archetypes": return "Archetype";
    case "rules": return "Rules";
    case "monsters": return "Monsters";
    case "deities": return "Deities";
    case "options": { const last = p.crumb[p.crumb.length - 1] || ""; return /^(Domains|Archetypes)$/i.test(last) ? "Class Options" : (last || "Class Options"); }
    case "classes": return p.crumb.some((s) => /prestige/i.test(s)) ? "Prestige Classes" : "Base Classes";
    case "items": {
      const c = p.crumb.map((s) => s.toLowerCase());
      if (c.some((s) => /wondrous/.test(s))) return "Wondrous Items";
      if (c.some((s) => /armor|shield/.test(s))) return "Armor";
      if (c.some((s) => /weapon/.test(s))) return "Weapons";
      return "Miscellaneous";
    }
    default: return p.bucket;
  }
}

/* ---------- name canonicalization — matches EXISTING Codex conventions, checked against real rows
 * before writing this (archetypes are class-prefixed with no "(Class Archetype)" suffix; races drop
 * their RP build-point cost). Anything else keeps d20's own cleaned name. */
function canonicalName(p) {
  if (p.bucket === "archetypes") {
    const ai = p.crumb.findIndex((s) => /^archetypes$/i.test(s));
    const cls = ai > 0 ? p.crumb[ai - 1] : null;
    if (cls) {
      // d20 sometimes ALSO carries "(Barbarian)" / "(Barbarian Archetype)" as a trailing suffix on the
      // page's own name — strip it before prefixing, or the class ends up on the name twice
      // ("Barbarian Tribal Guardian (Barbarian)"), found reading the dry run.
      const clsEsc = cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const base = p.name.replace(new RegExp(`\\s*\\(${clsEsc}(?:\\s+Archetype)?\\)\\s*$`, "i"), "").trim();
      return new RegExp("^" + clsEsc, "i").test(base) ? base : `${cls} ${base}`;
    }
  }
  if (p.bucket === "races") return p.name.replace(/\s*\(\d+\s*RP\)\s*$/i, "").trim();
  return p.name;
}

const mintId = (bucket, name) => crypto.createHash("sha256").update(`pf1e-codex-d20pfsrd|${bucket}|${norm(name)}`).digest("hex").slice(0, 16);

/* ---------- load ------------------------------------------------------------------------------- */
const matches = JSON.parse(fs.readFileSync(`${SNAP}/matches.json`, "utf8"));
const pages = new Map(fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse).map((p) => [p.file, p]));
const d = loadCodex(ROOT);
const existingIds = new Set(d.IDX.map((r) => r[0]));
const existingNameBucket = new Map(d.IDX.map((r) => [norm(r[1]) + "|" + r[2], r[0]]));

const origByKey = new Map();
for (const r of d.IDX) { if (r[0] === mintId(r[2], r[1])) continue; for (const k of nameKeys(r[1])) { const a = origByKey.get(r[2] + "|" + k); a ? a.push(r) : origByKey.set(r[2] + "|" + k, [r]); } }

const IMPORTABLE_BUCKETS = new Set(["deities", "races", "rules", "monsters", "items", "traits", "classes", "archetypes", "options", "feats", "spells"]);

const toImport = matches.filter((r) => r.verdict === "NEW" || r.verdict === "NAMESAKE" || r.verdict === "AMBIGUOUS");   // held verdicts are resolved by the guards below
const held = { NAMESAKE: matches.filter((r) => r.verdict === "NAMESAKE"), AMBIGUOUS: matches.filter((r) => r.verdict === "AMBIGUOUS") };

const rows = [];           // new PF_INDEX rows
const bodies = {};         // bucket -> { id: body }
const report = { imported: [], skippedUnmappedBucket: [], skippedExistingCollision: [], skippedIntraBatchNamesake: [], skippedInvertedDup: [], skippedHeldDuplicate: [] };
const mintedThisRun = new Map(); // id -> {file, bk} of the page that minted it first, this run

for (const r of toImport) {
  const p = pages.get(r.file);
  if (!p) { report.skippedUnmappedBucket.push({ ...r, reason: "page missing from pages.jsonl" }); continue; }
  if (!IMPORTABLE_BUCKETS.has(p.bucket)) { report.skippedUnmappedBucket.push({ ...r, reason: `bucket "${p.bucket}" not handled by this importer` }); continue; }
  p.body = tidyDividers(breakFlatStatBlocks(stripTemplateJunk(sanitizeText(p.body))));
  // Backstop for bucketOf(): a god-shaped page filed under options/classes belongs in deities whatever its crumb said.
  if ((p.bucket === "options" || p.bucket === "classes") && isGodBody(p.body)) p.bucket = "deities";
  p.name = sanitizeText(p.name);
  // The credits block can carry the site's "~~~" item divider — sometimes trailing, sometimes followed by real body
  // text the page's Section 15 zone swallowed (Arcane Ace). Never delete: only turn the tildes into a paragraph break.
  p.license = tidyDividers(sanitizeText(p.license)).trim();

  let name = canonicalName(p);
  // The page's own license paragraph outranks bkOf's guess: see d20-attrib.mjs for the defects this fixes.
  const bk = repairSource(bkOf(p), p.license);
  // A NAMED third-party publisher (not Paizo, not "unconfirmed"/"unattributed"): the only case where a shared name is
  // resolved by keeping both, told apart by publisher — the way monsters carry "(3pp)" and gods "(Frog God Games)".
  const thirdNamed = !isPaizoish(bk) && bk !== UNVERIFIED_SOURCE && bk !== "Third-party (unattributed)" && bk !== "d20pfsrd.com";
  // A Paizo/unconfirmed page the matcher judged DIFFERENT content (NAMESAKE — e.g. the regional trait "Bandit" from another
  // region than the AoN "Bandit") is kept too, told apart as "Name (d20pfsrd)". A NEW-verdict Paizo collision is still skipped.
  const canDisamb = thirdNamed || r.verdict === "NAMESAKE";
  const suffix = thirdNamed ? bk : "d20pfsrd";
  const disamb = (n) => (n.toLowerCase().endsWith("(" + suffix.toLowerCase() + ")") ? n : n + " (" + suffix + ")");
  // HELD verdicts. d20-match.mjs held 1,473 pages back as NAMESAKE ("same name, different content") or AMBIGUOUS. A
  // sample showed most are genuinely different entries (a third-party "Shedu", two publishers' "Energy Weapon", a
  // Paizo race vs a monster of the same name); a minority are true duplicates. The importer's own guards decide:
  //  NAMESAKE  -> imported unless the same name+bucket already exists (below).
  //  AMBIGUOUS -> imported only from a NAMED third-party publisher and only when the match is weak (cont < 0.25, cos < 0.6);
  //               a Paizo/unconfirmed page that middling-matches a Codex row is far more likely the same entity re-worded.
  if (r.verdict === "AMBIGUOUS") {
    const mc = r.match || {};
    if (!thirdNamed || (mc.cont || 0) >= 0.25 || (mc.cos || 0) >= 0.6) { report.skippedHeldDuplicate.push({ ...r, canonicalName: name, reason: "AMBIGUOUS: " + (!thirdNamed ? "not from a named third-party publisher" : "content overlaps the matched Codex row") }); continue; }
  }
  // Two publishers' take on the SAME god ("Set" by Frog God Games vs the Paizo "Set") — deities always keep both.
  if (p.bucket === "deities") {
    const ex = existingNameBucket.get(norm(name) + "|deities");
    if (ex !== undefined && ex !== mintId("deities", name)) name = disamb(name);
  }
  let key = norm(name) + "|" + p.bucket;
  let id = mintId(p.bucket, name);
  // Additive-only guard: a name+bucket already in the Codex under a DIFFERENT id is a real collision (some other row
  // owns that name — never shadow existing content). A NAMED third party is kept alongside it as "Name (Publisher)";
  // anything else is treated as the likely duplicate it is and skipped. The SAME id means it's this importer's own
  // row from a previous run (ids are minted from bucket+name) — an update, not a collision.
  let existingIdForKey = existingNameBucket.get(key);
  if (existingIdForKey !== undefined && existingIdForKey !== id) {
    if (!canDisamb) { report.skippedExistingCollision.push({ ...r, canonicalName: name, reason: "name exists; content not judged different and not from a named third-party publisher" }); continue; }
    name = disamb(name); key = norm(name) + "|" + p.bucket; id = mintId(p.bucket, name); existingIdForKey = existingNameBucket.get(key);
    if (existingIdForKey !== undefined && existingIdForKey !== id) { report.skippedExistingCollision.push({ ...r, canonicalName: name, reason: "name+publisher already exists" }); continue; }
  }
  // SAME id is only "my own row from an earlier run" if it is the same page. Across batches a DIFFERENT publisher's page
  // can mint the same id ("Detect Curse": Frog God Games, then Rogue Genius Games); a differing source on an existing
  // id is a namesake — keep the existing row, do not overwrite.
  if (existingIdForKey === id) {
    const oldRow = d.IDX.find((row) => row[0] === id);
    if (oldRow && oldRow[4] !== (bk || "d20pfsrd.com")) {
      if (!canDisamb) { report.skippedExistingCollision.push({ ...r, canonicalName: name, reason: "existing row is by \"" + oldRow[4] + "\", this page by \"" + bk + "\"" }); continue; }
      name = disamb(name); key = norm(name) + "|" + p.bucket; id = mintId(p.bucket, name); existingIdForKey = existingNameBucket.get(key);
      const o2 = existingIdForKey !== undefined ? d.IDX.find((row) => row[0] === existingIdForKey) : null;
      if (existingIdForKey !== undefined && (existingIdForKey !== id || (o2 && o2[4] !== bk))) { report.skippedExistingCollision.push({ ...r, canonicalName: name, reason: "name+publisher already exists" }); continue; }
    }
  }
  // INTRA-BATCH NAMESAKE: two DIFFERENT d20 pages in one run minting the SAME id ("Swap" by Kobold Press vs Rogue Genius
  // Games — two different spells). First page keeps the plain name; a second from a DIFFERENT named publisher is kept as
  // "Name (Publisher)"; anything else is a duplicate of the first and is skipped (never a silent overwrite).
  let prior = mintedThisRun.get(id);
  if (prior && prior.file !== r.file) {
    if (canDisamb && prior.bk !== bk) {
      name = disamb(name); key = norm(name) + "|" + p.bucket; id = mintId(p.bucket, name);
      const ex2 = existingNameBucket.get(key);
      prior = mintedThisRun.get(id);
      if ((ex2 !== undefined && ex2 !== id) || (prior && prior.file !== r.file)) { report.skippedIntraBatchNamesake.push({ ...r, canonicalName: name, id, bucket: p.bucket, reason: "intra-batch namesake, still colliding" }); continue; }
    } else { report.skippedIntraBatchNamesake.push({ ...r, canonicalName: name, id, bucket: p.bucket, reason: "intra-batch: same publisher, duplicate of the first" }); continue; }
  }
  mintedThisRun.set(id, { file: r.file, bk });
  // INVERTED-NAME DUPLICATE of an ORIGINAL row ("Arrow, Bleeding" vs "Arrow (bleeding)"): d20-match's parseName
  // drops parentheses, so it cannot see these. Only Paizo/unconfirmed pages qualify — a named third party
  // with a familiar name is a namesake. See d20-attrib.mjs nameKeys().
  if (!VARIANT_QUAL.test(name) && (isPaizoish(bk) || bk === UNVERIFIED_SOURCE)) {
    const hit = nameKeys(name).flatMap((k) => origByKey.get(p.bucket + "|" + k) || []).find((o) => !VARIANT_QUAL.test(o[1]) && o[1] !== name);
    if (hit) { report.skippedInvertedDup.push({ ...r, canonicalName: name, duplicateOf: hit[1] }); mintedThisRun.delete(id); continue; }
  }
  const facets = p.bucket === "spells" ? spellFacets(p, bk)
    : p.bucket === "items" ? itemFacets(p, bk)
    : p.bucket === "traits" ? traitFacets(p, bk)
    : p.bucket === "archetypes" ? archetypeFacets(p, bk)
    : p.bucket === "feats" ? featFacets(p, bk)
    : (bk ? { bk } : {});

  const snippet = snippetOf(p.body);
  const source = bk || "d20pfsrd.com";
  const rawCat = rawCatOf(p);
  // p.license is already the right text either way: the page's own Section 15 notice, a note citing
  // d20pfsrd's site-wide OGL declaration + best-known publisher, or (evidence:"unverified") the
  // on-page invite to claim the content — built by licenseNoteOf() in d20-clean.mjs.
  const body = `${p.body.trim()}\n\n${repairNote(bk, p.license)}`;

  rows.push([id, name, p.bucket, rawCat, source, snippet, facets]);
  (bodies[p.bucket] ||= {})[id] = body;
  report.imported.push({ id, name, bucket: p.bucket, thirdParty: p.thirdParty, evidence: p.evidence, url: p.url, file: r.file });
}

/* ---------- report ------------------------------------------------------------------------------ */
const byBucket = {}; for (const r of report.imported) byBucket[r.bucket] = (byBucket[r.bucket] || 0) + 1;
console.log(`=== IMPORT: ${toImport.length} NEW pages -> ${report.imported.length} rows to add ===`);
console.log("by bucket:", byBucket);
const attr = {}; for (const r of report.imported) attr[r.thirdParty === true ? "third-party" : r.thirdParty === false ? "Paizo/OGL-core" : "unverified"] = (attr[r.thirdParty === true ? "third-party" : r.thirdParty === false ? "Paizo/OGL-core" : "unverified"] || 0) + 1;
console.log("attribution:", attr);
{
  const verdictOf = new Map(matches.map((m) => [m.file, m.verdict]));
  const impHeld = report.imported.filter((x) => verdictOf.get(x.file) !== "NEW").length;
  console.log(`\nheld verdicts (${held.NAMESAKE.length} NAMESAKE, ${held.AMBIGUOUS.length} AMBIGUOUS): ${impHeld} imported by the guards, ${report.skippedHeldDuplicate.length} AMBIGUOUS skipped as likely duplicates`);
}
if (report.skippedUnmappedBucket.length) console.log(`skipped (bucket not handled): ${report.skippedUnmappedBucket.length}`);
if (report.skippedExistingCollision.length) console.log(`skipped (name already exists — additive-only guard fired): ${report.skippedExistingCollision.length}`, report.skippedExistingCollision.slice(0, 5).map((r) => r.canonicalName));
if (report.skippedIntraBatchNamesake.length) console.log(`skipped (two DIFFERENT d20 pages this run share a name+bucket — pulled both, need a person): ${report.skippedIntraBatchNamesake.length}`, report.skippedIntraBatchNamesake.map((r) => r.canonicalName));

if (report.skippedInvertedDup.length) console.log(`skipped (inverted-name duplicate of an original Codex row): ${report.skippedInvertedDup.length}`, report.skippedInvertedDup.slice(0, 6).map((r) => r.canonicalName + " = " + r.duplicateOf));

fs.writeFileSync(`${SNAP}/import-report.json`, JSON.stringify(report, null, 1));
console.log(`\nwrote ${SNAP}/import-report.json`);

console.log(`\n--- sample of ${Math.min(SHOW, rows.length)} new rows ---`);
for (const row of rows.slice(0, SHOW)) {
  console.log(`\n[${row[2]}/${row[3]}] ${row[1]}  (id ${row[0]})`);
  console.log(`  source: ${row[4]}  facets: ${JSON.stringify(row[6])}`);
  console.log(`  snippet: ${row[5]}`);
}

/* ---------- apply ------------------------------------------------------------------------------- */
if (APPLY) {
  console.log(`\n--apply set: writing ${rows.length} new rows...`);
  for (const [bucket, obj] of Object.entries(bodies)) {
    const path = `${ROOT}/data/cat/${bucket}.js`;
    const text = fs.readFileSync(path, "utf8");
    // 5 of the 10 cat files turned out to already be CRLF on disk ("rules"/"monsters"/"traits"/
    // "classes"/"archetypes" — found because their parse silently failed the LF-only pattern here on
    // the first --apply run, while data/index.js (written after, in a separate step) had already
    // gone through). \r?\n? covers both line-ending styles instead of assuming one.
    const m = new RegExp(`^window\\.PF_REG\\("${bucket}",(\\{.*\\})\\);\\r?\\n?$`, "s").exec(text);
    if (!m) { console.log(`  !! could not parse ${path}`); continue; }
    const existing = JSON.parse(m[1]);
    let added = 0, updated = 0;
    for (const [id, body] of Object.entries(obj)) { if (id in existing) updated++; else added++; existing[id] = body; }
    fs.writeFileSync(path, `window.PF_REG("${bucket}",${JSON.stringify(existing)});\n`);
    console.log(`  ${bucket}: +${added} new, ${updated} updated (idempotent re-run)`);
  }

  const idxPath = `${ROOT}/data/index.js`;
  const idxText = fs.readFileSync(idxPath, "utf8");
  const im = /^window\.PF_INDEX=(\[.*\]);\r?\n?$/s.exec(idxText);
  if (!im) { console.log("  !! could not parse data/index.js"); }
  else {
    const idxRows = JSON.parse(im[1]);
    const byId = new Map(idxRows.map((r, i) => [r[0], i]));
    let added = 0, updated = 0;
    for (const row of rows) {
      const i = byId.get(row[0]);
      if (i != null) { idxRows[i] = row; updated++; } else { idxRows.push(row); added++; }
    }
    fs.writeFileSync(idxPath, `window.PF_INDEX=${JSON.stringify(idxRows)};\n`);
    console.log(`  data/index.js: +${added} new, ${updated} updated`);
  }
  // Every defect class this importer has ever shipped is checked here, against the files just written, so an
  // --apply can never end quietly with a known problem in the data. See d20-verify.mjs.
  console.log("\n--- d20-verify (runs after every --apply) ---");
  const v = spawnSync(process.execPath, ["--max-old-space-size=8192", fileURLToPath(new URL("./d20-verify.mjs", import.meta.url)), "--root", ROOT], { stdio: "inherit" });
  if (v.status !== 0) { console.log("\n!! d20-verify FAILED — do NOT run gen-api / commit / deploy. Fix the importer (not just the data) and re-run."); process.exitCode = 1; }
  else console.log("\nDone. Now: node tools/gen-api.mjs && node tools/check-api.mjs, run the checks suite, bump the 3 cache tokens, verify live.");
} else {
  console.log(`\nDry run only — nothing written. Review the report, then re-run with --apply.`);
}
