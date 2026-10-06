/* Fill the SOURCE column of ORIGINAL rows that have none, from the book their own text names.
 *
 * Found 2026-10-06: 273 AoN-sourced rows had a blank source although the book is in the row's own body — monster templates ("Accursed (CR +1)
 * ⏎ Horror Adventures pg. 248"), mesmerist tricks / stares and psychic amplifications ("Allay Pain(Occult Realms pg. 16): …"), and class-feature
 * pages ("Description Source: PRPG Core Rulebook"). The original build only parsed a labelled "Source …" line, so these never reached the column.
 *
 * Strictly additive: ONLY a blank source is ever filled (never overwritten), only from text already in the row, and the body is untouched. The
 * facet `bk` (the "Any book" filter value: the book without its page) is set to match, as it is for every other AoN row.
 *
 * Usage: node tools/fix-original-sources.mjs [--apply] [--root <repo>]      (dry run by default)
 * d20-verify.mjs knows this one exception: an original row may differ from its baseline by a filled-in source/bk and nothing else. */
import fs from "node:fs";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const ROOT = argv.includes("--root") ? argv[argv.indexOf("--root") + 1] : ".";
const norm = (s) => String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
const mintId = (bucket, name) => crypto.createHash("sha256").update(`pf1e-codex-d20pfsrd|${bucket}|${norm(name)}`).digest("hex").slice(0, 16);

const idxPath = `${ROOT}/data/index.js`;
const im = /^window\.PF_INDEX=(\[.*\]);\r?\n?$/s.exec(fs.readFileSync(idxPath, "utf8"));
if (!im) throw new Error("cannot parse data/index.js");
const rows = JSON.parse(im[1]);
const bodies = {};
for (const b of new Set(rows.map((r) => r[2]))) {
  const text = fs.readFileSync(`${ROOT}/data/cat/${b}.js`, "utf8"), open = `window.PF_REG("${b}",`;
  bodies[b] = JSON.parse(text.slice(open.length, text.trimEnd().length - 2));
}

const PAGE = String.raw`(\d+(?:[-–]\d+)?)`;
/** "<Book> pg. N" from the row's own text, or "<Book>" when only a "Source: <Book>" is given. null when it names none. */
export function sourceFromBody(body) {
  const lines = String(body).split("\n");
  // 1. a line of its own near the top: "Horror Adventures pg. 248"
  const own = new RegExp(String.raw`^(?:Source:?\s+)?(.{3,70}?)\s+pg\.\s*${PAGE}\s*$`);
  for (const l of lines.slice(0, 14)) { const m = own.exec(l.trim()); if (m && !/[.!?]$/.test(m[1])) return `${m[1].trim()} pg. ${m[2]}`; }
  // 2. in the first line's parentheses: "Allay Pain(Occult Realms pg. 16): …", "Biokinetic Healing (Su) (Occult Origins pg. 16): …"
  const paren = new RegExp(String.raw`\(([^()]{3,60}?)\s+pg\.\s*${PAGE}\)`).exec(lines[0] || "");
  if (paren) return `${paren[1].trim()} pg. ${paren[2]}`;
  // 3. a labelled source with no page, in the first three lines: "Description Source: PRPG Core Rulebook"
  for (const l of lines.slice(0, 3)) { const m = /\bSource:\s*([^\n]{3,60}?)\s*$/.exec(l); if (m) return m[1].trim(); }
  return null;
}
export const bookOfSource = (s) => String(s).replace(/\s*pg\.\s*\d+.*$/, "").trim();

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("fix-original-sources.mjs")) {
  let filled = 0, none = 0; const tally = {}; const left = [];
  for (const r of rows) {
    if (r[4] || r[0] === mintId(r[2], r[1]) || r[3] === "Additional Material (d20pfsrd)") continue;   // only a blank source on an ORIGINAL row
    const src = sourceFromBody(bodies[r[2]][r[0]]);
    if (!src) { none++; left.push(`${r[1]} [${r[2]}/${r[3]}]`); continue; }
    filled++; const k = `${r[2]}/${r[3]}  <-  ${bookOfSource(src)}`; tally[k] = (tally[k] || 0) + 1;
    if (APPLY) { r[4] = src; r[6] = { ...(r[6] || {}), bk: bookOfSource(src) }; }
  }
  console.log(`original rows with a blank source: ${filled + none}  ->  filled from their own text: ${filled}, no book in the text: ${none}`);
  Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 14).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
  if (left.length) console.log(`still blank: ${left.join("; ")}`);
  if (APPLY) { fs.writeFileSync(idxPath, `window.PF_INDEX=${JSON.stringify(rows)};\n`); console.log(`APPLIED: data/index.js rewritten (${filled} sources filled; bodies untouched).`); }
  else console.log("Dry run — nothing written.");
}
