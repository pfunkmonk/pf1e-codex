/* Builds tools/d20/source-codes.json — what the product codes on d20pfsrd pages ("PZO1110", "PPC:CoL", "PRG:APG", "PAP61"…) stand for.
 *
 * d20pfsrd prints a book's code, not its title, in the "Source" column of its tables and at the head of many sections, and the
 * archive has no legend page. This resolves them from PUBLIC lists and shows its work (`how`), because a wrong code→book mapping would
 * quietly mis-credit an entry:
 *   - PZO1xxx  Paizo's own product numbers for the RPG line (Wikipedia "List of Pathfinder books", cross-checked against
 *              retailer pages: PZO1115 Advanced Player's Guide, PZO1117 Ultimate Magic, PZO1121 Advanced Race Guide…).
 *   - PZO94NN  Player Companion SKUs run in RELEASE ORDER: PZO94NN is the NNth title of the line (PathfinderWiki list). Confirmed at
 *              PZO9410, 9455, 9457, 9459, 9465, 9468, 9470 against retailer URL slugs, and against the CONTENT of the d20 pages that
 *              carry each code (PZO9445 = Alchemy Manual: brain-mold spores, Craft Ooze; PZO9481 = Adventurer's Armory 2: boline).
 *   - PZO90NNN / PAPnnn  Adventure Path volume NNN ("Pathfinder #61: Shards of Sin"); "PAP82:SotS" decodes to volume 82 = Secrets of the Sphinx.
 *   - PPC:/PCS:/PRG:/PCh:/PC:  d20pfsrd's own initials code, resolved ONLY inside the matching Paizo line's title list (Player
 *              Companion / Campaign Setting / RPG): "PPC:CoL" = Chronicle of Legends. An initials code that fits more than one title in
 *              its line is left UNRESOLVED, never guessed.
 * Third-party codes (LG:, JBE:, LL:, SwA:, FGG:…) are not Paizo books and are not touched here.
 *
 * Usage: node tools/d20/build-source-codes.mjs [--snap D:/CODEX/d20-pilot] [--root <repo>]    -> writes tools/d20/source-codes.json */
import fs from "node:fs";
import { buildBookIndex, bookKey } from "./d20-attrib.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");

// ---- public lists -----------------------------------------------------------------------------------------------------
const RPG = { PZO1110: "Core Rulebook", PZO1112: "Bestiary", PZO1114: "GameMastery Guide", PZO1115: "Advanced Player's Guide", PZO1116: "Bestiary 2", PZO1117: "Ultimate Magic",
  PZO1118: "Ultimate Combat", PZO1120: "Bestiary 3", PZO1121: "Advanced Race Guide", PZO1123: "Ultimate Equipment", PZO1124: "NPC Codex", PZO1125: "Ultimate Campaign",
  PZO1126: "Mythic Adventures", PZO1127: "Bestiary 4", PZO1128: "Strategy Guide", PZO1129: "Advanced Class Guide", PZO1130: "Monster Codex", PZO1131: "Pathfinder Unchained",
  PZO1132: "Occult Adventures", PZO1133: "Bestiary 5", PZO1134: "Ultimate Intrigue", PZO1135: "Horror Adventures", PZO1136: "Villain Codex", PZO1137: "Bestiary 6",
  PZO1138: "Adventurer's Guide", PZO1139: "Book of the Damned", PZO1140: "Ultimate Wilderness", PZO1141: "Planar Adventures" };
const PC = `Second Darkness|Elves of Golarion|Osirion, Land of Pharaohs|Legacy of Fire Player's Guide|Taldor, Echoes of Glory|Qadira, Gateway to the East|Cheliax, Empire of Devils|Dwarves of Golarion|Andoran, Spirit of Liberty|Adventurer's Armory|Gnomes of Golarion|Sargava, The Lost Colony|Orcs of Golarion|Inner Sea Primer|Halflings of Golarion|Faiths of Purity|Humans of Golarion|Faiths of Balance|Goblins of Golarion|Faiths of Corruption|Dragon Empires Primer|Pirates of the Inner Sea|Blood of Fiends|Blood of Angels|Varisia, Birthplace of Legends|Knights of the Inner Sea|Blood of the Night|People of the North|Animal Archive|Dungeoneer's Handbook|Champions of Purity|Kobolds of Golarion|Quests & Campaigns|Dragonslayer's Handbook|Pathfinder Society Primer|Faiths & Philosophies|Demon Hunter's Handbook|Mythic Origins|Blood of the Moon|Magical Marketplace|People of the Sands|Bastards of Golarion|Champions of Balance|Undead Slayer's Handbook|Alchemy Manual|The Harrow Handbook|Blood of the Elements|People of the River|People of the Stars|Champions of Corruption|Advanced Class Origins|Ranged Tactics Toolbox|Giant Hunter's Handbook|Familiar Folio|Melee Tactics Toolbox|Heroes of the Wild|Cohorts and Companions|Monster Summoner's Handbook|Dirty Tactics Toolbox|Heroes of the Streets|Occult Origins|Black Markets|Weapon Master's Handbook|Agents of Evil|Arcane Anthology|Blood of Shadows|Armor Master's Handbook|Magic Tactics Toolbox|Spymaster's Handbook|Legacy of Dragons|Haunted Heroes Handbook|Divine Anthology|Blood of the Beast|Paths of the Righteous|Healer's Handbook|Heroes of the High Court|Psychic Anthology|Monster Hunter's Handbook|Heroes of the Darklands|Legacy of the First World|Adventurer's Armory 2|Blood of the Sea|Elemental Master's Handbook|Antihero's Handbook|Blood of the Coven|People of the Wastes|Potions & Poisons|Disciple's Doctrine|Merchant's Manifest|Blood of the Ancients|Heroes from the Fringe|Plane-Hopper's Handbook|Martial Arts Handbook|Wilderness Origins|Heroes of Golarion|Chronicle of Legends`.split("|");
const CS = `Rise of the Runelords Map Folio|Harrow Deck|Guide to Korvosa|Classic Monsters Revisited|Gazetteer|Guide to Darkmoon Vale|Curse of the Crimson Throne Map Folio|Campaign Setting|Gods and Magic|Into the Darklands|Guide to Absalom|Second Darkness Map Folio|Dragons Revisited|Dark Markets: A Guide to Katapesh|The Great Beyond|Dungeon Denizens Revisited|Legacy of Fire Map Folio|Princes of Darkness|Seekers of Secrets|Cities of Golarion|City Map Folio|Classic Horrors Revisited|Guide to the River Kingdoms|Council of Thieves Map Folio|NPC Guide|Classic Treasures Revisited|Faction Guide|Heart of the Jungle|City of Strangers|Kingmaker Poster Map Folio|Misfit Monsters Redeemed|Lords of Chaos|Lost Cities of Golarion|Serpent's Skull Poster Map Folio|Inner Sea Poster Map Folio|The Inner Sea World Guide|Rule of Fear|Rival Guide|Undead Revisited|Dungeons of Golarion|Carrion Crown Poster Map Folio|Pathfinder Society Field Guide|Inner Sea Magic|Lands of the Linnorm Kings|Horsemen of the Apocalypse|Dragon Empires Gazetteer|Mythical Monsters Revisited|Jade Regent Poster Map Folio|Distant Worlds|Isles of the Shackles|Giants Revisited|Lost Kingdoms|Skull and Shackles Poster Map Folio|Magnimar, City of Monuments|Paths of Prestige|Artifacts & Legends|Inner Sea Bestiary|Mystery Monsters Revisited|Irrisen, Land of Eternal Winter|Shattered Star Poster Map Folio|Chronicle of the Righteous|Fey Revisited|Castles of the Inner Sea|Dragons Unleashed|The Worldwound|Reign of Winter Poster Map Folio|Demons Revisited|Mythic Realms|Towns of the Inner Sea|Inner Sea NPC Codex|Osirion, Legacy of Pharaohs|Wrath of the Righteous Poster Map Folio|Inner Sea Gods|Inner Sea Combat|Occult Mysteries|Numeria, Land of Fallen Stars|Mummy's Mask Poster Map Folio|Technology Guide|Undead Unleashed|Ships of the Inner Sea|Lost Treasures|Iron Gods Poster Map Folio|Belkzen, Hold of the Orc Hordes|Tombs of Golarion|Andoran, Birthplace of Freedom|Hell Unleashed|Inner Sea Monster Codex|Giantslayer Poster Map Folio|Occult Bestiary|Inner Sea Races|Distant Shores|Occult Realms|Cheliax, The Infernal Empire|Hell's Rebels Poster Map Folio|Darklands Revisited|Inner Sea Faiths|Heaven Unleashed|Inner Sea Intrigue|Path of the Hellknight|Hell's Vengeance Poster Map Folio|Planes of Power|Inner Sea Temples|Horror Realms|The First World, Realm of the Fey|Qadira, Jewel of the East|Strange Aeons Poster Map Folio|Lands of Conflict|Aquatic Adventures|Ironfang Invasion Poster Map Folio|Taldor, the First Empire|Ruins of Azlant Poster Map Folio|Inner Sea Taverns|Nidal, Land of Shadows|Distant Realms|War for the Crown Map Folio|Sandpoint, Light of the Lost Coast|Construct Handbook|Faiths of Golarion|Return of the Runelords Poster Map Folio|Concordance of Rivals|Tyrant's Grasp Poster Map Folio|Druma, Profit and Prophecy`.split("|");
const RPGLINE = [...Object.values(RPG), "Occult Bestiary", "The World of Vampire Hunter D", "Niobe", "Technology Guide", "Pathfinder Society Field Guide"];
// Adventure Path volumes -> "Pathfinder #N: Title"  (volume = the AP's own number; PZO90NNN uses the same N)
const AP_SERIES = [["Rise of the Runelords", ["Burnt Offerings", "The Skinsaw Murders", "The Hook Mountain Massacre", "Fortress of the Stone Giants", "Sins of the Saviors", "Spires of Xin-Shalast"]],
  ["Curse of the Crimson Throne", ["Edge of Anarchy", "Seven Days to the Grave", "Escape From Old Korvosa", "A History of Ashes", "Skeletons of Scarwall", "Crown of Fangs"]],
  ["Second Darkness", ["Shadow in the Sky", "Children of the Void", "The Armageddon Echo", "Endless Night", "A Memory of Darkness", "Descent into Midnight"]],
  ["Legacy of Fire", ["Howl of the Carrion King", "House of the Beast", "The Jackal's Price", "The End of Eternity", "The Impossible Eye", "The Final Wish"]],
  ["Council of Thieves", ["The Bastards of Erebus", "The Sixfold Trial", "What Lies in Dust", "The Infernal Syndrome", "Mother of Flies", "The Twice-Damned Prince"]],
  ["Kingmaker", ["Stolen Land", "Rivers Run Red", "The Varnhold Vanishing", "Blood for Blood", "War of the River Kings", "Sound of a Thousand Screams"]],
  ["Serpent's Skull", ["Souls for Smuggler's Shiv", "Racing to Ruin", "City of Seven Spears", "Vaults of Madness", "The Thousand Fangs Below", "Sanctum of the Serpent God"]],
  ["Carrion Crown", ["The Haunting of Harrowstone", "Trial of the Beast", "Broken Moon", "Wake of the Watcher", "Ashes at Dawn", "Shadows of Gallowspire"]],
  ["Jade Regent", ["The Brinewall Legacy", "Night of Frozen Shadows", "The Hungry Storm", "Forest of Spirits", "Tide of Honor", "The Empty Throne"]],
  ["Skull & Shackles", ["The Wormwood Mutiny", "Raiders of the Fever Sea", "Tempest Rising", "Island of Empty Eyes", "The Price of Infamy", "From Hell's Heart"]],
  ["Shattered Star", ["Shards of Sin", "Curse of the Lady's Light", "The Asylum Stone", "Beyond the Doomsday Door", "Into the Nightmare Rift", "The Dead Heart of Xin"]],
  ["Reign of Winter", ["The Snows of Summer", "The Shackled Hut", "Maiden, Mother, Crone", "The Frozen Stars", "Rasputin Must Die!", "The Witch Queen's Revenge"]],
  ["Wrath of the Righteous", ["The Worldwound Incursion", "Sword of Valor", "Demon's Heresy", "The Midnight Isles", "Herald of the Ivory Labyrinth", "City of Locusts"]],
  ["Mummy's Mask", ["The Half-Dead City", "Empty Graves", "Shifting Sands", "Secrets of the Sphinx", "The Slave Trenches of Hakotep", "Pyramid of the Sky Pharaoh"]],
  ["Iron Gods", ["Fires of Creation", "Lords of Rust", "The Choking Tower", "Valley of the Brain Collectors", "Palace of Fallen Stars", "The Divinity Drive"]],
  ["Giantslayer", ["Battle of Bloodmarch Hill", "The Hill Giant's Pledge", "Forge of the Giant God", "Ice Tomb of the Giant Queen", "Anvil of Fire", "Shadow of the Storm Tyrant"]],
  ["Hell's Rebels", ["In Hell's Bright Shadow", "Turn of the Torrent", "Dance of the Damned", "A Song of Silver", "The Kintargo Contract", "Breaking the Bones of Hell"]],
  ["Hell's Vengeance", ["The Hellfire Compact", "Wrath of Thrune", "The Inferno Gate", "For Queen & Empire", "Scourge of the Godclaw", "Hell Comes to Westcrown"]],
  ["Strange Aeons", ["In Search of Sanity", "The Thrushmoor Terror", "Dreams of the Yellow King", "The Whisper Out of Time", "What Grows Within", "Black Stars Beckon"]],
  ["Ironfang Invasion", ["Trail of the Hunted", "Fangs of War", "Assault on Longshadow", "Siege of Stone", "Prisoners of the Blight", "Vault of the Onyx Citadel"]],
  ["Ruins of Azlant", ["The Lost Outpost", "Into the Shattered Continent", "The Flooded Cathedral", "City in the Deep", "Tower of the Drowned Dead", "Beyond the Veiled Past"]],
  ["War for the Crown", ["Crownfall", "Songbird, Scion, Saboteur", "The Twilight Child", "City in the Lion's Eye", "The Reaper's Right Hand", "The Six-Legend Soul"]],
  ["Return of the Runelords", ["Secrets of Roderic's Cove", "It Came from Hollow Mountain", "Runeplague", "Temple of the Peacock Spirit", "The City Outside of Time", "Rise of New Thassilon"]],
  ["Tyrant's Grasp", ["The Dead Roads", "Eulogy for Roslar's Coffer", "Last Watch", "Gardens of Gallowspire", "Borne by the Sun's Grace", "Midwives to Death"]]];
const AP = []; for (const [, titles] of AP_SERIES) for (const t of titles) AP.push(t);   // AP[n-1] = title of volume n

// ---- the code inventory (every code-like value on a d20 "Source" line) -------------------------------------------------
const pages = fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse);
const CODE = /^(?:PZO\d{4,5}[A-Za-z]*|P?[A-Z][A-Za-z]{1,4}:[A-Za-z0-9&\-]{1,8}|PFU|APG|UM|GMG|PAP\d+|[A-Z]{2,6}\d*)$/;
const uses = new Map();
for (const p of pages) for (const m of (p.body || "").matchAll(/(?:^|\n)Source:?[ \t]+([^\n]{2,80})/g)) for (const part of m[1].split(/[,;]\s*/)) { const c = part.trim(); if (CODE.test(c)) uses.set(c, (uses.get(c) || 0) + 1); }

// ---- naming: the AoN originals' spelling of a book, when there is one ------------------------------------------------
const t = fs.readFileSync(`${ROOT}/data/index.js`, "utf8");
const rows = JSON.parse(t.slice(t.indexOf("=") + 1, t.lastIndexOf(";")));
const isMinted = (r) => false;   // every row of the book index below is an original (AoN) spelling; d20-minted rows are excluded by buildBookIndex's own filter
import crypto from "node:crypto";
const norm = (s) => String(s || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim();
const mint = (b, n) => crypto.createHash("sha256").update(`pf1e-codex-d20pfsrd|${b}|${norm(n)}`).digest("hex").slice(0, 16);
const BOOKS = buildBookIndex(rows, (r) => r[0] !== mint(r[2], r[1]));
const spell = (title) => BOOKS.get(bookKey(title)) || title;

// ---- decode ---------------------------------------------------------------------------------------------------------------
const SMALL = new Set(["of", "the", "and", "a", "an", "in", "to", "for", "from"]);
const words = (s) => String(s).replace(/'s\b/g, "").replace(/&/g, " and ").split(/[^A-Za-z0-9]+/).filter(Boolean);
function initialsOf(title) {                                // all the abbreviations a title can plausibly be shortened to
  const w = words(title), out = new Set();
  out.add(w.filter((x) => !SMALL.has(x.toLowerCase())).map((x) => x[0]).join("").toLowerCase());          // CoL -> skip "of"? (no: see next)
  out.add(w.map((x) => x[0]).join("").toLowerCase());                                                         // keep every word: Heroes of the Wild -> HotW
  out.add(w.flatMap((x) => x.split(/(?=[A-Z])/)).map((x) => x[0]).join("").toLowerCase());                     // GameMastery -> G M
  out.add(w.flatMap((x) => x.split(/(?=[A-Z])/)).filter((x) => !SMALL.has(x.toLowerCase())).map((x) => x[0]).join("").toLowerCase());
  return out;
}
function decodeInitials(ab, pool) {
  const a = ab.replace(/&/g, "a").replace(/[^A-Za-z0-9]/g, "").toLowerCase();       // "C&C" = Cohorts & Companions = C-and-C
  const bm = /^b(\d)$/.exec(a); if (bm) return [bm[1] === "1" ? "Bestiary" : `Bestiary ${bm[1]}`];   // the first Bestiary has no number
  return pool.filter((title) => initialsOf(title).has(a));
}
// ---- independent evidence: the AoN-sourced ORIGINALS already know which book each of their entries is from. If a code really means book B,
// the entry names on the lines that carry it should be entries AoN files under B ("agree"); entries AoN files under a different book
// are "other" (noisy by nature: a rule reprinted in two books). Used (a) to settle an initials code that fits several titles and
// (b) recorded beside every mapping so it can be audited.
const aonNames = new Map();                         // entry name -> Set of book keys
for (const r of rows) {
  if (r[0] === mint(r[2], r[1]) || r[3] === "Additional Material (d20pfsrd)") continue;
  const b = bookKey(String((r[6] && r[6].bk) || r[4] || "").replace(/\s*pg\.\s*\d+.*$/, "").split(",")[0]); const n = norm(r[1]);
  if (b && n.length >= 6) (aonNames.get(n) || aonNames.set(n, new Set()).get(n)).add(b);
}
const TOKEN = /P?PZO\d{4,5}[A-Za-z]?\d?|(?:PPC|PCS|PRG|PCh|Pch|PC|LG|LL|JBE|SwA|FGG|TOP):[A-Za-z0-9&\-]{1,8}|PAP\d+(?::\w+)?|PFU/g;
const linesByCode = new Map();
for (const p of pages) for (const ln of (p.body || "").split("\n")) {
  if (ln.length > 400) continue;
  for (const m of ln.matchAll(TOKEN)) { const a = linesByCode.get(m[0]) || linesByCode.set(m[0], []).get(m[0]); if (a.length < 300) a.push(norm(ln)); }
}
function evidence(code0, title) {
  const key = bookKey(spell(title)), lines = linesByCode.get(code0) || []; let agree = 0, other = 0;
  for (const ln of lines) { let a = false, o = false; for (const [n, bs] of aonNames) if (ln.includes(n)) { if (bs.has(key)) { a = true; break; } o = true; } if (a) agree++; else if (o) other++; }
  return { lines: lines.length, agree, other };
}
// ---- literal evidence from the web (2026-10-06): a retailer listing / product-page title that prints the code AND the title together -------
// (a search engine's SUMMARY of such a page is not accepted — one summary gave PZO9470 as "Legacy of the First World" while the product page's
// own URL says "pzo-9470-…-legacy-of-dragons"). Codes seen only in a summary stay unresolved: PZO9232, 9257, 9267, 9268.
const WEB = {
  PZO9210: ["Dungeon Denizens Revisited", "pastebin.com/EsBiKz9y product listing"], PZO9211: ["Seekers of Secrets", "pastebin.com/EsBiKz9y product listing"],
  PZO9283: ["Inner Sea Monster Codex", "opengamingstore.com/products/pzo9283-pathfinder-inner-sea-monster-codex"],
  PZO9286: ["Occult Realms", "trollandtoad.com 'Pathfinder Campaign Setting Occult Realms (PZO9286)'"],
  PZO9293: ["Path of the Hellknight", "kupdf.net 'PZO9293 Path of the Hellknight.pdf'"],
  PZO9297: ["Horror Realms", "wondertrail.com 'PZO9297 Horror Realms Pathfinder Campaign Setting'"],
};
// ---- abbreviations that are not initials but unambiguous inside their line ----------------------------------------------------
const ALIAS = { "PPC:SpyHB": ["Spymaster's Handbook", "Spy + Handbook"], "PPC:DHB": ["Demon Hunter's Handbook", "D(emon) H(unter's) B(ook)"], "PCS:ChotR": ["Chronicle of the Righteous", "Ch-o-t-R"],
  "PCh:FG": ["Faction Guide", "PCh = the Chronicles era; Faiths of Golarion is a 2019 Campaign Setting"] };
const out = {}; const unresolved = [];
const set = (code, title, how) => { out[code] = { book: spell(title), how, uses: uses.get(code) || 0, check: evidence(code, title) }; };
for (const [code0] of uses) {
  // variants of the same code: a stray leading P ("PPZO9410") and a trailing footnote digit ("PZO94102") are not part of it
  let code = code0, m;
  if ((m = /^P?(PZO\d{4,5}[A-Za-z]?)\d?$/.exec(code0)) && /^PZO94\d\d$|^PZO94\d\d[A-Za-z]$/.test(m[1]) === false) code = m[1];
  if ((m = /^P(PZO94\d\d)\d?$/.exec(code0))) code = m[1];
  if (WEB[code]) { set(code0, WEB[code][0], `retailer listing prints code and title: ${WEB[code][1]}`); continue; }
  if (ALIAS[code]) { set(code0, ALIAS[code][0], `abbreviation: ${ALIAS[code][1]}`); continue; }
  const n4 = /^PZO(\d{4})$/.exec(code);
  if (RPG[code]) { set(code0, RPG[code], "Paizo product number (Wikipedia list; retailer pages)"); continue; }
  if (n4 && /^94\d\d$/.test(n4[1]) && PC[Number(n4[1].slice(2)) - 1]) { set(code0, PC[Number(n4[1].slice(2)) - 1], `Player Companion SKUs run in release order: #${Number(n4[1].slice(2))}`); continue; }
  if ((m = /^PZO90(\d{3})$/.exec(code)) || (m = /^PAP(\d{1,3})(?::.*)?$/.exec(code))) {
    const v = Number(m[1]); if (AP[v - 1]) { set(code0, `Pathfinder #${v}: ${AP[v - 1]}`, `Adventure Path volume ${v}`); continue; }
  }
  if ((m = /^(PPC|PCS|PRG|PCh|Pch|PC):(.+)$/.exec(code))) {
    const fam = m[1].toLowerCase(), pool = fam === "ppc" ? PC : fam === "prg" ? RPGLINE : fam === "pcs" ? CS : fam === "pc" || fam === "pch" ? [...CS, ...PC] : [];
    const hits = [...new Set(decodeInitials(m[2], pool))];
    if (hits.length === 1) { set(code0, hits[0], `initials of a ${m[1]} title (unique in that line)`); continue; }
    if (hits.length > 1) {                                // several titles fit: the AoN entry names on the code's lines decide — or nothing does
      const ev = hits.map((h) => ({ h, ...evidence(code0, h) })).sort((a, b) => b.agree - a.agree);
      if (ev[0].agree >= 3 && ev[0].agree >= 3 * Math.max(1, ev[1].agree)) { set(code0, ev[0].h, `initials fit ${hits.length} ${m[1]} titles; AoN entry names settle it (${ev[0].agree} vs ${ev[1].agree})`); continue; }
    }
    unresolved.push({ code: code0, uses: uses.get(code0), why: hits.length ? "ambiguous: " + hits.join(" | ") : "no title in its line fits", family: m[1] }); continue;
  }
  if (code === "PFU") { set(code0, "Pathfinder Unchained", "d20pfsrd's abbreviation for Pathfinder Unchained"); continue; }
  if (code === "APG") { set(code0, "Advanced Player's Guide", "abbreviation"); continue; }
  if (code === "UM") { set(code0, "Ultimate Magic", "abbreviation"); continue; }
  if (code === "GMG") { set(code0, "GameMastery Guide", "abbreviation"); continue; }
  unresolved.push({ code: code0, uses: uses.get(code0), why: /^(LG|JBE|LL|SwA|FGG|TOP):/.test(code0) ? "third-party publisher code (not a Paizo book)" : "no rule", family: "other" });
}
// ---- web research 2026-10-07 (source-codes-web.json): each entry was found by one agent and then re-fetched by a second that tried to refute it ----
{
  const web = JSON.parse(fs.readFileSync(new URL("./source-codes-web.json", import.meta.url), "utf8")).codes;
  for (const w of web) {
    out[w.code] = { book: w.book, how: `web (${w.how}): ${w.evidence}`, uses: uses.get(w.code) || 0, check: evidence(w.code, w.book) };
    const i = unresolved.findIndex((u) => u.code === w.code); if (i >= 0) unresolved.splice(i, 1);
  }
}
const total = [...uses.values()].reduce((a, b) => a + b, 0), got = Object.values(out).reduce((a, b) => a + b.uses, 0);
fs.writeFileSync(new URL("./source-codes.json", import.meta.url), JSON.stringify({ built: "2026-10-06", codes: out, unresolved }, null, 1));
console.log(`codes on Source lines: ${uses.size} (${total} uses)  ->  resolved ${Object.keys(out).length} codes covering ${got} uses (${Math.round(100 * got / total)}%);  unresolved ${unresolved.length} codes (${total - got} uses)`);
const byHow = {}; for (const v of Object.values(out)) byHow[v.how.split(":")[0].slice(0, 44)] = (byHow[v.how.split(":")[0].slice(0, 44)] || 0) + v.uses; console.log(byHow);
console.log("\nunresolved, by uses:\n" + unresolved.sort((a, b) => b.uses - a.uses).slice(0, 40).map((u) => `  ${String(u.uses).padStart(3)}  ${u.code.padEnd(14)} ${u.why}`).join("\n"));
