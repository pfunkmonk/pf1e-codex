/* Recover entries that were TYPED correctly but never reached the Codex index.
 *
 * This is a different loss from the quarantine. `aon_structured_prep.py` sorted 3,704 spell
 * records, 3,617 feats and 3,303 magic items into typed .jsonl files — and the step that turned
 * those into data/index.js dropped some of them. Nothing flagged it, because the survivors look
 * complete: the Codex has "Beast Shape I" and "II" but not "III" or "IV", "Age Resistance" and
 * "Age Resistance, Greater" but not ", Lesser", "Summon Monster 1" and "2" but not 3-9. It was
 * missing "Detect Thoughts" outright.
 *
 * Everything needed is on disk. <stem>.jsonl carries the facets, <stem>.detail.jsonl the body in
 * exactly the shape data/cat/<bucket>.js wants ("Name\nSource X\nSchool …").
 *
 * Matching is EXACT on the normalised name, never fuzzy. AoN and the Codex share the
 * "Name, Qualifier" convention ("Darkvision, Communal", "Bestow Curse, Greater"), so a name that
 * is absent is genuinely absent. A fuzzy pass was tried and was wrong in both directions — it
 * called "Beast Shape III" a variant of "Beast Shape I", and called all 1,320 archetypes missing
 * because the Codex stores them class-prefixed.
 *
 * Idempotent: entries already present are skipped, so re-running adds nothing.
 *
 * Usage:
 *   node tools/import-typed-orphans.mjs .            # report only
 *   node tools/import-typed-orphans.mjs . --apply
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const APPLY = process.argv.includes("--apply");
const STRUCT = process.env.AON_STRUCTURED ||
  "C:/Users/mailp/OneDrive/Desktop/AON PAGES PARSED/FINISH/structured";

/* stem -> Codex bucket. Weapons/armor/shields/ammunition/traits were already complete.
 *
 * MAGIC ITEMS ARE DELIBERATELY NOT HERE. 166 of them look missing by name, and every one is
 * already in the Codex under a mangled VARIANT name that carries the full parent body:
 * "Bag of Tricks" lives as "Bag of Tricks Aquamarine", "Cloak of Resistance" as
 * "Cloak of Resistance1", "Boro Bead" as "Boro Bead1st". Importing them would have added 166
 * duplicate pages. Verified by checking whether any existing item body's first line is the
 * candidate's name — 85 matched directly and the remaining 81 were "+N" forms of the same thing.
 * Archetypes are the same story: all 1,320 are present, stored class-prefixed
 * ("Aerochemist" -> "Alchemist Aerochemist"), so a bare name lookup makes them all look absent. */
const SETS = [
  { stem: "spells", bucket: "spells", rawCat: () => "Spells" },
  { stem: "feats", bucket: "feats", rawCat: () => "Feats" },
];

const SAVE = { will: "Will", reflex: "Ref", ref: "Ref", fortitude: "Fort", fort: "Fort" };

// The capture left U+FFFD where a typographic apostrophe belonged ("Asmodeus�s Mandate").
// Repair it between letters rather than shipping the replacement character in a title.
const demojibake = (s) => String(s || "")
  .replace(/(\p{L})�(\p{L})/gu, "$1’$2")
  .replace(/�/g, "");
const norm = (s) => String(s || "").toLowerCase().replace(/['’]/g, "'")
  .replace(/[^a-z0-9]+/g, " ").trim();
const bookOf = (src) => String(src || "").replace(/\s*pg\.\s*\d+.*$/, "").trim();

async function readJsonl(file) {
  const out = [];
  if (!fs.existsSync(file)) return out;
  const rl = readline.createInterface({
    input: fs.createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try { out.push(JSON.parse(t)); } catch { /* skip */ }
  }
  return out;
}

/* Facets, per bucket, mirroring what the existing rows carry. */
function facetsFor(bucket, r) {
  const bk = bookOf(r.source);
  if (bucket === "spells") {
    const f = {};
    if (r.school) f.sch = r.school;
    if (r.levels && Object.keys(r.levels).length) f.lv = r.levels;
    if (Array.isArray(r.descriptors) && r.descriptors.length) f.desc = r.descriptors;
    f.save = r.save_type ? (SAVE[String(r.save_type).toLowerCase()] || "None") : "None";
    f.sr = r.sr || "no";
    if (bk) f.bk = bk;
    return f;
  }
  if (bucket === "feats") {
    const f = {};
    if (r.type) f.t = r.type;
    if (bk) f.bk = bk;
    return f;
  }
  const f = {};                                   // items
  if (typeof r.cost === "number" && r.cost > 0) f.pr = r.cost;
  if (r.slot) f.slot = r.slot;
  if (bk) f.bk = bk;
  return f;
}

/* The index snippet is the body with its first two lines (the name and the Source line) removed —
 * that is what the existing rows hold, e.g. "School evocation [fire]; Level arcanist 3, …". */
function snippetOf(raw) {
  const lines = String(raw || "").split("\n");
  let i = 0;
  if (lines[i] !== undefined && !/^Source\s/i.test(lines[i])) i++;      // name line
  if (lines[i] !== undefined && /^Source\s/i.test(lines[i])) i++;       // source line
  return lines.slice(i).join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
}

/* ---------- load the Codex ---------------------------------------------------------------- */
globalThis.window = {};
(0, eval)(fs.readFileSync(path.join(ROOT, "data/index.js"), "utf8"));
const IDX = globalThis.window.PF_INDEX;
const I_ID = 0, I_NAME = 1, I_SLUG = 2;

const existingIds = new Set(IDX.map((r) => r[I_ID]));
const haveInBucket = {};
for (const r of IDX) (haveInBucket[r[I_SLUG]] ||= new Set()).add(norm(r[I_NAME]));

const mintId = (bucket, name) =>
  crypto.createHash("sha256").update(`pf1e-codex-typed|${bucket}|${name}`).digest("hex").slice(0, 16);

/* ---------- collect ------------------------------------------------------------------------ */
const newRows = [], newBodies = {}, report = [];

for (const set of SETS) {
  const recs = await readJsonl(path.join(STRUCT, `${set.stem}.jsonl`));
  const details = await readJsonl(path.join(STRUCT, `${set.stem}.detail.jsonl`));
  const body = new Map(details.map((d) => [d.id, d.raw || ""]));
  const seen = new Set();
  let added = 0, dup = 0, noBody = 0;

  for (const r of recs) {
    const name = demojibake(r.name);
    if (!name) continue;
    const key = norm(name);
    if ((haveInBucket[set.bucket] || new Set()).has(key)) { dup++; continue; }
    if (seen.has(key)) { dup++; continue; }
    const raw = body.get(r.id);
    // Without a body there is nothing to show but a title; skip rather than add a hollow page.
    if (!raw || raw.length < 40) { noBody++; continue; }
    seen.add(key);

    const id = mintId(set.bucket, name);
    if (existingIds.has(id)) { console.error(`ID COLLISION ${set.bucket}/${name}`); process.exit(1); }
    existingIds.add(id);

    newBodies[set.bucket] ||= {};
    newBodies[set.bucket][id] = demojibake(raw);
    newRows.push([id, name, set.bucket, set.rawCat(r), r.source || "", snippetOf(raw),
                  facetsFor(set.bucket, r)]);
    added++;
  }
  report.push({ stem: set.stem, bucket: set.bucket, records: recs.length, added, dup, noBody });
}

/* ---------- report ------------------------------------------------------------------------- */
console.log(`structured dir : ${STRUCT}\n`);
console.log("  %s".replace("%s", "file".padEnd(14) + "records  already  no-body  RECOVERED"));
for (const r of report)
  console.log(`  ${r.stem.padEnd(14)}${String(r.records).padStart(7)}${String(r.dup).padStart(9)}${String(r.noBody).padStart(9)}${String(r.added).padStart(11)}`);
console.log(`\n  total recovered: ${newRows.length}`);

const byCat = {};
for (const r of newRows) byCat[`${r[2]}/${r[3]}`] = (byCat[`${r[2]}/${r[3]}`] || 0) + 1;
console.log("\n  by category:");
for (const [k, v] of Object.entries(byCat).sort((a, b) => b[1] - a[1]))
  console.log(`    ${String(v).padStart(5)}  ${k}`);

console.log("\n  sample:");
for (const r of newRows.slice(0, 8))
  console.log(`    [${r[2]}] ${r[1]} — ${r[5].slice(0, 70)}…`);

if (!APPLY) { console.log("\n(dry run — pass --apply to write)"); process.exit(0); }

/* ---------- apply -------------------------------------------------------------------------- */
fs.writeFileSync(path.join(ROOT, "data/index.js"),
  "window.PF_INDEX=" + JSON.stringify(IDX.concat(newRows)) + ";\n");

for (const [bucket, add] of Object.entries(newBodies)) {
  const p = path.join(ROOT, `data/cat/${bucket}.js`);
  const holder = {};
  globalThis.window.PF_REG = (slug, map) => { holder[slug] = map; };
  (0, eval)(fs.readFileSync(p, "utf8"));
  const merged = Object.assign({}, holder[bucket] || {}, add);
  fs.writeFileSync(p, `window.PF_REG("${bucket}",${JSON.stringify(merged)});\n`);
  console.log(`  data/cat/${bucket}.js  +${Object.keys(add).length} bodies -> ${Object.keys(merged).length}`);
}

// keep meta counts in step (app.js derives what it displays, but stale numbers mislead readers)
const metaPath = path.join(ROOT, "data/meta.js");
const metaObj = (0, eval)("(" + fs.readFileSync(metaPath, "utf8")
  .replace(/^\s*window\.PF_META\s*=\s*/, "").replace(/;\s*$/, "") + ")");
const all = IDX.concat(newRows);
const real = {};
for (const r of all) real[r[I_SLUG]] = (real[r[I_SLUG]] || 0) + 1;
for (const g of metaObj.groups || [])
  for (const c of g.cats) if (real[c.slug] != null) c.count = real[c.slug];
metaObj.total = all.length;
fs.writeFileSync(metaPath, "window.PF_META=" + JSON.stringify(metaObj) + ";\n");

console.log(`\n  data/index.js  ${IDX.length} -> ${all.length} rows`);
console.log(`  data/meta.js   total -> ${all.length}`);
