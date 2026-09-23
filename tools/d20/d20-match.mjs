/* Stage 3+4: match cleaned d20pfsrd entries against the Codex, then look for CONFLICTS.
 *
 * THE BRIEF: no accidental duplicates, so match FUZZILY — but on content as well as name.
 *
 * WHY NAMES ONLY PROPOSE. Fuzzy name matching alone was tried on this project once and was wrong in
 * both directions: it called "Beast Shape III" a variant of "Beast Shape I" (a different spell) and
 * called all 1,320 archetypes missing because the Codex stores them class-prefixed. So:
 *
 *   1. NAMES PROPOSE. A d20 page is compared to Codex rows by fuzzy name similarity.
 *   2. HARD VETOES. Qualifiers that make two things DIFFERENT entities must agree exactly: digits,
 *      roman numerals, and Lesser/Greater/Mass/Improved/Major/Minor... "Beast Shape III" can never
 *      match "Beast Shape I", however alike their text is.
 *   3. CONTENT DECIDES. A weighted-word cosine plus a numbers-and-dice comparison must confirm.
 *   4. ALIASES for known AoN naming: archetypes carry a class prefix; items are stored under a
 *      mangled variant name whose BODY still opens with the real parent name.
 *
 * OUTCOMES (each page gets exactly one)
 *   DUP        same thing as a Codex entry -> leave it out
 *   NAMESAKE   same name, genuinely different content -> a separate entry (common with third party)
 *   NEW        nothing in the Codex matches -> import
 *   INTRA_DUP  the same entry appearing twice inside d20pfsrd -> keep one
 * and for every DUP, a CONFLICT check: do the two sources disagree on the rules-relevant numbers?
 *
 * Usage: node tools/d20/d20-match.mjs [--calibrate] [--snap D:/CODEX/d20-pilot]
 *          [--dup-cos 0.55] [--fuzzy-cos 0.70] [--same-name-cos 0.30]
 */
import fs from "node:fs";
import { loadCodex } from "../lib/api-build.mjs";
import { fieldsOf, compareFields } from "./d20-conflicts.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const ROOT = arg("root", "C:/Users/mailp/dev/pf1e-codex");
const CALIBRATE = argv.includes("--calibrate");
const T_DUP = Number(arg("dup-cos", 0.55));          // strong name + at least this content agreement
const T_FUZZY = Number(arg("fuzzy-cos", 0.70));      // weaker name needs stronger content
const T_SAME = Number(arg("same-name-cos", 0.30));   // below this a same-named page is a different entity
const T_CONT = Number(arg("cont", 0.35));             // shared 5-word phrases: same name + this much shared text = same thing
const T_CONT_FUZZY = Number(arg("cont-fuzzy", 0.70)); // a looser name needs more shared text
const T_CONT_SAME = Number(arg("cont-same", 0.15));   // below this, a same-named page is a different entity

/* ---------- names -------------------------------------------------------------------------- */
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9 };
const QUAL = new Set(["lesser", "greater", "mass", "communal", "improved", "major", "minor", "supreme", "epic", "advanced", "superior", "mythic", "unchained"]);
const NAME_STOP = new Set(["of", "the", "a", "an", "and", "to", "in", "for"]);
const stem = (t) => (t.length > 4 && t.endsWith("ves") ? t.slice(0, -3) + "f"          // dwarves -> dwarf, elves -> elf
  : t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

export function parseName(raw) {
  let s = String(raw || "").toLowerCase().replace(/[’‘]/g, "'");
  // Parentheses are usually formatting: a feat type "(Combat)", "(CR 1/2)", "(3pp)". A few change WHAT
  // the thing is: "Deadly Aim (Mythic)" is the mythic feat, not Deadly Aim, and AoN names it
  // "Mythic Deadly Aim". Lift those out as qualifiers before discarding the rest.
  const extra = [];
  for (const m of s.matchAll(/\(([^)]*)\)/g)) {
    if (/mythic/.test(m[1])) extra.push("mythic");
    if (/unchained/.test(m[1])) extra.push("unchained");
    if (/3\.5/.test(m[1])) extra.push("3.5e");
  }
  s = s.replace(/\([^)]*\)/g, " ");                       // (Metamagic) (CR 1/2) (3pp)
  s = s.replace(/'s\b/g, "s").replace(/([a-z])(\d)/g, "$1 $2");   // "Resistance1" -> "Resistance 1"
  const toks = s.split(/[^a-z0-9]+/).filter(Boolean);
  const qual = new Set(), core = [];
  toks.forEach((t, i) => {
    if (QUAL.has(t)) qual.add(t);
    else if (/^\d+$/.test(t)) qual.add("#" + t);
    else if (ROMAN[t] && toks.length >= 2 && i === toks.length - 1) qual.add("#" + ROMAN[t]);
    else if (!NAME_STOP.has(t)) core.push(stem(t));
  });
  for (const e of extra) qual.add(e);
  return { core, qual, key: core.join(" ") };
}
// The full PF1e skill list — small, fixed, and each name means exactly one thing. Used only to rescue
// an AMBIGUOUS "Heal (Wis)" ~ "Heal" pair straight to DUP without needing content evidence at all.
const SKILLS = ["Acrobatics", "Appraise", "Bluff", "Climb", "Craft", "Diplomacy", "Disable Device", "Disguise",
  "Escape Artist", "Fly", "Handle Animal", "Heal", "Intimidate", "Knowledge", "Linguistics", "Perception",
  "Perform", "Profession", "Ride", "Sense Motive", "Sleight of Hand", "Spellcraft", "Stealth", "Survival", "Swim", "Use Magic Device"];
const SKILL_KEYS = new Set(SKILLS.map((s) => parseName(s).key));
const qualEqual = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const jacc = (a, b) => { const A = new Set(a), B = new Set(b); let n = 0; for (const x of A) if (B.has(x)) n++; return n / ((A.size + B.size - n) || 1); };
function lev(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur; }
  return prev[n];
}
const nameSim = (a, b) => (a.key === b.key ? 1 : Math.max(jacc(a.core, b.core),
  1 - lev(a.key, b.key) / Math.max(a.key.length, b.key.length, 1)));

/* ---------- content ------------------------------------------------------------------------ */
const STOPS = new Set("the and for you your are can that this with from have has not its may any all one two each per than then them they their there which when while will would into onto also such only more most other some these those been being does did doing his her she him who what where within without upon over under both either neither casting effect description defense offense statistics benefit normal special source".split(" "));
const WORD = /[a-z]+|\d+d\d+|\d+/g;
function tfOf(text) {
  const m = new Map();
  for (const w of (text.toLowerCase().replace(/[’‘]/g, "'").match(WORD) || [])) {
    if (w.length < 3 && !/\d/.test(w)) continue;
    if (STOPS.has(w)) continue;
    m.set(w, (m.get(w) || 0) + 1);
  }
  return m;
}
/** Numbers that carry rules (dice, DCs, bonuses, ranges) — page numbers and copyright years removed. */
function numsOf(text) {
  const t = text.replace(/pg\.?\s*\d+/gi, " ").replace(/©\s*\d{4}/g, " ").replace(/\b(19|20)\d\d\b/g, " ")
    .replace(/(\d),(\d{3})/g, "$1$2");
  return (t.match(/\d+d\d+|\d+(?:\/\d+)?/g) || []);
}
const bag = (arr) => { const m = new Map(); for (const x of arr) m.set(x, (m.get(x) || 0) + 1); return m; };
function bagJacc(a, b) {
  let inter = 0, uni = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) { const x = a.get(k) || 0, y = b.get(k) || 0; inter += Math.min(x, y); uni += Math.max(x, y); }
  return uni ? inter / uni : 1;
}

/** CONTAINMENT: the share of one text's 5-word phrases that appear in the other. Cosine over whole
 *  documents collapses when one side carries extra material — AoN bodies open with navigation debris
 *  ("General | Combat Stamina", "Drawbacks Nomadic Category Race Requirement(s)") and differ in length,
 *  so pairs whose text is IDENTICAL scored 0.3-0.5. Containment does not care what surrounds the
 *  shared text: the same entity scores near 1 either way, and a different entity that merely shares
 *  a name scores near 0 (a few stock phrases at most). Symmetric via max(): "d20 is contained in AoN"
 *  and "AoN is contained in d20" are both the same entity. */
function shingles(text, k = 5) {
  const w = text.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z0-9']+/g) || [];
  const set = new Set();
  for (let i = 0; i + k <= w.length; i++) set.add(w.slice(i, i + k).join(" "));
  return set;
}
function containment(A, B) {
  if (!A.size || !B.size) return 0;
  let n = 0; const [s, l] = A.size < B.size ? [A, B] : [B, A];
  for (const x of s) if (l.has(x)) n++;
  return n / s.size;                       // share of the SMALLER text found in the larger
}

/* ---------- load --------------------------------------------------------------------------- */
console.log("loading Codex …");
const d = loadCodex(ROOT);
const codex = d.IDX.filter((r) => !d.isJunk(r)).map((r) => {
  const body = (d.BODIES[r[2]] || {})[r[0]] || "";
  return { id: r[0], name: r[1], bucket: r[2], cat: r[3], body, pn: parseName(r[1]) };
});
const pages = fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse);
const entries = pages.filter((p) => p.kind === "entry");
console.log(`Codex rows ${codex.length}; d20 pages ${pages.length} (entries ${entries.length})`);

// IDF from the d20 sample (cheap, and only used to weight cosine)
const DF = new Map();
for (const p of entries) for (const w of tfOf(p.body).keys()) DF.set(w, (DF.get(w) || 0) + 1);
const idf = (w) => Math.log((entries.length + 1) / ((DF.get(w) || 0) + 1)) + 1;
const vec = (tf) => { const v = new Map(); let n2 = 0; for (const [w, c] of tf) { const x = (1 + Math.log(c)) * idf(w); v.set(w, x); n2 += x * x; } return { v, n: Math.sqrt(n2) || 1 }; };
const cosine = (A, B) => { let dot = 0; const [s, l] = A.v.size < B.v.size ? [A, B] : [B, A]; for (const [w, x] of s.v) { const y = l.v.get(w); if (y) dot += x * y; } return dot / (A.n * B.n); };

const stripSource = (b) => b.split("\n").filter((l) => !/^Source\s/i.test(l.trim())).join("\n");
// AoN stores some items under a mangled VARIANT name ("Ring of Protection1", "Bag of Tricks
// Aquamarine") while the BODY still opens with the real parent name. Index that parent name as an
// alias. Compare the full signature (words AND qualifiers): the digit in "Protection1" is exactly
// what distinguishes the variant from its parent, and a words-only comparison hid the alias.
const sigOf = (pn) => `${pn.key}|${[...pn.qual].sort().join(",")}`;
for (const c of codex) {
  c.parentKey = null;
  const first = (c.body.split("\n")[0] || "").trim();
  if (first) { const pk = parseName(first); if (pk.key && sigOf(pk) !== sigOf(c.pn)) c.parentKey = pk; }
}

// inverted index: core token -> Codex rows
const inv = new Map();
codex.forEach((c, i) => { for (const t of new Set([...c.pn.core, ...(c.parentKey ? c.parentKey.core : [])])) { if (!inv.has(t)) inv.set(t, []); inv.get(t).push(i); } });

const ALLOWED = { feats: ["feats"], spells: ["spells"], items: ["items", "rules"], monsters: ["monsters"], traits: ["traits"], races: ["races"],
  archetypes: ["archetypes", "options"], classes: ["classes"], options: ["options", "feats", "archetypes", "classes", "rules"],
  // d20 files mythic feats/spells under "Alternative Rule Systems"; the Codex files them under feats/spells.
  rules: ["rules", "options", "feats", "spells", "items", "traits", "monsters", "races", "classes", "archetypes"] };

function candidates(p) {
  const names = [parseName(p.name || p.title)];
  if (p.bucket === "archetypes") {                       // Codex stores archetypes class-prefixed
    const ai = p.crumb.findIndex((s) => /^archetypes$/i.test(s));
    const cls = ai > 0 ? p.crumb[ai - 1] : null;
    if (cls) names.push(parseName(`${cls} ${p.name || p.title}`));
  }
  // d20 names creatures "Family, Name" ("Devil, Lemure", "Boar, Common", "Primate, Monkey"); AoN uses the
  // bare name ("Lemure", "Boar"). Propose the halves as ALIASES. An alias is capped below "strong" so it can
  // only become a match when the TEXT agrees — a name alone never merges two entries.
  const raw = String(p.name || p.title).replace(/\([^)]*\)/g, " ").trim();
  const comma = /^([^,]+),\s*([^,]+)$/.exec(raw);
  if (comma) for (const a of [comma[2], comma[1], `${comma[2]} ${comma[1]}`]) { const pa = parseName(a); if (pa.key) { pa.alias = true; names.push(pa); } }
  // d20 titles options with their kind ("Chaos Domain"); AoN files the same thing as "Chaos" under Domains.
  const kindless = /^(.+?)\s+(domain|subdomain|bloodline|mystery|patron|spirit|school)$/i.exec(raw);
  if (kindless) { const pa = parseName(kindless[1]); if (pa.key) { pa.alias = true; names.push(pa); } }
  const allowed = new Set(ALLOWED[p.bucket] || [p.bucket]);
  const seen = new Map();
  for (const pn of names) {
    const pool = new Set();
    for (const t of pn.core) { const rows = inv.get(t); if (rows && rows.length < 3000) rows.forEach((i) => pool.add(i)); }
    for (const i of pool) {
      const c = codex[i]; if (!allowed.has(c.bucket)) continue;
      for (const cand of [c.pn, c.parentKey].filter(Boolean)) {
        let s = nameSim(pn, cand);
        if (pn.alias) s = Math.min(s, 0.8);
        if (s < 0.6) continue;
        const prev = seen.get(i), ok = qualEqual(pn.qual, cand.qual);
        // Prefer a candidate that SURVIVES the veto. "Ring of Protection1" ties itself at 1.00 with its
        // own parent alias "Ring of Protection"; the alias is the one that is not vetoed.
        if (!prev || (ok && !prev.qualOk) || (ok === prev.qualOk && s > prev.nameSim))
          seen.set(i, { c, nameSim: s, qualOk: ok, viaParent: cand === c.parentKey, pn });
      }
    }
  }
  return [...seen.values()].sort((a, b) => b.nameSim - a.nameSim).slice(0, 12);
}

/* ---------- match -------------------------------------------------------------------------- */
const results = [];
const cvCache = new Map();
const shCache = new Map();
const codexShingles = (c) => { if (!shCache.has(c.id)) shCache.set(c.id, shingles(stripSource(c.body))); return shCache.get(c.id); };
const codexVec = (c) => { if (!cvCache.has(c.id)) cvCache.set(c.id, vec(tfOf(stripSource(c.body)))); return cvCache.get(c.id); };

for (const p of entries) {
  const pv = vec(tfOf(p.body));
  const pnum = bag(numsOf(p.body));
  const psh = shingles(p.body);
  const cands = candidates(p).map((x) => ({ ...x, cos: cosine(pv, codexVec(x.c)),
    cont: containment(psh, codexShingles(x.c)),
    numJ: bagJacc(pnum, bag(numsOf(stripSource(x.c.body)))) }));
  // best = highest-scoring candidate among those that survive the qualifier veto
  // A parent-name alias exists to reach entries whose own name AoN mangled ("Cloak of Resistance1"). It must
  // never compete with a real same-name entry: "Bestow Curse, Greater" borrows its parent's name and would tie.
  const exact = cands.some((x) => !x.viaParent && x.qualOk && x.nameSim >= 0.92);
  const ok = cands.filter((x) => x.qualOk && !(exact && x.viaParent));
  if (process.env.DBG && process.env.DBG === p.title) for (const x of cands) console.log("DBG", x.c.name, x.c.bucket, x.nameSim.toFixed(2), "qualOk", x.qualOk, "cos", x.cos.toFixed(2), "cont", x.cont.toFixed(2), x.viaParent ? "viaParent" : "");
  const content = (x) => Math.max(x.cos, x.cont);
  ok.sort((a, b) => (b.nameSim * 0.4 + content(b) * 0.6) - (a.nameSim * 0.4 + content(a) * 0.6));
  const best = ok[0] || null;
  const vetoed = cands.filter((x) => !x.qualOk && x.nameSim >= 0.85).sort((a, b) => b.cos - a.cos)[0] || null;

  let verdict = "NEW", why = "";
  if (best) {
    const strong = best.nameSim >= 0.92, med = best.nameSim >= 0.75;
    if (strong && (best.cont >= T_CONT || best.cos >= T_DUP)) { verdict = "DUP"; why = best.cont >= T_CONT ? "name + shared text" : "name + similar content"; }
    else if (med && (best.cont >= T_CONT_FUZZY || best.cos >= T_FUZZY)) { verdict = "DUP"; why = "fuzzy name, strong content"; }
    else if (strong && best.cont < T_CONT_SAME && (best.cos < T_SAME || best.cont < 0.05)) { verdict = "NAMESAKE"; why = "same name, different content"; }
    else if (strong) {
      // RESCUE, before giving up as AMBIGUOUS: short bodies (a 1-sentence rogue talent, an item's
      // one-line construction note) starve cosine/containment of material to work with even when the
      // two pages plainly describe the same thing — found reading "Mask, Reaper's" (identical Price/CL
      // /Weight/Slot header, cont only 0.13 because AoN spells out bonuses d20's "functions like X"
      // version does not restate) and "Poison Use" (a two-sentence talent, numJ 1.00). Promote only on
      // POSITIVE evidence — at least one structured field shared AND agreeing — never on the mere
      // absence of a conflict, which would also wave through "Burning Gaze" (enchantment vs evocation,
      // an 11-class AoN spell list vs d20's 2): compareFields now checks School precisely to block that.
      const D = fieldsOf(p.body), A = fieldsOf(best.c.body);
      const shared = [...D.keys()].filter((k) => A.has(k) && k !== "prerequisite");
      const conflicts = compareFields(p.body, best.c.body);
      const fieldsAgree = shared.length > 0 && conflicts.every((c) => c.sev === "low");
      // SKILL PAGES: Pathfinder's ~30 skill names are a small, fixed, unambiguous set — "Heal" can
      // never mean two different things — so an exact name match in the rules bucket needs no further
      // content evidence at all.
      const skillMatch = p.bucket === "rules" && best.pn.key && SKILL_KEYS.has(best.pn.key) && best.pn.key === parseName(best.c.name).key;
      if (fieldsAgree || skillMatch) {
        verdict = "DUP";
        why = skillMatch ? "known skill name, exact match" : `same name + matching field(s): ${shared.join(", ")}`;
      } else {
        verdict = "AMBIGUOUS"; why = `same name, middling content (cont ${best.cont.toFixed(2)}, cos ${best.cos.toFixed(2)})`;
      }
    }
  }
  // FAMILY PAGE: d20 keeps "Beast Shape" as one page for I-IV; AoN has four numbered entries, so the qualifier
  // veto (right for I vs II) leaves nothing to match. If the vetoed sibling contains this page's text, the
  // content is already in the Codex.
  let family = null;
  if (verdict === "NEW" && vetoed && vetoed.cont >= 0.6 && (p.body || "").length > 400) { verdict = "DUP"; why = "family page: AoN files it as numbered/qualified variants"; family = vetoed; }
  const near = cands.slice().sort((a, b) => b.nameSim - a.nameSim || b.cos - a.cos)[0] || null;
  // RENAMED: a different name but the same text ("Unusual Origin (Gillmen)" = "Unusual Heritage (Gillman)").
  const byText = cands.filter((x) => x.qualOk && x.cont >= 0.55 && x.nameSim >= 0.5 && (p.body || "").length > 300)
    .sort((a, b) => b.cont - a.cont)[0] || null;
  if (verdict === "NEW" && byText) { verdict = "DUP"; why = "same text under a different name"; family = byText; }
  results.push({ p, best: best || family, vetoed, near, verdict, why, ncand: cands.length });
}

/* ---------- intra-d20 duplicates ----------------------------------------------------------- */
const groups = new Map();
for (const r of results.filter((r) => r.verdict === "NEW" || r.verdict === "NAMESAKE")) {
  const pn = parseName(r.p.name || r.p.title);
  const k = `${r.p.bucket}|${pn.key}|${[...pn.qual].sort().join(",")}`;
  if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r);
}
let intra = 0;
for (const g of groups.values()) {
  if (g.length < 2) continue;
  const keep = g[0], kv = vec(tfOf(keep.p.body));
  for (const r of g.slice(1)) if (cosine(kv, vec(tfOf(r.p.body))) >= T_DUP) { r.verdict = "INTRA_DUP"; r.why = `same as ${keep.p.title}`; intra++; }
}

/* ---------- conflicts ---------------------------------------------------------------------- */
const numWords = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
function conflict(r) {
  const a = bag(numsOf(r.p.body)), b = bag(numsOf(stripSource(r.best.c.body)));
  const onlyD = [], onlyA = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(k) || 0, y = b.get(k) || 0;
    if (x > y) onlyD.push(k + (x - y > 1 ? `×${x - y}` : ""));
    if (y > x) onlyA.push(k + (y - x > 1 ? `×${y - x}` : ""));
  }
  return { onlyD, onlyA, sev: onlyD.length + onlyA.length, numJ: bagJacc(a, b) };
}
for (const r of results.filter((r) => r.verdict === "DUP")) r.conflict = conflict(r);

/* ---------- report ------------------------------------------------------------------------- */
const tally = (f) => results.reduce((m, r) => (m[f(r)] = (m[f(r)] || 0) + 1, m), {});
const show = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  ");
console.log(`\n=== VERDICTS over ${results.length} entry pages ===`);
console.log(show(tally((r) => r.verdict)));
console.log("\nby bucket:");
for (const b of [...new Set(results.map((r) => r.p.bucket))].sort())
  console.log(`  ${b.padEnd(11)}`, show(results.filter((r) => r.p.bucket === b).reduce((m, r) => (m[r.verdict] = (m[r.verdict] || 0) + 1, m), {})));
console.log(`\nintra-d20 duplicate groups collapsed: ${intra}`);

if (CALIBRATE) {
  console.log("\n=== CALIBRATION: exact same-name pairs (KNOWN same entity) — how alike is their content? ===");
  const pos = results.filter((r) => r.best && r.best.nameSim === 1);
  const pct = (a, q) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * q))] : NaN;
  for (const b of [...new Set(pos.map((r) => r.p.bucket))].sort()) {
    const xs = pos.filter((r) => r.p.bucket === b).map((r) => r.best.cos);
    console.log(`  ${b.padEnd(11)} n=${String(xs.length).padStart(3)}  cos  min ${pct(xs, 0).toFixed(2)}  p10 ${pct(xs, .1).toFixed(2)}  p25 ${pct(xs, .25).toFixed(2)}  median ${pct(xs, .5).toFixed(2)}`);
  }
  console.log("\n  qualifier veto in action (name>=0.85 but a qualifier differs, so NOT matched):");
  for (const r of results.filter((r) => r.vetoed).slice(0, 8))
    console.log(`    d20 "${r.p.title}"  x  Codex "${r.vetoed.c.name}"   nameSim ${r.vetoed.nameSim.toFixed(2)}  cos ${r.vetoed.cos.toFixed(2)}  -> vetoed, verdict ${r.verdict}`);
}

fs.writeFileSync(`${SNAP}/matches.json`, JSON.stringify(results.map((r) => ({
  file: r.p.file, title: r.p.title, url: r.p.url, bucket: r.p.bucket, third: r.p.thirdParty, publisher: r.p.publisher,
  verdict: r.verdict, why: r.why,
  match: r.best ? { id: r.best.c.id, name: r.best.c.name, bucket: r.best.c.bucket, nameSim: +r.best.nameSim.toFixed(3), cos: +r.best.cos.toFixed(3), cont: +r.best.cont.toFixed(3), numJ: +r.best.numJ.toFixed(3), viaParent: r.best.viaParent } : null,
  near: r.near ? { name: r.near.c.name, bucket: r.near.c.bucket, nameSim: +r.near.nameSim.toFixed(3), cos: +r.near.cos.toFixed(3), cont: +r.near.cont.toFixed(3), numJ: +r.near.numJ.toFixed(3), qualOk: r.near.qualOk } : null,
  conflict: r.conflict || null,
})), null, 1));
console.log(`\nwrote ${SNAP}/matches.json`);
