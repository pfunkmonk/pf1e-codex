/* CROSS-REFERENCE PULL, to convergence.
 *
 * A catalog page (a table of items/feats/spells) is not imported as one blob; instead every row that also exists as an
 * individual page elsewhere in the archive is pulled into the pilot and imported as its own entry. Newly pulled pages can
 * themselves be catalogs, so this repeats until a round pulls nothing.
 *
 *   d20-xref-catalogs.mjs   which pilot pages are catalogs  -> D:/CODEX/d20-pilot/catalog-list.json
 *   d20-xref-gather.mjs     row names -> matching archive pages not yet in the pilot -> pull-list.json
 *   d20-xref-pull.mjs       copy them into the pilot and append to the sample.json ledger (next batch number)
 *   d20-xref-index.mjs      (once) the archive's name index, archive-by-name.json
 *
 * Run AFTER d20-sample.mjs and d20-clean.mjs, then re-run d20-clean.mjs:
 *   node tools/d20/d20-xref.mjs
 */
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const SNAP = "D:/CODEX/d20-pilot";
if (!fs.existsSync(`${SNAP}/archive-by-name.json`)) {
  console.log("archive-by-name.json missing — building it once");
  spawnSync(process.execPath, [here("./d20-xref-index.mjs")], { stdio: "inherit" });
}
const run = (script) => { const r = spawnSync(process.execPath, ["--max-old-space-size=8192", here(script)], { encoding: "utf8" }); if (r.status !== 0) { console.log(r.stdout, r.stderr); throw new Error(script + " failed"); } return r.stdout; };

let total = 0;
for (let round = 1; round <= 8; round++) {
  run("./d20-xref-catalogs.mjs");
  const g = run("./d20-xref-gather.mjs");
  const list = JSON.parse(fs.readFileSync(`${SNAP}/pull-list.json`, "utf8"));
  const n = Array.isArray(list) ? list.length : (list.files || []).length;
  console.log(`round ${round}: ${n} page(s) to pull   (${(g.match(/new to pull: \d+/) || [""])[0]})`);
  if (!n) break;
  run("./d20-xref-pull.mjs");
  total += n;
}
console.log(`\ncross-reference pull converged: ${total} page(s) added this run. Now: node tools/d20/d20-clean.mjs`);
