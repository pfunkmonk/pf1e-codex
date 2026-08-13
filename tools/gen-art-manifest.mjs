/* Generate data/art.js — the list of art files that ACTUALLY exist on disk.
 *
 * The app previously had one hand-maintained list serving two different questions:
 *   "what art do we plan to have?"  and  "what art exists right now?"
 * Those drift apart the moment a batch is generated, which made the gallery's
 * progress count wrong and made the resolver fire 404s for art not yet drawn.
 * Now: ART (in app.js) = the PLAN, PF_ART (here, generated) = what is PRESENT.
 *
 * Run after every ingest. Idempotent.
 */
import fs from "node:fs";

const ROOT = process.argv[2] || ".";
const keys = fs.readdirSync(`${ROOT}/art`)
  .filter(f => /\.jpg$/i.test(f))
  .map(f => f.replace(/\.jpg$/i, ""))
  .sort();

const out = "window.PF_ART=" + JSON.stringify(keys) + ";\n";
const path = `${ROOT}/data/art.js`;
const prev = fs.existsSync(path) ? fs.readFileSync(path, "utf8") : "";
if (prev === out) { console.log(`data/art.js already current (${keys.length} files)`); process.exit(0); }
fs.writeFileSync(path, out, "utf8");
console.log(`wrote data/art.js — ${keys.length} art files present (${Math.round(out.length / 1024)} KB)`);
