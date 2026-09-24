/* CATALOG COVERAGE — which excluded catalog pages hold table content that exists NOWHERE else?
 *
 * A catalog page (one page, many items) is normally excluded because its rows are individual entries elsewhere
 * (d20-xref pulls those). But some catalogs are the ONLY home of their rows — equipment lists, talent lists,
 * summoning tables — and excluding them silently drops real content. Now that the Codex renders tab-separated
 * rows as real tables (app.js renderTabTable), such a catalog can be imported as ONE table-page entry.
 *
 * A catalog is KEPT when, counting only real row names (header cells, stat fragments like "BAB +1", "Str 13" and
 * download lists are ignored), at least MIN_MISSING rows are missing from the Codex under any name AND missing rows are
 * at least MIN_SHARE of all rows. d20-clean.mjs reads the result (catalog-keep.json) and lets those pages through as
 * entries; the normal match / import / verify pipeline does the rest.
 *
 *   node tools/d20/d20-xref-coverage.mjs [--root <repo>] [--min-missing 20] [--min-share 0.25] [--show]
 */
import fs from "node:fs";
import { parsePage, isCatalogPage, bucketOf, isHubUrl, isCategoryRoot, isToolLinkPage } from "./d20-clean.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");
const MIN_MISSING = Number(arg("min-missing", 20)), MIN_SHARE = Number(arg("min-share", 0.25));
const SNAP = "D:/CODEX/d20-pilot";

const norm = (s) => String(s || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
const strip = (s) => norm(String(s).replace(/\*+\d*$/, "").replace(/\d+$/, "").replace(/\s*\([^)]{0,30}\)\s*$/, "").replace(/\s*\[[^\]]*\]\s*$/, ""));
const HEADER = /^(name|item|word|feat|spell|power|hex|title|source|cost|price|weight|armor|shield|type|group|augment|description|prerequisite|dmg|critical|range|special|level|cr|ac|talent|trick|monster|deity|discovery|formula name|file name|feature|situation|size|vehicle|gender|patron theme)\b/i;
// a first cell that is a stat/cell fragment, not the name of a thing
const FRAGMENT = /^([+\-–<>(]|BAB\b|Str\b|Dex\b|Con\b|Int\b|Wis\b|Cha\b|\d)|racial bonus|\[Download\]|\.zip\b|\.pdf\b/i;
const JUNK_PAGES = /Hero Lab Community Repository/i;

globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/index.js`, "utf8"));
const have = new Set(); for (const r of window.PF_INDEX) { have.add(norm(r[1])); have.add(strip(r[1])); }
const abn = new Map(JSON.parse(fs.readFileSync(`${SNAP}/archive-by-name.json`, "utf8")));

const dir = `${SNAP}/pages`, keep = [], report = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".txt"))) {
  const p = parsePage(fs.readFileSync(`${dir}/${f}`, "utf8"), f); const url = p.head.URL || ""; const bucket = bucketOf(p.crumb, url || "https://x/");
  const ls = p.body.split("\n").map((l) => l.trim()).filter(Boolean);
  if ((url && isHubUrl(url)) || isCategoryRoot(p.children, p.crumb, p.body.length, p.body, p.nameRaw) || (bucket === "spells" && p.crumb.includes("Spells by Class")) || isToolLinkPage(p.body)) continue;
  if (JUNK_PAGES.test(p.nameRaw) || !isCatalogPage(bucket, p.body.length, ls, p.body, p.nameRaw)) continue;
  // The 3rd-party feat HUB template (a summary of feats that each have their own page) is never kept, whatever its row names look like.
  if (/Feats are summarized on the table below|The following table lists all feats, showing prerequisites in tree form/.test(p.body)) continue;
  const seen = new Set(); let missing = 0;
  for (const l of ls) {
    if (!l.includes("\t")) continue;
    const first = l.split("\t")[0].trim();
    if (!first || first.length < 3 || first.length > 60 || HEADER.test(first) || FRAGMENT.test(first) || seen.has(first)) continue;
    seen.add(first);
    if (!have.has(norm(first)) && !have.has(strip(first)) && !(abn.get(norm(first)) || []).length) missing++;
  }
  const row = { file: f, name: p.nameRaw, bucket, rows: seen.size, missing };
  report.push(row);
  if (seen.size >= 15 && missing >= MIN_MISSING && missing / seen.size >= MIN_SHARE) keep.push(f);
}
fs.writeFileSync(`${SNAP}/catalog-keep.json`, JSON.stringify(keep, null, 1));
console.log(`catalog pages examined: ${report.length} | KEPT as table-page entries: ${keep.length}  (missing rows covered: ${report.filter((r) => keep.includes(r.file)).reduce((n, r) => n + r.missing, 0)})`);
if (argv.includes("--show")) report.filter((r) => keep.includes(r.file)).sort((a, b) => b.missing - a.missing).forEach((r) => console.log(`  ${r.name.slice(0, 44).padEnd(45)} ${r.bucket.padEnd(8)} rows ${String(r.rows).padStart(4)} missing ${String(r.missing).padStart(4)}`));
