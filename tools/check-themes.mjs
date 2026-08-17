/* Guards the keyword-theme tables in data/themes.js.
 *
 * Themes are matched by an ORDERED list of regexes, which is a design that fails quietly: a theme
 * placed too high, or written too broadly, steals entries from every theme below it and nobody
 * notices because every page still gets *a* picture. The original `weapon-training` theme matched
 * the bare adjectives improved/greater/master/advanced and silently claimed 139 unrelated feats.
 *
 * So this asserts the things a human eye will not catch:
 *   - no theme claims more than MAX_CLAIM entries        (too broad to mean anything)
 *   - no theme claims fewer than MIN_CLAIM               (dead weight — art nobody sees)
 *   - no theme claims nothing at all                     (typo in a regex, or a rule above eats it)
 *   - every theme's variant count keeps it under PAGES_PER_IMAGE
 *   - the app's resolution order is reproduced EXACTLY (name pass, then text pass)
 *
 * Exit code is non-zero on failure so this can gate a release.
 * Usage: node tools/check-themes.mjs [repoRoot]
 */
import fs from "node:fs";

const ROOT = process.argv[2] || ".";
const MAX_CLAIM = 150, MIN_CLAIM = 2, PAGES_PER_IMAGE = 20;

globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/themes.js`, "utf8"));
const IDX = globalThis.window.PF_INDEX;
const ART = new Set(globalThis.window.PF_ART);
const THEMES = globalThis.window.PF_THEMES || {};
const FALLBACK = globalThis.window.PF_THEME_FALLBACK || {};
const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Named-art prefix per bucket: an entry with its own picture never reaches the theme layer,
// so it must not count toward a theme's claim.
const NAMED = { feats: "feat-", spells: "spell-", items: "item-" };

let failed = 0;
const fail = m => { console.log(`  FAIL  ${m}`); failed++; };

for (const [bucket, table] of Object.entries(THEMES)) {
  const rows = IDX.filter(r => r[2] === bucket);
  const claims = new Map(table.map(t => [t[0], []]));
  const strays = [];
  let named = 0;

  for (const r of rows) {
    if (NAMED[bucket] && ART.has(NAMED[bucket] + artKey(r[1]))) { named++; continue; }   // has its own art
    const name = r[1] || "", text = r[5] || "";
    let key = null;
    for (const t of table) if (t[1] && t[1].test(name)) { key = t[0]; break; }
    if (!key) for (const t of table) if (t[2] && t[2].test(text)) { key = t[0]; break; }
    if (key) claims.get(key).push(r[1]); else strays.push(r[1]);
  }

  const sizes = [...claims.entries()].sort((a, b) => b[1].length - a[1].length);
  const themed = rows.length - strays.length - named;
  let images = 0;
  for (const t of table) images += (t[3] || 1);

  console.log(`\n=== ${bucket} — ${rows.length} entries, ${table.length} themes, ${images} theme images ===`);
  console.log(`    own art ${named}   themed ${themed} (${(themed / (rows.length - named) * 100).toFixed(1)}% of the rest)   no theme matched: ${strays.length}`);
  console.log(`    largest ${sizes[0][0]}:${sizes[0][1].length}   smallest ${sizes[sizes.length - 1][0]}:${sizes[sizes.length - 1][1].length}`);

  for (const [key, list] of sizes) {
    const t = table.find(x => x[0] === key), variants = t[3] || 1;
    if (list.length === 0) fail(`${bucket}/${key} claims NOTHING — dead regex, or an earlier theme eats it`);
    else if (list.length > MAX_CLAIM) fail(`${bucket}/${key} claims ${list.length} (> ${MAX_CLAIM}) — too broad; split it or move it later in the table`);
    else if (list.length < MIN_CLAIM) fail(`${bucket}/${key} claims only ${list.length} — dead weight, fold it into a neighbour`);
    const per = Math.ceil(list.length / variants);
    if (per > PAGES_PER_IMAGE)
      fail(`${bucket}/${key} needs ${Math.ceil(list.length / PAGES_PER_IMAGE)} variants, has ${variants} (${per} pages on one image)`);
  }

  // The straggler set has to be big enough to absorb whatever matched nothing.
  const fb = FALLBACK[bucket];
  if (!fb) { if (strays.length) fail(`${bucket} has ${strays.length} unthemed entries and NO fallback scene set`); }
  else {
    const per = Math.ceil(strays.length / fb.scenes);
    console.log(`    fallback ${fb.key}-1..${fb.scenes}  ->  ${per} pages per scene`);
    if (per > PAGES_PER_IMAGE) fail(`${bucket} fallback needs ${Math.ceil(strays.length / PAGES_PER_IMAGE)} scenes, has ${fb.scenes}`);
  }

  // How much art this bucket still owes, so the number in the batch plan is never guessed.
  const missing = [];
  for (const t of table) for (let v = 1; v <= (t[3] || 1); v++) {
    const k = `theme-${bucket}-${t[0]}-${v}`; if (!ART.has(k)) missing.push(k);
  }
  if (fb) for (let v = 1; v <= fb.scenes; v++) if (!ART.has(`${fb.key}-${v}`)) missing.push(`${fb.key}-${v}`);
  console.log(`    art present ${images + (fb ? fb.scenes : 0) - missing.length} / ${images + (fb ? fb.scenes : 0)}   still to generate: ${missing.length}`);
}

console.log(failed ? `\n${failed} PROBLEM(S)\n` : "\nall theme checks pass\n");
process.exit(failed ? 1 : 0);
