/* Splits each data/cat/<bucket>.js (all of a category's entry text in one file — monsters alone is 39 MB raw / 11 MB brotli) into SHARDS of about 1 MB raw, so opening
 * ONE entry downloads one shard (~0.3 MB) instead of the whole category. GENERATED at build time (tools/build-generated.mjs) and gitignored; the monolithic bucket files stay
 * the source of truth and the fallback (the app uses them whenever a shard is missing, for full-text search, and for the tools).
 *
 *   data/cat-shards/<bucket>/<n>.js   window.PF_REGPART("<bucket>", <n>, {id: body, ...});
 *   data/shards.js                    window.PF_SHARDS = {"<bucket>": <shard count>, ...};
 *
 * An id lives in shard  parseInt(id.slice(0, 6), 16) % count.  app.js (shardOf) MUST use the same rule. Ids are hex hashes, so shards come out even. */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || ".");
const CAT = path.join(ROOT, "data", "cat"), OUT = path.join(ROOT, "data", "cat-shards");
const TARGET = 1_000_000;                       // raw bytes per shard (before transport compression)
export const shardOf = (id, n) => parseInt(String(id).slice(0, 6), 16) % n;

fs.rmSync(OUT, { recursive: true, force: true });
const counts = {}; let files = 0, bodies = 0;
for (const f of fs.readdirSync(CAT).filter((x) => x.endsWith(".js")).sort()) {
  const slug = f.slice(0, -3), text = fs.readFileSync(path.join(CAT, f), "utf8");
  const open = `window.PF_REG("${slug}",`;
  if (!text.startsWith(open) || !text.trimEnd().endsWith(");")) throw new Error("cannot parse " + f);
  const map = JSON.parse(text.slice(open.length, text.trimEnd().length - 2));
  const ids = Object.keys(map), n = Math.max(1, Math.ceil(text.length / TARGET));
  const parts = Array.from({ length: n }, () => ({}));
  for (const id of ids) {
    if (!/^[0-9a-f]{6,}$/.test(id)) throw new Error(`${slug}: id "${id}" is not hex — the shard rule needs hex ids`);
    parts[shardOf(id, n)][id] = map[id];
  }
  fs.mkdirSync(path.join(OUT, slug), { recursive: true });
  parts.forEach((p, i) => fs.writeFileSync(path.join(OUT, slug, i + ".js"), `window.PF_REGPART("${slug}",${i},${JSON.stringify(p)});\n`));
  counts[slug] = n; files += n; bodies += ids.length;
}
fs.writeFileSync(path.join(ROOT, "data", "shards.js"), "window.PF_SHARDS=" + JSON.stringify(counts) + ";\n");
console.log(`cat shards: ${files} files for ${Object.keys(counts).length} buckets, ${bodies} entry bodies`);
