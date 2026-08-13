/* Every art file that is derived from entry data must be reachable by the app's own
 * artKey rule. A file the resolver can never ask for is dead weight and an invisible bug. */
import fs from "node:fs";
const ROOT = process.argv[2] || ".";
globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
const present = new Set(globalThis.window.PF_ART);

// must stay identical to artKey() in app.js
const artKey = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const reach = new Set();
for (const r of globalThis.window.PF_INDEX) {
  const b = r[2], f = r[6] || {};
  if (b === "spells")  reach.add("spell-" + artKey(r[1]));
  if (b === "races")   reach.add("race-" + artKey(r[1]));
  if (b === "classes") reach.add("class-" + artKey(r[1]));
  if (b === "traits" && f.cat) reach.add("trait-" + artKey(f.cat));
  if (b === "feats" && f.t)    reach.add("feat-" + artKey(f.t));
  if (b === "monsters" && f.st) reach.add("creature-" + artKey(f.st));
  // monsters try a same-named race portrait first — this is how race-lizardfolk earns its
  // keep despite there being no Lizardfolk *race* entry
  if (b === "monsters") reach.add("race-" + artKey(r[1]));
}
const fixedPrefixes = ["cat-", "school-", "tool-", "page-", "item-", "type-", "home-", "misc-", "deities-"];
const orphans = [...present].filter(k => !reach.has(k) && !fixedPrefixes.some(p => k.startsWith(p)));
console.log(`art files: ${present.size}`);
console.log(`unreachable from entry data: ${orphans.length}`);
if (orphans.length) console.log("   " + orphans.join(", "));
else console.log("   none — every entry-derived key resolves");
