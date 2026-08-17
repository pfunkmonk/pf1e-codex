/* Ingest generated art into the repo: resize, encode to WebP, verify, refresh the manifest.
 *
 * Replaces ingest-art.ps1, which used System.Drawing (GDI+) and physically cannot write WebP.
 *
 * WHAT IT GUARANTEES
 *  - Only keys the app can actually reach are ingested. A stray source file landing in art/ is
 *    dead weight no code path will ever request; that is exactly how the retired `cat-deities`
 *    image once slipped in. The accepted set is themes.js (themes + fallback scenes) plus any
 *    --keys manifest emitted by gen-art-prompts.mjs, plus whatever is already in art/.
 *  - Cloud-sync races do not produce false "missing source" reports. Box delivers files one at a
 *    time, so the preferred variant can be briefly absent while a sibling is already present;
 *    any -vN variant is accepted as a fallback.
 *  - Aspect ratio is preserved by COVER-cropping to the target, never squashed. The old script
 *    stretched to fit, which quietly distorted any source that was not exactly 16:9.
 *
 * Needs `sharp`. It is not a repo dependency (this repo has no package.json on purpose — Netlify
 * publishes from the root and a package.json risks turning a static deploy into a build). Install
 * it anywhere and point SHARP_MODULE at it, or run this from a folder that has it.
 *
 * Usage:
 *   node tools/ingest-art.mjs --src "C:/Users/mailp/Box/CODEX IMAGES" [--keys BATCH10-keys.json]
 *                             [--width 1280] [--height 720] [--quality 78] [--dry]
 */
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const has = n => argv.includes("--" + n);

const REPO = arg("repo", ".");
const SRC = arg("src", "C:/Users/mailp/Box/CODEX IMAGES");
const KEYS = arg("keys", null);
const W = Number(arg("width", 1280));      // batches 1-9 were 1600x900; batch 10 on is 1280x720
const H = Number(arg("height", 720));
const Q = Number(arg("quality", 78));      // matches the q78 the existing library was re-encoded at
const DRY = has("dry");
const REPLACE = has("replace");   // re-encode keys that already exist in art/ (see the guard below)

const { default: sharp } = await import(process.env.SHARP_MODULE || "sharp");

const artDir = path.join(REPO, "art");

/* ---- what we are allowed to accept ---------------------------------- */
globalThis.window = {};
(0, eval)(fs.readFileSync(path.join(REPO, "data/themes.js"), "utf8"));
const planned = new Set();
for (const [bucket, table] of Object.entries(globalThis.window.PF_THEMES || {}))
  for (const row of table)
    for (let v = 1; v <= (row[3] || 1); v++) planned.add(`theme-${bucket}-${row[0]}-${v}`);
// Every variety set, from the single declaration in themes.js. This used to read
// PF_THEME_FALLBACK as {key, scenes} objects; those became plain set NAMES when the counts moved
// into PF_VARIETY, so it was silently adding nothing and ingest would reject every variety image
// unless --keys happened to be supplied.
for (const [name, count] of Object.entries(globalThis.window.PF_VARIETY || {}))
  for (let v = 1; v <= count; v++) planned.add(`${name}-${v}`);
/* Named art (feat-<name>, deity-<name>, item-<name>) cannot be enumerated from themes.js — it is
 * per-entry and only exists because a pack asked for it. The key manifests live in the same folder
 * as the images, so pick them all up automatically rather than relying on --keys being remembered.
 * Forgetting it silently rejected every named image, which reads as "the generator skipped them". */
const keyFiles = KEYS ? [KEYS]
  : fs.readdirSync(SRC).filter(f => /^BATCH\d+-keys\.json$/.test(f)).map(f => path.join(SRC, f));
for (const kf of keyFiles) {
  for (const k of JSON.parse(fs.readFileSync(kf, "utf8"))) planned.add(k);
}
if (keyFiles.length) console.log(`key manifests: ${keyFiles.map(f => path.basename(f)).join(", ")}`);
// Anything already shipped stays ingestable, so a re-run can replace an existing image.
for (const f of fs.readdirSync(artDir)) if (/\.webp$/i.test(f)) planned.add(f.replace(/\.webp$/i, ""));
console.log(`accepting ${planned.size} art keys`);

/* ---- find a source file per key -------------------------------------- */
const EXT = /\.(png|jpe?g|webp|bmp)$/i;
const files = fs.readdirSync(SRC).filter(f => EXT.test(f));
const byKey = new Map();          // key -> [filenames], preferring lower variant numbers
for (const f of files) {
  const base = f.replace(EXT, "");
  const m = base.match(/^(.*?)(?:-v(\d+))?$/);
  const key = m[1], v = m[2] ? Number(m[2]) : 0;
  if (!planned.has(key)) continue;
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push({ f, v });
}
for (const list of byKey.values()) list.sort((a, b) => a.v - b.v);

const unplanned = files.filter(f => {
  const base = f.replace(EXT, "").replace(/-v\d+$/, "");
  return !planned.has(base);
});

/* ---- ingest ----------------------------------------------------------- */
let ok = 0, failed = [], skippedExisting = 0;
for (const [key, list] of byKey) {
  const src = path.join(SRC, list[0].f);
  const dst = path.join(artDir, key + ".webp");
  // Never silently re-encode art we already shipped. The source PNGs for batches 1-9 are still
  // in the same folder, and those were ingested at 1600x900 — a default re-run would quietly
  // DOWNSCALE the entire existing library to the new 1280x720 target. Opt in with --replace.
  if (!REPLACE && fs.existsSync(dst)) { skippedExisting++; continue; }
  if (DRY) { ok++; continue; }
  try {
    const buf = await sharp(src)
      .resize(W, H, { fit: "cover", position: "attention" })   // crop, never squash
      .webp({ quality: Q, effort: 5 })
      .toBuffer();
    fs.writeFileSync(dst, buf);
    // Verify what we just wrote actually decodes, rather than trusting the encoder.
    const meta = await sharp(dst).metadata();
    if (meta.format !== "webp" || meta.width !== W || meta.height !== H)
      throw new Error(`bad output ${meta.format} ${meta.width}x${meta.height}`);
    ok++;
  } catch (e) { failed.push(`${key}: ${e.message}`); }
}

console.log(`${DRY ? "would ingest" : "ingested"} ${ok} at ${W}x${H} q${Q}`);
if (skippedExisting) console.log(`left alone ${skippedExisting} key(s) already in art/ (pass --replace to re-encode)`);
const missing = [...planned].filter(k => !byKey.has(k) && !fs.existsSync(path.join(artDir, k + ".webp")));
if (missing.length) console.log(`no source yet for ${missing.length}: ${missing.slice(0, 12).join(", ")}${missing.length > 12 ? " …" : ""}`);
if (unplanned.length) console.log(`SKIPPED, not in the plan (${unplanned.length}): ${unplanned.slice(0, 12).join(", ")}${unplanned.length > 12 ? " …" : ""}`);
if (failed.length) { console.log("FAILURES:"); failed.forEach(f => console.log("  " + f)); }

if (!DRY) {
  const all = fs.readdirSync(artDir).filter(f => /\.webp$/i.test(f));
  const mb = all.reduce((n, f) => n + fs.statSync(path.join(artDir, f)).size, 0) / 1048576;
  console.log(`art/ now holds ${all.length} files, ${mb.toFixed(1)} MB`);
  console.log("next: node tools/gen-art-manifest.mjs . && node tools/check-themes.mjs . && node tools/check-reachable.mjs .");
}
process.exit(failed.length ? 1 : 0);
