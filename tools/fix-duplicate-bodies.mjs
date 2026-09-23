/* FIX for the duplicate-body bug (see check-body-duplicates.mjs and memory
 * pf1e-codex-d20pfsrd-incorporation.md, 2026-09-23) — re-derives a correct body straight from the
 * raw AoN page captures that were never touched by whatever step corrupted the Codex.
 *
 * WHY THIS WORKS. AoN's own page for a spell that "functions like X, except..." shows X's full
 * block first, then the spell's own block — sometimes a whole chain (Lesser, base, Greater all on
 * one page). Every one of a name-family's own pages shows the SAME full chain; only which block is
 * that page's "own" entry changes. So the correct body for entry E is: read E's own raw page top to
 * bottom, keep every block up to and including the one named E, and cut off anything after — never
 * grab just the first block (that was the corruption) and never keep blocks that come after E's own
 * (a more-advanced sibling E's reader didn't ask for). Confirmed on a 3-way chain (Object Possession
 * Lesser/base/Greater) before this was written; see memory for the full trace.
 *
 * Raw captures: 49,000 AoN page exports, filenames shaped
 *   <id>-<Title-with-dashes-for-spaces>---<Category>---Archives-of-Nethys-Pathfinder-RPG-Database.txt
 * A few titles were captured more than once (different crawl passes) — when that happens this
 * requires the extracted bodies to AGREE before trusting either; disagreement is reported, not guessed.
 *
 * THIS IS A DRY RUN BY DEFAULT. It never writes to data/cat/*.js on its own — it writes a proposal
 * file for review. Pass --apply to actually patch the Codex files, and only after reading the report.
 *
 * Usage: node tools/fix-duplicate-bodies.mjs [--in D:/CODEX/d20-pilot/codex-duplicate-body-bug.json]
 *          [--apply] [--show 20]
 */
import fs from "node:fs";
import { loadCodex } from "./lib/api-build.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const IN = arg("in", "D:/CODEX/d20-pilot/codex-duplicate-body-bug.json");
const APPLY = argv.includes("--apply");
const APPLY_DELETES = argv.includes("--apply-deletes");
const SHOW = Number(arg("show", 20));
const ROOT = "C:/Users/mailp/dev/pf1e-codex";
const RAW_DIR = "C:/Users/mailp/OneDrive/Desktop/AON PAGES PARSED/START";

/* ---------- source_blocks(): JS port of aon_structured_prep.py's page splitter, verified byte- for
 * -byte against the Python original on 4 raw pages before this was written. A block starts at the
 * nearest non-blank line above a "Source " line (that line is the entry's own name) and runs to the
 * next block's name line, or EOF. */
function lines(t) { return t.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n"); }
// The page footer carries a RANDOMIZED "Discover more" ad widget (different every crawl, even of the
// same URL minutes apart — confirmed: two captures of "Bull's Strength, Mass" an hour apart were
// otherwise byte-identical and only disagreed after this marker). Cut it before anything else, or the
// last block on every page silently absorbs a few lines of ad-widget garbage that never matches
// between two captures of the same page, and only ONE raw capture is not enough to trust — this makes
// most of them agree instead of merely most-of-them-with-known-noise.
function stripAdFooter(text) {
  const i = text.indexOf("Site Owner:");
  return i < 0 ? text : text.slice(0, i);
}
function sourceBlocks(rawText) {
  const text = stripAdFooter(rawText);
  const ls = lines(text);
  const starts = [];
  for (let i = 0; i < ls.length; i++) {
    if (ls[i].startsWith("Source ")) {
      let j = i - 1;
      while (j >= 0 && !ls[j].trim()) j--;
      if (j >= 0) starts.push([j, i]);
    }
  }
  const out = [];
  for (let z = 0; z < starts.length; z++) {
    const [nameI] = starts[z];
    const end = z + 1 < starts.length ? starts[z + 1][0] : ls.length;
    out.push({ name: ls[nameI].trim(), raw: ls.slice(nameI, end).join("\n").trim() });
  }
  return out;
}

/* ---------- matching a Codex name to its own raw AoN page(s) -------------------------------- */
const norm = (s) => String(s || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim();
const dashForm = (s) => String(s || "").replace(/\s+/g, "-");
let FILES = null;
function fileIndex() {
  if (FILES) return FILES;
  FILES = fs.readdirSync(RAW_DIR);
  return FILES;
}
/** Candidate raw files whose filename's title segment plausibly matches `name` (both apostrophe
 *  styles tried; comparison is on the dashed form since a stray real hyphen in a name is rare and
 *  the internal TITLE: header is checked afterward anyway). */
function candidateFiles(name) {
  const files = fileIndex();
  const targets = new Set([dashForm(name), dashForm(name.replace(/[\u2019\u2018]/g, "'")), dashForm(name.replace(/'/g, "\u2019"))]);
  const hits = [];
  for (const f of files) {
    const m = /^\d+-(.+?)---.+?---Archives-of-Nethys-Pathfinder-RPG-Database\.txt$/.exec(f);
    if (!m) continue;
    if (targets.has(m[1])) hits.push(f);
  }
  return hits;
}
/** Confirms the raw file really is E's own page (its declared TITLE says so, not just a filename
 *  guess), extracts blocks, and returns the concatenation from the top through E's own block. */
function extractFrom(file, name) {
  const text = fs.readFileSync(`${RAW_DIR}/${file}`, "utf8");
  const titleLine = (text.split("\n")[0] || "").trim();
  const declaredTitle = (/^TITLE:\s*(.+?)\s+-\s+\S/.exec(titleLine) || [])[1];
  if (!declaredTitle || norm(declaredTitle) !== norm(name)) return { ok: false, reason: "declared TITLE does not match: " + titleLine };
  const blocks = sourceBlocks(text);
  const idx = blocks.findIndex((b) => norm(b.name) === norm(name));
  if (idx < 0) return { ok: false, reason: `no block named "${name}" found among [${blocks.map((b) => b.name).join(", ")}]` };
  const body = blocks.slice(0, idx + 1).map((b) => b.raw).join("\n").trim();
  return { ok: true, body, ownRaw: blocks[idx].raw, blockNames: blocks.slice(0, idx + 1).map((b) => b.name) };
}

/* ---------- index.js row fields (source/snippet/facets), derived from the entry's OWN block only —
 * never the prepended reference spell's, or "Major Creation" would carry Minor Creation's school/level
 * facets forever, the same corruption one level down. Ported from aon_structured_prep.py's parse_spell()
 * (School/Level/Saving Throw regexes) and import-typed-orphans.mjs's facetsFor()/snippetOf(), which
 * define the shape data/index.js rows already use — verified byte-for-byte against "Fireball"'s row
 * before trusting this on the 46. Spells only for now; items/feats need their own field() calls if a
 * later batch of fixes includes them. */
function field(raw, label) {
  const m = new RegExp(String.raw`(?:^|\n)${label}[ \t]+(.+?)(?=\n|$)`, "i").exec(raw);
  return m ? m[1].trim() : "";
}
const SAVE_MAP = { will: "Will", reflex: "Ref", ref: "Ref", fortitude: "Fort", fort: "Fort" };
const bookOf = (src) => String(src || "").replace(/\s*pg\.\s*\d+.*$/, "").trim();
function spellFacetsAndFields(ownRaw) {
  let sl = field(ownRaw, "School").split(/;\s*Level/i)[0].trim();
  if (!sl) { const m = /(?:^|\n)School\s+(.+?);\s*Level\s+(.+)/i.exec(ownRaw); sl = m ? m[1].trim() : ""; }
  const m = /^([^\s([]+)(?:\s*\(([^)]*)\))?\s*(?:\[([^\]]*)])?/.exec(sl);
  const school = m ? m[1].toLowerCase() : "";
  const desc = m && m[3] ? m[3].split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) : [];
  const lm = /\bLevel\s+(.+?)(?:\n|$)/i.exec(ownRaw);
  const levelLine = lm ? lm[1] : "";
  const levels = {};
  for (const cm of levelLine.matchAll(/([A-Za-z][A-Za-z -]*(?:\(unchained\))?)\s+(\d+)(?:\s*\([^)]*\))?(?:,|$)/gi)) {
    let cls = cm[1].trim().toLowerCase();
    if (cls === "redmantisassassin") cls = "red mantis assassin";
    levels[cls] = Number(cm[2]);
  }
  const saveSr = field(ownRaw, "Saving Throw");
  let save = "", sr = "";
  if (saveSr) { const parts = saveSr.split(/;\s*Spell Resistance\s+/i); save = parts[0].trim(); sr = (parts[1] || "").trim(); }
  const saveType = save && save.toLowerCase() !== "none" ? (["fortitude", "reflex", "will"].find((v) => save.toLowerCase().includes(v)) || "special") : "none";
  const source = field(ownRaw, "Source");
  const facets = {};
  if (school) facets.sch = school;
  if (Object.keys(levels).length) facets.lv = levels;
  if (desc.length) facets.desc = desc;
  facets.save = saveType !== "none" ? (SAVE_MAP[saveType] || "None") : "None";
  facets.sr = sr || "no";
  const bk = bookOf(source);
  if (bk) facets.bk = bk;
  return { source, facets };
}
/** Matches import-typed-orphans.mjs's snippetOf(): the body with its OWN name line and Source line
 *  stripped, single-spaced, capped at 200 chars — applied to the entry's own block, not the full
 *  (now multi-block) body, so a variant's search snippet describes the variant, not its prepended base. */
function snippetOf(ownRaw) {
  const ls = String(ownRaw || "").split("\n");
  let i = 0;
  if (ls[i] !== undefined && !/^Source\s/i.test(ls[i])) i++;
  if (ls[i] !== undefined && /^Source\s/i.test(ls[i])) i++;
  return ls.slice(i).join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
}

/* ---------- SPURIOUS DUPLICATE ROWS — a variant that was never its own raw page at all ----------
 * "Greater Aquadynamic" isn't missing distinct text to recover — AoN prices it as ONE entry
 * ("Aquadynamic ... Price (+3,750 gp), Improved (+15,000 gp), Greater (+33,750 gp)"), and a THIRD,
 * spurious "Greater Aquadynamic" row got created during import carrying a copy of that same entry's
 * body. Same story for "Bat (Uskwood)" (Bat's own price line already reads "5 gp, 50 gp (Uskwood)"),
 * "Strangler" (a bare duplicate of "Strangler (MC)" even though "Strangler (UC)" is ALSO its own
 * correct, separate row — AoN never published a plain "Strangler"), and the rest of the 10 that
 * fix-duplicate-bodies.mjs could never find a raw page for. This is the SAME family of import defect
 * HANDOFF.md already documents for magic items ("Bag of Tricks" -> "Bag of Tricks Aquamarine",
 * "Cloak of Resistance" -> "Cloak of Resistance1") — a real sibling with the real content already
 * exists; this row is a redundant extra that should be REMOVED, not rewritten.
 * check-body-duplicates.mjs already names the culprit in `sibling`; confirm it here (a possible
 * leading "own name" line stripped first, matching the difference this session found between
 * "Unusual Heritage"'s spurious copy and "Unusual Heritage (Dhampir)"'s real body) before trusting it. */
function shingles5(text) {
  const w = String(text || "").toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) || [];
  const set = new Set();
  for (let i = 0; i + 5 <= w.length; i++) set.add(w.slice(i, i + 5).join(" "));
  return set;
}
function containment5(a, b) { if (!a.size || !b.size) return 0; const [s, l] = a.size < b.size ? [a, b] : [b, a]; let n = 0; for (const x of s) if (l.has(x)) n++; return n / s.size; }
function stripOwnNameLine(body, name) {
  const ls = String(body || "").split("\n");
  return norm(ls[0]) === norm(name) ? ls.slice(1).join("\n").trim() : body;
}
function spuriousDuplicateCheck(t, byId) {
  if (!t.sibling) return null;
  const row = byId.get(t.id); if (!row) return null;
  const sibRow = [...byId.values()].find((r) => r[2] === row[2] && norm(r[1]) === norm(t.sibling));
  if (!sibRow) return null;
  const myBody = stripOwnNameLine((d0.BODIES[row[2]] || {})[t.id] || "", t.name);
  const sibBody = (d0.BODIES[sibRow[2]] || {})[sibRow[0]] || "";
  const cont = containment5(shingles5(myBody), shingles5(sibBody));
  if (cont < 0.9) return null;
  return { duplicateOfId: sibRow[0], duplicateOfName: sibRow[1], cont: +cont.toFixed(2) };
}

/* ---------- main ------------------------------------------------------------------------------ */
const targets = JSON.parse(fs.readFileSync(IN, "utf8"));   // [{id,name,bucket,...}, ...] from check-body-duplicates.mjs
console.log(`${targets.length} candidate rows to repair (from ${IN})`);

// check-body-duplicates.mjs's containment+length-ratio heuristic cannot tell "body IS a pure copy of
// the sibling" (a real bug) apart from "body correctly OPENS with the sibling's text, per Pathfinder's
// own writing style, then adds its own short addendum" (not a bug at all) — both score the same way.
// Loaded up front: the "fixed" path settles it by rebuilding and comparing; the spurious-duplicate
// path (above) needs it to compare against a SIBLING's current body.
const d0 = loadCodex(ROOT);
const byId0 = new Map(d0.IDX.map((r) => [r[0], r]));

const results = [];
for (const t of targets) {
  const files = candidateFiles(t.name);
  if (!files.length) {
    const spurious = spuriousDuplicateCheck(t, byId0);
    results.push(spurious ? { ...t, status: "spurious-duplicate", ...spurious } : { ...t, status: "no-raw-page", detail: `no file matched dashed title "${dashForm(t.name)}"` });
    continue;
  }
  const attempts = files.map((f) => ({ file: f, ...extractFrom(f, t.name) }));
  const ok = attempts.filter((a) => a.ok);
  if (!ok.length) {
    const spurious = spuriousDuplicateCheck(t, byId0);
    results.push(spurious ? { ...t, status: "spurious-duplicate", ...spurious } : { ...t, status: "extract-failed", detail: attempts.map((a) => a.reason).join(" | ") });
    continue;
  }
  const bodies = new Set(ok.map((a) => a.body));
  if (bodies.size > 1) { results.push({ ...t, status: "disagreement", detail: `${ok.length} raw pages found, ${bodies.size} distinct bodies`, candidates: ok.map((a) => ({ file: a.file, len: a.body.length })) }); continue; }
  const indexFields = t.bucket === "spells" ? spellFacetsAndFields(ok[0].ownRaw) : null;
  results.push({ ...t, status: "fixed", newBody: ok[0].body, sourceFile: ok[0].file, blockNames: ok[0].blockNames,
    newSnippet: snippetOf(ok[0].ownRaw), newSource: indexFields && indexFields.source, newFacets: indexFields && indexFields.facets });
}

for (const r of results) {
  if (r.status !== "fixed") continue;
  const row = byId0.get(r.id);
  const oldBody = row ? (d0.BODIES[row[2]] || {})[r.id] || "" : "";
  r.wasAlreadyCorrect = oldBody === r.newBody;
}

const byStatus = {};
for (const r of results) byStatus[r.wasAlreadyCorrect ? "already-correct" : r.status] = (byStatus[r.wasAlreadyCorrect ? "already-correct" : r.status] || 0) + 1;
console.log("\nresult:", byStatus);

const fixed = results.filter((r) => r.status === "fixed" && !r.wasAlreadyCorrect);
console.log(`(of ${results.filter((r) => r.status === "fixed").length} that rebuilt cleanly, ${fixed.length} actually change the live text — the rest were already correct; the old detector's heuristic can't tell "opens with the sibling's text on purpose" from "IS the sibling's text")`);
fs.writeFileSync("D:/CODEX/d20-pilot/duplicate-body-fixes.json", JSON.stringify(results, null, 1));
console.log(`\nwrote D:/CODEX/d20-pilot/duplicate-body-fixes.json (${results.length} rows, ${fixed.length} ready to apply)`);

console.log(`\n--- sample of ${Math.min(SHOW, fixed.length)} fixes (old -> new) ---`);
for (const r of fixed.slice(0, SHOW)) {
  const row = byId0.get(r.id);
  const oldBody = row ? (d0.BODIES[row[2]] || {})[r.id] || "" : "";
  console.log(`\n[${r.bucket}] ${r.name}  (blocks kept: ${r.blockNames.join(" -> ")})`);
  console.log(`  OLD (${oldBody.length}c): ${oldBody.replace(/\s+/g, " ").slice(0, 110)}`);
  console.log(`  NEW (${r.newBody.length}c): ${r.newBody.replace(/\s+/g, " ").slice(0, 110)}`);
}

const spurious = results.filter((r) => r.status === "spurious-duplicate");
if (spurious.length) {
  console.log(`\n--- ${spurious.length} SPURIOUS DUPLICATE rows (no raw page ever existed for these — they duplicate a real sibling's content and are recommended for DELETION, not a body fix) ---`);
  for (const r of spurious) console.log(`  [${r.bucket}] "${r.name}" (id ${r.id})  ==  "${r.duplicateOfName}" (id ${r.duplicateOfId})  cont=${r.cont}`);
  if (!APPLY_DELETES) console.log(`  Not deleted by --apply. Re-run with --apply-deletes (after reviewing the list above) to remove them.`);
}

const problems = results.filter((r) => r.status !== "fixed" && r.status !== "spurious-duplicate");
if (problems.length) {
  console.log(`\n--- ${problems.length} rows NOT auto-fixed, need a look ---`);
  for (const r of problems.slice(0, 30)) console.log(`  [${r.bucket}] ${r.name}: ${r.status} — ${r.detail}`);
}

if (APPLY) {
  console.log(`\n--apply set: writing ${fixed.length} corrected bodies into data/cat/*.js ...`);
  const byBucket = new Map();
  for (const r of fixed) { if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, []); byBucket.get(r.bucket).push(r); }
  for (const [bucket, rows] of byBucket) {
    const path = `${ROOT}/data/cat/${bucket}.js`;
    const text = fs.readFileSync(path, "utf8");
    const m = new RegExp(`^window\\.PF_REG\\("${bucket}",(\\{.*\\})\\);\\n?$`, "s").exec(text);
    if (!m) { console.log(`  !! could not parse ${path}, skipping ${rows.length} fixes for ${bucket}`); continue; }
    const obj = JSON.parse(m[1]);
    let applied = 0;
    for (const r of rows) { if (r.id in obj) { obj[r.id] = r.newBody; applied++; } }
    fs.writeFileSync(path, `window.PF_REG("${bucket}",${JSON.stringify(obj)});\n`);
    console.log(`  ${bucket}: applied ${applied}/${rows.length}`);
  }

  // data/index.js: source (col 4), snippet (col 5), facets (col 6) — derived from the entry's OWN
  // block only (see spellFacetsAndFields), never the multi-block body, so a variant's search result
  // and level/school filters describe the variant, not the reference spell prepended for reading.
  const withIndexFields = fixed.filter((r) => r.newFacets);
  if (withIndexFields.length) {
    const idxPath = `${ROOT}/data/index.js`;
    const idxText = fs.readFileSync(idxPath, "utf8");
    const im = /^window\.PF_INDEX=(\[.*\]);\n?$/s.exec(idxText);
    if (!im) { console.log("  !! could not parse data/index.js, skipping index field updates"); }
    else {
      const rows = JSON.parse(im[1]);
      const byId = new Map(rows.map((r, i) => [r[0], i]));
      let applied = 0;
      for (const r of withIndexFields) {
        const i = byId.get(r.id); if (i == null) continue;
        rows[i][4] = r.newSource || rows[i][4];
        rows[i][5] = r.newSnippet;
        rows[i][6] = r.newFacets;
        applied++;
      }
      fs.writeFileSync(idxPath, `window.PF_INDEX=${JSON.stringify(rows)};\n`);
      console.log(`  data/index.js: applied ${applied}/${withIndexFields.length} (source/snippet/facets)`);
    }
  }

  console.log("\nDone. Now: node tools/gen-api.mjs && node tools/check-api.mjs, run the checks suite, bump the 3 cache tokens, verify live.");
} else if (!APPLY_DELETES) {
  console.log(`\nDry run only — nothing written. Review the report, then re-run with --apply.`);
}

if (APPLY_DELETES) {
  console.log(`\n--apply-deletes set: removing ${spurious.length} spurious duplicate rows ...`);
  const byBucket = new Map();
  for (const r of spurious) { if (!byBucket.has(r.bucket)) byBucket.set(r.bucket, []); byBucket.get(r.bucket).push(r); }
  for (const [bucket, rows] of byBucket) {
    const path = `${ROOT}/data/cat/${bucket}.js`;
    const text = fs.readFileSync(path, "utf8");
    const m = new RegExp(`^window\\.PF_REG\\("${bucket}",(\\{.*\\})\\);\\n?$`, "s").exec(text);
    if (!m) { console.log(`  !! could not parse ${path}, skipping ${rows.length} deletes for ${bucket}`); continue; }
    const obj = JSON.parse(m[1]);
    let removed = 0;
    for (const r of rows) { if (r.id in obj) { delete obj[r.id]; removed++; } }
    fs.writeFileSync(path, `window.PF_REG("${bucket}",${JSON.stringify(obj)});\n`);
    console.log(`  ${bucket}: removed ${removed}/${rows.length} bodies`);
  }
  const idxPath = `${ROOT}/data/index.js`;
  const idxText = fs.readFileSync(idxPath, "utf8");
  const im = /^window\.PF_INDEX=(\[.*\]);\n?$/s.exec(idxText);
  if (!im) { console.log("  !! could not parse data/index.js, skipping row removal"); }
  else {
    const rows = JSON.parse(im[1]);
    const toRemove = new Set(spurious.map((r) => r.id));
    const kept = rows.filter((r) => !toRemove.has(r[0]));
    fs.writeFileSync(idxPath, `window.PF_INDEX=${JSON.stringify(kept)};\n`);
    console.log(`  data/index.js: removed ${rows.length - kept.length}/${spurious.length} rows`);
  }
  console.log("\nDone. Now: node tools/gen-api.mjs && node tools/check-api.mjs, run the checks suite, bump the 3 cache tokens, verify live.");
} else if (spurious.length) {
  console.log(`\n(${spurious.length} spurious-duplicate rows found — not removed. Re-run with --apply-deletes to remove them.)`);
}
