/* Source-column attribution repair, shared by d20-import.mjs (new rows) and d20-repair.mjs (rows already live).
 *
 * WHY THIS EXISTS. An audit of the 11,740 imported entries (2026-09-24) found the SOURCE column disagreeing
 * with the entry's own license paragraph in ~1,800 places, and the reader sees both ("📖 Source: Paizo, Inc."
 * above "Source not confirmed for this entry"):
 *   - 327 entries with NO attribution evidence were labelled "Paizo, Inc." (bkOf's last-resort default), which
 *     asserts the very thing the on-page notice says we do not know.
 *   - 1,352 were labelled "Third-party (unattributed)" although their own Section 15 line names the publisher.
 *   - 13 were labelled Paizo (breadcrumb said so) although their Section 15 names Frog God Games / Necromancer
 *     Games / d20pfsrd.com Publishing only.
 *   - 84 third-party entries carried a blanket note crediting "Paizo, Inc. (Pathfinder Roleplaying Game
 *     Reference Document)" as author, invented by the fallback in licenseNoteOf for content with no evidence.
 * The Section 15 notice on the page is the strongest evidence there is, so it wins over a breadcrumb guess.
 */
import { UNVERIFIED_NOTICE } from "./d20-clean.mjs";
export const PLACEHOLDER_S15 = /Product Name Section 15 here|^\s*x\s*$/i;   // "x" alone: a page whose whole Section 15 is one letter (Drifthorn)   // the publisher template text where a real Section 15 should be
export const UNVERIFIED_SOURCE = "Source unconfirmed";
export const UNVERIFIED_MARK = "Source not confirmed for this entry";
export const NOT_IDENTIFIED = "not identified (third-party content; use the Feedback link to claim or correct)";
const PRD_CREDIT = "Author/publisher: Paizo, Inc. (Pathfinder Roleplaying Game Reference Document)";

// "Paizo Publishing, LLC" and "Paizo Inc." are Paizo; "Paizo Fans United" is a fan group, NOT Paizo.
export const isPaizoish = (s) => /^(paizo\b(?!\s+fans)|wizards of the coast)/i.test(String(s).trim());

/** Publisher names out of a Section 15 style notice: "X © 2017, Everyman Gaming LLC; Authors: ...". */
export function publishersFromNotice(text) {
  const t = String(text)
    .replace(/\b(Inc|LLC|Ltd|Co|Corp)\./gi, "$1\u0001")     // "Inc." must not end the name
    .replace(/(\w)\.(\w)/g, "$1\u0002$2");                  // nor the dot in "d20pfsrd.com"
  const re = /(?:©|\(c\)|copyright)\s*,?\s*(?:\(c\)\s*)?(?:19|20)\d\d(?:\s*[-–]\s*(?:19|20)?\d\d)?\s*[,.]?\s*([^;.\n]+?)\s*(?=[;.]|,\s*published|\s+Authors?\b|\s+Created\b|\n|$)/gi;
  const out = [];
  for (const m of t.matchAll(re)) {
    const name = m[1].replace(/\u0001/g, ".").replace(/\u0002/g, ".").replace(/[,\s]+$/, "").trim();
    if (name.length >= 3 && name.length <= 80 && !/^(all rights reserved|used with permission)\b/i.test(name) && !out.includes(name)) out.push(name);
  }
  return out;
}

/** Tidy a source string: variant spellings of Paizo, stray dashes/periods, captured image credits. */
export function tidySource(src) {
  let s = String(src).trim();
  if (/^paizo,? ?inc\.?$/i.test(s)) return "Paizo, Inc.";
  s = s.replace(/^[–—-]\s*/, "").replace(/(#\d+)\.$/, "$1");
  if (/^wp clipart$/i.test(s)) return null;              // an image credit that leaked into the Source field
  return s;
}

/** The corrected source string for a row, given its current source and its trailing license paragraph. */
export function repairSource(source, tail) {
  let s = tidySource(source);
  const t = String(tail || "");
  const pubs = publishersFromNotice(t);
  const non = pubs.filter((p) => !isPaizoish(p));
  const hasPaizo = pubs.some(isPaizoish);
  if (PLACEHOLDER_S15.test(t)) return UNVERIFIED_SOURCE;   // a template, not a credit: we do not actually know
  if (t.includes(UNVERIFIED_MARK)) return s && !isPaizoish(s) ? s : UNVERIFIED_SOURCE;
  if (s === null) return hasPaizo || /Paizo/i.test(t) ? "Paizo, Inc." : (non[0] || "Third-party (unattributed)");
  if (s === "Third-party (unattributed)" && non.length) return non[0];
  if (s === "Third-party (unattributed)" && hasPaizo) return "Paizo, Inc.";   // its own Section 15 is Paizo's: that outranks a breadcrumb guess
  if (isPaizoish(s) && non.length && !hasPaizo) return non[0];
  return s;
}

/** The corrected license paragraph: never credit Paizo as author of third-party content on no evidence. */
export function repairNote(source, tail) {
  const t = String(tail || "");
  if (PLACEHOLDER_S15.test(t)) return UNVERIFIED_NOTICE;
  if (t.includes(PRD_CREDIT) && (source === "Third-party (unattributed)")) return t.replace(PRD_CREDIT, `Author/publisher: ${NOT_IDENTIFIED}`);
  return t;
}

/* ---- inverted-name duplicates ------------------------------------------------------------------
 * d20-match.mjs's parseName() throws parenthetical text away as formatting ("(Combat)", "(CR 1/2)"), so the
 * AoN name "Arrow (bleeding)" reads as just "Arrow" and never meets d20's "Arrow, Bleeding". Same for
 * "Ioun Stone Sepia Ellipsoid" vs "Sepia Ellipsoid (Ioun Stone)" and "Forgefiend (Scanderig)" vs
 * "Scanderig (Forgefiend)". 40 such duplicates were imported before this was noticed (audit 2026-09-24).
 * This compares letters-only keys with the words of "A, B" / "A (B)" reordered, only ever against content
 * from a DIFFERENT source system (an original Codex row), and never for names that mark a variant
 * (Mythic, 3pp, a CR adjustment) — those are different entries that merely share a base name. */
const alnum = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
export const VARIANT_QUAL = /mythic|\[3pp\]|\(3pp\)|\(cr\s*[+\d]/i;
export function nameKeys(name) {
  const n = String(name).replace(/\s*\[3pp\]|\s*\(3pp\)|\s*\(CR [^)]*\)/gi, "").trim();
  const ks = new Set([alnum(n)]);
  let m = /^([^,(]+),\s*([^(]+?)(?:\s*\(.*\))?$/.exec(n); if (m) ks.add(alnum(m[2] + " " + m[1]));
  m = /^([^(]+?)\s*\(([^)]+)\)$/.exec(n); if (m) { ks.add(alnum(m[2] + " " + m[1])); ks.add(alnum(m[1] + " " + m[2])); }
  return [...ks];
}

/* ---- source-site template leftovers ------------------------------------------------------------------
 * Some d20pfsrd pages still carry the literal text of the publisher's blank template ("Italicized descriptive text
 * here. There should be no hyperlinks in this section." above a stat block; "Ability: This is placeholder text."
 * inside race-trait tables; an ecology block of "Environment ZZ / Treasure {{none/standard/...}}"). Found by loading
 * 200 random imported pages (audit 2026-09-24): 9 entries. These lines carry no rules content, so they are removed;
 * unfinished stat VALUES ("Perception +ZZ") are the source's own gaps and are left alone rather than invented over. */
const TEMPLATE_LINE = /^(?:Italicized descriptive text here\.\s*There should be no hyperlinks in this section\.|[A-Za-z][A-Za-z0-9 ]*:\s*This is placeholder text\.?|Environment ZZ|Organization ZZ\s*\{\{.*\}\}|Treasure\s*\{\{.*\}\}.*|\{\{[^}]*\}\})\s*$/;   // last alternative: a whole line that is one {{template field}} ("{{monster’s description goes here}}")
export function stripTemplateJunk(body) {
  return String(body).split("\n").filter((l) => !TEMPLATE_LINE.test(l.trim())).join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "");
}

/* ---- stat blocks flattened onto one line ---------------------------------------------------------------
 * A few d20 pages hold a whole monster stat block in one paragraph (Encephalon Gorger: 4,960 characters on one
 * line). Break it before the standard section headers and field labels. Only lines that are long AND carry six or
 * more stat labels are touched, so ordinary prose is never re-flowed. */
const STAT_BREAK = /\s+(?=(?:DEFENSE|OFFENSE|STATISTICS|ECOLOGY|SPECIAL ABILITIES|TACTICS)\b|(?:Init [+-]\d|AC \d|hp \d|Fort [+-]\d|Speed \d|Melee |Ranged |Space \d|Special Attacks |Str \d|Base Atk [+-]|Feats [A-Z]|Skills [A-Z]|Languages [A-Z]|SQ [a-z]|Environment [a-z]|Organization [a-z]|Treasure [a-z]))/g;
export const isFlatStatLine = (l) => l.length > 700 && ["Init", "AC ", "hp ", "Fort ", "Speed ", "Melee", "Str ", "Base Atk", "Feats", "Skills"].filter((k) => l.includes(k)).length >= 6;
export function breakFlatStatBlocks(body) {
  return String(body).split("\n").map((l) => (isFlatStatLine(l) ? l.replace(STAT_BREAK, "\n") : l)).join("\n");
}

/* ---- a god's page, judged by its own shape --------------------------------------------------------------
 * Backstop for bucketOf(): d20 nests gods under Classes > Cleric > Gods, but a god filed anywhere else on the site
 * (or under a crumb the pattern misses) still has Alignment plus Domains/Portfolio/Favored Weapon lines. */
export const isGodBody = (b) => /Alignment:?\s+(?:Lawful|Neutral|Chaotic|LG|LN|LE|NG|N\b|NE|CG|CN|CE)/i.test(b) && /(Domains?|Portfolio|Favou?red Weapons?|Typical Worshipers?)\b/.test(b);

/* ---- index snippet ------------------------------------------------------------------------------------
 * The one-line preview kept in data/index.js (search results, lists). Lives here so the importer and the repair
 * pass cannot disagree: cleaning a body without recomputing its snippet left "Italicized descriptive text here"
 * showing in Spriggan Guard's search preview. */
const normSnip = (s) => String(s || "").toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, " ").trim();
export function snippetOf(body) {
  const ls = String(body || "").split("\n");
  let i = 0;
  if (ls[i] !== undefined && normSnip(ls[i]).length < 80 && !/^Source\s/i.test(ls[i]) && /^[A-Z]/.test(ls[i] || "") && ls[i + 1] !== undefined && /^Source\s/i.test(ls[i + 1] || "")) i++;
  if (ls[i] !== undefined && /^Source\s/i.test(ls[i])) i++;
  return ls.slice(i).join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
}

/* ---- "~~~" dividers ---------------------------------------------------------------------------------------
 * d20 separates the items bundled on one page with a "~~~" line (or inline: "Author Scott Greene. ~~~ ENCEPHALON
 * GORGER"). Left alone it renders as literal tildes. Turn each into a paragraph break. */
export function tidyDividers(body) {
  return String(body).replace(/[ \t]*~~~+[ \t]*/g, "\n\n").replace(/\n{3,}/g, "\n\n");
}
