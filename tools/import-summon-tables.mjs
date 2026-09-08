/* Put the summon lists on the right pages.
 *
 * Two problems this fixes.
 *
 * 1. THE STANDARD LIST WAS ON TWO PAGES OUT OF NINE. AoN prints the whole 9-level creature table
 *    on every Summon Monster page, and the Codex captured it onto "Summon Monster 1" and "2" only
 *    — all 105 rows on each. Summon Monster 3-9 were missing entirely until they were recovered,
 *    and their text says "you can summon one creature from the 3rd-level list" with no list in
 *    sight. Each spell now carries the slice it can actually use: Summon Monster N gets levels
 *    1..N, because the spell summons one creature of its own level or several of a lower one.
 *
 * 2. THE DEITY SUMMONS WERE NOWHERE. MasterSummonList.aspx lists the extra creatures a worshipper
 *    of a given deity may summon at each spell level. It was quarantined as an index page, so
 *    none of it reached the Codex. It is split by level and attached to the matching spell.
 *
 * Idempotent: rebuilt from source each run, so re-running produces the same tables.
 *
 * Usage:
 *   node tools/import-summon-tables.mjs .           # report only
 *   node tools/import-summon-tables.mjs . --apply
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const APPLY = process.argv.includes("--apply");
const QUARANTINE = process.env.AON_QUARANTINE ||
  "C:/Users/mailp/OneDrive/Desktop/AON PAGES PARSED/FINISH/structured/_quarantine.jsonl";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const LEVEL_HDR = /^(\d)(?:st|nd|rd|th)\s+Level$/i;

globalThis.window = {};
(0, eval)(fs.readFileSync(path.join(ROOT, "data/index.js"), "utf8"));
(0, eval)(fs.readFileSync(path.join(ROOT, "data/tables.js"), "utf8"));
const IDX = globalThis.window.PF_INDEX;
const TABLES = globalThis.window.PF_TABLES;

const spellNamed = (n) =>
  IDX.find((r) => r[2] === "spells" && r[1].toLowerCase() === n.toLowerCase());

/* ---------- 1. the standard creature list, sliced per level -------------------------------- */

/** Split a level-sectioned table into { 1: [rows], 2: [rows], … }. */
function sectionsOf(rows) {
  const out = {};
  let cur = null;
  for (const row of rows) {
    const m = LEVEL_HDR.exec(String(row[0] || "").trim());
    if (m) { cur = Number(m[1]); out[cur] = [row]; continue; }
    if (cur) out[cur].push(row);
  }
  return out;
}

const FAMILIES = [
  { base: "Summon Monster", src: "Summon Monster 1" },
  { base: "Summon Nature's Ally", src: "Summon Nature's Ally 1" },
];

const plan = [];       // { id, name, tables }
for (const fam of FAMILIES) {
  const srcRow = spellNamed(fam.src);
  if (!srcRow || !TABLES[srcRow[0]]) { console.error(`no source table on ${fam.src}`); continue; }
  const sec = sectionsOf(TABLES[srcRow[0]][0].r);
  for (let n = 1; n <= 9; n++) {
    const row = spellNamed(`${fam.base} ${n}`);
    if (!row) { console.error(`missing spell ${fam.base} ${n}`); continue; }
    const rows = [];
    for (let l = 1; l <= n; l++) if (sec[l]) rows.push(...sec[l]);
    if (!rows.length) continue;
    plan.push({ id: row[0], name: row[1], level: n, family: fam.base,
                tables: [{ r: rows, hdr: true }] });
  }
}

/* ---------- 2. the deity-specific additions ------------------------------------------------ */

const deityRows = {};   // "Summon Monster" -> { level -> [[deity, creature, source]] }

const rl = readline.createInterface({
  input: fs.createReadStream(QUARANTINE, { encoding: "utf8" }), crlfDelay: Infinity });

for await (const line of rl) {
  if (!line.includes("MasterSummonList")) continue;
  let d;
  try { d = JSON.parse(line); } catch { continue; }
  const url = d.url || "";
  const family = /SummonType=nature/i.test(url) ? "Summon Nature's Ally"
               : /SummonType=monster/i.test(url) ? "Summon Monster" : null;
  if (!family) continue;

  const fam = (deityRows[family] ||= {});
  let level = null, deity = null;
  for (const raw of String(d.content || "").split("\n")) {
    const s = raw.trim();
    if (!s) continue;
    // "Summon Monster IV" / "Summon Nature's Ally IV" marks the start of a level block
    const lm = new RegExp(`^${family.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s+([IVX]+)$`, "i").exec(s);
    if (lm) { level = ROMAN.indexOf(lm[1].toUpperCase()) + 1 || null; deity = null; continue; }
    const dm = /^Deity:\s*(.+)$/i.exec(s);
    if (dm) { deity = dm[1].trim(); continue; }
    if (!level || !deity) continue;
    if (s.startsWith("---")) continue;                       // trailing clarification line
    // "Two-Headed Celestial Eagle (LN)† (Source Monster Summoner's Handbook pg. 30)"
    const cm = /^(.+?)\s*\(Source\s+([^)]+)\)\s*$/i.exec(s);
    if (!cm) continue;
    (fam[level] ||= []).push([deity, cm[1].trim(), cm[2].trim()]);
  }
}

let deityAttached = 0;
for (const p of plan) {
  const rows = (deityRows[p.family] || {})[p.level];
  if (!rows || !rows.length) continue;
  p.tables.push({ r: [["Deity", "Additional creature", "Source"], ...rows], hdr: true });
  deityAttached += rows.length;
}

/* ---------- report ------------------------------------------------------------------------- */
console.log("  spell                       standard rows   deity rows");
for (const p of plan)
  console.log(`  ${p.name.padEnd(28)}${String(p.tables[0].r.length).padStart(9)}${String(p.tables[1] ? p.tables[1].r.length - 1 : 0).padStart(13)}`);
console.log(`\n  spells given tables : ${plan.length}`);
console.log(`  deity rows placed   : ${deityAttached}`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

for (const p of plan) TABLES[p.id] = p.tables;
fs.writeFileSync(path.join(ROOT, "data/tables.js"),
  "window.PF_TABLES=" + JSON.stringify(TABLES) + ";\n");
console.log(`\n  data/tables.js — ${Object.keys(TABLES).length} entries now carry tables`);
