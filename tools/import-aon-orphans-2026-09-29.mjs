/* Recover AoN entries found missing by a live-site audit (2026-09-29), re-verified against a fresh
 * full rebuild of the raw AoN scrape (D20-style: 49,000 raw pages -> aon_builder.py -> pages.jsonl).
 *
 * THE AUDIT'S OWN FIRST PASS WAS MOSTLY WRONG, AND THAT IS THE STORY WORTH KEEPING. A first sweep
 * across feats/spells/monsters/traits/npcs/classes/deities/items found "298 missing items, 6 feats,
 * 2 deities, 18 rules pages" by comparing AoN's URL `ItemName=`/`Name=` query values against Codex
 * names. Re-verified before importing anything (the owner asked explicitly: make sure this isn't
 * duplicative of the d20pfsrd import), two independent problems were found and both collapsed the
 * count:
 *   1. THE MATCHER WAS WRONG, NOT THE DATA. "Ale (mug)" isn't the item's name — it's the URL's own
 *      disambiguator for one row of a price table whose real title is "Ale". The Codex already has
 *      it. Re-deriving each candidate's REAL on-page name (strip AoN's own pipe-separated category
 *      nav chips, take the first content line) and checking BOTH substring directions against every
 *      existing item name dropped "298 missing" to 1 (of 3,849 unique item pages checked, not just
 *      the original 298). This is why a duplicate check has to compare against the actual content,
 *      not the search key that turned a page up.
 *   2. THE SCRAPE HAD SILENT FALLBACKS. Every one of the 6 "missing" feats and all 18 "missing"
 *      rules pages turned out to be the SAME page, byte for byte (identical content_sha256) — AoN's
 *      generic category-browse page, returned with HTTP 200 for a query string that doesn't resolve
 *      to a real entry, both in the archived scrape AND on the live site checked directly. Not
 *      content that was missed; a URL that was never a real page. Same for 1 of the 2 "missing"
 *      deities (the other, "Nyarlathotep (Haunter of the Dark)", turned out to be a real page but a
 *      DUPLICATE of the "Nyarlathotep" the Codex already has, just via a third URL alias).
 *   Lesson for the next audit: content_sha256 collisions across "different" candidates are the tell
 *   for a silent fallback; check it before trusting an HTTP 200 as "this page exists."
 *
 * What survives, genuinely new and hand-verified against both the Codex and the full d20pfsrd raw
 * archive (zero hits in either): ONE entry.
 *   - Spices (items) — Source Adventurer's Guide pg. 14. Seven named spices (Black Cumin, Flaming
 *     Sumac, Golden Cardamom, Striped Nutmeg, Sunrise Cinnamon, Tiger Cloves, Violet Salt), each
 *     with its own disease/environment-resistance benefit. No single price/slot (a price table, not
 *     one item), so only `bk` is faceted, matching how other multi-variant original rows are faceted.
 *
 * Same id-minting family as tools/import-typed-orphans.mjs ("pf1e-codex-typed|bucket|name") and the
 * same body convention as every other original (AoN-derived) row: no appended license paragraph —
 * the site's blanket AoN attribution already covers it, unlike d20pfsrd rows which carry their own.
 *
 * Usage: node tools/import-aon-orphans-2026-09-29.mjs .            # report only
 *        node tools/import-aon-orphans-2026-09-29.mjs . --apply
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const APPLY = process.argv.includes("--apply");

const mintId = (bucket, name) =>
  crypto.createHash("sha256").update(`pf1e-codex-typed|${bucket}|${name}`).digest("hex").slice(0, 16);

const ENTRIES = [
  {
    bucket: "items", name: "Spices", rawCat: "Items", source: "Adventurer's Guide pg. 14",
    facets: { bk: "Adventurer's Guide" },
    body: "Spices\nSource Adventurer's Guide pg. 14\nPrice 15 gp Black cumin, 20 gp Flaming sumac, 30 gp Golden cardamom, 100 gp Striped nutmeg, 15 gp Sunrise cinnamon, 25 gp Tiger cloves, 5 gp Violet salt; Weight — Black cumin, — Flaming sumac, — Golden cardamom, — Striped nutmeg, — Sunrise cinnamon, — Tiger cloves, — Violet salt\nDescription\nFood spoils more quickly in hot climates, and Qadirans have become experts at using the spices that they trade to help preserve their meals. After importing plants from across the planes, Qadiran druids and alchemists bred and magically adapted unique species with enhanced medicinal properties. Al-Zabriti tribes generally have supplies of the following spices on hand. To gain the benefits of these spices, a character must consume multiple doses over 1 or more days, as indicated for each spice. Once the benefit is gained, continued consumption at that rate maintains the benefit.\n\nBlack Cumin: Cumin is a nutty seasoning used in savory foods. If eaten twice per day for a week, it grants those who consume it a +1 alchemical bonus on Fortitude saves to resist disease for the following 24 hours. An ounce of black cumin sells for 15 gp and seasons 14 meals.\n\nFlaming Sumac: A tart spice, sumac allows a character who contracts a natural disease with multiple effects to suffer one fewer effect (determined randomly) each time he fails a saving throw to resist that disease’s effects. An individual must consume flaming sumac twice per day for at least 3 days to gain its effects, which last for 24 hours after the last dose is consumed. An ounce of flaming sumac sells for 20 gp and seasons six meals.\n\nGolden Cardamom: This fragrant, sweet powder is made from ground cardamom seeds and is often used as a perfume and tooth cleaner, as well as a seasoning in rice dishes and desserts. When a character takes ability damage from a disease, the actual damage taken is reduced by 1 (to a minimum of 0). Golden cardamom has no effect on ability drain or other effects caused by disease. It must be eaten once per day for 9 days to build up sufficiently within an individual’s body to provide this effect. An ounce of golden cardamom seeds sells for 30 gp and seasons nine meals.\n\nStriped Nutmeg: Used for both desserts and meats, nutmeg halves any ability damage (but not ability drain) resulting from non-supernatural disease, to a minimum damage of 1. It must be eaten three times per day for at least 4 days to provide this effect. An ounce of ground striped nutmeg sells for 100 gp and seasons 12 meals.\n\nSunrise Cinnamon: A warming spice, sunrise cinnamon is used for seasoning both sweet and savory foods. It promotes sweating, and a character who ingests it twice per day for 5 days gains a +4 alchemical bonus on Fortitude saves made to resist the effects of hot environments. An ounce of ground sunrise cinnamon sells for 15 gp and seasons 10 meals.\n\nTiger Cloves: Cloves are used in both sweet and savory foods, brewed into teas, and chewed as a breath freshener. When chewed for 1 minute, a dose of tiger cloves removes nauseated or sickened conditions caused by disease or poison effects. When used to season a meal, a dose of tiger cloves grants a +2 alchemical bonus on saving throws to resist the nauseated or sickened conditions for 24 hours after the meal is eaten. A single dose of tiger cloves sells for 25 gp and seasons one meal.\n\nViolet Salt: Salt is of vital importance for retaining a body’s water. If a dose of Qadiran violet salt is consumed as part of a meal, it grants a +4 alchemical bonus on Constitution checks to resist the effects of ongoing thirst for the next 24 hours. A dose of violet salt sells for 5 gp and seasons one meal.",
  },
];

function snippetOf(raw) {
  const lines = String(raw || "").split("\n");
  let i = 0;
  if (lines[i] !== undefined && !/^Source\s/i.test(lines[i])) i++;
  if (lines[i] !== undefined && /^Source\s/i.test(lines[i])) i++;
  return lines.slice(i).join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
}

globalThis.window = {};
(0, eval)(fs.readFileSync(path.join(ROOT, "data/index.js"), "utf8"));
const IDX = globalThis.window.PF_INDEX;
const I_ID = 0, I_NAME = 1, I_SLUG = 2;
const existingIds = new Set(IDX.map((r) => r[I_ID]));
const haveInBucket = {};
const norm = (s) => String(s || "").toLowerCase().replace(/['’]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
for (const r of IDX) (haveInBucket[r[I_SLUG]] ||= new Set()).add(norm(r[I_NAME]));

const newRows = [], newBodies = {};
for (const e of ENTRIES) {
  const key = norm(e.name);
  if ((haveInBucket[e.bucket] || new Set()).has(key)) { console.error(`ALREADY PRESENT: ${e.bucket}/${e.name} — refusing to duplicate`); process.exit(1); }
  const id = mintId(e.bucket, e.name);
  if (existingIds.has(id)) { console.error(`ID COLLISION ${e.bucket}/${e.name}`); process.exit(1); }
  existingIds.add(id);
  newBodies[e.bucket] ||= {};
  newBodies[e.bucket][id] = e.body;
  newRows.push([id, e.name, e.bucket, e.rawCat, e.source, snippetOf(e.body), e.facets]);
}

console.log(`recovering ${newRows.length} entr${newRows.length === 1 ? "y" : "ies"}:`);
for (const r of newRows) console.log(`  [${r[2]}] ${r[1]} — ${r[4]} — ${r[5].slice(0, 90)}…`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

fs.writeFileSync(path.join(ROOT, "data/index.js"), "window.PF_INDEX=" + JSON.stringify(IDX.concat(newRows)) + ";\n");
for (const [bucket, add] of Object.entries(newBodies)) {
  const p = path.join(ROOT, `data/cat/${bucket}.js`);
  const holder = {};
  globalThis.window.PF_REG = (slug, map) => { holder[slug] = map; };
  (0, eval)(fs.readFileSync(p, "utf8"));
  const merged = Object.assign({}, holder[bucket] || {}, add);
  fs.writeFileSync(p, `window.PF_REG("${bucket}",${JSON.stringify(merged)});\n`);
  console.log(`  data/cat/${bucket}.js  +${Object.keys(add).length} bodies -> ${Object.keys(merged).length}`);
}

const metaPath = path.join(ROOT, "data/meta.js");
const metaObj = (0, eval)("(" + fs.readFileSync(metaPath, "utf8").replace(/^\s*window\.PF_META\s*=\s*/, "").replace(/;\s*$/, "") + ")");
const all = IDX.concat(newRows);
const real = {};
for (const r of all) real[r[I_SLUG]] = (real[r[I_SLUG]] || 0) + 1;
for (const g of metaObj.groups || []) for (const c of g.cats) if (real[c.slug] != null) c.count = real[c.slug];
metaObj.total = all.length;
fs.writeFileSync(metaPath, "window.PF_META=" + JSON.stringify(metaObj) + ";\n");
console.log(`\ndata/index.js  ${IDX.length} -> ${all.length} rows`);
