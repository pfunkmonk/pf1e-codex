/* Proves the generated shards (tools/gen-cat-shards.mjs) are exactly the monolithic bucket files, split: every entry body appears in exactly the shard the app will ask for
 * (same rule as app.js shardOf), byte-for-byte equal to the monolith, and nothing else is in any shard. Exit 1 on any difference.
 *   node tools/check-shards.mjs [repoRoot] */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || ".");
const shardOf = (id, n) => parseInt(String(id).slice(0, 6), 16) % n;
globalThis.window = {};
(0, eval)(fs.readFileSync(path.join(ROOT, "data", "shards.js"), "utf8"));
const COUNTS = window.PF_SHARDS;
let bad = 0, entries = 0; const say = (m) => { bad++; if (bad < 15) console.log("FAIL " + m); };
for (const f of fs.readdirSync(path.join(ROOT, "data", "cat")).filter((x) => x.endsWith(".js")).sort()) {
  const slug = f.slice(0, -3), text = fs.readFileSync(path.join(ROOT, "data", "cat", f), "utf8");
  const mono = JSON.parse(text.slice(`window.PF_REG("${slug}",`.length, text.trimEnd().length - 2));
  const n = COUNTS[slug]; if (!n) { say(`${slug}: no shard count`); continue; }
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const p = path.join(ROOT, "data", "cat-shards", slug, i + ".js");
    if (!fs.existsSync(p)) { say(`${slug}/${i} missing`); continue; }
    const s = fs.readFileSync(p, "utf8"), open = `window.PF_REGPART("${slug}",${i},`;
    if (!s.startsWith(open)) { say(`${slug}/${i}: bad header`); continue; }
    const part = JSON.parse(s.slice(open.length, s.trimEnd().length - 2));
    for (const [id, body] of Object.entries(part)) {
      if (shardOf(id, n) !== i) say(`${slug}/${i}: ${id} belongs in shard ${shardOf(id, n)}`);
      if (mono[id] !== body) say(`${slug}/${i}: ${id} differs from the monolith`);
      if (seen.has(id)) say(`${slug}: ${id} in two shards`); seen.add(id);
    }
  }
  for (const id of Object.keys(mono)) { entries++; if (!seen.has(id)) say(`${slug}: ${id} missing from every shard`); }
  if (seen.size !== Object.keys(mono).length) say(`${slug}: shard union has ${seen.size} ids, monolith ${Object.keys(mono).length}`);
}
console.log(bad ? `\n${bad} PROBLEM(S)` : `shards are exactly the monolith, split: ${entries} entry bodies across ${Object.values(COUNTS).reduce((a, b) => a + b, 0)} shard files`);
process.exit(bad ? 1 : 0);
