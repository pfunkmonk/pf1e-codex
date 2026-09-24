// Targeted pull: copy specific already-identified archive pages into the pilot snapshot, the same way
// d20-sample.mjs does for its random draws, and append them to the SAME cumulative sample.json ledger
// under the next batch number, so the rest of the pipeline (clean/match/conflicts/import) treats them
// identically to a normal random batch.
import fs from "node:fs";

const ARCHIVE = "D:/CODEX/family-site-archiver/archives/www.d20pfsrd.com-2026-09-21-full";
const SNAP = "D:/CODEX/d20-pilot";

function parseCsvLine(line) {
  const fields = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { fields.push(cur); cur = ""; }
    else cur += c;
  }
  fields.push(cur);
  return fields;
}

const csv = fs.readFileSync(`${ARCHIVE}/index.csv`, "utf8");
const byFile = new Map();
for (const line of csv.trim().split("\n").slice(1)) {
  const [number, title, url, file, status, chars] = parseCsvLine(line);
  byFile.set(file, { n: Number(number), title, url, file, chars: Number(chars), status });
}

const pullList = JSON.parse(
  fs.readFileSync("D:/CODEX/d20-pilot/pull-list.json", "utf8")
);

const sample = JSON.parse(fs.readFileSync(`${SNAP}/sample.json`, "utf8"));
const nextBatch = Math.max(...sample.map((r) => r.batch)) + 1;
const already = new Set(sample.map((r) => r.n));

let copied = 0, skippedMissing = 0, skippedAlready = 0, skippedBadStatus = 0;
const newRows = [];
for (const file of pullList) {
  const meta = byFile.get(file);
  if (!meta) { skippedMissing++; continue; }
  if (already.has(meta.n)) { skippedAlready++; continue; }
  if (meta.status !== "200") { skippedBadStatus++; continue; }
  const src = `${ARCHIVE}/${file}`;
  const dstName = file.replace(/^pages\//, "");
  const dst = `${SNAP}/pages/${dstName}`;
  if (!fs.existsSync(src)) { skippedMissing++; continue; }
  fs.copyFileSync(src, dst);
  copied++;
  const section = "/" + (meta.url.replace(/^https?:\/\/[^/]+\//, "").split("/")[0] || "");
  newRows.push({ n: meta.n, title: meta.title, url: meta.url, file: dstName, chars: meta.chars, section, batch: nextBatch });
}

const merged = sample.concat(newRows);
fs.writeFileSync(`${SNAP}/sample.json`, JSON.stringify(merged, null, 1));

console.log("copied:", copied, " skipped (missing file):", skippedMissing, " skipped (already in ledger):", skippedAlready, " skipped (bad status):", skippedBadStatus);
console.log("new batch number:", nextBatch, " pilot total now:", merged.length);
