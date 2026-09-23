/* CONFLICT DETECTOR — the one thing the owner reviews.
 *
 * Input: matches.json (DUP pairs: a d20pfsrd page and the AoN-derived Codex entry it duplicates).
 * Output: conflicts.json + a severity-sorted printout of pairs where the two sources MATERIALLY disagree.
 *
 * Why not "diff the numbers". The first version compared every number on each page and flagged all 750
 * pairs: a page that is longer, shorter, or wrapped in different navigation has a different bag of
 * numbers without disagreeing about anything. A conflict is two statements ABOUT THE SAME THING that
 * differ. So this compares like with like, two ways:
 *
 *   1. FIELDS  — labelled stat lines (Level, Range, Duration, Price, Weight, Slot, Hit Die, ...). Both
 *      sides have the field and its normalised value differs in a number or a listed level.
 *   2. SENTENCES — for each d20 sentence that carries a number, find the AoN sentence that says the same
 *      thing (word overlap once numbers are removed). Same wording, different number = conflict.
 *
 * Something one side says and the other does not is NOT a conflict (AoN carries later-book classes on a
 * spell's level line; d20 carries extra flavour). Extra levels are noted at LOW severity, so the report
 * stays about disagreement.
 *
 * Usage: node tools/d20/d20-conflicts.mjs [--snap D:/CODEX/d20-pilot] [--mutate]
 *   --mutate  self-test: change one number in a d20 body and require the detector to find exactly that.
 */
import fs from "node:fs";
import { loadCodex } from "../lib/api-build.mjs";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");
const ROOT = "C:/Users/mailp/dev/pf1e-codex";

/* ---------- normalisation ------------------------------------------------------------------ */
const W2N = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100 };
const ORD = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const BS = String.fromCharCode(92);

function norm(t) {
  return String(t).toLowerCase()
    .replace(/[’‘]/g, "'").replace(/[–—−]/g, "-").replace(/×/g, "x")
    .replace(/(\d),\s?(\d{3})/g, "$1$2")
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|hundred)\b(?!-)/g, (m) => String(W2N[m]))
    .replace(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/g, (m) => String(ORD[m]))
    .replace(/\s+/g, " ").trim();
}
/** Rules numbers only: dice, plain and fractional numbers; page refs and years removed. */
function nums(t) {
  const s = norm(t).replace(/pg\.?\s*\d+/g, " ").replace(/\b(19|20)\d\d\b/g, " ");
  return (s.match(/\d+d\d+|\d+\/\d+|\d+/g) || []);
}
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const bagDiff = (a, b) => {
  const m = new Map(); for (const x of a) m.set(x, (m.get(x) || 0) + 1);
  const only2 = []; for (const x of b) { if (m.get(x)) m.set(x, m.get(x) - 1); else only2.push(x); }
  const only1 = []; for (const [k, v] of m) for (let i = 0; i < v; i++) only1.push(k);
  return { only1, only2 };
};
const stripSource = (b) => String(b || "").split("\n").filter((l) => !/^Source\s/i.test(l.trim())).join("\n");

/* ---------- 1. fields ---------------------------------------------------------------------- */
// Label -> severity when it disagrees. Order matters only for the alternation (longest first).
const FIELDS = [
  ["Casting Time", "high"], ["Saving Throw", "high"], ["Spell Resistance", "med"], ["Duration", "high"], ["Range", "high"],
  ["Area", "med"], ["Effect", "med"], ["Targets?", "med"], ["Price", "high"], ["Cost", "high"], ["Weight", "med"],
  ["Slot", "med"], ["Aura", "low"], ["CL", "med"], ["Hit Die", "high"], ["Skill Ranks per Level", "high"],
  ["Starting Wealth", "med"], ["Damage", "high"], ["Critical", "high"], ["Hardness", "med"], ["Hit Points|hp", "med"],
  ["Speed", "med"], ["Space", "low"], ["Reach", "low"], ["Init", "low"], ["AC", "high"], ["CR", "high"], ["BAB", "high"],
  ["Prerequisites?", "med"], ["Level", "high"], ["School", "high"],
];
const LABELS = FIELDS.map((f) => f[0]).join("|");
// A header label starts a line or follows "; " (School necromancy; Level wizard 3). A label buried in prose
// ("the cost of the spell", "damage to the target") is not a field, and matching those was the noise in the
// first version. The all-caps section words (CASTING, DEFENSE, ...) are treated as line breaks.
const LABEL_RE = new RegExp(String.raw`(?:^|;\s*)(` + LABELS + String.raw`)(?=[\s:])`, "gi");
export function fieldsOf(text) {
  const out = new Map();
  const lines = stripSource(text).replace(/(CASTING|EFFECT|DEFENSE|OFFENSE|STATISTICS|DESCRIPTION|ECOLOGY|Requirements)\s/g, "\n$1 ")
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  for (const line of lines) {
    const hits = []; let m; LABEL_RE.lastIndex = 0;
    while ((m = LABEL_RE.exec(line))) hits.push({ label: m[1].toLowerCase().replace(/s$/, ""), start: m.index + m[0].length - m[1].length, end: LABEL_RE.lastIndex });
    hits.forEach((h, i) => {
      const val = line.slice(h.end, i + 1 < hits.length ? hits[i + 1].start : line.length).replace(/^[\s:]+/, "").replace(/;\s*$/, "").slice(0, 160);
      if (!out.has(h.label) && val) out.set(h.label, val);            // first occurrence = the header field
    });
  }
  return out;
}
const sevOf = (label) => { for (const [re, s] of FIELDS) if (new RegExp("^(?:" + re + ")$", "i").test(label)) return s; return "med"; };

/** "Level bard 2, cleric 3" -> {bard:2, cleric:3}. Only classes named on BOTH sides are compared. */
function levels(v) {
  const o = {}; const s = norm(v);
  for (const m of s.matchAll(/([a-z][a-z/ ]*?)\s+(\d)(?=[,;\s]|$)/g)) for (const c of m[1].split("/")) o[c.trim().replace(/^(?:level|and)\s+/, "")] = +m[2];
  return o;
}

export function compareFields(dBody, aBody) {
  const D = fieldsOf(dBody), A = fieldsOf(aBody), out = [];
  for (const [label, dv] of D) {
    if (!A.has(label)) continue;
    const av = A.get(label);
    // School is a WORD, not a number ("evocation" vs "enchantment") — nums() sees nothing on either
    // side and the generic branch below would silently skip it. A spell's school is close to its
    // identity; two same-named spells that disagree here are more likely two different spells that
    // share a name (found via "Burning Gaze": d20 says enchantment, AoN's is evocation with a much
    // longer class list — almost certainly not the same spell) than an errata'd rewrite.
    if (label === "school") {
      const first = (s) => s.replace(/\[[^\]]*\]/g, "").trim().toLowerCase().split(/[\s(;]/)[0];
      const ds = first(dv), as = first(av);
      if (ds && as && ds !== as) out.push({ kind: "field", label: "School", sev: "high", d20: dv.slice(0, 60), aon: av.slice(0, 60) });
      continue;
    }
    if (label === "level") {
      const dl = levels(dv), al = levels(av);
      for (const c of Object.keys(dl)) if (c in al && dl[c] !== al[c])
        out.push({ kind: "field", label: "Level (" + c + ")", sev: "high", d20: `${c} ${dl[c]}`, aon: `${c} ${al[c]}` });
      const extra = Object.keys(dl).filter((c) => !(c in al));
      if (extra.length && Object.keys(al).length) out.push({ kind: "field", label: "Level (extra classes)", sev: "low", d20: extra.map((c) => `${c} ${dl[c]}`).join(", "), aon: "(not listed)" });
      continue;
    }
    const dn = nums(dv), an = nums(av);
    if (!dn.length && !an.length) continue;
    // a field that is a prefix of the other's text ("60 ft." vs "60 ft. (see text)") is not a conflict
    const { only1, only2 } = bagDiff(dn, an);
    if (only1.length && only2.length) out.push({ kind: "field", label, sev: sevOf(label), d20: dv.slice(0, 120), aon: av.slice(0, 120) });
    else if ((only1.length || only2.length) && Math.abs(dn.length - an.length) === 0)
      out.push({ kind: "field", label, sev: sevOf(label), d20: dv.slice(0, 120), aon: av.slice(0, 120) });
  }
  return out;
}

/* ---------- 2. sentences ------------------------------------------------------------------- */
const STOP = new Set("a an the of to in on at by for and or is are be as it its this that with from you your can may must".split(" "));
const words = (s) => norm(s).replace(/\d+d\d+|\d+\/\d+|\d+/g, " ").match(/[a-z']{3,}/g)?.filter((w) => !STOP.has(w)) || [];
/** Prose sentences only. Class tables ("7th +5 +5 +5 +2 Bomb 4d6"), header lines ("School abjuration; Level ..."),
 *  stat blocks and table rows are not statements to compare; comparing them was most of the first noise. */
function sentences(t) {
  return stripSource(t).split("\n").flatMap((l) => l.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z(])/))
    .map((x) => x.trim())
    .filter((x) => {
      if (x.length < 30 || x.length > 600 || /\t/.test(x) || /^table/i.test(x)) return false;
      if (/^(school|level|str |cr |xp |aura |slot |price |cost |casting|components|range|duration|starting statistics)/i.test(x)) return false;
      if (/^\d+(st|nd|rd|th)\b/i.test(x)) return false;
      const toks = x.split(" ");
      if (toks.length < 7) return false;
      const alpha = toks.filter((w) => /^[A-Za-z][A-Za-z'’-]*[.,;:]?$/.test(w)).length;
      return alpha / toks.length >= 0.7;
    });
}
const dice = (A, B) => { let n = 0; for (const x of A) if (B.has(x)) n++; return (2 * n) / ((A.size + B.size) || 1); };

/** aCorpus = [{s, w, own}] sentences of the matched AoN entry (own) and of its qualified siblings. */
function compareSentences(dBody, aCorpus) {
  const out = [];
  for (const s of sentences(dBody).filter((x) => nums(x).length)) {
    const w = new Set(words(s)); if (w.size < 4) continue;
    const dn = nums(s);
    let best = null, exact = false;
    for (const a of aCorpus) {
      const sc = dice(w, a.w); if (sc < 0.7) continue;
      const { only1, only2 } = bagDiff(dn, a.n);
      const eq = !only1.length && !only2.length;
      if (eq) { exact = true; break; }                   // AoN (or a sibling) says exactly this: no conflict
      if (a.own && (!best || sc > best.sc)) best = { a, sc };
    }
    if (exact || !best) continue;                        // no counterpart in the matched entry: NOT a conflict
    const { only1, only2 } = bagDiff(dn, best.a.n);
    if (only1.length && only2.length) out.push({ kind: "sentence", label: "text", sev: "med", overlap: +best.sc.toFixed(2), d20: s.slice(0, 220), aon: best.a.s.slice(0, 220) });
  }
  return out;
}
const corpusOf = (aBody, sibBodies = []) => {
  const mk = (body, own) => sentences(body).filter((x) => nums(x).length).map((s) => ({ s, w: new Set(words(s)), n: nums(s), own }));
  return [...mk(aBody, true), ...sibBodies.flatMap((b) => mk(b, false))];
};

/* ---------- main --------------------------------------------------------------------------- */
export function conflictsFor(dBody, aBody, sibBodies = []) {
  const f = compareFields(dBody, aBody);
  const s = compareSentences(dBody, corpusOf(aBody, sibBodies));
  return [...f, ...s];
}

/** Codex entries that share a name once qualifiers are dropped (Bestow Curse / , Greater; Beast Shape I-IV). */
const sibKey = (name) => String(name).toLowerCase().replace(/[’‘]/g, "'").replace(/\(.*?\)/g, " ")
  .replace(/\b(greater|lesser|mass|communal|improved|major|minor|mythic|unchained|supreme|epic|advanced|superior)\b/g, " ")
  .replace(/\b(i{1,3}|iv|v|vi{0,3}|ix|x|\d+)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("d20-conflicts.mjs")) {
  const d = loadCodex(ROOT);
  const rows = new Map(d.IDX.map((r) => [r[0], r]));
  const sibs = new Map();
  for (const r of d.IDX) { const k = r[2] + "|" + sibKey(r[1]); if (!sibs.has(k)) sibs.set(k, []); sibs.get(k).push(r[0]); }
  const matches = JSON.parse(fs.readFileSync(`${SNAP}/matches.json`, "utf8"));
  const pages = new Map(fs.readFileSync(`${SNAP}/pages.jsonl`, "utf8").trim().split("\n").map(JSON.parse).map((p) => [p.file, p]));
  const bodyOf = (id) => { const r = rows.get(id); return r ? (d.BODIES[r[2]] || {})[id] || "" : ""; };
  const sibBodiesOf = (id) => { const r = rows.get(id); if (!r) return []; return (sibs.get(r[2] + "|" + sibKey(r[1])) || []).filter((x) => x !== id).map(bodyOf); };
  const check = (p, r) => conflictsFor(p.body, bodyOf(r.match.id), sibBodiesOf(r.match.id));

  if (process.argv.includes("--mutate")) {
    // SELF-TEST. Take real DUP pairs whose text agrees, change ONE number inside a sentence that AoN says
    // word for word, and require the detector to report exactly that sentence. A detector that cannot
    // find a planted disagreement proves nothing by finding none.
    let tried = 0, caught = 0, falseAlarm = 0;
    for (const r of matches.filter((x) => x.verdict === "DUP" && x.match && x.match.nameSim === 1 && x.match.cont > 0.6)) {
      const p = pages.get(r.file), a = bodyOf(r.match.id); if (!p || !a) continue;
      if (check(p, r).some((c) => c.sev !== "low")) continue;                    // pairs that disagree on their own are not test material
      const aS = sentences(a).map((s) => ({ s, w: new Set(words(s)) }));
      const target = sentences(p.body).find((s) => /\d/.test(s) && !/\d+d\d+/.test(s) && aS.some((x) => dice(new Set(words(s)), x.w) >= 0.9 && s.includes(x.s.slice(0, 20))));
      if (!target) continue;
      const m = /\d+/.exec(target);
      const mutated = p.body.replace(target, target.replace(m[0], String(+m[0] + 7)));
      tried++;
      const got = conflictsFor(mutated, a, sibBodiesOf(r.match.id)).filter((c) => c.sev !== "low");
      if (got.length && got.some((c) => c.d20.includes(String(+m[0] + 7)))) caught++;
      else if (tried < 6) console.log("  missed:", r.title, "|", target.slice(0, 100));
      if (tried >= 120) break;
    }
    console.log(`mutation self-test: ${caught}/${tried} planted single-number changes found`);
    process.exit(tried >= 30 && caught / tried > 0.9 ? 0 : 1);
  }

  const out = [];
  // Rescued pairs (a page covering several AoN entries, or the same text under another name) are DUPs but are
  // not like-for-like, so they are not compared: that produced "Beast Shape ~ Magical Beast Shape".
  const COMPARABLE = (r) => r.match && /^(name \+|fuzzy name)/.test(r.why || "");
  for (const r of matches.filter((x) => x.verdict === "DUP" && COMPARABLE(x))) {
    const p = pages.get(r.file); if (!p || !bodyOf(r.match.id)) continue;
    const c = check(p, r);
    if (c.some((x) => x.sev !== "low")) out.push({ title: r.title, url: r.url, third: r.third, aon: r.match.name, bucket: r.match.bucket, id: r.match.id, conflicts: c });
  }
  const rank = { high: 0, med: 1, low: 2 };
  out.sort((x, y) => Math.min(...x.conflicts.map((c) => rank[c.sev])) - Math.min(...y.conflicts.map((c) => rank[c.sev])) || x.title.localeCompare(y.title));
  fs.writeFileSync(`${SNAP}/conflicts.json`, JSON.stringify(out, null, 1));
  const dupN = matches.filter((x) => x.verdict === "DUP").length;
  console.log(`DUP pairs ${dupN}; with a material disagreement ${out.length} (${(out.length / dupN * 100).toFixed(1)}%)`);
  const bySev = { high: 0, med: 0 }; for (const o of out) bySev[o.conflicts.some((c) => c.sev === "high") ? "high" : "med"]++;
  console.log("worst severity per pair:", bySev);
  for (const o of out.slice(0, +arg("show", 25))) {
    console.log(`\n[${o.bucket}] ${o.title}  ~  ${o.aon}${o.third ? "  (3P)" : ""}`);
    for (const c of o.conflicts.filter((c) => c.sev !== "low").slice(0, 3)) console.log(`   ${c.sev.toUpperCase().padEnd(4)} ${c.label}: d20 «${c.d20.slice(0, 90)}»  vs  AoN «${c.aon.slice(0, 90)}»`);
  }
}
