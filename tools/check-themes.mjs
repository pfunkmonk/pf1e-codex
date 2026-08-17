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
const MIN_CLAIM = 2, PAGES_PER_IMAGE = 20;

/* MAX_CLAIM is per bucket, because "too broad" means different things in each.
 * A feat theme claiming 150+ is nearly always an accident — feat names are verb phrases, and a
 * regex that big is usually matching bare adjectives (the first `weapon-training` draft caught
 * improved/greater/master/advanced and swallowed 139 unrelated feats).
 * Item names are NOUNS, so large claims can be entirely legitimate: `ring` claims 183 and `rod`
 * 152 simply because the game has that many rings and rods. Those are concrete objects an
 * illustrator can draw, not a vague catch-all, and their variant counts keep them under 20 pages
 * per image. The per-image check below is the real quality gate; this one catches vagueness.
 * Spells are the same story for a different reason: their themes match mostly on SUBSCHOOL and
 * DESCRIPTOR, which are authored categories rather than guesses. `charm-mind` claims 191 because
 * compulsion is genuinely the largest subschool in the game, not because the regex is sloppy. */
const MAX_CLAIM = { feats: 150, items: 260, spells: 200 };
const maxClaim = b => MAX_CLAIM[b] ?? 150;

globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/themes.js`, "utf8"));
const IDX = globalThis.window.PF_INDEX;
const ART = new Set(globalThis.window.PF_ART);
const THEMES = globalThis.window.PF_THEMES || {};
const FALLBACK = globalThis.window.PF_THEME_FALLBACK || {};
const VARIETY = globalThis.window.PF_VARIETY || {};
const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* An entry that resolves BEFORE the theme layer never reaches it, so it must not count toward a
 * theme's claim. For most buckets that is just "has its own named art". Monsters are different:
 * a real wolf resolves through race-/creature-/type- art long before any theme is consulted, and
 * counting those inflated animal-canine from 12 to 31 and reported failures that do not exist.
 * This mirrors the order in entryArtKey — if the two drift, this check goes quietly wrong. */
const NAMED = { feats: "feat-", spells: "spell-", items: "item-" };
function resolvesEarlier(bucket, row) {
  if (NAMED[bucket] && ART.has(NAMED[bucket] + artKey(row[1]))) return true;
  if (bucket !== "monsters") return false;
  const nm = artKey(row[1]), fac = row[6] || {};
  if (["monster-", "race-", "creature-", "type-"].some(p => ART.has(p + nm))) return true;
  return !!(fac.st && ART.has("creature-" + artKey(fac.st)));
}

let failed = 0;
const fail = m => { console.log(`  FAIL  ${m}`); failed++; };

for (const [bucket, table] of Object.entries(THEMES)) {
  const rows = IDX.filter(r => r[2] === bucket);
  const claims = new Map(table.map(t => [t[0], []]));
  const strays = [];
  let named = 0;

  for (const r of rows) {
    if (resolvesEarlier(bucket, r)) { named++; continue; }   // resolves before the theme layer
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
    else if (list.length > maxClaim(bucket)) fail(`${bucket}/${key} claims ${list.length} (> ${maxClaim(bucket)}) — too broad; split it or move it later in the table`);
    else if (list.length < MIN_CLAIM) fail(`${bucket}/${key} claims only ${list.length} — dead weight, fold it into a neighbour`);
    const per = Math.ceil(list.length / variants);
    if (per > PAGES_PER_IMAGE)
      fail(`${bucket}/${key} needs ${Math.ceil(list.length / PAGES_PER_IMAGE)} variants, has ${variants} (${per} pages on one image)`);
  }

  // The straggler set has to be big enough to absorb whatever matched nothing.
  const fbName = FALLBACK[bucket];
  if (fbName && fbName.endsWith("*")) {
    // Per-facet fallback: every set sharing the prefix must exist. size-variants sizes them.
    const prefix = fbName.slice(0, -1);
    const sets = Object.keys(VARIETY).filter(k => k.startsWith(prefix));
    if (!sets.length) fail(`${bucket} falls back to "${fbName}" but no set with that prefix is declared`);
    else console.log(`    stragglers ${strays.length} -> ${sets.length} per-facet sets (${prefix}…), sized individually`);
    continue;
  }
  const fbCount = VARIETY[fbName];
  if (!fbName) { if (strays.length) fail(`${bucket} has ${strays.length} unthemed entries and NO fallback scene set`); }
  else if (!fbCount) fail(`${bucket} falls back to "${fbName}", which is not declared in PF_VARIETY`);
  else {
    // Buckets can route stragglers to their OWN variety sets before the general one (items send
    // Weapons/Armor/Artifacts/Wondrous to theirs), so this is an upper bound, not an exact figure.
    const per = Math.ceil(strays.length / fbCount);
    console.log(`    stragglers ${strays.length} -> ${fbName}-1..${fbCount} and any bucket-specific sets (<= ${per} pages per scene)`);
    if (per > PAGES_PER_IMAGE * 3) fail(`${bucket} fallback ${fbName} has ${fbCount} scenes for ${strays.length} stragglers`);
  }

  // How much art this bucket still owes, so the number in the batch plan is never guessed.
  const missing = [];
  for (const t of table) for (let v = 1; v <= (t[3] || 1); v++) {
    const k = `theme-${bucket}-${t[0]}-${v}`; if (!ART.has(k)) missing.push(k);
  }
  console.log(`    theme art present ${images - missing.length} / ${images}   still to generate: ${missing.length}`);
}

console.log("\n=== variety sets ===");
for (const [name, n] of Object.entries(VARIETY)) {
  let have = 0;
  for (let i = 1; i <= n; i++) if (ART.has(`${name}-${i}`)) have++;
  console.log(`    ${name.padEnd(16)} ${String(have).padStart(3)} / ${n}${have < n ? `   (${n - have} to generate)` : ""}`);
}
console.log(failed ? `\n${failed} PROBLEM(S)\n` : "\nall theme checks pass\n");
process.exit(failed ? 1 : 0);
