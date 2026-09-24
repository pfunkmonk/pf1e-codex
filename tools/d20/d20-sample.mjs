/* Draw a STRATIFIED pilot sample from the d20pfsrd archive and snapshot it, growing the pilot batch
 * by batch rather than redrawing over it.
 *
 * Why stratified. The crawler visits by section, so the earliest pages are dominated by traits and
 * class pages. A first-N sample would exercise only the easy sections and say nothing about the
 * ones that decide whether the system works (spells with numbered/Greater/Mass families,
 * third-party feats, archetypes named differently from AoN, magic items, monsters).
 *
 * The crawler is STILL RUNNING, so this never reads a file it might be writing: it works only from
 * pages numbered well below the current maximum, and COPIES them into a snapshot folder — every
 * later stage reads the snapshot, never the live archive.
 *
 * CUMULATIVE across runs: `sample.json` doubles as the ledger of every page ever drawn, tagged with
 * a `batch` number. Each run reads it, EXCLUDES those page numbers from the draw pool, and appends
 * this run's picks rather than overwriting — a second "give me 1,000 more" never redraws page #4,412
 * just because the seeded PRNG landed on it twice. `pages/` is already additive (files are copied in,
 * never cleared), so nothing downstream needs to change: d20-clean.mjs reads every file in pages/,
 * so the whole pipeline just processes a bigger pilot on the next run.
 *
 * Seeded PRNG (seeded per BATCH, so the same batch number always redraws the same pages if repeated
 * before its picks are excluded — batch 2 differs from batch 1 because its pool has batch 1 removed).
 *
 * Usage: node tools/d20/d20-sample.mjs [--n 1000] [--out D:/CODEX/d20-pilot] [--seed 20260922] [--margin 200] [--min-chars 400]
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const N = Number(arg("n", 1000));
const OUT = arg("out", "D:/CODEX/d20-pilot");
const SEED = Number(arg("seed", 20260922));
const ARCHIVE = "D:/CODEX/family-site-archiver/archives/www.d20pfsrd.com-2026-09-21-full";

function rng(seed) {                        // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1);
                 t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// The ledger: every page this pilot has EVER drawn, across all batches. Load before picking so this
// run's pool excludes them; batch number auto-increments off whatever is already recorded.
const prior = fs.existsSync(`${OUT}/sample.json`) ? JSON.parse(fs.readFileSync(`${OUT}/sample.json`, "utf8")) : [];
const already = new Set(prior.map((r) => r.n));
const BATCH = (prior.length ? Math.max(...prior.map((r) => r.batch || 1)) : 0) + 1;
const rand = rng(SEED + BATCH);                                  // distinct draw per batch, still reproducible

// index.csv is being appended to while we read: keep only complete rows.
const rows = fs.readFileSync(`${ARCHIVE}/index.csv`, "utf8").split("\n").slice(1).map((l) => {
  const m = /^"(\d+)","(.*)","(https?:[^"]*)","([^"]*)","(\d+)","(\d+)"$/.exec(l);
  return m ? { n: +m[1], title: m[2], url: m[3], file: m[4], status: +m[5], chars: +m[6] } : null;
}).filter(Boolean);

const maxN = Math.max(...rows.map((r) => r.n));
const MARGIN = Number(arg("margin", 200));                   // 0 once the crawl has FINISHED (the archive is then static)
const MIN_CHARS = Number(arg("min-chars", 400));
const SAFE = maxN - MARGIN;                                         // margin: never touch the newest pages
const usable = rows.filter((r) => r.n <= SAFE && r.status === 200 && r.chars > MIN_CHARS && !already.has(r.n));
console.log(`archive rows ${rows.length}, newest page #${maxN}, batch ${BATCH} (${already.size} pages already drawn in earlier batches, excluded)`);
console.log(`sampling from the ${usable.length} pages at #${SAFE} or older not yet drawn`);

const sectionOf = (u) => "/" + (new URL(u).pathname.split("/").filter(Boolean)[0] || "").toLowerCase();
const bySection = {};
for (const r of usable) (bySection[sectionOf(r.url)] ||= []).push(r);

console.log("\navailable by section:");
for (const [k, v] of Object.entries(bySection).sort((a, b) => b[1].length - a[1].length).slice(0, 16))
  console.log(`  ${k.padEnd(28)} ${String(v.length).padStart(5)}`);

// Quotas. Weighted toward the sections where matching is HARD, not toward the ones with most pages.
const QUOTA = {
  "/magic": 170, "/feats": 150, "/classes": 170, "/magic-items": 110, "/bestiary": 110,
  "/equipment": 80, "/traits": 70, "/races": 50, "/gamemastering": 25, "/skills": 20,
  "/alternative-rule-systems": 20,
};
const picked = [];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
for (const [sec, q] of Object.entries(QUOTA)) {
  const pool = shuffle([...(bySection[sec] || [])]);
  picked.push(...pool.slice(0, q).map((r) => ({ ...r, section: sec })));
}
// top up from anything not yet picked, so short sections do not shrink the pilot
const have = new Set(picked.map((r) => r.n));
if (picked.length < N) {
  const rest = shuffle(usable.filter((r) => !have.has(r.n)));
  for (const r of rest) { if (picked.length >= N) break; picked.push({ ...r, section: sectionOf(r.url) }); }
}
picked.length = Math.min(picked.length, N);

fs.mkdirSync(`${OUT}/pages`, { recursive: true });        // additive: existing files from earlier batches are untouched
let copied = 0;
for (const r of picked) {
  const src = `${ARCHIVE}/${r.file}`;
  const dst = `${OUT}/pages/${path.basename(r.file)}`;
  try { fs.copyFileSync(src, dst); copied++; } catch (e) { console.error("could not copy", r.file, e.message); }
}
const newRows = picked.map(({ n, title, url, file, chars, section }) => ({ n, title, url, file: path.basename(file), chars, section, batch: BATCH }));
fs.writeFileSync(`${OUT}/sample.json`, JSON.stringify([...prior, ...newRows], null, 1));

const dist = {};
for (const r of picked) dist[r.section] = (dist[r.section] || 0) + 1;
console.log(`\nbatch ${BATCH}: sampled ${picked.length}, copied ${copied} -> ${OUT}/pages`);
console.log("this batch by section:", Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "));
console.log(`pilot total across all batches: ${prior.length + newRows.length} pages`);
console.log(`\nNext: node tools/d20/d20-clean.mjs && node tools/d20/d20-match.mjs && node tools/d20/d20-conflicts.mjs`);
