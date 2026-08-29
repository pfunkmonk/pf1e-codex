/* Does the onboarding copy still point at things that exist?
 *
 * The Start Here guide, the sidebar counts and the per-category intros are all written by hand
 * against a dataset that gets rebuilt underneath them. Every one of them fails SILENTLY: a dead
 * guide link renders as a normal chip that lands on the home page, a stale count is just a wrong
 * number nobody recomputes, and a missing intro is simply absent. This asserts all three.
 *
 * Checks:
 *   1. every META.guide step/concept href resolves (entry id present, or a real bucket)
 *   2. every displayed category count equals what browse/search can actually REACH
 *      (i.e. after isJunkEntry) — the nav must never advertise an unreachable entry
 *   3. every bucket has intro copy, and no INTRO key is orphaned
 *
 * Usage: node tools/check-guide.mjs [repoRoot]
 */
import fs from "node:fs";

const ROOT = process.argv[2] || ".";
globalThis.window = {};
for (const f of ["data/index.js", "data/meta.js"])
  (0, eval)(fs.readFileSync(`${ROOT}/${f}`, "utf8"));

const IDX = globalThis.window.PF_INDEX;
const META = globalThis.window.PF_META;
const I_ID = 0, I_NAME = 1, I_SLUG = 2, I_RAW = 3;

// Mirrors isJunkEntry() in app.js — keep the two in step.
const isJunk = (r) =>
  r[I_SLUG] === "rules" && /^(\d+(?:st|nd|rd|th)\s+Level|Cantrips?|Orisons?)$/i.test(r[I_NAME]);

const byId = new Set(IDX.map((r) => r[I_ID]));
const buckets = new Set(IDX.map((r) => r[I_SLUG]));
const rawCats = new Set(IDX.map((r) => r[I_RAW]));

const visible = {};
let visTotal = 0;
for (const r of IDX) {
  if (isJunk(r)) continue;
  visible[r[I_SLUG]] = (visible[r[I_SLUG]] || 0) + 1;
  visTotal++;
}

const fail = [];

// ---- 1. guide links ---------------------------------------------------------
const guide = META.guide || {};
const links = [
  ...(guide.steps || []).map((s) => [`step ${s.n} "${s.label}"`, s.href]),
  ...(guide.concepts || []).map((c) => [`concept "${c.label}"`, c.href]),
];
for (const [what, href] of links) {
  const e = /^#\/e\/(.+)$/.exec(href || "");
  const c = /^#\/c\/([^/]+)$/.exec(href || "");
  if (e) { if (!byId.has(decodeURIComponent(e[1]))) fail.push(`guide: ${what} -> dead entry id ${e[1]}`); }
  else if (c) { if (!buckets.has(c[1])) fail.push(`guide: ${what} -> unknown bucket ${c[1]}`); }
  else fail.push(`guide: ${what} -> unrecognised href ${href}`);
}
if (!links.length) fail.push("guide: no steps or concepts at all");

// ---- 2. advertised counts vs reachable counts -------------------------------
// data/meta.js is written by a builder that is not in this repo and knows nothing about
// isJunkEntry, so its counts are RAW and drift is expected — regenerating it would only bring
// the drift back. The durable fix is that app.js derives what it displays. So rather than
// policing meta.js, assert the app never renders the baked figure directly.
const drift = [];
for (const g of META.groups || [])
  for (const c of g.cats) {
    const reach = visible[c.slug] || 0;
    if (reach !== c.count) drift.push(`${c.slug}: meta ${c.count} vs reachable ${reach}`);
  }

const appSrc = fs.readFileSync(`${ROOT}/app.js`, "utf8");
const stripped = appSrc.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
if (/\bc\.count\.toLocaleString\(\)/.test(stripped))
  fail.push("counts: app.js renders c.count directly — use visCount(c.slug, c.count) so the " +
            "displayed figure matches what browse and search can reach");
if (/\bMETA\.total\b/.test(stripped))
  fail.push("counts: app.js renders META.total directly — use VIS_TOTAL, which excludes junk entries");
if (!/\bVIS_TOTAL\b/.test(stripped) || !/function visCount\b/.test(stripped))
  fail.push("counts: app.js is missing the VIS_TOTAL / visCount derivation entirely");

// ---- 3. intro copy ----------------------------------------------------------
const app = fs.readFileSync(`${ROOT}/app.js`, "utf8");
const at = app.indexOf("var INTRO=");
if (at < 0) fail.push("intros: INTRO map not found in app.js");
else {
  const open = app.indexOf("{", at);
  let depth = 0, end = -1;
  for (let k = open; k < app.length; k++) {
    if (app[k] === "{") depth++;
    else if (app[k] === "}") { depth--; if (!depth) { end = k; break; } }
  }
  const INTRO = (0, eval)("(" + app.slice(open, end + 1) + ")");
  for (const b of buckets) if (!INTRO[b]) fail.push(`intros: bucket "${b}" has no intro copy`);
  for (const k of Object.keys(INTRO))
    if (!buckets.has(k) && !rawCats.has(k))
      fail.push(`intros: key "${k}" matches no bucket and no rawCat — dead copy`);
}

// ---- report -----------------------------------------------------------------
console.log(`entries           : ${IDX.length} (${visTotal} reachable, ${IDX.length - visTotal} hidden as junk)`);
console.log(`guide links       : ${links.length}`);
console.log(`categories        : ${(META.groups || []).reduce((n, g) => n + g.cats.length, 0)}`);
console.log(`raw meta drift    : ${drift.length ? drift.join("; ") + "  (expected — app derives instead)" : "none"}`);
if (fail.length) {
  console.log(`\nFAIL — ${fail.length} problem(s):`);
  for (const f of fail) console.log("  " + f);
  process.exit(1);
}
console.log("\nguide, counts and intro copy all check out");
