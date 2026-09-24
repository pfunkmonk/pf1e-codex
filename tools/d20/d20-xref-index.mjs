/* Build the archive's NAME INDEX: normalised page title -> every archive page with that title.
 *
 * Why: a catalog page (a table of items, feats, spells...) lists rows that usually ALSO exist as individual pages elsewhere in
 * the archive. Rather than parse the table (lossy), the cross-reference step finds those individual pages by name and pulls
 * them into the pilot. This index is what makes that lookup instant. Rebuild only if the archive itself changes.
 *
 *   node tools/d20/d20-xref-index.mjs [--archive <dir>] [--out D:/CODEX/d20-pilot/archive-by-name.json]
 */
import fs from "node:fs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const ARCHIVE = arg("archive", "D:/CODEX/family-site-archiver/archives/www.d20pfsrd.com-2026-09-21-full");
const OUT = arg("out", "D:/CODEX/d20-pilot/archive-by-name.json");

export const normName = (s) => String(s || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
export function parseCsvLine(line) {
  const fields = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === "," && !inQ) { fields.push(cur); cur = ""; }
    else cur += c;
  }
  fields.push(cur);
  return fields;
}

if (process.argv[1] && process.argv[1].endsWith("d20-xref-index.mjs")) {
  const csv = fs.readFileSync(`${ARCHIVE}/index.csv`, "utf8");
  const byName = new Map();
  for (const line of csv.trim().split("\n").slice(1)) {
    const [, title, url, file, , chars] = parseCsvLine(line);
    const key = normName(String(title).replace(/\s+[–-]\s+d20PFSRD$/i, ""));
    if (!key) continue;
    (byName.get(key) || byName.set(key, []).get(key)).push({ url, file, chars: Number(chars) });
  }
  fs.writeFileSync(OUT, JSON.stringify([...byName]));
  console.log(`wrote ${OUT}: ${byName.size} distinct names`);
}
