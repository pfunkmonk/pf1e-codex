/* Is the committed API still true to the data, and is it well-formed?
 *
 * Two kinds of assertion, deliberately different:
 *
 *   FRESHNESS — re-derive the whole API in memory and demand it be byte-identical to what is on
 *   disk, with no missing and no stale files. This is what forces a regeneration after a data
 *   change, and it catches a hand-edit of a generated file. It is only ever as good as the
 *   builder, so it is NOT the only check:
 *
 *   TRUTH — facts read straight from the raw data files and compared with what the API says,
 *   never via the builder: every visible entry has exactly one file whose id, name and bucket
 *   match; every list is the same set as the bucket; bodies are byte-equal to data/cat; table
 *   row counts equal PF_TABLES; nothing is empty; no U+FFFD; the pages the site hides are not
 *   leaked; the manifest agrees with app.js about which data release this is.
 *
 * A check written from the same guess as the code proves self-consistency, not correctness — the
 * TRUTH half exists so a bug in the builder cannot also be a bug in its test.
 *
 * Usage: node tools/check-api.mjs [repoRoot]
 */
import fs from "node:fs";
import path from "node:path";
import { buildApi, loadCodex, API_ROOT } from "./lib/api-build.mjs";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const fail = [];
const bad = (m) => { if (fail.length < 60) fail.push(m); else if (fail.length === 60) fail.push("… (more)"); };
// Line endings are normalised on read. With core.autocrlf (the default on Windows) a fresh clone
// checks these files out as CRLF, and a byte-for-byte comparison would then call every one of the
// 28k files "out of date". Only STRUCTURAL newlines are affected: newlines inside a body are the
// escape sequence backslash-n in the JSON, so the data itself is untouched.
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
// U+FFFD, the "unknown character" left behind when a capture decoded text wrongly. Built from its
// code point on purpose: written as an escape or a literal it has been silently mangled by
// editors and shell tools before, leaving a check that could never fire.
const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/* ---------- FRESHNESS ---------------------------------------------------------------------- */
const { files, manifest } = buildApi(ROOT);
let missing = 0, stale = 0, differs = 0;
for (const [rel, text] of files) {
  if (!exists(rel)) { missing++; if (missing <= 3) bad(`missing file: ${rel}`); continue; }
  if (read(rel) !== text) { differs++; if (differs <= 3) bad(`out of date: ${rel}`); }
}
const entriesDir = path.join(ROOT, API_ROOT, "entries");
const onDisk = fs.existsSync(entriesDir) ? fs.readdirSync(entriesDir) : [];
for (const f of onDisk) if (!files.has(`${API_ROOT}/entries/${f}`)) { stale++; if (stale <= 3) bad(`stale file (no longer in the data): entries/${f}`); }
if (missing) bad(`${missing} generated file(s) missing — run: node tools/gen-api.mjs .`);
if (differs) bad(`${differs} generated file(s) out of date — run: node tools/gen-api.mjs .`);
if (stale) bad(`${stale} stale entry file(s) — run: node tools/gen-api.mjs . --prune`);

/* ---------- TRUTH -------------------------------------------------------------------------- */
const d = loadCodex(ROOT);
const visible = d.IDX.filter((r) => !d.isJunk(r));
const byId = new Map(visible.map((r) => [r[0], r]));

// 1. the manifest agrees with the data and with app.js
const m = JSON.parse(read(`${API_ROOT}/index.json`));
if (m.dataVersion !== d.dataVersion) bad(`manifest dataVersion ${m.dataVersion} ≠ app.js DATA_V ${d.dataVersion}`);
if (m.totals.entries !== visible.length) bad(`manifest says ${m.totals.entries} entries, the data has ${visible.length} visible`);
if (m.buckets.reduce((n, b) => n + b.count, 0) !== visible.length) bad("manifest bucket counts do not sum to the total");

// 2. every list is exactly its bucket
let listed = 0;
for (const b of m.buckets) {
  const L = JSON.parse(read(`${API_ROOT}/${b.list}`));
  const want = visible.filter((r) => r[2] === b.slug);
  if (L.count !== want.length || L.entries.length !== want.length)
    bad(`${b.slug}.json has ${L.entries.length} entries (header says ${L.count}); the data has ${want.length}`);
  const ids = new Set(L.entries.map((e) => e.id));
  if (ids.size !== L.entries.length) bad(`${b.slug}.json repeats an id`);
  for (const r of want) if (!ids.has(r[0])) { bad(`${b.slug}.json is missing ${r[0]} (${r[1]})`); break; }
  listed += L.entries.length;
  const cats = {};
  for (const e of L.entries) cats[e.category] = (cats[e.category] || 0) + 1;
  for (const [c, n] of Object.entries(b.categories)) if (cats[c] !== n) bad(`${b.slug}: manifest says ${n} in "${c}", the list has ${cats[c] || 0}`);
}
if (listed !== visible.length) bad(`lists total ${listed}, expected ${visible.length}`);

// 3. names.json is the same set
const N = JSON.parse(read(`${API_ROOT}/names.json`));
if (N.count !== visible.length || N.rows.length !== visible.length) bad(`names.json has ${N.rows.length} rows, expected ${visible.length}`);
for (const [id, name, bucket] of N.rows) {
  const r = byId.get(id);
  if (!r) { bad(`names.json has an id the data does not: ${id}`); break; }
  if (r[1] !== name || r[2] !== bucket) { bad(`names.json disagrees with the data on ${id}`); break; }
}

// 4. every entry file, against the RAW data (not the builder)
let sumBodyBytes = 0, tablesFound = 0, tablesExpected = 0;
const bodiesByBucket = d.BODIES;
for (const r of visible) {
  const [id, name, bucket] = r;
  const rel = `${API_ROOT}/entries/${id}.json`;
  if (!exists(rel)) continue;                                   // already reported above
  let e;
  try { e = JSON.parse(read(rel)); } catch { bad(`${rel} is not valid JSON`); continue; }
  if (e.id !== id || e.name !== name || e.bucket !== bucket) bad(`${rel}: id/name/bucket disagree with the data`);
  const rawBody = bodiesByBucket[bucket][id];
  if (e.body !== rawBody) bad(`${rel}: body differs from data/cat/${bucket}.js (${name})`);
  if (!e.body || !e.body.trim()) bad(`${rel}: empty body (${name})`);
  if (e.body.includes(REPLACEMENT_CHAR) || e.name.includes(REPLACEMENT_CHAR)) bad(`${rel}: U+FFFD replacement character in ${name}`);
  sumBodyBytes += Buffer.byteLength(e.body || "");
  if (e.links.web !== `${manifest.site}/#/e/${id}`) bad(`${rel}: bad web link`);
  const T = d.TABLES[id];
  if (T) {
    tablesExpected += T.length;
    const got = e.tables || [];
    tablesFound += got.length;
    if (got.length !== T.length) bad(`${rel}: ${got.length} tables, data has ${T.length} (${name})`);
    else for (let i = 0; i < T.length; i++)
      if (got[i].rows.length !== T[i].r.length || got[i].headerRow !== !!T[i].hdr)
        bad(`${rel}: table ${i + 1} has ${got[i].rows.length} rows, data has ${T[i].r.length} (${name})`);
  } else if (e.tables) bad(`${rel}: has tables the data does not (${name})`);
}
if (tablesFound !== tablesExpected) bad(`tables in API ${tablesFound} ≠ tables in data on visible entries ${tablesExpected}`);
if (tablesFound !== m.totals.tables) bad(`manifest says ${m.totals.tables} tables, entry files carry ${tablesFound}`);

// 5. the pages the site hides must not be served
const leak = (JSON.parse(read(`${API_ROOT}/rules.json`)).entries || [])
  .filter((e) => /^(\d+(st|nd|rd|th) Level|Cantrips?|Orisons?)$/i.test(e.name));
if (leak.length) bad(`${leak.length} scraped index page(s) leaked into rules.json, e.g. "${leak[0].name}"`);

// 6. the docs page carries the live totals
const html = read("api/index.html");
if (!html.includes(m.totals.entries.toLocaleString("en-US"))) bad("api/index.html does not state the current entry total");

console.log(`entries          : ${visible.length.toLocaleString()} (${d.IDX.length - visible.length} hidden, as on the site)`);
console.log(`files            : ${files.size.toLocaleString()} generated, ${onDisk.length.toLocaleString()} entry files on disk`);
console.log(`bodies           : ${(sumBodyBytes / 1048576).toFixed(1)} MB, byte-equal to data/cat`);
console.log(`tables           : ${tablesFound} (matches data)`);
console.log(`data release     : ${m.dataVersion}`);
if (fail.length) {
  console.log(`\nFAIL — ${fail.length} problem(s):`);
  for (const f of fail) console.log("  " + f);
  process.exit(1);
}
console.log("\nthe API is fresh and true to the data");
