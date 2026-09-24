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
