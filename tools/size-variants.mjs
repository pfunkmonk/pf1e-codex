/* Compute the variant counts actually needed to hit the pages-per-image target.
 *
 * WHY THIS EXISTS
 * Sizing a variant count as ceil(claimed / 20) is wrong, and wrong in a way that is invisible
 * until the art has been paid for. Entries are assigned to variants by a HASH, so the split is
 * random, not even: sizing 183 rings across 10 images gives an average of 18 but a worst case
 * near 28. The first pass at items left 93 images over target, the worst backing 56 pages.
 *
 * So this does not estimate. It runs the real resolution chain over every entry, counts what
 * actually lands on each image, raises whatever is over target, and repeats until it converges.
 * Run it after editing a theme table; it prints the corrections and, with --apply, writes them.
 *
 * Usage: node tools/size-variants.mjs [repoRoot] [--apply] [--target 20]
 */
import fs from "node:fs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const APPLY = process.argv.includes("--apply");
const ti = process.argv.indexOf("--target");
const TARGET = ti >= 0 ? Number(process.argv[ti + 1]) : 20;
const MAX_ROUNDS = 40;

const themesPath = `${ROOT}/data/themes.js`;
globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
(0, eval)(fs.readFileSync(themesPath, "utf8"));
const IDX = globalThis.window.PF_INDEX, ART = new Set(globalThis.window.PF_ART);
const THEMES = globalThis.window.PF_THEMES, FALLBACK = globalThis.window.PF_THEME_FALLBACK;
const VARIETY = { ...globalThis.window.PF_VARIETY };
const variants = {};   // "bucket/key" -> count
for (const [b, t] of Object.entries(THEMES)) for (const r of t) variants[`${b}/${r[0]}`] = r[3] || 1;

const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function hash32(s){ let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} h^=h>>>16;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return h>>>0; }
const vk = (n, id) => `${n}-${hash32(id) % (VARIETY[n] || 1) + 1}`;
const SLOT={armor:"armor",weapon:"weapon",shield:"shield",head:"head",helmet:"head",face:"head",mask:"head",ears:"head",headband:"headband",brain:"headband",eyes:"eyes",eye:"eyes",goggles:"eyes",neck:"neck",amulet:"neck",necklace:"neck",shoulders:"shoulders",shoulder:"shoulders",cloak:"shoulders",mantle:"shoulders",back:"shoulders",chest:"chest",body:"body",torso:"body",belt:"belt",waist:"belt",wrist:"wrists",wrists:"wrists",arm:"wrists",arms:"wrists",hand:"hands",hands:"hands",gloves:"hands",gauntlet:"hands",feet:"feet",boots:"feet",legs:"feet",ring:"ring",held:"held",rod:"held"};
const ICAT={Rings:"ring",Rods:"rod",Staves:"staff",Artifacts:"artifact","Cursed Items":"cursed","Intelligent Items":"intelligent","Potions & Oils":"potion",Pharmaceuticals:"potion",Technology:"technology",Cybertech:"technology","Psi-Tech":"technology"};

function themeHit(bucket, r) {
  const t = THEMES[bucket]; if (!t) return null;
  const n = r[1] || "", x = r[5] || "";
  const pick = row => ({ key: `${bucket}/${row[0]}`,
    art: `theme-${bucket}-${row[0]}-${hash32(r[0]) % variants[`${bucket}/${row[0]}`] + 1}` });
  for (const row of t) if (row[1] && row[1].test(n)) return pick(row);
  for (const row of t) if (row[2] && row[2].test(x)) return pick(row);
  return null;
}

// Resolve one entry to the image it will actually land on, assuming all declared art exists.
// `owner` names the knob to turn if that image is overloaded.
function resolve(r) {
  const b = r[2], id = r[0], fac = r[6] || {};
  if (b === "feats") {
    if (ART.has("feat-" + artKey(r[1]))) return null;                       // named: 1 page, fine
    const th = themeHit("feats", r);
    if (th) return { art: th.art, owner: { kind: "theme", key: th.key } };
    return { art: vk(FALLBACK.feats, id), owner: { kind: "variety", key: FALLBACK.feats } };
  }
  if (b === "items") {
    if (ART.has("item-" + artKey(r[1]))) return null;
    const th = themeHit("items", r);
    if (th) return { art: th.art, owner: { kind: "theme", key: th.key } };
    const raw = r[3] || "", slot = String(fac.slot || "").toLowerCase();
    for (const [cond, name] of [[raw === "Weapons", "item-weapon"], [raw === "Armor", "item-armorset"], [raw === "Artifacts", "item-artifact"]])
      if (cond) return { art: vk(name, id), owner: { kind: "variety", key: name } };
    if (ICAT[raw]) return { art: "item-" + ICAT[raw], owner: { kind: "fixed", key: "item-" + ICAT[raw] } };
    if (SLOT[slot]) {
      const name = "item-" + SLOT[slot];
      // Slot art becomes a variety set the moment it is declared in PF_VARIETY.
      return VARIETY[name] ? { art: vk(name, id), owner: { kind: "variety", key: name } }
                           : { art: name, owner: { kind: "slot", key: name } };
    }
    if (raw === "Wondrous Items") return { art: vk("item-wondrous", id), owner: { kind: "variety", key: "item-wondrous" } };
    return { art: vk(FALLBACK.items, id), owner: { kind: "variety", key: FALLBACK.items } };
  }
  return null;
}

let round = 0, bumped;
do {
  bumped = 0;
  const use = new Map();                       // art -> {n, owner}
  for (const r of IDX) {
    const hit = resolve(r); if (!hit) continue;
    const e = use.get(hit.art) || { n: 0, owner: hit.owner };
    e.n++; use.set(hit.art, e);
  }
  // Raise the count behind every overloaded image. Proportional, so it converges quickly.
  const worst = new Map();
  for (const [, e] of use) {
    if (e.n <= TARGET) continue;
    const k = `${e.owner.kind}:${e.owner.key}`;
    worst.set(k, Math.max(worst.get(k) || 0, e.n));
  }
  for (const [k, n] of worst) {
    const [kind, key] = [k.slice(0, k.indexOf(":")), k.slice(k.indexOf(":") + 1)];
    const grow = Math.max(1, Math.ceil((n / TARGET - 1) * (kind === "theme" ? variants[key] : (VARIETY[key] || 1))));
    if (kind === "theme") variants[key] += grow;
    else if (kind === "variety") VARIETY[key] = (VARIETY[key] || 1) + grow;
    else if (kind === "slot") VARIETY[key] = 2;      // promote a bare slot image to a variety set
    else continue;                                    // "fixed" rawCat art: nothing to turn
    bumped++;
  }
  round++;
} while (bumped && round < MAX_ROUNDS);

// Final measurement with the converged numbers.
const use = new Map();
for (const r of IDX) { const h = resolve(r); if (!h) continue; use.set(h.art, (use.get(h.art) || 0) + 1); }
const over = [...use.entries()].filter(([, n]) => n > TARGET).sort((a, b) => b[1] - a[1]);
console.log(`converged after ${round} round(s), target ${TARGET} pages per image`);
console.log(`worst image now backs ${Math.max(...use.values())} pages; ${over.length} still over target`);
if (over.length) console.log("  " + over.slice(0, 10).map(x => `${x[0]}:${x[1]}`).join("  ") +
  "\n  (these are rawCat images with no variant knob — e.g. item-potion — and are left as-is)");

const themeChanges = [], varietyChanges = [];
for (const [b, t] of Object.entries(THEMES)) for (const r of t) {
  const was = r[3] || 1, now = variants[`${b}/${r[0]}`];
  if (now !== was) themeChanges.push({ bucket: b, key: r[0], was, now });
}
for (const [k, v] of Object.entries(VARIETY)) {
  const was = globalThis.window.PF_VARIETY[k];
  if (v !== was) varietyChanges.push({ key: k, was: was ?? 0, now: v });
}
console.log(`\n${themeChanges.length} theme variant change(s), ${varietyChanges.length} variety set change(s)`);
for (const c of themeChanges) console.log(`   theme ${c.bucket}/${c.key}: ${c.was} -> ${c.now}`);
for (const c of varietyChanges) console.log(`   variety ${c.key}: ${c.was || "(none)"} -> ${c.now}`);
let totalImages = 0;
for (const b of Object.keys(THEMES)) for (const r of THEMES[b]) totalImages += variants[`${b}/${r[0]}`];
for (const v of Object.values(VARIETY)) totalImages += v;
console.log(`\ntotal theme + variety images at this target: ${totalImages}`);

if (!APPLY) { console.log("\n(run again with --apply to write these into data/themes.js)"); process.exit(0); }

let src = fs.readFileSync(themesPath, "utf8");
for (const c of themeChanges) {
  const re = new RegExp(`(\\["${c.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}",[\\s\\S]{0,400}?),\\s*${c.was}\\]`);
  const next = src.replace(re, `$1, ${c.now}]`);
  if (next === src) { console.error(`could not patch theme ${c.bucket}/${c.key}`); process.exit(1); }
  src = next;
}
for (const c of varietyChanges) {
  const q = `"${c.key}"`;
  if (src.includes(`${q}:`)) src = src.replace(new RegExp(`(${q}\\s*:\\s*)\\d+`), `$1${c.now}`);
  else src = src.replace(/(window\.PF_VARIETY = \{)/, `$1\n  ${q}: ${c.now},`);
}
fs.writeFileSync(themesPath, src);
console.log("\nwritten to data/themes.js");
