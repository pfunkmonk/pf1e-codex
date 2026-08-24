/* Every art file that is derived from entry data must be reachable by the app's own
 * artKey rule. A file the resolver can never ask for is dead weight and an invisible bug. */
import fs from "node:fs";
const ROOT = process.argv[2] || ".";
globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/themes.js`, "utf8"));
const present = new Set(globalThis.window.PF_ART);

// must stay identical to artKey() in app.js
const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Must mirror entryArtKey() in app.js. If a rule is added there and not here, this check
// starts crying wolf; if a rule is added here and not there, real dead art goes unnoticed.
const OPTION_ART = { "Wild Talents":"wild-talents","Exploits":"exploits","Bloodlines":"bloodlines","Tricks":"tricks",
  "Blessings":"blessings","Domains":"domains","Mysteries":"mysteries","Phrenic Amplifications":"phrenic",
  "Shifter":"shifter","Stares":"stares","Advanced Weapon Training":"adv-weapon-training","Disciplines":"disciplines",
  "Construct Mods":"construct-mods","Schools":"schools","Spirits":"spirits","Emotional Focus":"emotional-focus",
  "Orders":"orders","Advanced Armor Training":"adv-armor-training","Implement Schools":"implement-schools",
  "Unique Patrons":"unique-patrons" };
// Must stay byte-identical to hash32() in app.js, avalanche included. This copy was missing the
// murmur3 finaliser and so disagreed with the app about which rules-N/npc-N scenes are reachable.
const hash32 = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return h >>> 0;
};
const SLOT_ART = { armor:"armor",weapon:"weapon",shield:"shield",head:"head",helmet:"head",face:"head",mask:"head",
  ears:"head",headband:"headband",brain:"headband",eyes:"eyes",eye:"eyes",goggles:"eyes",neck:"neck",amulet:"neck",
  necklace:"neck",shoulders:"shoulders",shoulder:"shoulders",cloak:"shoulders",mantle:"shoulders",back:"shoulders",
  chest:"chest",body:"body",torso:"body",belt:"belt",waist:"belt",wrist:"wrists",wrists:"wrists",arm:"wrists",
  arms:"wrists",hand:"hands",hands:"hands",gloves:"hands",gauntlet:"hands",feet:"feet",boots:"feet",legs:"feet",
  ring:"ring",held:"held",rod:"held" };
const ITEM_CAT_ART = { Rings:"ring",Rods:"rod",Staves:"staff",Artifacts:"artifact","Cursed Items":"cursed",
  "Intelligent Items":"intelligent","Potions & Oils":"potion",Pharmaceuticals:"potion",Technology:"technology",
  Cybertech:"technology","Psi-Tech":"technology" };

const reach = new Set();
for (const r of globalThis.window.PF_INDEX) {
  const b = r[2], f = r[6] || {}, nm = artKey(r[1]);
  if (b === "spells")  reach.add("spell-" + nm);
  if (b === "races")   reach.add("race-" + nm);
  if (b === "classes") reach.add("class-" + nm);
  if (b === "deities") reach.add("deity-" + nm);
  if (b === "traits" && f.cat) reach.add("trait-" + artKey(f.cat));
  if (b === "feats") { reach.add("feat-" + nm); if (f.t) reach.add("feat-" + artKey(f.t)); }
  if (b === "items") {
    reach.add("item-" + nm);                                   // named artifacts
    const slot = String(f.slot || "").toLowerCase();
    if (SLOT_ART[slot]) reach.add("item-" + SLOT_ART[slot]);   // wondrous, by body slot
    if (ITEM_CAT_ART[r[3]]) reach.add("item-" + ITEM_CAT_ART[r[3]]);
    if (r[3] === "Wondrous Items") reach.add("item-wondrous");
    reach.add("item-generalstore");
  }
  if (b === "options" && OPTION_ART[r[3]]) reach.add("opt-" + OPTION_ART[r[3]]);
  if (b === "hazards") reach.add("hazard-" + artKey(r[3] || ""));
  if (b === "rules") reach.add("rules-" + (hash32(r[0]) % 40 + 1));
  if (b === "npcs")  reach.add("npc-" + (hash32(r[0]) % 12 + 1));
  if (b === "monsters") {
    reach.add("monster-" + nm);
    if (f.st) reach.add("creature-" + artKey(f.st));
    // monsters try a same-named race portrait first — this is how race-lizardfolk earns its
    // keep despite there being no Lizardfolk *race* entry
    reach.add("race-" + nm);
  }
}
// Theme art: every declared theme key x variant is reachable, plus the straggler scene set.
// Enumerated from data/themes.js rather than re-implementing the matcher — check-themes.mjs is
// what proves each theme actually claims entries, so these two checks together cover both
// directions (art with no route in, and routes with no art).
{
  const t = globalThis.window.PF_THEMES || {}, fb = globalThis.window.PF_THEME_FALLBACK || {};
  for (const [bucket, table] of Object.entries(t))
    for (const row of table)
      for (let v = 1; v <= (row[3] || 1); v++) reach.add(`theme-${bucket}-${row[0]}-${v}`);
  /* Every VARIETY set, from the single declaration in themes.js. This used to read
   * PF_THEME_FALLBACK as {key, scenes} objects; those became plain set NAMES when the counts
   * moved into PF_VARIETY, so it silently enumerated nothing and reported 813 live images as
   * unreachable the moment they landed on disk. Identical bug to the one ingest-art carried --
   * which is exactly the four-copies drift HANDOFF warns about. */
  const V = globalThis.window.PF_VARIETY || {};
  for (const [name, count] of Object.entries(V))
    for (let v = 1; v <= count; v++) reach.add(`${name}-${v}`);
  // Body motifs share the theme namespace but are declared separately; a row with a 4th field
  // REUSES an existing key and owns none of its own.
  const B = globalThis.window.PF_BODY_THEMES || {};
  for (const [bucket, table] of Object.entries(B))
    for (const row of table) {
      if (row[3]) continue;
      for (let v = 1; v <= (row[2] || 1); v++) reach.add(`theme-${bucket}-${row[0]}-${v}`);
    }
  void fb;
}
const fixedPrefixes = ["cat-", "school-", "tool-", "page-", "type-", "home-", "misc-", "deities-",
  "item-weapon-", "item-armorset-", "item-wondrous", "item-generalstore"];
const orphans = [...present].filter(k => !reach.has(k) && !fixedPrefixes.some(p => k.startsWith(p)));
console.log(`art files: ${present.size}`);
console.log(`unreachable from entry data: ${orphans.length}`);
if (orphans.length) console.log("   " + orphans.join(", "));
else console.log("   none — every entry-derived key resolves");
