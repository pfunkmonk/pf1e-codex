/* Downloads any art/ images listed in data/art.js that this clone does not have yet (art/ is not in git — SIZE-PLAN.md).
 *   node tools/sync-art.mjs [--base https://codex.pipsprojects.com/art] [--jobs 6]
 * Safe to re-run; never overwrites an existing file. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const ART = path.join(ROOT, "art");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://codex.pipsprojects.com/art"), JOBS = Number(arg("--jobs", 6));
fs.mkdirSync(ART, { recursive: true });
const keys = [...fs.readFileSync(path.join(ROOT, "data", "art.js"), "utf8").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const todo = keys.filter((k) => !fs.existsSync(path.join(ART, k + ".webp")));
console.log(`${keys.length} images in the manifest, ${todo.length} to download from ${BASE}`);
let done = 0, failed = 0;
async function worker() {
  while (todo.length) {
    const k = todo.pop();
    try {
      const r = await fetch(`${BASE}/${k}.webp`);
      if (!r.ok) throw new Error("HTTP " + r.status);
      fs.writeFileSync(path.join(ART, k + ".webp"), Buffer.from(await r.arrayBuffer()));
      done++;
    } catch (e) { failed++; console.log("  failed", k, String(e.message || e)); }
    if ((done + failed) % 250 === 0) console.log(`  ${done + failed} handled`);
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));
console.log(`done: ${done} downloaded, ${failed} failed`);
process.exit(failed ? 1 : 0);
