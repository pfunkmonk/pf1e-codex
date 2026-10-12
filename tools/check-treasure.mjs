/* Are the treasure tags true to the Codex, well-formed, and do they say what the docs promise?
 *
 * Run after tools/gen-api.mjs (the build does). Exits 1 on any problem.
 *
 * Like check-api.mjs it asserts two different kinds of thing, on purpose:
 *   FORM  - every tag is in the published vocabulary, every row has exactly the tags it must, every attraction points at something that exists.
 *   TRUTH - facts read from the RAW stat blocks and item bodies (never through the builder) and facts fixed by hand from the Bestiary / Ultimate Equipment: a black bear's
 *           block says Treasure none; a red dragon's says triple; a ladder is not something a creature carries or hoards. A check written from the same guess as the code
 *           proves only self-consistency, so the hand-fixed cases are the half that can catch a wrong rule.
 * Then it RUNS THE EXAMPLE the API docs give (letters x routes) for a bear, a goblin and a gelatinous cube and asserts what comes out.
 *
 * Usage: node tools/check-treasure.mjs [repoRoot]
 */
import fs from "node:fs";
import path from "node:path";
import { loadCodex, API_ROOT } from "./lib/api-build.mjs";
import { THEMES, ETHOS, ROUTES, MIND, BULK, BUDGET_WORDS, LETTERS, TYPE_LETTERS, ITEM_CLASSES } from "./lib/treasure-tags.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const fail = [];
const bad = (m) => { if (fail.length < 80) fail.push(m); else if (fail.length === 80) fail.push("… (more)"); };
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const d = loadCodex(ROOT);
const vis = d.IDX.filter((r) => !d.isJunk(r));
const rawById = new Map(vis.map((r) => [r[0], r]));
const vocab = JSON.parse(read(`${API_ROOT}/treasure.json`));
const IT = JSON.parse(read(`${API_ROOT}/treasure-items.json`)).items;
const CR = JSON.parse(read(`${API_ROOT}/treasure-creatures.json`)).creatures;
let judgments = { items: {} };
try { judgments = JSON.parse(read("tools/treasure/judgments.json")); } catch { /* no judgments yet */ }
const J = judgments.items || {};

const vals = (x, ns) => x.tags.filter((t) => t.startsWith(ns + ":")).map((t) => t.slice(ns.length + 1));
const one = (x, ns, what) => { const v = vals(x, ns); if (v.length !== 1) { bad(`${what} ${x.name}: expected exactly one ${ns}: tag, has ${v.length}`); return null; } return v[0]; };
const has = (x, t) => x.tags.includes(t);

/* ---------------------------------- FORM ---------------------------------- */
const MAGIC = new Set(["mundane", "magic", "artifact"]), HANDLING = new Set(["wield", "wear", "use", "consume", "none"]), ROLE = new Set(["combat", "caster", "both", "utility"]);
const VALUE = /^(bonus|unpriced|lt10|10-99|100-999|1k-4999|5k-9999|10k-49999|50k\+)$/;
const SLOTS = new Set(["armor", "shield", "belt", "body", "chest", "eyes", "feet", "hands", "head", "headband", "neck", "ring", "shoulders", "wrists", "face"]);
const ITEM_NS = new Set(vocab.namespaces.items), CREA_NS = new Set(vocab.namespaces.creatures);
const knownFlags = new Set(Object.keys(vocab.flags));

for (const it of IT) {
  for (const t of it.tags) { const ns = t.split(":")[0]; if (!ITEM_NS.has(ns)) bad(`item ${it.name}: tag "${t}" is in no declared item namespace`); }
  const cls = one(it, "class", "item"); if (cls && !ITEM_CLASSES.includes(cls)) bad(`item ${it.name}: unknown class ${cls}`);
  const mg = one(it, "magic", "item"); if (mg && !MAGIC.has(mg)) bad(`item ${it.name}: unknown magic ${mg}`);
  const bk = one(it, "bulk", "item"); if (bk && !BULK[bk]) bad(`item ${it.name}: unknown bulk ${bk}`);
  const hd = one(it, "handling", "item"); if (hd && !HANDLING.has(hd)) bad(`item ${it.name}: unknown handling ${hd}`);
  const vl = one(it, "value", "item"); if (vl && !VALUE.test(vl)) bad(`item ${it.name}: unknown value band ${vl}`);
  one(it, "state", "item");
  for (const l of vals(it, "letter")) if (!LETTERS[l]) bad(`item ${it.name}: unknown letter ${l}`);
  for (const r of vals(it, "route")) if (!ROUTES[r]) bad(`item ${it.name}: unknown route ${r}`);
  for (const t of vals(it, "theme")) if (!THEMES[t]) bad(`item ${it.name}: unknown theme ${t}`);
  for (const e of vals(it, "ethos")) if (!ETHOS[e]) bad(`item ${it.name}: unknown ethos ${e}`);
  for (const r of vals(it, "role")) if (!ROLE.has(r)) bad(`item ${it.name}: unknown role ${r}`);
  for (const s of vals(it, "slot")) if (!SLOTS.has(s)) bad(`item ${it.name}: unknown slot ${s}`);
  for (const f of vals(it, "flag")) if (!knownFlags.has("flag:" + f)) bad(`item ${it.name}: undeclared flag ${f}`);
  if (vals(it, "theme").length > 3) bad(`item ${it.name}: more than 3 themes`);
  if (new Set(it.tags).size !== it.tags.length) bad(`item ${it.name}: repeated tag`);
}
for (const c of CR) {
  for (const t of c.tags) { const ns = t === "uses-items" ? "uses-items" : t.split(":")[0]; if (!CREA_NS.has(ns)) bad(`creature ${c.name}: tag "${t}" is in no declared creature namespace`); }
  const ty = one(c, "type", "creature"); if (ty && !TYPE_LETTERS[ty]) bad(`creature ${c.name}: unknown type ${ty}`);
  const mi = one(c, "mind", "creature"); if (mi && !MIND[mi] && mi !== "unknown") bad(`creature ${c.name}: unknown mind ${mi}`);
  const bu = one(c, "budget", "creature"); if (bu && !BUDGET_WORDS[bu]) bad(`creature ${c.name}: unknown budget ${bu}`);
  one(c, "lair", "creature"); one(c, "style", "creature"); one(c, "hands", "creature");
  for (const l of vals(c, "letter")) if (!LETTERS[l]) bad(`creature ${c.name}: unknown letter ${l}`);
  for (const r of vals(c, "route")) if (!ROUTES[r]) bad(`creature ${c.name}: unknown route ${r}`);
  for (const f of vals(c, "flag")) if (!knownFlags.has("flag:" + f)) bad(`creature ${c.name}: undeclared flag ${f}`);
}

/* every id is a real, visible Codex entry with the same name; counts match the data */
const wantItems = vis.filter((r) => r[2] === "items").length;
const skipped = Object.values(J).filter((j) => j && j.skip).length;
if (IT.length !== wantItems - skipped) bad(`treasure-items has ${IT.length} items; the Codex has ${wantItems} visible items and ${skipped} judged non-items`);
for (const it of IT) { const r = rawById.get(it.id); if (!r || r[1] !== it.name || r[2] !== "items") { bad(`treasure item ${it.id} (${it.name}) is not that Codex item`); break; } }
for (const c of CR) { const r = rawById.get(c.id); if (!r || r[1] !== c.name || r[2] !== "monsters" || r[3] !== "Monsters") { bad(`treasure creature ${c.id} (${c.name}) is not that Codex monster`); break; } }
if (new Set(IT.map((i) => i.id)).size !== IT.length) bad("treasure-items repeats an id");
if (new Set(CR.map((i) => i.id)).size !== CR.length) bad("treasure-creatures repeats an id");
if (CR.length < 7000) bad(`only ${CR.length} creatures are profiled (expected about 7,500)`);

/* every attraction points at a tag some creature really has; every theme is used by some item */
const creatureTags = new Set(CR.flatMap((c) => c.tags));
const itemThemes = new Set(IT.flatMap((i) => vals(i, "theme")));
for (const [th, spec] of Object.entries(vocab.themes)) {
  for (const a of spec.attractedBy) if (!creatureTags.has(a)) bad(`theme "${th}" is attracted by "${a}", which no creature carries - the attraction can never fire`);
  if (!itemThemes.has(th)) bad(`theme "${th}" is on no item`);
}

/* judgments file: every judged id is a live item, every value is in the vocabulary */
const itemIds = new Set(IT.map((i) => i.id));
for (const [id, j] of Object.entries(J)) {
  if (!rawById.has(id) || rawById.get(id)[2] !== "items") { bad(`judgments: ${id} is not a Codex item any more`); continue; }
  if (j.skip) continue;
  if (!itemIds.has(id)) bad(`judgments: ${id} is a live item but missing from the output`);
  for (const t of j.themes || []) if (!THEMES[t]) bad(`judgments: ${id} has unknown theme "${t}"`);
  for (const e of j.ethos || []) if (!ETHOS[e]) bad(`judgments: ${id} has unknown ethos "${e}"`);
  if (j.role && !ROLE.has(j.role)) bad(`judgments: ${id} has unknown role "${j.role}"`);
  if (j.cls && !ITEM_CLASSES.includes(j.cls)) bad(`judgments: ${id} has unknown class "${j.cls}"`);
}

/* ---------------------------------- TRUTH ---------------------------------- */
// 1. Every budget the book states must be SUPPORTED BY THE WORDS of its own Treasure line (read raw, not through the builder).
const SUPPORT = { none: /none|no treasure|^[-—–]\s*$|value none/i, incidental: /incidental|half/i, standard: /standard|normal/i, double: /double/i, triple: /triple/i, "npc-gear": /npc gear/i };
let checkedBudgets = 0;
for (const c of CR) {
  if (has(c, "flag:budget-suggested")) continue;
  const body = String(d.BODIES.monsters[c.id]);
  const m = /\n\s*Treasure\s+([^\n]+)/.exec(body);
  const w = vals(c, "budget")[0];
  if (!m) { bad(`creature ${c.name}: tagged budget:${w} as from the stat block but its text has no Treasure line`); continue; }
  checkedBudgets++;
  if (!SUPPORT[w].test(m[1])) bad(`creature ${c.name}: budget:${w} but its Treasure line reads "${m[1].slice(0, 60)}"`);
}
// 2. Hand-fixed facts from the books.
const byName = (arr, n) => arr.find((x) => x.name === n);
const facts = [
  ["Bear, Black", ["type:animal", "budget:none", "flag:budget-none", "letter:A", "letter:B", "letter:D", "letter:E", "route:victim", "hands:no"], ["route:carried", "uses-items", "letter:C", "letter:H"]],
  ["Goblin", ["type:humanoid", "budget:npc-gear", "uses-items", "route:carried", "letter:F", "letter:G", "letter:H", "culture:goblinoid"], []],
  ["Orc", ["culture:orc", "uses-items", "budget:npc-gear"], []],
  ["Gelatinous Cube", ["type:ooze", "flag:accidental-treasure", "letter:A", "letter:B", "letter:D", "route:victim"], ["route:carried", "letter:E", "letter:F", "letter:G", "uses-items"]],
  ["Giant Spider", ["type:vermin", "mind:mindless"], ["uses-items", "route:carried"]],
];
for (const [n, yes, no] of facts) {
  const c = byName(CR, n);
  if (!c) { bad(`fixed fact: creature "${n}" not found`); continue; }
  for (const t of yes) if (!has(c, t)) bad(`fixed fact: ${n} should have ${t}`);
  for (const t of no) if (has(c, t)) bad(`fixed fact: ${n} should NOT have ${t}`);
}
const dragon = CR.find((c) => /^(Dragon, Red|Red Dragon|Ancient Red Dragon|Dragon, Red, Ancient)/.test(c.name) && has(c, "type:dragon"));
if (!dragon) bad("fixed fact: no red dragon found");
else for (const t of ["letter:A", "letter:B", "letter:C", "letter:H", "letter:I", "flag:hoarder"]) if (!has(dragon, t)) bad(`fixed fact: ${dragon.name} should have ${t}`);
// 3. Items: what must never be and must always be.
const item = (n) => IT.find((i) => i.name === n);
const NEVER_LOOT = ["placed", "unique"];
for (const it of IT) {
  const cls = vals(it, "class")[0], routes = vals(it, "route");
  if (["mount", "vehicle", "siege", "structure", "service"].includes(cls) && (routes.length !== 1 || routes[0] !== "placed")) bad(`item ${it.name} (${cls}) must be a placed set piece only, has routes ${routes}`);
  if (cls === "artifact" && (routes.length !== 1 || routes[0] !== "unique")) bad(`artifact ${it.name} must be route:unique only, has ${routes}`);
  if (routes.some((r) => NEVER_LOOT.includes(r)) && routes.length > 1) bad(`item ${it.name} mixes a never-rolled route with loot routes: ${routes}`);
  if (["weapon", "armor", "shield"].includes(cls) && !has(it, "fit:sized")) bad(`item ${it.name} (${cls}) should be fit:sized`);
  if (has(it, "state:perishable") && routes.includes("victim") && !["potion", "scroll"].includes(cls)) bad(`perishable item ${it.name} (${cls}) must not be victim loot`);
  if (["food", "herb", "trade-good"].includes(cls) && routes.includes("victim")) bad(`${cls} ${it.name} must not be victim loot`);
  if (has(it, "bulk:fixed") && (routes.includes("carried") || routes.includes("victim"))) bad(`item ${it.name} is bulk:fixed but can be carried or left by a victim`);
}
const ladder = item("Ladder");
if (!ladder) bad("fixed fact: item Ladder not found");
else for (const t of ["route:carried", "route:victim", "route:hoard"]) if (has(ladder, t)) bad(`fixed fact: a Ladder must not have ${t}`);
const rope = item("Rope (50 ft.)"); if (!rope || !has(rope, "route:victim")) bad("fixed fact: a 50 ft. rope is what a dead traveller leaves (route:victim)");
const sword = item("Longsword"); if (!sword || !["letter:E", "route:victim", "route:carried", "class:weapon", "fit:sized"].every((t) => has(sword, t))) bad("fixed fact: Longsword should be class:weapon, fit:sized, letter:E, route:carried and route:victim");
const gold = item("Gold (1 lb.)"); if (!gold || !has(gold, "class:trade-good") || has(gold, "route:victim")) bad("fixed fact: Gold (1 lb.) is a trade good, never victim loot");

/* ---------------------------------- PAIRING: the docs example, run ---------------------------------- */
const pool = (c) => {
  const letters = vals(c, "letter").map((l) => "letter:" + l), routes = vals(c, "route").map((r) => "route:" + r);
  return IT.filter((i) => letters.some((l) => has(i, l)) && routes.some((r) => has(i, r)) && !has(i, "flag:cursed"));
};
const bear = byName(CR, "Bear, Black"), gob = byName(CR, "Goblin"), cube = byName(CR, "Gelatinous Cube");
if (bear && gob && cube) {
  const pb = pool(bear), pg = pool(gob), pc = pool(cube);
  if (!pb.length) bad("a black bear's pool is empty - it should be able to hold a dead adventurer's gear");
  if (pb.some((i) => ["vehicle", "mount", "structure", "siege", "service", "food"].some((c) => has(i, "class:" + c)))) bad("a black bear's pool contains a vehicle, mount, structure, siege engine, service or food");
  if (pb.some((i) => i.name === "Ladder")) bad("a black bear's pool contains a Ladder");
  if (pb.some((i) => has(i, "class:artifact"))) bad("a black bear's pool contains an artifact");
  if (!pb.some((i) => has(i, "class:weapon")) && !pb.some((i) => has(i, "class:ring"))) bad("a black bear's pool has no weapon and no ring");
  // incidental gear (no letter) is eligible by route alone - the docs promise it, so prove it
  const routesOf = (c) => vals(c, "route").map((r) => "route:" + r);
  const gearOf = (c) => IT.filter((i) => !i.tags.some((t) => t.startsWith("letter:")) && routesOf(c).some((r) => has(i, r)));
  const gb = gearOf(bear);
  if (!gb.some((i) => i.name === "Rope (50 ft.)")) bad("a black bear's incidental gear should include a 50 ft. rope (a dead traveller's kit)");
  if (gb.some((i) => i.name === "Ladder")) bad("a black bear's incidental gear contains a Ladder");
  if (gb.some((i) => ["food", "herb", "vehicle", "mount", "structure", "siege", "service", "alchemical"].some((c) => has(i, "class:" + c)))) bad("a black bear's incidental gear contains perishables, vehicles, mounts, structures, siege engines or services");
  if (gearOf(cube).some((i) => !has(i, "route:victim"))) bad("a gelatinous cube's incidental gear should be victim kit only");
  if (!pg.length || !pg.some((i) => has(i, "route:carried"))) bad("a goblin's pool should include things it carries");
  if (pc.length && pc.some((i) => !has(i, "route:victim"))) bad("a gelatinous cube's pool should be victim loot only");
  if (!pc.some((i) => has(i, "class:ring") || has(i, "class:weapon"))) bad("a gelatinous cube should be able to hold a ring or a weapon swallowed with its victim");
}

/* ---------------------------------- report ---------------------------------- */
console.log(`items            : ${IT.length.toLocaleString()} tagged (${skipped} judged non-items, ${Object.keys(J).length} judged entries)`);
console.log(`creatures        : ${CR.length.toLocaleString()} profiled; ${checkedBudgets.toLocaleString()} budgets checked against their own Treasure line`);
console.log(`themes           : ${Object.keys(vocab.themes).length}, every attraction reachable`);
if (fail.length) {
  console.log(`\nFAIL - ${fail.length} problem(s):`);
  for (const f of fail) console.log("  " + f);
  process.exit(1);
}
console.log("\nthe treasure tags are well-formed and true to the Codex");
