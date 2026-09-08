/* Recover the class options that never made it into the Codex.
 *
 * WHY THIS EXISTS
 * The Codex was never scraped from AoN. It was built from a folder of archived page exports, and
 * the structuring step turned each PAGE into entries. That works when AoN gives every option its
 * own detail page — kineticist wild talents (278), sorcerer bloodlines (75), mesmerist stares (24)
 * all came through that way. But AoN publishes some families as ONE long page holding every
 * option, and those pages look exactly like a duplicative index (Feats.aspx, Monsters.aspx?Letter=All),
 * so they were quarantined with reason "unsupported_entity_type". For those families the listing
 * page is the ONLY copy of the text, so quarantining it dropped the content entirely — which is
 * why the Codex had zero alchemist discoveries, rogue talents, witch hexes or bard masterpieces.
 *
 * The pages are still on disk. This reads them straight out of the quarantine and rebuilds the
 * missing entries. Nothing is fetched from the network.
 *
 * Two page shapes, both present and auto-detected:
 *   A (inline)  Acid bomb* (Advanced Player's Guide pg. 29): When the alchemist creates a bomb…
 *   B (block)   Ancients' Flight (Oratory)
 *               Source Dragonslayer's Handbook pg. 11
 *               <body paragraphs>
 *
 * Idempotent: entries already in PF_INDEX under the same category are skipped, so a second run
 * adds nothing. Re-run it after any data rebuild.
 *
 * Usage:
 *   node tools/import-class-options.mjs .                 # report only
 *   node tools/import-class-options.mjs . --apply         # write data/index.js + data/cat/options.js
 *   node tools/import-class-options.mjs . --dump <dir>    # also write per-page JSON for inspection
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const APPLY = process.argv.includes("--apply");
const DUMP = process.argv.includes("--dump")
  ? process.argv[process.argv.indexOf("--dump") + 1] : null;

const QUARANTINE = process.env.AON_QUARANTINE ||
  "C:/Users/mailp/OneDrive/Desktop/AON PAGES PARSED/FINISH/structured/_quarantine.jsonl";

/* Which quarantined listing pages to recover, and what category each becomes.
 * The category is the label a reader sees in the Class Options type chooser, so it is
 * class-qualified wherever two classes share a family name (witch vs shaman hexes, rogue vs
 * vigilante talents). Families the Codex ALREADY has in full — cleric Domains, mesmerist Tricks,
 * arcanist Exploits, cavalier Orders — are simply not listed here.
 * The two Unchained lists get their OWN categories rather than merging into the core ones: 32 of
 * the 151 shared rogue-talent names carry rewritten text, so merging would have served Rogue
 * (Unchained) players the chained rules. */
const PAGES = [
  [/\/AlchemistDiscoveries\.aspx$/i,        "Discoveries",           "Alchemist"],
  [/\/Annointings\.aspx$/i,                 "Annointings",           "Alchemist"],
  [/\/RogueTalents\.aspx$/i,                "Rogue Talents",         "Rogue"],
  [/\/RogueUnchainedTalents\.aspx$/i,       "Rogue Talents (Unchained)", "Rogue (Unchained)"],
  [/\/VigilanteTalents\.aspx$/i,            "Vigilante Talents",     "Vigilante"],
  [/\/SlayerTalents\.aspx$/i,               "Slayer Talents",        "Slayer"],
  [/\/InvestigatorTalents\.aspx$/i,         "Investigator Talents",  "Investigator"],
  [/\/WitchHexes\.aspx$/i,                  "Witch Hexes",           "Witch"],
  [/\/ShamanHexes\.aspx$/i,                 "Shaman Hexes",          "Shaman"],
  [/\/BardMasterpieces\.aspx$/i,            "Masterpieces",          "Bard"],
  [/\/SummonerEvolutions\.aspx$/i,          "Evolutions",            "Summoner"],
  [/\/SummonerUCEvolutions\.aspx$/i,        "Evolutions (Unchained)", "Summoner (Unchained)"],
  // Forced to block: inline would yield the 79 granted powers instead of the ~40
  // inquisitions, and the inquisition is what a character actually picks.
  [/\/Inquisitions\.aspx$/i,                "Inquisitions",          "Inquisitor", null, "block"],
  [/\/BarbarianRagePowers\.aspx(\?|$)/i,    "Rage Powers",           "Barbarian"],
  [/\/OracleCurses\.aspx$/i,                "Oracle Curses",         "Oracle"],
  [/\/DruidDomains\.aspx$/i,                "Druid Domain Powers",   "Druid"],
  [/\/MagusArcana\.aspx$/i,                 "Magus Arcana",          "Magus"],
  [/\/NinjaTricks\.aspx$/i,                 "Ninja Tricks",          "Ninja"],
  [/\/GunslingerDeeds\.aspx$/i,             "Deeds",                 "Gunslinger"],
  [/\/SwashbucklerDeeds\.aspx$/i,           "Deeds",                 "Swashbuckler"],
  [/\/RangerCombatStyles\.aspx$/i,          "Combat Styles",         "Ranger"],
  // Mythic path abilities are character options in every sense — the choices a mythic character
  // makes at each tier — and the Codex had the mythic RULES chapter and 89 mythic monsters but
  // none of these. The class recorded is the one whose scenes they borrow until opt-mythic-path
  // art exists, not a claim about who grants them; the real path is in the `path` facet.
  [/\/PathAbilities\.aspx\?Path=Archmage/i,           "Mythic Path Abilities", "Wizard"],
  [/\/PathAbilities\.aspx\?Path=Champion/i,           "Mythic Path Abilities", "Fighter"],
  [/\/PathAbilities\.aspx\?Path=Guardian/i,           "Mythic Path Abilities", "Paladin"],
  [/\/PathAbilities\.aspx\?Path=Hierophant/i,         "Mythic Path Abilities", "Cleric"],
  [/\/PathAbilities\.aspx\?Path=Marshal/i,            "Mythic Path Abilities", "Cavalier"],
  [/\/PathAbilities\.aspx\?Path=Trickster/i,          "Mythic Path Abilities", "Rogue"],
  [/\/PathAbilities\.aspx\?Path=Godling/i,            "Mythic Path Abilities", "Sorcerer"],
  [/\/PathAbilities\.aspx\?Path=Universal/i,          "Mythic Path Abilities", "Oracle"],
  // Eidolon options — present as monster families, absent as the choices a summoner makes.
  [/\/EidolonBaseForms\.aspx$/i,           "Eidolon Base Forms",    "Summoner"],
  [/\/EidolonUCBaseForms\.aspx$/i,         "Eidolon Base Forms (Unchained)", "Summoner (Unchained)"],
  [/\/EidolonUCSubtypes\.aspx$/i,          "Eidolon Subtypes (Unchained)",   "Summoner (Unchained)"],
  // Favors are single-use magic items given by one creature to another. Their own detail pages
  // were quarantined because "Favors" is not a type the structuring step knows. A 4th element
  // sends rows to a bucket other than `options`.
  [/\/MagicFavorsDisplay\.aspx/i,          "Favors",                null, "items"],
  // A mythic path’s BASE features (Wild Arcana, Fleet Charge, Sudden Attack) are described on
  // the path page, not on PathAbilities.aspx, so importing only the ability lists left the
  // best-known mythic abilities missing. Kept separate from the selectable path abilities
  // because these are granted automatically; both share the opt-mythic-path art.
  [/\/MythicPaths\.aspx\?Path=Archmage/i,            "Mythic Path Features",  "Wizard"],
  [/\/MythicPaths\.aspx\?Path=Champion/i,            "Mythic Path Features",  "Fighter"],
  [/\/MythicPaths\.aspx\?Path=Guardian/i,            "Mythic Path Features",  "Paladin"],
  [/\/MythicPaths\.aspx\?Path=Hierophant/i,          "Mythic Path Features",  "Cleric"],
  [/\/MythicPaths\.aspx\?Path=Marshal/i,             "Mythic Path Features",  "Cavalier"],
  [/\/MythicPaths\.aspx\?Path=Trickster/i,           "Mythic Path Features",  "Rogue"],
];

const pageRule = (url) => PAGES.find(([re]) => re.test(url));

/* ---------- parsing ---------------------------------------------------------------------- */

// "Name (Su)* (Book pg. 29): text"  — the tags and the * are optional and may be absent.
// Godling abilities insert a deity in brackets: "Drunken Luck (Su) [Cayden Cailean] (Mythic
// Origins pg. 6): ...". Without allowing that bracket the whole Godling page parsed to zero.
const INLINE = new RegExp(
  "^(?<name>[^(:\\[][^:(\\[]{0,80}?)\\s*" +
  "(?<tags>(?:\\((?:Su|Ex|Sp|Su\\/Ex)\\)\\s*)?\\*?)\\s*" +
  "(?:\\[(?<deity>[^\\]]{1,40})\\]\\s*)?" +
  "\\((?<src>[^)]*?(?:pg\\.\\s*\\d+|[A-Za-z]))\\):\\s*(?<rest>.*)$");

// A block entry is a NAME line whose next non-blank line starts with "Source ".
const SOURCE_LINE = /^Source\s+(.+?)\s*$/;

// Lines that are page furniture, not content.
const isNav = (s) => s.includes(" | ") && s.split(" | ").length >= 3;
const isDescSource = (s) => /^Description Source:/i.test(s);

// A line only counts as a section heading if it names an option family. Anything else that looks
// heading-shaped on these pages is table data or a stray Source/Deities line.
const SECTION_OK =
  /(?:Talents?|Discoveries|Hexes|Rage Powers|Curses|Arcana|Tricks|Deeds|Evolutions|Annointings|Masterpieces|Inquisitions|Domain|Powers|Styles|Exploits)\s*$/i;

function parseInline(lines, startAt, pageSource) {
  const out = [];
  let cur = null, section = "";
  for (let i = startAt; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;
    if (isNav(s) || isDescSource(s)) continue;
    const m = INLINE.exec(s);
    if (m) {
      // A lone "(Su)" / "(Ex)" / "(Sp)" is the ability TYPE, not a citation. Mythic path
      // features are written "Wild Arcana (Su): ..." with no source of their own, so without
      // this the body reads "Source Su" and the book facet becomes "Su".
      let src = m.groups.src.trim(), tags = (m.groups.tags || "").trim();
      if (/^(?:Su|Ex|Sp)$/i.test(src)) { tags = tags || `(${src})`; src = pageSource || ""; }
      cur = { name: m.groups.name.trim().replace(/\*+$/, ""),
              tags,
              deity: (m.groups.deity || "").trim(),
              source: src,
              section,
              body: [m.groups.rest.trim()] };
      out.push(cur);
      continue;
    }
    // A section heading sits between groups of entries ("Bomb Discoveries", "Major Hexes",
    // "1-Point Evolutions"). Being loose here swallows embedded TABLE ROWS — "Metropolis 35",
    // "d20 Effect", "Sickened Nauseated" — and the per-entry "Source …"/"Deities …" lines, so
    // only accept a line that actually ends in an option-family word.
    if (s.length < 60 && !s.includes(":") && !/[.!?]$/.test(s) && SECTION_OK.test(s)) {
      section = s; cur = null; continue;
    }
    if (cur) cur.body.push(s);
  }
  return out;
}

function parseBlock(lines, startAt) {
  const out = [];
  let cur = null;
  for (let i = startAt; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;
    if (isNav(s) || isDescSource(s)) continue;
    // look ahead for the Source line that marks this as a name
    let j = i + 1;
    while (j < lines.length && !lines[j].trim()) j++;
    const nxt = j < lines.length ? lines[j].trim() : "";
    const sm = SOURCE_LINE.exec(nxt);
    if (sm && s.length < 90 && !/[.!?]$/.test(s) && !INLINE.test(s)) {
      const tagm = /\((Su|Ex|Sp)\)\s*$/.exec(s);
      cur = { name: s.replace(/\((Su|Ex|Sp)\)\s*$/, "").trim().replace(/\*+$/, ""),
              tags: tagm ? `(${tagm[1]})` : "",
              source: sm[1].trim(), section: "", body: [] };
      out.push(cur);
      i = j;                       // consume the Source line
      continue;
    }
    if (cur) cur.body.push(s);
  }
  return out;
}

function parsePage(content, force) {
  const lines = content.split("\n");
  // Skip the class nav block and the page title at the top.
  let start = 0;
  for (let i = 0; i < Math.min(12, lines.length); i++) if (isNav(lines[i].trim())) start = i + 1;
  // The page's own "Source Mythic Adventures pg. 14" line, used when an entry has none.
  let pageSource = "";
  for (let i = start; i < Math.min(start + 12, lines.length); i++) {
    const m = /^Source\s+(.+?)\s*$/.exec(lines[i].trim());
    if (m) { pageSource = m[1]; break; }
  }
  const inline = parseInline(lines, start, pageSource);
  const block = parseBlock(lines, start);
  // Whichever shape yields more entries is the page's real shape.
  const useInline = force ? force === "inline" : inline.length >= block.length;
  const chosen = useInline ? inline : block;
  const shape = (useInline ? "inline" : "block") + (force ? "*" : "");
  return { entries: chosen.filter((e) => e.name && e.body.join(" ").trim().length > 20), shape };
}

/* ---------- load what the Codex already has ----------------------------------------------- */

globalThis.window = {};
(0, eval)(fs.readFileSync(path.join(ROOT, "data/index.js"), "utf8"));
const IDX = globalThis.window.PF_INDEX;
const I_ID = 0, I_NAME = 1, I_SLUG = 2, I_RAW = 3;

const bodies = {};
globalThis.window.PF_REG = (slug, map) => { bodies[slug] = map; };
(0, eval)(fs.readFileSync(path.join(ROOT, "data/cat/options.js"), "utf8"));
const OPT_BODIES = bodies.options || {};

const existingIds = new Set(IDX.map((r) => r[I_ID]));
// Dedup is scoped to CATEGORY + name, never name alone. Option names collide constantly across
// unrelated families: "Charm" and "Healing" are cleric domains AND witch hexes, "Familiar" is a
// magus arcanum AND a rogue talent, "Tremorsense" is an evolution AND a druid power. A global
// name test silently dropped 29 genuine options on the first run.
const existingKeys = new Set(
  IDX.map((r) => `${r[I_SLUG]}|${r[I_RAW]}|${r[I_NAME].toLowerCase()}`));

const mintId = (cat, name) =>
  crypto.createHash("sha256").update(`pf1e-codex-option|${cat}|${name}`).digest("hex").slice(0, 16);

/* ---------- read the quarantine ----------------------------------------------------------- */

const found = [];
const rl = readline.createInterface({
  input: fs.createReadStream(QUARANTINE, { encoding: "utf8" }), crlfDelay: Infinity });

for await (const line of rl) {
  if (!line.trim() || !line.includes(".aspx")) continue;
  let d;
  try { d = JSON.parse(line); } catch { continue; }
  const url = d.url || "";
  const rule = pageRule(url);
  if (!rule) continue;
  const pm = /[?&]Path=([^&]+)/i.exec(url);
  found.push({ url, cat: rule[1], cls: rule[2], bucket: rule[3] || "options",
               shape: rule[4] || null,
               path: pm ? decodeURIComponent(pm[1].replace(/\+/g, " ")) : null,
               title: d.title || "", content: d.content || "" });
}

if (!found.length) {
  console.error(`no matching pages found in ${QUARANTINE}`);
  process.exit(1);
}

/* ---------- parse, dedup, mint ------------------------------------------------------------ */

const newRows = [], newBodies = {}, perPage = [];
const seenThisRun = new Set();
let dupExisting = 0, dupInRun = 0;
const dupNames = [];

for (const pg of found.sort((a, b) => a.url.localeCompare(b.url))) {
  const { entries, shape } = parsePage(pg.content, pg.shape);
  let added = 0, skipped = 0;
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (existingKeys.has(`${pg.bucket}|${pg.cat}|${key}`)) { dupExisting++; skipped++; dupNames.push(`${pg.cat}/${e.name}`); continue; }
    if (seenThisRun.has(`${pg.bucket}|${pg.cat}|${key}`)) { dupInRun++; skipped++; continue; }
    seenThisRun.add(`${pg.bucket}|${pg.cat}|${key}`);

    const id = mintId(pg.bucket === "options" ? pg.cat : `${pg.bucket}|${pg.cat}`, e.name);
    if (existingIds.has(id)) { console.error(`ID COLLISION for ${e.name}`); process.exit(1); }
    existingIds.add(id);

    const desc = e.body.join("\n").trim();
    const bookOnly = (e.source || "").replace(/\s*pg\.\s*\d+.*$/, "").trim();
    // Body mirrors the shape the other option entries use: name line, Source line, then prose.
    (newBodies[pg.bucket] ||= {})[id] =
      `${e.name}${e.tags ? " " + e.tags : ""}${e.deity ? " [" + e.deity + "]" : ""}` +
      `\nSource ${e.source}\n${desc}`;
    newRows.push([id, e.name, pg.bucket, pg.cat, e.source, desc.slice(0, 200),
                  { ...(bookOnly ? { bk: bookOnly } : {}), ...(pg.cls ? { cls: pg.cls } : {}),
                    ...(pg.path ? { path: pg.path } : {}),
                    ...(e.deity ? { deity: e.deity } : {}),
                    ...(e.section ? { sec: e.section } : {}) }]);
    added++;
  }
  perPage.push({ url: pg.url.replace("https://www.aonprd.com", ""), cat: pg.cat, cls: pg.cls,
                 shape, parsed: entries.length, added, skipped });
}

/* ---------- report ------------------------------------------------------------------------ */

console.log(`quarantine        : ${QUARANTINE}`);
console.log(`listing pages     : ${found.length}`);
console.log(`entries recovered : ${newRows.length}`);
console.log(`skipped (already in Codex): ${dupExisting}   (duplicate within run): ${dupInRun}`);
// Name-matched skips are the one place this tool can silently drop real content, so list them.
if (dupNames.length) console.log(`  already present: ${dupNames.join(", ")}`);
console.log("");

console.log("  shape   parsed  added  category                url");
for (const p of perPage.sort((a, b) => b.added - a.added))
  console.log(`  ${p.shape.padEnd(6)} ${String(p.parsed).padStart(7)} ${String(p.added).padStart(6)}  ${p.cat.padEnd(22)} ${p.url}`);

const byCat = {};
for (const r of newRows) byCat[r[I_RAW]] = (byCat[r[I_RAW]] || 0) + 1;
console.log("\nnew categories:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(v).padStart(5)}  ${k}`);

if (DUMP) {
  fs.mkdirSync(DUMP, { recursive: true });
  fs.writeFileSync(path.join(DUMP, "new-options.json"), JSON.stringify(newRows, null, 1));
  console.log(`\nwrote ${path.join(DUMP, "new-options.json")}`);
}

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

/* ---------- apply -------------------------------------------------------------------------- */

const idxPath = path.join(ROOT, "data/index.js");
const merged = IDX.concat(newRows);
fs.writeFileSync(idxPath, "window.PF_INDEX=" + JSON.stringify(merged) + ";\n");

for (const [bucket, add] of Object.entries(newBodies)) {
  const p = path.join(ROOT, `data/cat/${bucket}.js`);
  const holder = {};
  globalThis.window.PF_REG = (slug, map) => { holder[slug] = map; };
  (0, eval)(fs.readFileSync(p, "utf8"));
  const merged = Object.assign({}, holder[bucket] || {}, add);
  fs.writeFileSync(p, `window.PF_REG("${bucket}",${JSON.stringify(merged)});\n`);
  console.log(`  data/cat/${bucket}.js  +${Object.keys(add).length} -> ${Object.keys(merged).length} bodies`);
}

// app.js derives every count it DISPLAYS, so this is not load-bearing — but leaving meta.js
// claiming 835 class options when there are 2,548 is a trap for the next person reading the data.
// Sync it to the row counts as part of the same pass.
const metaPath = path.join(ROOT, "data/meta.js");
const metaSrc = fs.readFileSync(metaPath, "utf8");
const metaObj = (0, eval)("(" + metaSrc.replace(/^\s*window\.PF_META\s*=\s*/, "").replace(/;\s*$/, "") + ")");
const realCount = {};
for (const r of merged) realCount[r[I_SLUG]] = (realCount[r[I_SLUG]] || 0) + 1;
let touched = 0;
for (const g of metaObj.groups || [])
  for (const c of g.cats)
    if (realCount[c.slug] != null && c.count !== realCount[c.slug]) { c.count = realCount[c.slug]; touched++; }
metaObj.total = merged.length;
fs.writeFileSync(metaPath, "window.PF_META=" + JSON.stringify(metaObj) + ";\n");

console.log(`\napplied:`);
console.log(`  data/index.js        ${IDX.length} -> ${merged.length} rows`);

console.log(`  data/meta.js         ${touched} category count(s) synced, total -> ${merged.length}`);
console.log(`\nNEXT: regenerate meta counts, re-run derive-body-themes + size-variants + the checks,`);
console.log(`      and bump the three cache tokens.`);
