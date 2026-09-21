/* Generate the static JSON API under api/ from the Codex data files.
 *
 * Run this after ANY data change — an importer, a data repair, a rebuild — and commit the result.
 * tools/check-api.mjs fails until you do, so it cannot be forgotten silently.
 *
 * Idempotent: a file is only rewritten when its content differs, and the output has no timestamp,
 * so a re-run over unchanged data changes nothing and git sees nothing.
 *
 * It never deletes. If an entry disappears from the data its file becomes STALE — reported here
 * and by check-api — and is removed only when you pass --prune, so a scripted run cannot quietly
 * shrink a public API.
 *
 * Usage:
 *   node tools/gen-api.mjs .            # write
 *   node tools/gen-api.mjs . --dry      # report what would change, write nothing
 *   node tools/gen-api.mjs . --prune    # also delete stale entry files
 */
import fs from "node:fs";
import path from "node:path";
import { buildApi, API_ROOT } from "./lib/api-build.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const DRY = process.argv.includes("--dry");
const PRUNE = process.argv.includes("--prune");

const t0 = Date.now();
const { files, manifest, stats } = buildApi(ROOT);

let added = 0, changed = 0, same = 0, bytes = 0;
for (const [rel, text] of files) {
  const abs = path.join(ROOT, rel);
  bytes += Buffer.byteLength(text);
  let cur = null;
  // A CRLF checkout (core.autocrlf) is the same content; do not rewrite 28k files to say so.
  try { cur = fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n"); } catch { /* new file */ }
  if (cur === text) { same++; continue; }
  cur === null ? added++ : changed++;
  if (DRY) continue;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text);
}

// Stale = present on disk, no longer produced by the data.
const dir = path.join(ROOT, API_ROOT, "entries");
const stale = fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => !files.has(`${API_ROOT}/entries/${f}`)) : [];
if (stale.length && PRUNE && !DRY)
  for (const f of stale) fs.unlinkSync(path.join(dir, f));

console.log(`api ${DRY ? "(dry run) " : ""}— data release ${stats.dataVersion}`);
console.log(`  entries      : ${stats.entries.toLocaleString()} across ${manifest.buckets.length} buckets`);
console.log(`  hidden       : ${stats.hidden} scraped index page(s), same as the site`);
console.log(`  tables       : ${stats.tableCount} on ${stats.tableRows.toLocaleString()} rows`);
console.log(`  files        : ${files.size.toLocaleString()}  (${(bytes / 1048576).toFixed(1)} MB)`);
console.log(`  new ${added.toLocaleString()} · changed ${changed.toLocaleString()} · unchanged ${same.toLocaleString()}`);
if (stale.length)
  console.log(`  STALE        : ${stale.length} entry file(s) no longer in the data — ` +
              (PRUNE && !DRY ? "pruned" : "re-run with --prune to remove") + `\n    ${stale.slice(0, 5).join(", ")}`);
console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
