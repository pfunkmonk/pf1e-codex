import fs from "node:fs";
import { parsePage, isCatalogPage, bucketOf, isHubUrl, isCategoryRoot, isToolLinkPage } from "./d20-clean.mjs";

const norm = (s) => String(s || "").toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();
const archiveByName = new Map(
  JSON.parse(fs.readFileSync("D:/CODEX/d20-pilot/archive-by-name.json", "utf8"))
);

const HEADER_WORDS = /^(name|item|word|feat|spell|power|hex|title|source|cost|price|weight|armor|shield|type|group|augment|description|prerequisite|dmg|critical|range|special|level|cr|ac)\b/i;
function extractRowNames(body) {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const names = new Set();
  for (const l of lines) {
    if (l.includes("\t")) {
      const first = l.split("\t")[0].trim();
      if (first && first.length > 1 && first.length < 60 && !HEADER_WORDS.test(first) && !/^\d/.test(first)) names.add(first);
    } else {
      const words = l.split(/\s+/);
      if (words.length >= 1 && words.length <= 6 && !/[.!?:;]$/.test(l) && l.length < 60 && /^[A-Z]/.test(l)) names.add(l);
    }
  }
  return [...names];
}

const dir = "D:/CODEX/d20-pilot/pages";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
const alreadyInPilot = new Set(files); // files already in our pilot snapshot (by name), skip re-pulling these
const catalogPages = [];
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
    catalogPages.push({ file: f, name: p.nameRaw, bucket, url });
  }
}

const matchedFiles = new Map(); // archive file path -> {url, fromCatalogs: []}
for (const c of catalogPages) {
  const text = fs.readFileSync(`${dir}/${c.file}`, "utf8");
  const p = parsePage(text, c.file);
  const rowNames = extractRowNames(p.body);
  const urlPrefix = c.url.replace(/^https?:\/\/[^/]+/, "").split("/").slice(0, 3).join("/");
  for (const rn of rowNames) {
    const key = norm(rn);
    const candidates = archiveByName.get(key) || [];
    // prefer a candidate under the same URL area; else take the first if there's exactly one
    let hit = candidates.find((cand) => cand.url.includes(urlPrefix));
    if (!hit && candidates.length === 1) hit = candidates[0];
    if (hit) {
      if (!matchedFiles.has(hit.file)) matchedFiles.set(hit.file, { url: hit.url, fromCatalogs: [] });
      matchedFiles.get(hit.file).fromCatalogs.push(c.name);
    }
  }
}

console.log("total distinct archive files matched:", matchedFiles.size);
const alreadyHaveBasenames = new Set([...alreadyInPilot].map((f) => f.split("/").pop()));
let alreadyHave = 0, toPull = 0;
const pullList = [];
for (const [file, info] of matchedFiles) {
  const base = file.split("/").pop();
  if (alreadyHaveBasenames.has(base)) alreadyHave++;
  else { toPull++; pullList.push(file); }
}
console.log("already in current pilot sample:", alreadyHave, " new to pull:", toPull);
fs.writeFileSync(
  "D:/CODEX/d20-pilot/pull-list.json",
  JSON.stringify(pullList, null, 1)
);
