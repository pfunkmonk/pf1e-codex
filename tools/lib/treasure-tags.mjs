/* Treasure tags: which kinds of item belong in which kinds of creature's treasure.
 *
 * Pure: reads the Codex data (loadCodex) plus the committed judgment file and returns the tag tables; touches nothing on disk. tools/lib/api-build.mjs publishes the result as
 * /api/v1/treasure*.json for the generators (Compendium, Character Generator) to filter on.
 *
 * TWO LAYERS, deliberately kept apart so a consumer can use just the first:
 *
 *   LAYER 1 - PAIZO'S OWN SYSTEM (Ultimate Equipment, "Random Treasure", the creature-type treasure step). A creature gets a BUDGET WORD from its stat block
 *   (none / incidental x0.5 / standard / double / triple / NPC gear) and a set of TREASURE TYPES (letters A-I) from its creature type; each letter says what KIND of
 *   thing that treasure is made of. We carry that over exactly, and add the one missing half: which letters each ITEM belongs to.
 *
 *   LAYER 2 - OUR EXPANSION (the "a bear has no use for a ladder" layer). Paizo's letters stop at "what kind of thing"; they do not say whether a creature could
 *   HAVE it. So we add four ROUTES by which an item reaches a creature - carried (it uses it), hoard (it collects it), victim (left behind by something it killed),
 *   placed (a set piece, not loot) - plus portability, handling, durability, sizing, and THEMES (nautical, fire, undead, tribal...) matched to the creature's habitat,
 *   culture, element and ethos.
 *
 * Every tag is a namespaced string ("class:weapon", "route:victim", "theme:nautical") so a consumer can filter with a plain includes(). The vocabulary - what each tag
 * means, which layer it comes from, and which CREATURE tags attract each THEME - is published beside the data (treasure.json) so nothing has to be guessed.
 *
 * DETERMINISM: no clock, no randomness; sorting is by code unit. A re-run over unchanged data is byte-identical.
 * JUDGMENTS: themes the keyword rules cannot settle were decided by reading the entries (tools/treasure/judgments.json, keyed by entry id); see HANDOFF.md.
 */
import fs from "node:fs";
import path from "node:path";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const uniq = (a) => [...new Set(a)].sort(cmp);

/* =========================== LAYER 1: PAIZO'S TABLES (verbatim from Ultimate Equipment) ================================ */
export const BUDGET_WORDS = {
  none: { multiplier: 0, paizo: "No treasure. The value can be saved for a later encounter." },
  incidental: { multiplier: 0.5, paizo: "Little if any treasure: reduce the base value by 50%." },
  standard: { multiplier: 1, paizo: "The normal amount of treasure: no change to the base value." },
  double: { multiplier: 2, paizo: "More than average treasure: double the base value." },
  triple: { multiplier: 3, paizo: "A large amount of treasure: triple the base value." },
  "npc-gear": { multiplier: null, paizo: "Discard the base value; look the creature up individually on the NPC Gear table." },
};

export const LETTERS = {
  A: "Coins", B: "Coins and gems", C: "Art objects", D: "Coins and small objects (potions, rings, scrolls, wands)", E: "Armor and weapons",
  F: "Combatant gear (armor, coins, potions, weapons, wondrous items)", G: "Spellcaster gear (coins, potions, scrolls, staves, wands, wondrous items)",
  H: "Lair treasure (a wide mix, with many magic items and coins)", I: "Treasure hoard (virtually any item, usually for major encounters)",
};

// Creature type -> treasure types, exactly as the appendix lists them. `conditional` letters are added when the stated condition holds.
export const TYPE_LETTERS = {
  aberration: { letters: "ABDE", conditional: [{ when: "cunning", add: "FGH" }] },
  animal: { letters: "ABDE", note: "Treasure is usually left in lairs, not carried." },
  construct: { letters: "EF", conditional: [{ when: "guarding", add: "BCH" }] },
  dragon: { letters: "ABCHI" },
  fey: { letters: "BCDG" },
  humanoid: { letters: "ABDEFG", conditional: [{ when: "community", add: "H" }] },
  "magical beast": { letters: "ABDE" },
  "monstrous humanoid": { letters: "ABCDEH" },
  ooze: { letters: "ABD", note: "Any treasure is accidental." },
  outsider: { letters: "", note: "Any type; the GM chooses by creature. Expanded here by whether it can use items." },
  plant: { letters: "ABDE" },
  undead: { letters: "ABDE", conditional: [{ when: "intelligent", add: "FG" }] },
  vermin: { letters: "ABD" },
};

/* ================================ LAYER 2: OUR EXPANSION - VOCABULARY ================================================== */
export const ROUTES = {
  carried: "On the creature's person and used by it: needs hands (or a body the item fits) and a mind able to use it.",
  hoard: "Collected and kept in a lair: portable, valuable or magical things a creature would gather and guard.",
  victim: "Left behind by whatever it killed or robbed: durable, portable gear an adventurer or traveller would carry. A bear can have this; it cannot use it.",
  placed: "A set piece (vehicle, siege engine, altar, mount, service) - scenery or a GM placement, never random loot.",
  unique: "An artifact or one-of-a-kind item: GM-placed, never rolled.",
};

export const MIND = {
  mindless: "Int shown as - (zombies, oozes, many constructs and vermin)",
  animal: "Int 1-2: instinct only",
  dim: "Int 3-7: can learn simple tool use",
  average: "Int 8-12",
  sharp: "Int 13-17",
  genius: "Int 18+",
};

export const BULK = {
  pocket: "up to 1 lb", carry: "up to 25 lb", haul: "up to 100 lb (a strong creature, not a quick one)", fixed: "over 100 lb, or a vehicle/siege engine/structure",
};

// Each THEME lists the CREATURE tags that attract it, so a generator can weight a creature's pile toward its own nature. Order within a list does not matter.
export const THEMES = {
  nautical: { label: "Sea, ships, rivers and lakes", attractedBy: ["habitat:aquatic", "habitat:coastal", "subtype:aquatic", "subtype:water", "culture:pirate"] },
  subterranean: { label: "Mines, caves, the underworld", attractedBy: ["habitat:underground", "culture:dwarf", "culture:underfolk", "subtype:earth"] },
  wilderness: { label: "Hunting, forests, survival", attractedBy: ["habitat:forest", "habitat:plains", "habitat:hills", "type:animal", "type:magical beast", "type:plant", "type:fey"] },
  desert: { label: "Sand, sun and nomads", attractedBy: ["habitat:desert"] },
  swamp: { label: "Marsh, rot and bog", attractedBy: ["habitat:swamp"] },
  mountain: { label: "Peaks, crags and high places", attractedBy: ["habitat:mountain", "habitat:hills", "culture:giant"] },
  cold: { label: "Ice, frost and winter", attractedBy: ["habitat:cold", "subtype:cold", "element:cold"] },
  fire: { label: "Flame, forge and heat", attractedBy: ["subtype:fire", "element:fire", "habitat:plane-fire"] },
  earth: { label: "Stone, metal and gemstone", attractedBy: ["subtype:earth", "element:earth"] },
  air: { label: "Wind, sky and storm", attractedBy: ["subtype:air", "element:air", "habitat:plane-air"] },
  urban: { label: "Cities, markets, civilised life", attractedBy: ["habitat:urban", "culture:human"] },
  martial: { label: "Soldiers, warriors and war", attractedBy: ["style:martial", "culture:orc", "culture:goblinoid", "culture:giant", "culture:human"] },
  criminal: { label: "Thieves, assassins, contraband", attractedBy: ["culture:criminal", "culture:goblinoid", "culture:pirate", "culture:human"] },
  scholarly: { label: "Books, study, lore", attractedBy: ["style:caster", "mind:genius", "type:aberration", "type:dragon"] },
  religious: { label: "Worship, ritual and holy symbols", attractedBy: ["style:caster", "type:outsider", "type:undead", "culture:human"] },
  noble: { label: "Wealth, jewels, regal luxury", attractedBy: ["flag:hoarder", "type:dragon", "culture:giant", "culture:human"] },
  tribal: { label: "Crude, savage, barbarian craft", attractedBy: ["culture:orc", "culture:goblinoid", "culture:giant", "culture:gnoll", "culture:kobold", "culture:troglodyte"] },
  draconic: { label: "Dragons and their kin", attractedBy: ["type:dragon", "culture:kobold", "culture:reptilian"] },
  fey: { label: "Fairy, dream and glamer", attractedBy: ["type:fey", "habitat:forest"] },
  necromantic: { label: "Death, graves and the undead", attractedBy: ["type:undead", "ethos:unholy"] },
  planar: { label: "Other planes and their natives", attractedBy: ["type:outsider", "subtype:extraplanar", "habitat:planar"] },
  psionic: { label: "Psychic and mind powers", attractedBy: ["subtype:psionic", "type:aberration"] },
  venom: { label: "Poison, venom and alchemy", attractedBy: ["culture:criminal", "type:vermin", "culture:drow"] },
  construct: { label: "Clockwork, golems, machines", attractedBy: ["type:construct", "subtype:clockwork"] },
  arcane: { label: "Arcane magic and its tools", attractedBy: ["style:caster"] },
  divine: { label: "Divine magic and its tools", attractedBy: ["style:caster", "type:outsider"] },
  musical: { label: "Instruments, song and performance", attractedBy: ["type:fey", "culture:human"] },
  firearm: { label: "Gunpowder and gunsmithing", attractedBy: ["culture:human", "culture:pirate"] },
  "giant-scale": { label: "Made for Large-and-bigger wielders", attractedBy: ["culture:giant", "size:Large", "size:Huge", "size:Gargantuan", "size:Colossal"] },
};
export const ETHOS = { holy: "Good-aligned or sacred", unholy: "Evil-aligned or profane", lawful: "Lawful-aligned or axiomatic", chaotic: "Chaotic-aligned or anarchic" };

export const ITEM_CLASSES = uniq(["weapon", "armor", "shield", "enchantment", "ring", "rod", "staff", "wand", "potion", "scroll", "wondrous", "artifact", "intelligent", "gear", "tool", "kit", "clothing",
  "food", "herb", "alchemical", "contraband", "focus", "entertainment", "animal-gear", "mount", "vehicle", "siege", "structure", "service", "technology", "drug", "trade-good", "other"]);

/* ======================================== ITEM PARSING ================================================================= */
const toGp = (n, unit) => n * ({ pp: 10, gp: 1, sp: 0.1, cp: 0.01 }[unit] || 1);
const num = (s) => Number(String(s).replace(/,/g, ""));

export function parsePrice(body, facetPr) {
  if (typeof facetPr === "number") return { gp: facetPr, bonus: null };
  const bm = /Price\s+\+(\d+)\s+bonus/i.exec(body);
  if (bm) return { gp: null, bonus: Number(bm[1]) };
  const m = /Price\s+([\d,]+(?:\.\d+)?)(?:\s*[-–]\s*[\d,]+(?:\.\d+)?)?\s*(pp|gp|sp|cp)\b/i.exec(body);     // a range ("10-50 gp") takes its low end
  return m ? { gp: toGp(num(m[1]), m[2].toLowerCase()), bonus: null } : { gp: null, bonus: null };
}

export function parseWeight(body) {
  const m = /Weight\s+((?:\d[\d,]*)(?:\.\d+)?(?:[-\s]\d+\/\d+|\/\d+)?)\s*(lbs?|pounds?|oz|ounces?)\b/i.exec(body);
  if (!m) return null;
  let t = m[1].replace(/,/g, "").trim(), v;
  const mixed = /^(\d+)[-\s](\d+)\/(\d+)$/.exec(t);
  if (mixed) v = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  else if (/^\d+\/\d+$/.test(t)) { const [a, b] = t.split("/"); v = Number(a) / Number(b); }
  else v = Number(t);
  if (!Number.isFinite(v)) return null;
  return /^o/i.test(m[2]) ? v / 16 : v;
}

const SLOT_MAP = {
  armor: "armor", shield: "shield", belt: "belt", waist: "belt", body: "body", torso: "body", chest: "chest", eyes: "eyes", goggles: "eyes", feet: "feet", boots: "feet",
  hands: "hands", hand: "hands", gloves: "hands", head: "head", helmet: "head", headband: "headband", neck: "neck", necklace: "neck", amulet: "neck", ring: "ring",
  shoulders: "shoulders", shoulder: "shoulders", cloak: "shoulders", mantle: "shoulders", back: "shoulders", wrists: "wrists", wrist: "wrists", face: "face", mask: "face",
};
export function slotOf(body, facetSlot) {
  const raw = (facetSlot || (/Slot\s+([A-Za-z]+)/.exec(body) || [])[1] || "").toLowerCase();
  if (!raw || raw === "none" || raw === "see" || raw === "special" || raw === "weapon") return null;
  return SLOT_MAP[raw] || null;
}

const CATEGORY_CLASS = {
  "adventuring gear": "gear", "alchemical tools": "alchemical", "alchemical weapons": "alchemical", "alchemical remedies": "alchemical", "mounts/pets": "mount", tools: "tool", kits: "kit",
  clothing: "clothing", "food/drink": "food", "animal gear": "animal-gear", "black market": "contraband", entertainment: "entertainment", herbs: "herb", "channel foci": "focus",
  tincture: "alchemical", concoctions: "alchemical", "transport, sea": "vehicle", "transport, land": "vehicle", "transport, air": "vehicle", "lodging/services": "service",
  "torture implements": "tool", "dungeon guides": "other", dragoncraft: "other",
};
const NAME_RULES = [
  ["siege", /\b(catapult|ballista|trebuchet|battering ram|mangonel|bombard|cannon|siege tower|arbalest\b.*siege)\b/i],
  ["vehicle", /\b(ship|boat|galley|longship|carriage|wagon|cart|sled|chariot|raft|barge|airship|schooner|sloop|brig|ferry|canoe|dinghy|caravel|galleon|cutter|clipper)\b/i],
  ["structure", /\b(altar|throne|shrine|fountain|statue|obelisk|fortress|keep|tower|bridge|monument)\b/i],
  ["service", /\b(lodging|per day|per week|per month|passage|toll|messenger|hireling|bribe|fee\b|funeral|healing service|spellcasting service|rent)\b/i],
  ["mount", /\b(horse|pony|mule|donkey|camel|elephant|warhorse|riding dog|destrier|palfrey|steed)\b/i],
  ["food", /\b(ration|ale|wine|beer|bread|meat|cheese|stew|feast|meal|mead|brandy|whiskey|cider|tea\b|coffee|fruit|spice|sugar|salt\b|honey|jerky)\b/i],
  ["clothing", /\b(robe|cloak|coat|boots|shirt|dress|gown|hat\b|cap\b|sandals|tunic|kimono|vestments|outfit|scarf|gloves|belt\b|mittens)\b/i],
  ["alchemical", /\b(alchemical|acid\b|antitoxin|tanglefoot|thunderstone|smokestick|sunrod|tindertwig|alchemist's fire|salve|elixir|tonic)\b/i],
  ["tool", /\b(tools?\b|kit\b|lock\b|pick\b|hammer|crowbar|shovel|spade|saw\b|chisel|lantern|torch|rope\b|chain\b|grappling|manacles?|crampons|piton|net\b|trap\b)\b/i],
];
const PERISHABLE_RE = /\b(scroll|potion|oil\b|elixir|incense|ration|ale\b|wine|beer|bread|meat|cheese|stew|feast|meal|fruit|herb|tincture|salve|ointment|perfume|powder|dust\b|ink\b|flower|seed|spore|mushroom|poison|venom|drug|food)\b/i;

/** Class of an item from its category bucket, the Category line in its body, then its name. First rule that fires wins; "other" is a measured, reported residue. */
export function classOf(row, body) {
  const cat = row[3];
  const sub = ((/^Category\s+(.+)$/m.exec(body) || [])[1] || "").toLowerCase();
  const name = row[1];
  const price = parsePrice(body, (row[6] || {}).pr);
  const magical = /\bAura\b/.test(body) || /\bCL\s+\d/.test(body);
  if (cat === "Rings") return "ring";
  if (cat === "Rods") return "rod";
  if (cat === "Staves") return "staff";
  if (cat === "Wondrous Items" || cat === "Magic Equipment") return "wondrous";
  if (cat === "Artifacts") return "artifact";
  if (cat === "Intelligent Items") return "intelligent";
  if (cat === "Potions & Oils") return "potion";
  if (cat === "Pharmaceuticals") return "drug";
  if (cat === "Technology" || cat === "Cybertech" || cat === "Psi-Tech") return "technology";
  if (cat === "Altars" || cat === "Thrones") return "structure";
  if (cat === "Favors") return "service";
  if (cat === "Cursed Items") {
    if (/\bpotion\b/i.test(name)) return "potion";
    if (/\bscroll\b/i.test(name)) return "scroll";
    if (/\bwand\b/i.test(name)) return "wand";
    return CURSED_BY_BODY(body);
  }
  if (cat === "Weapons") {
    if (/siege engine/i.test(sub) || /close assault|direct-fire|indirect-fire|siege/i.test(sub)) return "siege";
    if (price.bonus != null) return "enchantment";
    if (/^ladder, escalade/i.test(name)) return "siege";
    return "weapon";
  }
  if (cat === "Armor") {
    if (price.bonus != null) return "enchantment";
    return slotOf(body, (row[6] || {}).slot) === "shield" || /\b(shield|buckler|targe)\b/i.test(name) ? "shield" : "armor";
  }
  if (CATEGORY_CLASS[sub]) return CATEGORY_CLASS[sub];
  if (/proficiency/i.test(sub)) return "weapon";
  if (/\((?:1 lb\.?|1 ton|1 sq\. ?yd\.?|1 gallon|1 oz\.?|1 cask|1 bushel)\)\s*$/i.test(name) && cat !== "Cursed Items") return "trade-good";     // the Core "Trade Goods" table: spices, metals, cloth by the pound
  for (const [c, re] of NAME_RULES) if (re.test(name)) return c;
  if (cat === "Equipment" || cat === "Miscellaneous") return magical ? "wondrous" : "gear";
  if (cat === "Additional Material (d20pfsrd)") return magical ? "wondrous" : "other";
  return "other";
}
function CURSED_BY_BODY(body) {
  const s = (/Slot\s+([A-Za-z]+)/.exec(body) || [])[1];
  if (/\bsword|axe|spear|dagger|bow|mace|blade\b/i.test(body.slice(0, 600))) return "weapon";
  return s ? "wondrous" : "wondrous";
}

const ENCHANT_FOR = (row, body) => (row[3] === "Armor" ? "armor" : "weapon");

/* ---- magic / role / ethos ---- */
export function magicOf(cls, row, body, price) {
  if (cls === "artifact") return "artifact";
  if (["ring", "rod", "staff", "wand", "potion", "scroll", "wondrous", "intelligent", "enchantment"].includes(cls)) return "magic";
  if (row[3] === "Cursed Items") return "magic";
  if ((cls === "weapon" || cls === "armor" || cls === "shield") && (/\bAura\b/.test(body) || /\bCL\s+\d/.test(body) || /^\+\d/.test(row[1]))) return "magic";
  return "mundane";
}

const stripConstruction = (b) => b.replace(/\n\s*Construction[\s\S]*$/i, "").replace(/\bCraft (?:Wondrous Item|Magic Arms and Armor|Rod|Staff|Ring|Wand|Construct)[^\n]*/gi, "");
const CASTER_RE = /\b(spells?|caster levels?|metamagic|arcane|divine|spellbook|wizards?|sorcerers?|clerics?|druids?|bards?|witch(?:es)?|oracles?|magus|spell-like|spell slots?|concentration|prepared|cantrips?|channel (?:positive|negative) energy|familiar|summon)\b/gi;
const COMBAT_RE = /\b(attack rolls?|damage rolls?|armor class|\bAC\b|critical|initiative|combat|melee|ranged|weapons?|armors?|shields?|fighters?|barbarians?|rangers?|paladins?|bonus on (?:attack|damage)|natural armor|deflection bonus|hit points|rage|smite)\b/gi;
export function roleOf(body) {
  const b = stripConstruction(body);
  const c = (b.match(CASTER_RE) || []).length, f = (b.match(COMBAT_RE) || []).length;
  if (c >= 2 && f >= 2) return "both";
  if (c >= 2 && f < 2) return "caster";
  if (f >= 2 && c < 2) return "combat";
  return "utility";
}

export function ethosOf(row, body) {
  const out = [];
  const name = row[1].toLowerCase();
  const aura = (/^Aura\s.*$/m.exec(body) || [""])[0].toLowerCase();
  const text = (name + " " + stripConstruction(body).toLowerCase().slice(0, 1200));
  if (/\[evil\]|\bevil\b|\bunholy\b|\bvile\b|\bprofane\b|\bdemonic\b|\binfernal\b|\bdiabolic|\bblasphem/.test(aura + " " + name) || /\b(unholy|vile|profane|infernal|demonic)\b/.test(text)) out.push("unholy");
  if (/\[good\]|\bholy\b|\bsacred\b|\bangelic\b|\bcelestial\b|\bblessed\b|\bhallowed\b/.test(aura + " " + name) || /\b(holy symbol of|holy avenger|holy water|sacred)\b/.test(text)) out.push("holy");
  if (/\[lawful\]|\baxiomatic\b|\blawful\b/.test(aura + " " + name)) out.push("lawful");
  if (/\[chaotic\]|\banarchic\b|\bchaotic\b/.test(aura + " " + name)) out.push("chaotic");
  return uniq(out);
}

/* ---- theme keywords: NAME hits are strong (3), BODY hits count 1 each (distinct words), threshold 3. Strong words alone are enough. ---- */
const LEX = {
  nautical: ["sea", "ocean", "ship", "sailor", "pirate", "naval", "anchor", "kraken", "mermaid", "merfolk", "sahuagin", "boat", "underwater", "aquatic", "fisher", "fishing", "harpoon", "trident", "coral", "pearl", "tide", "wave", "buccaneer", "seafarer", "mariner", "deck", "rigging", "triton"],
  subterranean: ["mine", "miner", "mining", "cavern", "cave", "subterranean", "tunnel", "underdark", "delve", "pickaxe", "dwarf", "dwarven", "duergar", "stone", "crystal", "lantern", "darkvision"],
  wilderness: ["hunter", "hunting", "forest", "woodland", "ranger", "trapper", "druid", "survival", "tracking", "camp", "wilderness", "beast", "antler", "pelt", "fur", "bow", "arrow", "quiver", "snare", "natural", "grove"],
  desert: ["desert", "sand", "dune", "oasis", "nomad", "scorching", "mirage", "sandstorm", "scorpion", "sun-baked", "caravan"],
  swamp: ["swamp", "marsh", "bog", "mire", "fen", "rot", "mud", "fungus", "slime", "moss"],
  mountain: ["mountain", "peak", "crag", "cliff", "climb", "climbing", "alpine", "avalanche", "highland"],
  cold: ["ice", "frost", "snow", "cold", "glacier", "winter", "rime", "frozen", "freezing", "arctic", "blizzard", "frigid"],
  fire: ["fire", "flame", "flaming", "burning", "forge", "ember", "inferno", "scorch", "lava", "magma", "ash", "smoke", "brimstone", "salamander", "efreeti"],
  earth: ["earth", "stone", "rock", "boulder", "granite", "gem", "gemstone", "ore", "mineral", "adamantine", "obsidian", "marble", "clay"],
  air: ["wind", "storm", "lightning", "thunder", "cloud", "sky", "flight", "wing", "feather", "gale", "tempest", "air"],
  urban: ["city", "guild", "merchant", "market", "tavern", "street", "theater", "urban", "bazaar", "shop", "town", "trade", "courtier"],
  martial: ["soldier", "army", "battle", "legion", "knight", "warrior", "war", "battlefield", "commander", "mercenary", "gladiator", "arena", "military", "banner", "siege"],
  criminal: ["thief", "thieves", "assassin", "smuggler", "burglar", "lockpick", "lock pick", "rogue", "stealth", "cutpurse", "poison", "dagger", "forger", "fence", "guild of thieves", "disguise", "sneak"],
  scholarly: ["book", "scholar", "library", "ink", "study", "sage", "knowledge", "research", "lore", "tome", "scroll", "spellbook", "librarian", "scribe", "archive", "manuscript", "academic"],
  religious: ["holy symbol", "priest", "temple", "deity", "shrine", "ritual", "worship", "divine", "prayer", "religious", "cleric", "paladin", "inquisitor", "sacred", "altar", "relic", "faith", "cult", "censer"],
  noble: ["jewel", "jeweled", "silk", "gilded", "royal", "crown", "regal", "noble", "courtly", "gold", "platinum", "diamond", "ruby", "emerald", "sapphire", "luxur", "ornate", "bejeweled", "scepter", "throne", "heirloom"],
  tribal: ["crude", "savage", "tribal", "barbarian", "bone", "totem", "tooth", "tusk", "primitive", "shaman", "orc", "goblin", "ogre", "hide", "ritual scars"],
  draconic: ["dragon", "wyrm", "drake", "draconic", "dragonscale", "dragonhide", "kobold", "breath weapon", "scale"],
  fey: ["fey", "fairy", "pixie", "sylvan", "glamer", "dream", "nymph", "sprite", "satyr", "unseelie", "seelie", "feywild", "whimsical", "faerie"],
  necromantic: ["undead", "grave", "death", "corpse", "soul", "necromancer", "necromantic", "tomb", "skull", "ghost", "ghoul", "vampire", "lich", "coffin", "crypt", "skeleton", "zombie", "negative energy", "bone", "mortuary"],
  planar: ["planar", "outsider", "demon", "devil", "angel", "abyss", "hell", "celestial", "infernal", "extraplanar", "plane", "astral", "ethereal", "daemon", "archon", "azata", "qlippoth", "genie", "elemental plane"],
  psionic: ["psionic", "power points", "psychic", "psion", "mind", "telepathy", "telepathic", "occultist", "mesmerist", "spiritualist", "phrenic", "psychometabolism"],
  venom: ["poison", "venom", "venomous", "toxin", "antitoxin", "alchemist", "alchemical", "viper", "spider", "toxic", "drow poison", "envenom"],
  construct: ["clockwork", "construct", "golem", "mechanical", "gear", "automaton", "animated", "cog", "steam", "windup", "homunculus"],
  arcane: ["arcane", "wizard", "sorcerer", "spellbook", "magus", "witch", "metamagic", "familiar", "evocation", "conjuration", "abjuration", "illusion", "transmutation", "enchantment", "necromancy", "divination"],
  divine: ["divine", "cleric", "priest", "oracle", "inquisitor", "warpriest", "channel energy", "holy", "deity", "domain", "blessing"],
  musical: ["instrument", "song", "bardic", "lute", "harp", "flute", "drum", "lyre", "fiddle", "horn", "bagpipes", "minstrel", "performance", "melody", "music"],
  firearm: ["firearm", "gunpowder", "pistol", "musket", "rifle", "bullet", "black powder", "gunslinger", "cannon", "grit", "gunsmith", "powder horn"],
  "giant-scale": ["giant", "ogre", "titan", "troll", "gargantuan", "colossal", "huge", "jotun"],
};
// A theme that these keywords can only support when the NAME itself says it (short words that appear everywhere in rules text).
const WEAK = new Set(["air", "ash", "bone", "gear", "gold", "hide", "horn", "ice", "mind", "natural", "rot", "scale", "sea", "smoke", "stone", "trade", "war", "wave", "wing", "bow", "deck", "dwarf", "fire", "cold", "earth", "poison", "holy", "divine", "arcane", "elemental plane", "giant", "huge", "crystal", "fur", "rock", "shop", "town", "mud", "moss", "slime", "ink", "book", "mine", "sky", "cloud", "storm", "wind", "drum", "flight", "feather", "stealth", "rogue", "lantern", "camp", "climb", "death", "soul", "plane", "demon", "devil", "angel", "hell"]);

const wordRe = {};
const rxFor = (w) => (wordRe[w] ||= new RegExp("(?:^|[^a-z])" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:s|es|ed|ing)?(?![a-z])", "i"));

export function themeScores(row, body) {
  const name = row[1];
  const text = stripConstruction(body).slice(0, 2500);
  const out = {};
  for (const [theme, words] of Object.entries(LEX)) {
    let s = 0;
    for (const w of words) {
      const inName = rxFor(w).test(name);
      if (inName) s += WEAK.has(w) ? 2 : 3;
      else if (rxFor(w).test(text)) s += WEAK.has(w) ? 0.5 : 1;
    }
    if (s >= 3) out[theme] = s;
  }
  return out;
}

/* ===================================== BUILD THE ITEM TABLE ============================================================ */
const bulkOf = (cls, wt) => {
  if (["vehicle", "siege", "structure", "mount", "service"].includes(cls)) return "fixed";
  if (wt == null) return ["weapon", "armor", "shield"].includes(cls) ? "carry" : "pocket";
  return wt <= 1 ? "pocket" : wt <= 25 ? "carry" : wt <= 100 ? "haul" : "fixed";
};
const handlingOf = (cls, slot) => {
  if (["weapon", "shield", "staff", "rod", "wand", "siege", "enchantment"].includes(cls)) return "wield";
  if (["armor", "ring", "clothing"].includes(cls)) return "wear";
  if (cls === "wondrous") return slot ? "wear" : "use";
  if (["potion", "food", "herb", "drug", "alchemical", "scroll"].includes(cls)) return "consume";
  if (["gear", "tool", "kit", "focus", "entertainment", "contraband", "intelligent", "technology", "artifact", "other"].includes(cls)) return "use";
  return "none";
};
const valueBand = (gp, bonus) => (bonus != null ? "bonus" : gp == null ? "unpriced" : gp < 10 ? "lt10" : gp < 100 ? "10-99" : gp < 1000 ? "100-999" : gp < 5000 ? "1k-4999" : gp < 10000 ? "5k-9999" : gp < 50000 ? "10k-49999" : "50k+");

export function lettersOf(cls, magic, bulk, role, gp) {
  const L = [];
  if (bulk === "fixed" || cls === "service" || cls === "mount") return L;
  if (cls === "artifact") return ["I"];
  const valued = magic !== "mundane" || (gp != null && gp >= 25);
  if (["ring", "potion", "scroll", "wand"].includes(cls)) L.push("D");
  if (["weapon", "armor", "shield", "enchantment"].includes(cls)) L.push("E");
  if (["weapon", "armor", "shield", "potion", "enchantment"].includes(cls)) L.push("F");
  if (["potion", "scroll", "staff", "wand"].includes(cls)) L.push("G");
  if (["wondrous", "rod", "intelligent", "ring", "technology"].includes(cls)) {
    if (role === "combat" || role === "both" || role === "utility") L.push("F");
    if (role === "caster" || role === "both" || role === "utility") L.push("G");
  }
  if (valued) L.push("H", "I");
  return uniq(L);
}

export function buildItems(d, judgments) {
  const J = (judgments && judgments.items) || {};
  const items = [];
  for (const row of d.IDX) {
    if (row[2] !== "items" || d.isJunk(row)) continue;
    const body = String(d.BODIES.items[row[0]] || "");
    const j = J[row[0]] || {};
    if (j.skip) continue;                                                                    // an index/hub page that is not an item at all (judged by reading it)
    const cls = j.cls && ITEM_CLASSES.includes(j.cls) ? j.cls : classOf(row, body);       // a read judgment may correct a class the rules got wrong
    const price = parsePrice(body, (row[6] || {}).pr);
    const wt = parseWeight(body);
    const slot = slotOf(body, (row[6] || {}).slot);
    const magic = magicOf(cls, row, body, price);
    const bulk = bulkOf(cls, wt);
    const role = ["wondrous", "rod", "ring", "intelligent", "technology"].includes(cls) ? roleOf(body) : null;
    const cursed = row[3] === "Cursed Items";
    const perishable = cls === "scroll" || cls === "potion" || cls === "food" || cls === "herb" || cls === "drug" || (cls === "alchemical") || (["gear", "other", "contraband"].includes(cls) && PERISHABLE_RE.test(row[1]));
    const scores = themeScores(row, body);
    const ruleThemes = Object.keys(scores).sort((a, b) => scores[b] - scores[a] || cmp(a, b)).slice(0, 3);     // strongest three
    let themes = Array.isArray(j.themes) ? j.themes : ruleThemes;                 // a read judgment REPLACES the keyword guess (it was shown the guess)
    themes = [...new Set(themes.filter((t) => THEMES[t]))].slice(0, 3);
    const ethos = Array.isArray(j.ethos) ? j.ethos.filter((e) => ETHOS[e]) : ethosOf(row, body);
    const effRole = j.role && ["combat", "caster", "both", "utility"].includes(j.role) ? j.role : role;
    const letters = lettersOf(cls, magic, bulk, effRole, price.gp);

    // ROUTES
    const routes = [];
    if (cls === "artifact") routes.push("unique");
    else if (bulk === "fixed" || cls === "service" || cls === "mount" || cls === "vehicle" || cls === "siege" || cls === "structure") routes.push("placed");
    else {
      // ON PERSON: something a creature can wear or hold. Armor, shields, weapons and magic items go on the body whatever they weigh (full plate is 50 lb);
      // anything else must be light enough to carry about (10 lb - a rope, not a ladder).
      const wornOrHeld = ["weapon", "armor", "shield", "enchantment", "ring", "rod", "staff", "wand", "wondrous", "intelligent", "technology"].includes(cls);
      const onPerson = wornOrHeld ? bulk !== "fixed" : (bulk === "pocket" || (wt != null && wt <= 10 && bulk !== "fixed"));
      // KIT: durable, portable gear a delver or traveller would have on them (the "bear and the dead adventurer" route). Never food, herbs or trade goods.
      const kitClasses = ["weapon", "armor", "shield", "enchantment", "ring", "rod", "staff", "wand", "wondrous", "intelligent", "gear", "tool", "kit", "clothing", "focus", "entertainment", "technology", "alchemical", "potion", "scroll"];
      const kit = j.kit != null ? !!j.kit : kitClasses.includes(cls) && onPerson;
      if (onPerson && cls !== "animal-gear" && cls !== "trade-good") routes.push("carried");
      if (letters.includes("H") || letters.includes("I")) routes.push("hoard");
      if (kit && (!perishable || ["potion", "scroll"].includes(cls))) routes.push("victim");
    }

    const tags = [`class:${cls}`, `magic:${magic}`, `bulk:${bulk}`, `handling:${handlingOf(cls, slot)}`, `value:${valueBand(price.gp, price.bonus)}`,
      ...letters.map((l) => `letter:${l}`), ...routes.map((r) => `route:${r}`), ...ethos.map((e) => `ethos:${e}`), ...themes.map((t) => `theme:${t}`)];
    if (slot) tags.push(`slot:${slot}`);
    if (effRole) tags.push(`role:${effRole}`);
    if (["weapon", "armor", "shield", "clothing", "enchantment", "animal-gear"].includes(cls)) tags.push("fit:sized");
    tags.push(perishable ? "state:perishable" : "state:durable");
    if (cursed) tags.push("flag:cursed");
    if (cls === "enchantment") tags.push(`applies-to:${ENCHANT_FOR(row, body)}`);
    const item = { id: row[0], name: row[1], category: row[3], book: (row[6] || {}).bk || "", tags: uniq(tags) };
    if (price.gp != null) item.pr = price.gp; else if (price.bonus != null) item.bonus = price.bonus;
    if (wt != null) item.wt = wt;
    items.push(item);
  }
  items.sort((a, b) => cmp(a.name.toLowerCase(), b.name.toLowerCase()) || cmp(a.id, b.id));
  return items;
}

/* ===================================== CREATURE PARSING ================================================================ */
const TYPES_RX = "aberration|animal|construct|dragon|fey|humanoid|magical beast|monstrous humanoid|ooze|outsider|plant|undead|vermin";
const SIZES_RX = "Fine|Diminutive|Tiny|Small|Medium|Large|Huge|Gargantuan|Colossal";
const TYPELINE = new RegExp("(?:^|\\n|\\s)(LG|NG|CG|LN|N|CN|LE|NE|CE|Any alignment|any alignment|Unaligned)?\\s*(" + SIZES_RX + ")\\s+(" + TYPES_RX + ")(?:\\s*\\(([^)]*)\\))?", "i");
const AL_ETHOS = { LG: ["holy", "lawful"], NG: ["holy"], CG: ["holy", "chaotic"], LN: ["lawful"], N: [], CN: ["chaotic"], LE: ["unholy", "lawful"], NE: ["unholy"], CE: ["unholy", "chaotic"] };

export function budgetOf(text) {
  if (text == null) return { budget: null, lairOnly: false };
  const t = text.toLowerCase();
  const lairOnly = /in (?:its |their |the )?lair|lair only/.test(t);
  let budget = null;
  if (/npc gear/.test(t)) budget = "npc-gear";
  else if (/\btriple\b/.test(t)) budget = "triple";
  else if (/\bdouble\b/.test(t)) budget = "double";
  else if (/incidental|half standard|half\b/.test(t)) budget = "incidental";
  else if (/\bstandard\b|\bnormal\b/.test(t)) budget = "standard";
  else if (/\bnone\b|\bno treasure\b|^[-—–]\s*$/.test(t)) budget = "none";
  return { budget, lairOnly };
}

const SUBTYPE_NORM = { "augmented humanoid": "augmented", "augmented human": "augmented", "augmented animal": "augmented", "augmented": "augmented" };
const HUMANOID_SUBTYPES = new Set(["human", "elf", "dwarf", "gnome", "halfling", "goblinoid", "orc", "giant", "gnoll", "reptilian", "boggard", "ratfolk", "android", "kobold", "troglodyte", "tengu", "kitsune", "oread", "sylph", "ifrit", "undine", "aasimar", "tiefling", "dark folk", "samsaran", "vanara", "wayang", "nagaji", "catfolk", "grippli", "merfolk", "skinwalker", "changeling", "duergar", "drow", "half-elf", "half-orc", "monstrous"]);
const WEAPON_WORDS = /\b(longsword|shortsword|greatsword|battleaxe|greataxe|handaxe|axe|spear|longspear|shortspear|javelin|dagger|club|greatclub|mace|morningstar|flail|warhammer|hammer|scimitar|rapier|falchion|sword|bow|longbow|shortbow|crossbow|sling|halberd|glaive|trident|quarterstaff|staff|whip|lance|pike|katana|kukri|sickle|net)\b/i;

const normHabitat = (s) => {
  const t = s.toLowerCase();
  const out = [];
  const has = (re) => re.test(t);
  if (has(/aquatic|ocean|\bsea\b|river|lake|water|reef|swim|underwater|marine/)) out.push("aquatic");
  if (has(/coast|shore|beach|harbor|harbour|island/)) out.push("coastal");
  if (has(/underground|underdark|cavern|cave|dungeon|subterranean|tunnel/)) out.push("underground");
  if (has(/forest|jungle|woodland|woods/)) out.push("forest");
  if (has(/desert/)) out.push("desert");
  if (has(/mountain/)) out.push("mountain");
  if (has(/hill/)) out.push("hills");
  if (has(/plain|grassland|steppe|savanna|prairie/)) out.push("plains");
  if (has(/swamp|marsh|bog|fen/)) out.push("swamp");
  if (has(/urban|city|town|village|ruin|settle/)) out.push("urban");
  if (has(/cold|arctic|tundra|glacier|ice|polar|frozen|snow/)) out.push("cold");
  if (has(/warm|tropic|jungle|volcan/)) out.push("warm");
  if (has(/plane of fire|elemental plane of fire/)) out.push("plane-fire");
  if (has(/plane of air|elemental plane of air/)) out.push("plane-air");
  if (has(/plane of earth|elemental plane of earth/)) out.push("plane-earth");
  if (has(/plane of water|elemental plane of water/)) out.push("plane-water");
  if (has(/abyss|hell\b|abaddon|elysium|heaven|axis|nirvana|maelstrom|astral|ethereal|shadow|plane|limbo|hades|dimension|outer|nirvana|boneyard|elemental/)) out.push("planar");
  if (!out.length && has(/\bany\b/)) out.push("any");
  return out;
};

/** Culture a creature belongs to when its stat block says so only in the NAME (the Bestiary's Orc has no "(orc)" in its type line). Humanoid-shaped creatures only, so
 *  "Giant Spider" is never a giant and "Goblin Dog" never a goblin. */
export function cultureFromName(name, type) {
  const out = [];
  const n = name.toLowerCase();
  if (type === "humanoid" || type === "monstrous humanoid") {
    if (/\b(orc|half-orc)\b/.test(n)) out.push("orc");
    if (/\b(goblin|hobgoblin|bugbear)\b/.test(n)) out.push("goblinoid");
    if (/\bkobold\b/.test(n)) out.push("kobold");
    if (/\bgnoll\b/.test(n)) out.push("gnoll");
    if (/\b(ogre|troll|giant|cyclops|ettin|jotun|fomorian)\b/.test(n)) out.push("giant");
    if (/\b(lizardfolk|troglodyte)\b/.test(n)) out.push("reptilian");
    if (/\btroglodyte\b/.test(n)) out.push("troglodyte");
    if (/\b(drow|duergar|derro|morlock|svirfneblin)\b/.test(n)) out.push("underfolk");
    if (/\bdrow\b/.test(n)) out.push("drow");
    if (/\b(elf|elven)\b/.test(n)) out.push("elf");
    if (/\b(dwarf|dwarven)\b/.test(n)) out.push("dwarf");
    if (/\b(gnome|halfling)\b/.test(n)) out.push(/gnome/.test(n) ? "gnome" : "halfling");
    if (/\b(human|commoner|noble|guard|soldier|knight|merchant|sailor|priest|mage|wizard|bandit|thief|assassin|pirate|captain)\b/.test(n)) out.push("human");
  }
  if (/\b(pirate|buccaneer|corsair|privateer|sea dog|sailor|first mate)\b/.test(n)) out.push("pirate");
  if (/\b(bandit|thief|thug|cutthroat|assassin|rogue|smuggler|brigand|outlaw|highwayman|cultist|spy|burglar|pickpocket|mugger)\b/.test(n)) out.push("criminal");
  return uniq(out);
}

export function parseCreature(row, body) {
  const f = row[6] || {};
  const tm = TYPELINE.exec(body);
  const type = (f.t || (tm && tm[3]) || "").toLowerCase();
  if (!type) return null;
  const size = f.sz || (tm && tm[2] && tm[2][0].toUpperCase() + tm[2].slice(1).toLowerCase()) || null;
  const alRaw = (f.al || (tm && tm[1]) || "").toUpperCase();
  let subs = [];
  if (tm && tm[4]) subs = tm[4].split(/,\s*/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  else if (typeof f.st === "string") subs = f.st.split(/,\s*/).map((s) => s.trim().toLowerCase());
  subs = uniq(subs.map((s) => SUBTYPE_NORM[s] || s));
  const im = /\bInt\s+(\d+|—|-|–)(?![\d])/.exec(body);
  const intScore = im ? (/\d/.test(im[1]) ? Number(im[1]) : null) : undefined;     // null = mindless, undefined = unknown
  const mind = intScore === undefined ? "unknown" : intScore === null ? "mindless" : intScore <= 2 ? "animal" : intScore <= 7 ? "dim" : intScore <= 12 ? "average" : intScore <= 17 ? "sharp" : "genius";
  const tl = (re) => { const m = re.exec(body); return m ? m[1].trim() : null; };
  const treasureText = tl(/\n\s*Treasure\s+([^\n]+)/), envText = tl(/\n\s*Environment\s+([^\n]+)/), orgText = tl(/\n\s*Organization\s+([^\n]+)/);
  const { budget, lairOnly } = budgetOf(treasureText);
  const gearLine = /\n\s*(?:Combat |Other )?Gear\b/.test(body);
  const melee = tl(/\n\s*Melee\s+([^\n]+)/) || "";
  const casts = /\n\s*(?:Spells (?:Prepared|Known)|Domain Spell|Wizard Spells|Cleric Spells|Sorcerer Spells|Druid Spells|Bard Spells|Witch Spells|Oracle Spells|Magus Spells)\b/.test(body);
  const cr = typeof f.cr === "number" ? f.cr : (() => { const m = /\bCR\s+(\d+)(?:\/(\d+))?/.exec(body); return m ? (m[2] ? Number(m[1]) / Number(m[2]) : Number(m[1])) : null; })();
  const hasHandSubtype = subs.some((s) => HUMANOID_SUBTYPES.has(s));
  const hands = type === "humanoid" || type === "monstrous humanoid" || hasHandSubtype || gearLine || WEAPON_WORDS.test(melee) || (type === "outsider" && /\b(sword|axe|spear|bow|weapon|gear)\b/i.test(body.slice(0, 4000)) && mind !== "animal" && mind !== "mindless");
  return { type, size, alignment: alRaw && AL_ETHOS[alRaw] ? alRaw : "", subs, intScore, mind, treasureText, envText, orgText, budget, lairOnly, gearLine, casts, cr, hands, melee };
}

const VICTIM_KILLERS = new Set(["animal", "magical beast", "monstrous humanoid", "aberration", "vermin", "ooze", "plant", "undead", "dragon"]);

export function buildCreatures(d, judgments) {
  const out = [];
  const modal = {};                 // type -> budget word histogram, for creatures whose stat block has none
  const parsed = [];
  for (const row of d.IDX) {
    if (row[2] !== "monsters" || row[3] !== "Monsters" || d.isJunk(row)) continue;
    const body = String(d.BODIES.monsters[row[0]] || "");
    const c = parseCreature(row, body);
    if (!c) continue;
    parsed.push({ row, body, c });
    if (c.budget) { const k = c.type + "|" + (c.mind === "mindless" ? "mindless" : "minded"); (modal[k] ||= {})[c.budget] = (modal[k][c.budget] || 0) + 1; }
  }
  const modalBudget = (type, mind) => {
    const h = modal[type + "|" + (mind === "mindless" ? "mindless" : "minded")] || modal[type + "|minded"] || {};
    return Object.entries(h).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]))[0]?.[0] || "standard";
  };
  for (const { row, body, c } of parsed) {
    const usesItems = !!c.hands && c.mind !== "animal" && c.mind !== "mindless" && c.mind !== "unknown";
    const org = (c.orgText || "").toLowerCase();
    const community = /\b(tribe|band|clan|community|village|horde|warband|settlement|army|company|legion|cult)\b/.test(org);
    const group = community || /\b(pack|flock|herd|gang|swarm|school|troop|nest|brood|pride|colony|patrol|squad|team|group|party|mob)\b/.test(org);
    const lair = community ? "community" : group ? "group" : "solitary";
    const cunning = c.intScore != null && c.intScore >= 8, intelligent = c.intScore != null;
    const spec = TYPE_LETTERS[c.type] || { letters: "" };
    let letters = spec.letters;
    if (c.type === "outsider") letters = usesItems ? "ABDEFG" : "ABDE";
    for (const cond of spec.conditional || []) {
      if ((cond.when === "cunning" && cunning) || (cond.when === "intelligent" && intelligent) || (cond.when === "community" && community)) letters += cond.add;
    }
    letters = uniq(letters.split("")).join("");
    const budget = c.budget || modalBudget(c.type, c.mind);
    const budgetSource = c.budget ? "stat-block" : "suggested-from-type";
    const habitats = uniq((c.envText || "").split(/[,;]|\bor\b/).flatMap((p) => normHabitat(p)));
    const ethos = AL_ETHOS[c.alignment] || [];
    const elements = uniq(c.subs.filter((s) => ["fire", "cold", "earth", "air", "water", "electricity", "acid"].includes(s)));
    const nameCulture = cultureFromName(row[1], c.type);
    const cultureSet = uniq([...nameCulture, ...c.subs.filter((s) => HUMANOID_SUBTYPES.has(s) || ["clockwork", "shapechanger", "psionic", "incorporeal", "swarm", "extraplanar", "native", "mythic", "demon", "devil", "angel", "daemon", "qlippoth", "agathion", "archon", "azata", "kami", "oni", "psychopomp", "leshy", "god", "augmented", "dark folk"].includes(s))]);
    const style = c.casts && c.gearLine ? "both" : c.casts ? "caster" : (usesItems || c.gearLine) ? "martial" : "none";
    const hoarder = c.type === "dragon" || /\bhoard(?:s|ing|er)?\b/i.test(body.slice(0, 6000)) || /\b(collects|collector of|treasures?)\b.*\b(jewels?|gems?|coins?|gold)\b/i.test(body.slice(0, 6000));
    const routes = [];
    if (budget !== "none") {
      if (usesItems) routes.push("carried");
      if (c.type !== "ooze") routes.push("hoard");                                  // oozes only ever hold treasure by accident (Paizo)
      routes.push("victim");
    } else if (VICTIM_KILLERS.has(c.type)) {
      // By the book it has NO planned treasure (a black bear's block says "none"). Whatever it killed may still have left something in the den, so victim loot stays
      // possible - the flag below says this is the "might have scavenged" case, to be kept small.
      routes.push("victim");
    }
    const tags = [`type:${c.type}`, `mind:${c.mind}`, `hands:${c.hands ? "yes" : "no"}`, `budget:${budget}`, `lair:${lair}`, `style:${style}`, ...letters.split("").filter(Boolean).map((l) => `letter:${l}`),
      ...routes.map((r) => `route:${r}`), ...habitats.map((h) => `habitat:${h}`), ...ethos.map((e) => `ethos:${e}`), ...elements.map((e) => `element:${e}`), ...c.subs.map((s) => `subtype:${s}`),
      ...cultureSet.map((s) => `culture:${s}`)];
    if (c.size) tags.push(`size:${c.size}`);
    if (usesItems) tags.push("uses-items");
    if (hoarder) tags.push("flag:hoarder");
    if (c.lairOnly) tags.push("flag:treasure-in-lair-only");
    if (budgetSource === "suggested-from-type") tags.push("flag:budget-suggested");
    if (c.type === "ooze") tags.push("flag:accidental-treasure");
    if (budget === "none") tags.push("flag:budget-none");
    const crea = { id: row[0], name: row[1], book: (row[6] || {}).bk || "", tags: uniq(tags) };
    if (c.cr != null) crea.cr = c.cr;
    if (c.intScore != null) crea.int = c.intScore;
    out.push(crea);
  }
  out.sort((a, b) => cmp(a.name.toLowerCase(), b.name.toLowerCase()) || cmp(a.id, b.id));
  return out;
}

/* ============================================ PUBLIC BUILD ============================================================= */
export function loadJudgments(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, "tools", "treasure", "judgments.json"), "utf8")); } catch { return { items: {} }; }
}

export function vocabulary() {
  return {
    layers: {
      paizo: "Layer 1 - Paizo's own system from Ultimate Equipment: budget words, treasure types A-I, creature type -> types. Used as written.",
      expansion: "Layer 2 - this project's expansion: routes, portability, handling, durability, sizing, role, ethos and themes.",
    },
    budgetWords: BUDGET_WORDS,
    treasureTypes: LETTERS,
    creatureTypeTreasureTypes: TYPE_LETTERS,
    routes: ROUTES,
    mind: MIND,
    bulk: BULK,
    itemClasses: ITEM_CLASSES,
    ethos: ETHOS,
    themes: THEMES,
    flags: {
      "flag:cursed": "Item: from the Cursed Items list. Exclude for safe loot.",
      "flag:hoarder": "Creature: a dragon, or the text says it hoards or collects treasure. Weight its pile up.",
      "flag:budget-none": "Creature: its stat block says Treasure none. A generator should keep any victim loot very small (it 'might have scavenged').",
      "flag:budget-suggested": "Creature: its stat block has no Treasure line; budget:* is the commonest word for its type, not the book's.",
      "flag:accidental-treasure": "Creature: an ooze. Any treasure is accidental (indigestible metal, coins, gems).",
      "flag:treasure-in-lair-only": "Creature: its Treasure line says the treasure is in its lair, not on its person.",
    },
    namespaces: {
      items: ["class", "magic", "bulk", "handling", "value", "letter", "route", "slot", "role", "ethos", "theme", "fit", "state", "applies-to", "flag"],
      creatures: ["type", "mind", "hands", "budget", "lair", "style", "letter", "route", "habitat", "ethos", "element", "subtype", "culture", "size", "flag", "uses-items"],
    },
    howToUse: [
      "1. Read the creature's tags. budget:* is the amount (multiplier in budgetWords); letter:* are its Paizo treasure types; route:* are the ways an item can reach it.",
      "2. VALUED loot: an item is a candidate when it shares at least one letter:* with the creature AND at least one route:* with the creature. INCIDENTAL gear: cheap mundane items (rope, a bedroll, a backpack, tools, clothing...) carry NO letter on purpose - they are Paizo's 'nonmagical odds and ends' and cost next to nothing - so they are eligible by route alone (route:victim = durable kit a traveller would have; route:carried = what a hands-and-mind creature has on it). Use them as small flavour on top of the budget, not as part of it.",
      "3. Respect handling: route:carried needs the creature's uses-items tag. A creature without it still has route:victim.",
      "4. Weight the candidates: an item whose theme:X appears in themes[X].attractedBy for the creature's own tags is more likely. fit:sized items should be scaled to the creature's size:* tag. Exclude flag:cursed if you want only safe loot, and state:perishable for old victim loot.",
      "5. route:unique and route:placed items are never rolled.",
      "6. class:enchantment entries (Flaming, Spell Resistance, Bane...) are special abilities, not objects: apply one to a class:weapon or class:armor item drawn from the same pool (applies-to:weapon or applies-to:armor says which). Their pr is absent; the entry's bonus (+N) is the price modifier.",
      "7. Prices (pr, in gp) are the Codex's own. About a fifth of items, mostly magic weapons and armor, are priced only by their bonus or not at all (value:unpriced / value:bonus) - a budget-driven generator should price those from the bonus, or skip them.",
    ],
    caveats: [
      "These tags are derived data, not Paizo rules text. Layer 1 is Paizo's table; layer 2 is judgment.",
      "Coins, gems and art objects (types A, B, C) are not in the Codex as items, so a generator must make those from the budget itself.",
      "Wands, scrolls and potions in general are produced from spells and are not separate Codex entries, so those classes are nearly empty here.",
      "Creatures cover the Monsters category only (stat-blocked entries). Templates, NPCs and animal companions are not included.",
      "budget:* comes from the stat block's Treasure line; where there is none the tag flag:budget-suggested marks a value suggested from the creature's type.",
    ],
  };
}

export function buildTreasure(d, root) {
  const judgments = loadJudgments(root);
  const items = buildItems(d, judgments);
  const creatures = buildCreatures(d, judgments);
  return { vocab: vocabulary(), items, creatures, judgments };
}
