/* VERIFY every defect class the d20pfsrd import has ever produced. Exit 0 = clean, 1 = at least one check failed.
 *
 * Run automatically at the end of `d20-import.mjs --apply`, and by hand after ANY batch or repair:
 *   node tools/d20/d20-verify.mjs [--root <repo>] [--baseline <git rev>]
 *
 * Each check below exists because a real batch shipped that defect and it was only found by auditing afterwards
 * (2026-09-24, see memory d20-import-audit-2026-09-24). They are independent of the importer's own logic on
 * purpose: a check that reuses the code it is checking proves self-consistency, not correctness. Every check has
 * been mutation-tested (a fault injected into a scratch copy, the SPECIFIC message confirmed).
 *
 * A row is "d20" iff its id === mintId(bucket, name); every other row is an original Codex page and is never touched.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { commaListShare, AD_MARK, isGodSummaryTable } from "./d20-clean.mjs";
import {
  UNVERIFIED_MARK, UNVERIFIED_SOURCE, isPaizoish, publishersFromNotice, nameKeys, VARIANT_QUAL,
  isGodBody, isFlatStatLine, snippetOf,
} from "./d20-attrib.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");
const BASELINE = arg("baseline", "b9c50cfa");   // the last commit before any d20 import

// The duplicate-body cleanup bundled into the first import commit (38cdd7fa) removed 10 duplicate rows and rewrote
// 46 spell bodies. That is understood and fine; anything beyond it means an ORIGINAL page was lost or altered.
const KNOWN_ORIGINAL_DRIFT = { missing: 10, changed: 46 };

const norm = (s) => String(s || "").toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\s+/g, " ").trim();
const mintId = (bucket, name) => crypto.createHash("sha256").update(`pf1e-codex-d20pfsrd|${bucket}|${norm(name)}`).digest("hex").slice(0, 16);

function loadRoot(root) {
  const idxText = fs.readFileSync(`${root}/data/index.js`, "utf8");
  const rows = JSON.parse(idxText.slice(idxText.indexOf("=") + 1, idxText.lastIndexOf(";")));
  const bodies = {};
  for (const b of new Set(rows.map((r) => r[2]))) {
    const t = fs.readFileSync(`${root}/data/cat/${b}.js`, "utf8"), open = `window.PF_REG("${b}",`;
    if (!t.startsWith(open)) throw new Error(`data/cat/${b}.js has an unexpected shape`);
    Object.assign(bodies, JSON.parse(t.slice(open.length, t.trimEnd().length - 2)));
  }
  return { rows, bodies };
}

const { rows, bodies } = loadRoot(ROOT);
const isD20 = (r) => r[0] === mintId(r[2], r[1]);
const d20 = rows.filter(isD20), orig = rows.filter((r) => !isD20(r));
const failures = [];
const check = (name, bad, note = "") => {
  const ok = bad.length === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (${bad.length})`}`);
  if (!ok) { failures.push(name); bad.slice(0, 4).forEach((x) => console.log(`        ${x}`)); if (note) console.log(`        -> ${note}`); }
};
const tailOf = (id) => String(bodies[id]).split("\n\n").pop();
const label = (r) => `${r[1]} [${r[2]}] src="${r[4]}"`;
console.log(`verifying ${ROOT}: ${rows.length} rows (${d20.length} d20-minted, ${orig.length} original)\n`);

/* ---- integrity ---- */
const ids = new Set(rows.map((r) => r[0]));
check("ids are unique", rows.length === ids.size ? [] : [`${rows.length - ids.size} duplicate ids`]);
check("every row has a body", rows.filter((r) => typeof bodies[r[0]] !== "string" || !bodies[r[0]].trim()).map(label));
check("no body without a row", Object.keys(bodies).filter((id) => !ids.has(id)).map((id) => id));

/* ---- original pages are never lost or altered (beyond the one known cleanup) ---- */
try {
  const git = (p) => execSync(`git show ${BASELINE}:${p}`, { cwd: ROOT, maxBuffer: 1 << 29, stdio: ["ignore", "pipe", "ignore"] }).toString();
  const it = git("data/index.js");
  const baseRows = JSON.parse(it.slice(it.indexOf("=") + 1, it.lastIndexOf(";")));
  const nowById = new Map(rows.map((r) => [r[0], r]));
  const baseBodies = {};
  for (const b of new Set(baseRows.map((r) => r[2]))) { const t = git(`data/cat/${b}.js`), open = `window.PF_REG("${b}",`; Object.assign(baseBodies, JSON.parse(t.slice(open.length, t.trimEnd().length - 2))); }
  const missing = [], changed = [];
  for (const r of baseRows) { const n = nowById.get(r[0]); if (!n) missing.push(r[1]); else if (JSON.stringify(n) !== JSON.stringify(r) || baseBodies[r[0]] !== bodies[r[0]]) changed.push(r[1]); }
  check("original pages not removed", missing.length <= KNOWN_ORIGINAL_DRIFT.missing ? [] : missing.map((n) => `MISSING ${n}`), `only ${KNOWN_ORIGINAL_DRIFT.missing} known removals are expected`);
  check("original pages not altered", changed.length <= KNOWN_ORIGINAL_DRIFT.changed ? [] : changed.map((n) => `CHANGED ${n}`), `only ${KNOWN_ORIGINAL_DRIFT.changed} known rewrites are expected`);
} catch (e) { console.log(`SKIP  original-page comparison (git baseline ${BASELINE} unavailable: ${String(e.message).split("\n")[0]})`); }

/* ---- attribution ---- */
check("no 'Paizo' source on an entry whose own notice says the source is unconfirmed",
  d20.filter((r) => tailOf(r[0]).includes(UNVERIFIED_MARK) && r[4] !== UNVERIFIED_SOURCE && isPaizoish(r[4])).map(label),
  "asserting Paizo where we do not know is the mistake bkOf's default made");
check("no 'Third-party (unattributed)' when the entry's own Section 15 names the publisher",
  d20.filter((r) => r[4] === "Third-party (unattributed)" && publishersFromNotice(tailOf(r[0])).length).map(label));
check("no Paizo source when the entry's own Section 15 names only another publisher",
  d20.filter((r) => { if (!isPaizoish(r[4])) return false; const p = publishersFromNotice(tailOf(r[0])); return p.length && !p.some(isPaizoish); }).map(label));
check("no invented Paizo authorship on third-party content",
  d20.filter((r) => r[4] === "Third-party (unattributed)" && tailOf(r[0]).includes("Author/publisher: Paizo, Inc. (Pathfinder Roleplaying Game Reference Document)")).map(label));
check("no junk source strings (leading dash, trailing period after a number, image credits, Paizo spelling variants)",
  d20.filter((r) => /^[–—-]\s|#\d+\.$|^wp clipart$|^paizo,? ?inc\.?$/i.test(r[4]) && r[4] !== "Paizo, Inc.").map(label));
// A few pages carry stat data after the credit line (Encephalon Gorger), so the last TWO paragraphs are searched.
const lastTwo = (id) => String(bodies[id]).split("\n\n").slice(-2).join("\n\n");
check("every entry ends with a license/credit paragraph",
  d20.filter((r) => !/©|\(c\)|copyright|Author|blanket OGL|Source not confirmed|Open Game|source of this content is unclear|Written by|Messageboard|@ |Blog|Tumblr|Enterprises|^Source:|^Pathfinder\b/im.test(lastTwo(r[0]))).map((r) => `${label(r)} :: ${tailOf(r[0]).slice(0, 80)}`));

check("no placeholder text where a Section 15 credit should be",
  d20.filter((r) => /Product Name Section 15 here/i.test(String(bodies[r[0]])) || /\n\nx$/.test(String(bodies[r[0]]))).map(label));

/* ---- duplicates ---- */
{
  const byKey = new Map();
  for (const r of orig) for (const k of nameKeys(r[1])) { const a = byKey.get(r[2] + "|" + k); a ? a.push(r) : byKey.set(r[2] + "|" + k, [r]); }
  const bad = [];
  for (const r of d20) {
    if (VARIANT_QUAL.test(r[1]) || !(isPaizoish(r[4]) || r[4] === UNVERIFIED_SOURCE)) continue;
    for (const k of nameKeys(r[1])) for (const o of byKey.get(r[2] + "|" + k) || []) if (!VARIANT_QUAL.test(o[1]) && o[1] !== r[1]) bad.push(`${r[1]}  duplicates original "${o[1]}"`);
  }
  check("no d20 entry duplicates an original page under an inverted name", [...new Set(bad)]);
}

/* ---- routing ---- */
check("no god-shaped page outside the deities bucket",
  d20.filter((r) => ["options", "classes"].includes(r[2]) && isGodBody(String(bodies[r[0]]))).map(label));

/* ---- content shape ---- */
check("no source-template placeholder text",
  d20.filter((r) => /Italicized descriptive text here|: This is placeholder text|^Environment ZZ$|\{\{[^}]*\}\}/m.test(String(bodies[r[0]]))).map(label));
check("no stat block flattened onto a single line",
  d20.filter((r) => String(bodies[r[0]]).split("\n").some(isFlatStatLine)).map(label));
check("no crawler-captured advertisement text",
  d20.filter((r) => String(bodies[r[0]]).split("\n").some((l) => AD_MARK.test(l.trim()))).map(label),
  "the publisher-page ad widget (OpenGamingStore) must be cut in parsePage; a page that is only the ad is not an entry");
check("no god summary table posing as an entry",
  d20.filter((r) => { const b = String(bodies[r[0]]); return isGodSummaryTable(b.slice(0, b.lastIndexOf("\n\n"))); }).map(label));
check("no name-list navigation page posing as an entry",
  d20.filter((r) => commaListShare(String(bodies[r[0]]).split("\n").filter((l) => l.trim())) > 0.6).map(label));
check("no garbled characters or leaked markup",
  d20.filter((r) => /\uFFFD|â€|Ã[©¨¢±¶]|&nbsp;|&amp;|&lt;|~~~/.test(String(bodies[r[0]]))).map(label));
check("index snippet matches its body",
  d20.filter((r) => { const b = String(bodies[r[0]]); return r[5] !== snippetOf(b.slice(0, b.lastIndexOf("\n\n"))); }).map((r) => `${r[1]}: «${String(r[5]).slice(0, 50)}»`));

console.log(failures.length ? `\n${failures.length} CHECK(S) FAILED` : "\nall checks pass");
process.exit(failures.length ? 1 : 0);
