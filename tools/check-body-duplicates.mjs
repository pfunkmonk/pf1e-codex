/* CODEX INTEGRITY CHECK — a row whose body is actually a SIBLING's body, not its own.
 *
 * Found 2026-09-23 while cross-checking d20pfsrd against the Codex for the incorporation pilot:
 * "Major Creation"'s body was Minor Creation's text verbatim. That turned out not to be one typo —
 * it's a pattern, confirmed at 202 rows (192 spells, 5 items, 5 feats) as of this run.
 *
 * WHY THIS ISN'T "just how Pathfinder spells are written". A row opening with a sibling's name is
 * normal PF1e style on its own — "This spell functions as bestow curse, except..." is how the game
 * legitimately writes an upgraded spell. That produces a SHORT reference followed by the upgrade's
 * OWN distinct rules text, so it should NOT closely resemble the base spell's full body. The bug
 * signature is different and much stronger: the row's ENTIRE body is a near-total duplicate of the
 * sibling's own separate body (shingle containment ~1.00, near-identical length) — i.e., "Bull's
 * Strength, Mass" is not upgraded Bull's Strength text, it IS single-target Bull's Strength's body,
 * copied wholesale, so the mass version's real mechanics are simply missing from the live site.
 *
 * This is independent of the d20pfsrd work — a pre-existing data bug, not something the import
 * caused — surfaced by having a second source (d20pfsrd) to cross-check bodies against.
 *
 * Usage: node tools/check-body-duplicates.mjs
 */
import fs from "node:fs";
import { loadCodex } from "./lib/api-build.mjs";
const d = loadCodex("C:/Users/mailp/dev/pf1e-codex");
function shingles(text, k = 5) {
  const w = String(text || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").match(/[a-z0-9']+/g) || [];
  const set = new Set();
  for (let i = 0; i + k <= w.length; i++) set.add(w.slice(i, i + k).join(" "));
  return set;
}
function containment(a, b) {
  if (!a.size || !b.size) return 0;
  const [s, l] = a.size < b.size ? [a, b] : [b, a];
  let n = 0; for (const x of s) if (l.has(x)) n++;
  return n / s.size;
}
const stem = (t) => (t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);
const NAME_STOP = new Set(["of", "the", "a", "an", "and", "to", "in", "for"]);
const QUAL = new Set(["lesser", "greater", "mass", "communal", "improved", "major", "minor", "supreme", "epic", "advanced", "superior", "mythic", "unchained"]);
const ROMAN = new Set(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix"]);
function familyKey(raw) {
  let s = String(raw || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\([^)]*\)/g, " ").replace(/'s\b/g, "s").replace(/,/g, " ");
  const toks = s.split(/[^a-z0-9]+/).filter(Boolean);
  const core = [];
  toks.forEach((t, i) => { if (QUAL.has(t) || /^\d+$/.test(t) || (ROMAN.has(t) && i === toks.length - 1) || NAME_STOP.has(t)) return; core.push(stem(t)); });
  return core.join(" ");
}
const families = new Map();
const byNameBucket = new Map(d.IDX.map((r) => [r[2] + "|" + r[1].toLowerCase(), r]));
for (const r of d.IDX) {
  const k = r[2] + "|" + familyKey(r[1]);
  if (!k.split("|")[1]) continue;
  if (!families.has(k)) families.set(k, []);
  families.get(k).push({ id: r[0], name: r[1], bucket: r[2] });
}
const firstLine = (body) => (body || "").split("\n").map((l) => l.trim()).filter(Boolean).find((l) => !/^Source\s/i.test(l)) || "";
const bodyOf = (bucket, id) => (d.BODIES[bucket] || {})[id] || "";

let flaggedRaw = 0, confirmedBug = [];
for (const [, members] of families) {
  if (members.length < 2) continue;
  const names = new Set(members.map((m) => m.name.toLowerCase()));
  for (const m of members) {
    const body = bodyOf(m.bucket, m.id);
    const first = firstLine(body);
    if (!first || first.length > 50 || first.toLowerCase() === m.name.toLowerCase() || !names.has(first.toLowerCase())) continue;
    flaggedRaw++;
    const sib = byNameBucket.get(m.bucket + "|" + first.toLowerCase());
    const sibBody = bodyOf(sib[2], sib[0]);
    const cont = containment(shingles(body), shingles(sibBody));
    const lenRatio = sibBody.length ? body.length / sibBody.length : 0;
    // A near-total duplicate of the SIBLING's own separate body: high overlap AND similar total length
    // (a legitimate "as X, except Y" spell is usually LONGER than X alone, or clearly shorter/partial).
    if (cont >= 0.85 && lenRatio >= 0.7 && lenRatio <= 1.5) confirmedBug.push({ ...m, sibling: sib[1], cont: +cont.toFixed(2), lenRatio: +lenRatio.toFixed(2), myLen: body.length, sibLen: sibBody.length });
  }
}
console.log(`candidates (open with a sibling name): ${flaggedRaw}`);
console.log(`confirmed near-duplicate bodies (cont>=0.85, similar length): ${confirmedBug.length}\n`);
for (const f of confirmedBug) console.log(`  [${f.bucket}] "${f.name}" (${f.myLen}c)  <-  "${f.sibling}" (${f.sibLen}c)   cont=${f.cont} lenRatio=${f.lenRatio}   id=${f.id}`);

fs.writeFileSync("D:/CODEX/d20-pilot/codex-duplicate-body-bug.json", JSON.stringify(confirmedBug, null, 1));
console.log(`\nwrote D:/CODEX/d20-pilot/codex-duplicate-body-bug.json`);
