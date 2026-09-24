import fs from "node:fs";
import { parsePage, isCategoryRoot, isToolLinkPage, isCatalogPage, bucketOf, isHubUrl } from "./d20-clean.mjs";

const dir = "D:/CODEX/d20-pilot/pages";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
const catalogs = [];
for (const f of files) {
  const text = fs.readFileSync(`${dir}/${f}`, "utf8");
  const p = parsePage(text, f);
  const url = p.head.URL || "";
  const bucket = bucketOf(p.crumb, url || "https://x/");
  const ls = p.body.split("\n").map((l) => l.trim()).filter(Boolean);
  if (url && isHubUrl(url)) continue;
  if (isCategoryRoot(p.children, p.crumb, p.body.length, p.body, p.nameRaw)) continue;
  if (bucket === "spells" && p.crumb.includes("Spells by Class")) continue;
  if (isToolLinkPage(p.body)) continue;
  if (isCatalogPage(bucket, p.body.length, ls, p.body, p.nameRaw)) {
    catalogs.push({ file: f, name: p.nameRaw, bucket, url, bodyLen: p.body.length });
  }
}
fs.writeFileSync(
  "D:/CODEX/d20-pilot/catalog-list.json",
  JSON.stringify(catalogs, null, 1)
);
console.log("total catalog pages:", catalogs.length);
const byBucket = {};
catalogs.forEach((c) => { byBucket[c.bucket] = (byBucket[c.bucket] || 0) + 1; });
console.log(byBucket);
