/* Do the tables that must be on a page actually reach it — and say the right thing?
 *
 * Written AFTER a regression that every other check passed. import-summon-tables.mjs took its
 * source from a table it also overwrote, so a re-run sliced a slice: Summon Monster 2-9 all showed
 * only the 1st-level creatures. The pages still had a table, the counts of tables were right, and
 * it shipped. The only thing that was wrong was the number of ROWS — so that is what this asserts.
 *
 * The expectation here is deliberately stated from the RULES, not derived from the importer:
 * Summon Monster N summons a creature from level N's list or several from a lower level, so its
 * page must list levels 1..N — exactly those, in order, none missing, none extra. A check that
 * re-used the importer's logic would only ever confirm the importer agrees with itself.
 *
 * Usage: node tools/check-tables.mjs [repoRoot]
 */
import fs from "node:fs";

const ROOT = process.argv[2] || ".";
globalThis.window = {};
for (const f of ["data/index.js", "data/tables.js"]) (0, eval)(fs.readFileSync(`${ROOT}/${f}`, "utf8"));
const IDX = globalThis.window.PF_INDEX, T = globalThis.window.PF_TABLES;

const fail = [];
const LEVEL = /^(\d)(?:st|nd|rd|th)\s+Level$/i;

for (const base of ["Summon Monster", "Summon Nature's Ally"]) {
  for (let n = 1; n <= 9; n++) {
    const name = `${base} ${n}`;
    const row = IDX.find((r) => r[2] === "spells" && r[1] === name);
    if (!row) { fail.push(`${name}: the spell itself is missing from the index`); continue; }
    const tabs = T[row[0]];
    if (!tabs || !tabs.length) { fail.push(`${name}: has no tables at all`); continue; }

    // 1. the standard list: level headers must be exactly 1..N, each with creatures under it
    const rows = tabs[0].r;
    const headers = [], perLevel = {};
    let cur = null;
    for (const r of rows) {
      const m = LEVEL.exec(String(r[0] || "").trim());
      if (m) { cur = Number(m[1]); headers.push(cur); perLevel[cur] = 0; }
      else if (cur) perLevel[cur]++;
    }
    const want = Array.from({ length: n }, (_, i) => i + 1).join(",");
    if (headers.join(",") !== want)
      fail.push(`${name}: standard list shows levels [${headers.join(",")}], should be [${want}] ` +
                `(${rows.length} rows)`);
    for (const l of headers) if (perLevel[l] < 1) fail.push(`${name}: level ${l} has no creatures under it`);

    // 2. the deity table: three columns, no blank cells
    const deity = tabs[1];
    if (!deity) fail.push(`${name}: no deity-additions table`);
    else {
      const hdr = deity.r[0] || [];
      if (hdr.join("|") !== "Deity|Additional creature|Source")
        fail.push(`${name}: deity table header is [${hdr.join("|")}]`);
      const bad = deity.r.slice(1).filter((r) => r.length !== 3 || r.some((c) => !String(c).trim()));
      if (bad.length) fail.push(`${name}: ${bad.length} malformed deity row(s), e.g. ${JSON.stringify(bad[0])}`);
      if (deity.r.length < 2) fail.push(`${name}: deity table has no rows`);
    }
  }
}

// Informational, not a failure: tables keyed to an id that no index row carries can never be shown.
const ids = new Set(IDX.map((r) => r[0]));
const orphans = Object.keys(T).filter((id) => !ids.has(id));

console.log(`summon spells checked : 18`);
console.log(`tables in data        : ${Object.keys(T).length} entries (${orphans.length} keyed to an id that no entry has — cannot display)`);
if (fail.length) {
  console.log(`\nFAIL — ${fail.length} problem(s):`);
  for (const f of fail) console.log("  " + f);
  process.exit(1);
}
console.log("\nevery summon spell lists exactly the levels it can use, plus its deity additions");
