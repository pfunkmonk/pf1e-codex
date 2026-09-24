/* One-off + re-runnable repair of already-imported d20 rows (see d20-attrib.mjs for why). Dry run by default.
 *   1. Source column / license paragraph corrections (repairSource, repairNote).
 *   2. Removes d20 rows that duplicate an ORIGINAL Codex row under an inverted name (nameKeys). Only rows this
 *      importer minted are ever touched: a row is d20's iff its id === mintId(bucket, name).
 * Usage: node tools/d20/d20-repair.mjs [--apply] [--root C:/Users/mailp/dev/pf1e-codex] */
import fs from "node:fs";
import crypto from "node:crypto";
import { commaListShare } from "./d20-clean.mjs";
import { repairSource, repairNote, nameKeys, VARIANT_QUAL, isPaizoish, UNVERIFIED_SOURCE } from "./d20-attrib.mjs";

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
const godBody = (b) => /Alignment:?\s+(?:Lawful|Neutral|Chaotic|LG|LN|LE|NG|N\b|NE|CG|CN|CE)/i.test(b) && /(Domains?|Portfolio|Favou?red Weapons?|Typical Worshipers?)\b/.test(b);
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
const d20 = rows.filter(isD20), orig = rows.filter((r) => !isD20(r));
console.log(`rows ${rows.length}: d20-minted ${d20.length}, original ${orig.length}`);

const drop = new Map();
// ---- 3. structure: navigation-list "entries" and stat blocks flattened onto one line ----
const listPages = d20.filter((r) => commaListShare(String(bodies[r[2]][r[0]]).split("\n").filter((l) => l.trim())) > 0.6);
console.log(`\nname-list navigation pages posing as entries: ${listPages.length}`);
for (const r of listPages) { console.log("  drop", r[1], `[${r[2]}]`); }
const STAT_BREAK = /\s+(?=(?:DEFENSE|OFFENSE|STATISTICS|ECOLOGY|SPECIAL ABILITIES|TACTICS)\b|(?:Init [+-]\d|AC \d|hp \d|Fort [+-]\d|Speed \d|Melee |Ranged |Space \d|Special Attacks |Str \d|Base Atk [+-]|Feats [A-Z]|Skills [A-Z]|Languages [A-Z]|SQ [a-z]|Environment [a-z]|Organization [a-z]|Treasure [a-z]))/g;
const isFlat = (l) => l.length > 700 && ["Init", "AC ", "hp ", "Fort ", "Speed ", "Melee", "Str ", "Base Atk", "Feats", "Skills"].filter((k) => l.includes(k)).length >= 6;
let rebroke = 0;
for (const r of d20) {
  const b = String(bodies[r[2]][r[0]]);
  if (!b.split("\n").some(isFlat)) continue;
  const nb = b.split("\n").map((l) => (isFlat(l) ? l.replace(STAT_BREAK, "\n") : l)).join("\n");
  console.log(`  re-broke flattened stat block: ${r[1]} (${b.split("\n").length} -> ${nb.split("\n").length} lines)`);
  if (APPLY) bodies[r[2]][r[0]] = nb;
  rebroke++;
}
for (const r of listPages) drop.set(r[0], `${r[1]}  <>  (a list of names, no content of its own)`);

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
for (const r of d20) {
  if (drop.has(r[0])) continue;
  const body = String(bodies[r[2]][r[0]]); const cut = body.lastIndexOf("\n\n");
  const head = body.slice(0, cut), tail = body.slice(cut + 2);
  const newSrc = repairSource(r[4], tail), newTail = repairNote(newSrc, tail);
  if (newSrc !== r[4]) { const k = `${r[4]} -> ${/^Source unconfirmed/.test(newSrc) ? newSrc : r[4] === "Third-party (unattributed)" ? "(publisher from own Section 15)" : newSrc}`; tally[k] = (tally[k] || 0) + 1; srcChanged++; }
  if (newTail !== tail) noteChanged++;
  if (APPLY) {
    if (newSrc !== r[4]) { if (r[6] && r[6].bk === r[4]) r[6].bk = newSrc; r[4] = newSrc; }
    if (newTail !== tail) bodies[r[2]][r[0]] = head + "\n\n" + newTail;
  }
}
console.log(`\nsource column corrected: ${srcChanged} | license paragraph corrected: ${noteChanged}`);
Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

if (APPLY) {
  const kept = rows.filter((r) => !drop.has(r[0]));
  for (const id of drop.keys()) { const r = rows.find((x) => x[0] === id); delete bodies[r[2]][id]; }
  for (const b of buckets) fs.writeFileSync(`${ROOT}/data/cat/${b}.js`, `window.PF_REG("${b}",${JSON.stringify(bodies[b])});\n`);
  fs.writeFileSync(idxPath, `window.PF_INDEX=${JSON.stringify(kept)};\n`);
  console.log(`\nAPPLIED: ${kept.length} rows written (${drop.size} removed).`);
} else console.log("\nDry run — nothing written.");
