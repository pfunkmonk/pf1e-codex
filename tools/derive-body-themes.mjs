/* Precompute body-motif themes into data/bodythemes.js.
 *
 * The index snippet is ~200 characters — for most spells, just the stat block. The real
 * description lives in data/cat/<bucket>.js and averages 1,458 characters. "Blush of Youth" is a
 * blood ritual worked by a circle of secondary casters, and none of that is visible from the
 * index; from there it is only "necromancy".
 *
 * Those bodies are lazy-loaded, and applyArt runs before loadCat returns, so this cannot happen at
 * runtime without either blocking the render or swapping the picture out from under the reader.
 * Hence a build step: match offline, emit a compact id -> motif map, let the app read it directly.
 *
 * ONLY entries that no snippet-level rule already placed are considered — a body motif must never
 * override an authored category like a subschool.
 *
 * Usage: node tools/derive-body-themes.mjs [repoRoot] [--dry]
 */
import fs from "node:fs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const DRY = process.argv.includes("--dry");

globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/themes.js`, "utf8"));
const IDX = globalThis.window.PF_INDEX;
const ART = new Set(globalThis.window.PF_ART);
const THEMES = globalThis.window.PF_THEMES || {};
const BODY = globalThis.window.PF_BODY_THEMES || {};
const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const NAMED = { feats: "feat-", spells: "spell-", items: "item-" };

/* What text a motif sees, per bucket. Two rules that matter:
 *  - FEATS have the Pathfinder Unchained "Combat Stamina" block appended verbatim to 320 of the
 *    725 stragglers. Left in, it swamps every real signal, so it is cut before matching.
 *  - ITEMS keep their WHOLE body, because the "Category" label sits in the stat header ABOVE the
 *    description. Trimming to the prose would throw away the best signal in the bucket. */
function matchText(bucket, b) {
  let s = String(b || "").replace(/<[^>]+>/g, " ");
  if (bucket === "items") {
    /* Item bodies END with "Construction Requirements", which lists the SPELLS needed to craft the
     * thing — not what it does. Left in, it is actively misleading: Akhentepi's Armor was tagged
     * healing-item because crafting it needs `cure critical wounds`, and three suits of armour were
     * tagged summon-item because they need `summon monster I`. That is a recipe, not an object.
     * The header stays, because the Category label lives there. */
    const cr = s.search(/Construction\s+Requirements/i);
    if (cr > 0) s = s.slice(0, cr);
    return s;
  }
  if (bucket === "feats") {
    const cs = s.search(/Combat Stamina/i);
    if (cs > 0) s = s.slice(0, cs);
    const ben = s.search(/\bBenefit\b/);
    if (ben >= 0) s = s.slice(ben + 7);
    return s;
  }
  // Monsters and traits are matched against the WHOLE body: the monster signal is the Environment
  // line in the stat block, and a trait's body is almost entirely the prose already.
  if (bucket === "monsters" || bucket === "traits") return s;
  const i = s.indexOf("Description");
  return i >= 0 ? s.slice(i + 11) : s;
}

/* Art that already resolves ahead of the body layer, per bucket. A motif must never displace
 * something more specific — and it must not pad the map either, because size-variants would then
 * size the motif sets for entries that never reach them.
 *   MONSTERS: a real portrait, the family art, or the SUBTYPE art. Only the ones that fall through
 *             to a broad type-* set are candidates.
 *   TRAITS:   Race and Religion traits already reuse the actual race and deity art, which beats
 *             any inferred motif outright. */
function resolvesEarlier(bucket, r) {
  const fac = r[6] || {}, nm = artKey(r[1]);
  if (bucket === "monsters") {
    if (["monster-", "race-", "creature-", "type-"].some(p => ART.has(p + nm))) return true;
    return !!(fac.st && ART.has("creature-" + artKey(fac.st)));
  }
  if (bucket === "traits") {
    const m = String(r[5] || "").match(/Requirement\(s\)\s+(.+?)(?:\s*\[|\s+(?:You|Your|A|An|The|Whenever|Once|As)\b|$)/);
    const q = m ? artKey(m[1].trim()) : null;
    if (!q) return false;
    if (fac.cat === "Race" && ART.has("race-" + q)) return true;
    if (fac.cat === "Religion" && ART.has("deity-" + q)) return true;
  }
  return false;
}

const out = {};
let considered = 0, placed = 0;
const perBucket = {};

for (const [bucket, motifs] of Object.entries(BODY)) {
  const bodies = {};
  globalThis.window.PF_REG = (slug, map) => { if (slug === bucket) Object.assign(bodies, map); };
  const catFile = `${ROOT}/data/cat/${bucket}.js`;
  if (!fs.existsSync(catFile)) { console.error(`no body file for ${bucket}`); process.exit(1); }
  (0, eval)(fs.readFileSync(catFile, "utf8"));

  const table = THEMES[bucket] || [];
  const counts = {};
  for (const r of IDX) {
    if (r[2] !== bucket) continue;
    if (NAMED[bucket] && ART.has(NAMED[bucket] + artKey(r[1]))) continue;   // has its own art
    if (resolvesEarlier(bucket, r)) continue;                                // bucket-specific art
    // Anything the snippet rules already place is left alone — authored beats inferred.
    let hit = null;
    for (const t of table) if (t[1] && t[1].test(r[1] || "")) { hit = 1; break; }
    if (!hit) for (const t of table) if (t[2] && t[2].test(r[5] || "")) { hit = 1; break; }
    if (hit) continue;

    considered++;
    const p = matchText(bucket, bodies[r[0]]);
    if (!p) continue;
    for (const [key, re] of motifs) {
      if (!re.test(p)) continue;
      out[r[0]] = key; placed++; counts[key] = (counts[key] || 0) + 1;
      break;
    }
  }
  perBucket[bucket] = counts;
}

console.log(`entries with no snippet-level theme : ${considered}`);
console.log(`placed by body motif                : ${placed} (${(placed / considered * 100).toFixed(0)}%)`);
for (const [bucket, counts] of Object.entries(perBucket)) {
  console.log(`\n${bucket}:`);
  for (const [k, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    const row = BODY[bucket].find(r => r[0] === k);
    const per = Math.ceil(n / (row[2] || 1));
    console.log(`  ${String(n).padStart(4)}  ${k.padEnd(16)} ${row[2]} variant(s) -> ${per} pages each${per > 20 ? "   ** OVER TARGET **" : ""}`);
  }
  const dead = BODY[bucket].filter(r => !counts[r[0]]);
  if (dead.length) console.log(`  DEAD (claims nothing): ${dead.map(r => r[0]).join(", ")}`);
}

/* NPC stat blocks open with race and class — "Halfling commoner 4". The class is by far the best
 * art signal an NPC has, and we already own the class images. Only REAL PC classes are recorded:
 * the NPC classes (commoner, expert, aristocrat, warrior, adept) route through CLASS_INHERIT to
 * rogue/investigator/cavalier/fighter/cleric, which would hand an Accomplished Angler a rogue
 * portrait. Those are left to the role rules, where the name says "angler". */
const PC_CLASS = /\b(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|wizard|alchemist|cavalier|gunslinger|inquisitor|magus|oracle|summoner|witch|antipaladin|brawler|hunter|investigator|shaman|skald|slayer|swashbuckler|warpriest|arcanist|bloodrager|kineticist|medium|mesmerist|occultist|psychic|spiritualist|vigilante|ninja|samurai)\s+\d+/;
const npcClass = {};
{
  const bodies = {};
  globalThis.window.PF_REG = (slug, map) => { if (slug === "npcs") Object.assign(bodies, map); };
  const f = `${ROOT}/data/cat/npcs.js`;
  if (fs.existsSync(f)) {
    (0, eval)(fs.readFileSync(f, "utf8"));
    for (const r of IDX) {
      if (r[2] !== "npcs") continue;
      const m = String(bodies[r[0]] || "").replace(/<[^>]+>/g, " ").match(PC_CLASS);
      if (m && ART.has("class-" + m[1].toLowerCase())) npcClass[r[0]] = m[1].toLowerCase();
    }
  }
  const counts = {};
  for (const c of Object.values(npcClass)) counts[c] = (counts[c] || 0) + 1;
  console.log(`\nnpcs: ${Object.keys(npcClass).length} resolved to an existing class image`);
  console.log("  " + Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => `${k}:${n}`).join("  "));
}

if (DRY) { console.log("\n(dry run — nothing written)"); process.exit(0); }

const lines = [
  "/* GENERATED by tools/derive-body-themes.mjs — do not edit by hand.",
  " * Maps an entry id to a body-motif key from PF_BODY_THEMES in data/themes.js.",
  " * Only entries that no name or stat-block rule could place appear here.",
  " * Re-run the tool after changing a motif regex or after a data refresh. */",
  "window.PF_BODY_THEME = " + JSON.stringify(out) + ";",
  "/* NPC id -> the class named in its stat block, for classes we already have art for. */",
  "window.PF_BODY_CLASS = " + JSON.stringify(npcClass) + ";",
  ""
];
fs.writeFileSync(`${ROOT}/data/bodythemes.js`, lines.join("\n"));
const kb = (fs.statSync(`${ROOT}/data/bodythemes.js`).size / 1024).toFixed(0);
console.log(`\nwrote data/bodythemes.js — ${Object.keys(out).length} entries, ${kb} KB`);
