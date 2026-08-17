/* Does the art we have PLUS the art we have commissioned cover everything the app can ask for?
 *
 * This is the question the other checks do not answer. check-themes verifies the tables are sane;
 * check-reachable verifies no art on disk is orphaned. Neither notices the opposite failure: a key
 * the resolver will request that is neither drawn nor in any prompt pack. That gap is invisible
 * until a page quietly falls through to its category banner months later.
 *
 * So this enumerates every key the resolution chain can produce, subtracts what is on disk, and
 * subtracts what the batch packs commission (read from the BATCHnn-keys.json files the generator
 * writes). Anything left is art nobody has been asked to draw.
 *
 * Usage: node tools/check-coverage.mjs [repoRoot] [packDir]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] || ".";
const PACKS = process.argv[3] || ".";

globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/themes.js`, "utf8"));
const IDX = globalThis.window.PF_INDEX;
const ON_DISK = new Set(globalThis.window.PF_ART);
const THEMES = globalThis.window.PF_THEMES, VARIETY = globalThis.window.PF_VARIETY;

// Every key the resolver can ever request.
const wanted = new Map();          // key -> why
const want = (k, why) => { if (k && !wanted.has(k)) wanted.set(k, why); };

for (const [bucket, table] of Object.entries(THEMES))
  for (const row of table)
    for (let v = 1; v <= (row[3] || 1); v++) want(`theme-${bucket}-${row[0]}-${v}`, `theme ${bucket}/${row[0]}`);

for (const [name, count] of Object.entries(VARIETY))
  for (let v = 1; v <= count; v++) want(`${name}-${v}`, `variety ${name}`);

// Named art the app looks for per entry. Only the buckets where a named lookup is unconditional
// or gated on ART — a gated key that does not exist is not a gap, it is the design.
const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
for (const r of IDX) if (r[2] === "deities") want(`deity-${artKey(r[1])}`, "deity portrait");

// What the packs commission.
const commissioned = new Set();
const packFiles = fs.readdirSync(PACKS).filter(f => /^BATCH\d+-keys\.json$/.test(f));
for (const f of packFiles)
  for (const k of JSON.parse(fs.readFileSync(path.join(PACKS, f), "utf8"))) commissioned.add(k);

const gaps = [], dupes = [];
for (const [k, why] of wanted) {
  if (ON_DISK.has(k)) continue;
  if (commissioned.has(k)) continue;
  gaps.push({ k, why });
}
for (const k of commissioned) if (ON_DISK.has(k)) dupes.push(k);
/* Named art is OPTIONAL — the resolver asks for `feat-<name>` only once it exists, so a named key
 * is never a "gap". The failure that matters for these is the opposite one: art commissioned under
 * a key no entry can ever produce. That is exactly how `spell-bulls-strength` ended up on disk and
 * unreachable, because two slug rules disagreed about the apostrophe. So every commissioned key
 * that is not a theme or variety slot must be derivable from a real entry's name. */
const NAMED_PREFIX = { "feat-": "feats", "item-": "items", "spell-": "spells", "monster-": "monsters", "deity-": "deities" };
const entryKeys = new Set();
for (const r of IDX) {
  for (const [p, bucket] of Object.entries(NAMED_PREFIX))
    if (r[2] === bucket) entryKeys.add(p + artKey(r[1]));
}
const stray = [...commissioned].filter(k => {
  if (wanted.has(k)) return false;
  return !entryKeys.has(k);        // reachable from a real entry => legitimate named art
});

console.log(`keys the resolver can request : ${wanted.size}`);
console.log(`already on disk                : ${[...wanted.keys()].filter(k => ON_DISK.has(k)).length}`);
console.log(`commissioned across ${String(packFiles.length).padStart(2)} packs   : ${commissioned.size}`);
console.log(`\nGAPS (wanted, not drawn, not commissioned): ${gaps.length}`);
if (gaps.length) {
  const byWhy = {};
  for (const g of gaps) (byWhy[g.why] = byWhy[g.why] || []).push(g.k);
  for (const [why, ks] of Object.entries(byWhy).sort((a, b) => b[1].length - a[1].length).slice(0, 25))
    console.log(`  ${String(ks.length).padStart(4)}  ${why}   e.g. ${ks[0]}`);
}
console.log(`\nRE-COMMISSIONED (already on disk but in a pack): ${dupes.length}`);
if (dupes.length) console.log("  " + dupes.slice(0, 10).join("  "));
console.log(`COMMISSIONED BUT UNREACHABLE (no entry produces this key): ${stray.length}`);
if (stray.length) console.log("  " + stray.slice(0, 10).join("  "));

const bad = gaps.length + dupes.length + stray.length;
console.log(bad ? `\n${bad} PROBLEM(S)\n` : "\ncoverage complete — every key is drawn or commissioned, nothing twice\n");
process.exit(bad ? 1 : 0);
