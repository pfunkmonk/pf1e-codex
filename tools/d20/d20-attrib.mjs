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
import { readFileSync } from "node:fs";
import { UNVERIFIED_NOTICE } from "./d20-clean.mjs";
export const PLACEHOLDER_S15 = /Product Name Section 15 here|ADD BOOK\/SOURCE NAME HERE|Place Section 15 Statement|^\s*x\s*$/i;   // "x" alone: a page whose whole Section 15 is one letter (Drifthorn)   // the publisher template text where a real Section 15 should be
export const UNVERIFIED_SOURCE = "Source unconfirmed";
export const UNVERIFIED_MARK = "Source not confirmed for this entry";
export const NOT_IDENTIFIED = "not identified (third-party content; use the Feedback link to claim or correct)";
const PRD_CREDIT = "Author/publisher: Paizo, Inc. (Pathfinder Roleplaying Game Reference Document)";

// "Paizo Publishing, LLC" and "Paizo Inc." are Paizo; "Paizo Fans United" is a fan group, NOT Paizo.
// A book/product title that starts "Pathfinder" (Roleplaying Game Advanced Race Guide, Player Companion, #43…) is a Paizo product.
// A Paizo book title that does not START "Pathfinder" ("Advanced Player's Guide", "Ultimate Magic", "GameMastery Module E1…") is still a Paizo
// product: every spelling the AoN-sourced originals use, and every title read out of a Paizo Section 15 notice, is registered here
// (registerPaizoBooks) so the repair/import/verify tools keep treating a book-titled source as Paizo, not as an unknown third party.
const PAIZO_BOOKS = new Set();
export const registerPaizoBooks = (names) => { for (const n of names) if (n) PAIZO_BOOKS.add(String(n).trim().toLowerCase()); };
const paizoOne = (s) => /^(paizo\b(?!\s+fans)|wizards of the coast|pathfinder\b|gamemastery\b)/i.test(s) || PAIZO_BOOKS.has(s.toLowerCase());
// "Bestiary 2; Bestiary 3" (a page whose notices name two books) is Paizo when every part is.
export const isPaizoish = (s) => { const t = String(s).trim(); return paizoOne(t) || (t.includes(";") && t.split(";").every((p) => paizoOne(p.trim()))); };

/** A short, readable "(Publisher)" suffix for telling two same-named entries apart. A source string is sometimes a citation
 *  ("Kelpie from the Tome of Horrors Complete", "…: Uncertain Futures"), so keep the part after "from the" and cap the length. */
export function shortSuffix(s) {
  let t = String(s).trim();
  const fm = /\bfrom the (.{4,60})$/i.exec(t); if (fm) t = fm[1].trim();
  if (t.length > 40) t = t.slice(0, 40).replace(/[\s,:;–-]+\S*$/, "").replace(/[\s,:;–-]+$/, "");
  return t;
}

/** Publisher names out of a Section 15 style notice: "X © 2017, Everyman Gaming LLC; Authors: ...". */
export function publishersFromNotice(text) {
  const t = String(text)
    .replace(/\b(Inc|LLC|Ltd|Co|Corp)\./gi, "$1\u0001")     // "Inc." must not end the name
    .replace(/(\w)\.(\w)/g, "$1\u0002$2");                  // nor the dot in "d20pfsrd.com"
  const re = /(?:©|\(c\)|copyright)\s*,?\s*(?:\(c\)\s*)?(?:19|20)\d\d(?:\s*[-–]\s*(?:19|20)?\d\d)?\s*[,.]?\s*([^;.\n]+?)\s*(?=[;.]|,\s*published|\s+Authors?\b|\s+Created\b|\n|$)/gi;
  const out = [];
  for (const m of t.matchAll(re)) {
    // "Copyright 2008 – Rocks Fall, Everyone Dies": the dash after the year is separator punctuation, not part of the name.
    const name = m[1].replace(/\u0001/g, ".").replace(/\u0002/g, ".").replace(/^[\s–—-]+/, "").replace(/[,\s]+$/, "").trim();
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
/* A PDF purchaser's watermark that rode along with the text ("John Reyst (order #29707975) 20 Frog God Games"): a
 * customer's name and order number must never be published; the trailing page number + publisher is page furniture. */
export const PURCHASE_WATERMARK = /\s*(?:[A-Z][\w.'’-]*\s+){1,3}\(order #\d+\)(?:\s+\d+\s+Frog God Games)?/g;
/* Site chrome that rode along inside a page's text: the site owner's Patreon plea, the "report a problem" notice, the Hero Lab
 * data-set link. Found 2026-10-03 reading the restored companions ("Support John Reyst, creator and maintainer of this site on
 * Patreon!" inside the Races and Classes companions). Whole lines are removed. Deliberately NOT bare "link" labels or URL-only
 * lines: those also occur as legitimate publisher credits in older rows ("To the Birds: Tengu" -> a Kobold Quarterly link). */
export const SITE_CHROME_LINE = /Support John Reyst, creator and maintainer|please let us know by reporting it using the Report a Problem link|Powered by Hero Lab Data sets/i;
export function stripTemplateJunk(body) {
  return String(body).replace(PURCHASE_WATERMARK, "").split("\n").filter((l) => !TEMPLATE_LINE.test(l.trim()) && !SITE_CHROME_LINE.test(l.trim())).join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\s+/, "");
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

/* ---- same text? ------------------------------------------------------------------------------------------
 * d20-match's cosine calls a page a NAMESAKE ("same name, different content") when the AoN original merely carries extra
 * lines — "Martial Master / Source Advanced Class Guide pg. 93 / There are those who learn the fighting arts…" vs d20's
 * "There are those who learn the fighting arts…". Keeping every NAMESAKE therefore imported ~100 true duplicates.
 * Containment of 5-word shingles (share of the SMALLER text found in the larger) is insensitive to extra header lines:
 * >= 0.5 means the same text. Used at every name collision, and by the repair to drop duplicates already imported. */
const shingles5 = (t) => {
  const w = String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const s = new Set(); for (let i = 0; i + 5 <= w.length; i++) s.add(w.slice(i, i + 5).join(" "));
  return s;
};
export function contentOverlap(a, b) {
  const A = shingles5(a), B = shingles5(b);
  if (!A.size || !B.size) return 0;
  const [small, big] = A.size <= B.size ? [A, B] : [B, A];
  let hit = 0; for (const x of small) if (big.has(x)) hit++;
  return hit / small.size;
}
export const SAME_TEXT = 0.5;

/* ---- the BOOK a Paizo entry came from -------------------------------------------------------------------------------
 * Found 2026-10-06: 3,166 d20-imported entries (+ ~680 companions) showed only "Paizo, Inc." as their source although the book
 * was on the page the whole time. d20pfsrd rarely prints a readable "Source" line, so bkOf() fell through to the last-resort
 * "Paizo, Inc." — but the entry's own Section 15 notice names the book ("Pathfinder Roleplaying Game Advanced Race Guide © 2012,
 * Paizo Publishing, LLC; Authors: …") and that notice is already copied into the body. 2,979 of those rows carry exactly one
 * notice, so the book is unambiguous.
 *
 * NAMING. The AoN-sourced originals already spell their books one way ("Advanced Race Guide", "Pathfinder RPG Bestiary", "PRPG Core
 * Rulebook"); the notice spells them another ("Pathfinder Roleplaying Game Advanced Race Guide"). Two spellings of one book would
 * split the "Any book" filter, so a notice title is matched to the originals' spelling by bookKey() and only an unmatched title
 * (an Adventure Path, a module) is used as written (tidied). Third-party rows are NOT touched: their source stays the publisher
 * (the filter groups by it) — see HANDOFF.md. */
export function bookKey(s) {
  return String(s || "").toLowerCase().replace(/[’‘]/g, "'")
    .replace(/\((?:ogl|[^)]*edition)\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/\bprpg\b/g, " ")
    .replace(/pathfinder\s+(?:roleplaying game|rpg|campaign setting|player companion|adventure path|chronicles|module|society|tales|map folio)\b[\s:,–-]*/g, " ")
    .replace(/gamemastery\s+module\b[\s:,–-]*/g, " ")
    .replace(/^\s*pathfinder\b[\s:,–-]*/, "")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
/** key -> the originals' most common spelling. `rows` = the PF_INDEX rows; `isOriginal(row)` = not minted by the d20 importer. */
export function buildBookIndex(rows, isOriginal) {
  const count = new Map();
  for (const r of rows) {
    if (!isOriginal(r) || r[3] === "Additional Material (d20pfsrd)") continue;
    const b = ((r[6] && r[6].bk) || r[4] || "").replace(/\s*pg\.\s*\d+.*$/, "").split(",")[0].trim();
    if (b) count.set(b, (count.get(b) || 0) + 1);
  }
  const byKey = new Map();
  for (const [b, n] of count) { const k = bookKey(b); if (k && (!byKey.has(k) || n > count.get(byKey.get(k)))) byKey.set(k, b); }
  registerPaizoBooks(count.keys());     // every AoN book is a Paizo book
  return byKey;
}
const NOTICE_MARK = /(?:©|\(c\)|copyright)\s*,?\s*(?:\(c\)\s*)?(?:19|20)\d\d/gi;
const GENERIC_TITLE = /open game licen|system reference|reference document|^pathfinder roleplaying game$/i;
function tidyTitle(t) {
  let s = String(t).replace(/Pathfi\s+nder/g, "Pathfinder").replace(/\s+/g, " ").replace(/\((?:OGL)\)/g, "").trim().replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "");
  const h = Math.floor(s.length / 2);                      // "X X": the notice repeats its own title ("Pathfinder 5: Sins of the Saviors Pathfinder 5: …")
  if (s.length > 12 && s.slice(0, h).trim() === s.slice(h).trim()) s = s.slice(0, h).trim();
  s = s.replace(/^(.{6,60}?)\s+(?=\1[:\s])/, "");      // "Phantasia Zoologica I Phantasia Zoologica I: Dogs": the title said once as a heading, once in full
  return s;
}
/** Titles named by the PAIZO notices in a Section 15 paragraph, in order, de-duplicated. */
export function paizoNoticeTitles(tail) {
  const t = String(tail || "");
  const marks = [...t.matchAll(NOTICE_MARK)];
  const out = [];
  for (let k = 0; k < marks.length; k++) {
    const m = marks[k], next = marks[k + 1] ? marks[k + 1].index : t.length;
    const publisher = t.slice(m.index + m[0].length, Math.min(next, m.index + m[0].length + 90));
    if (!/\bPaizo\b/i.test(publisher) || /Paizo Fans/i.test(publisher)) continue;       // a third-party notice names no Paizo book
    let seg = t.slice(k ? marks[k - 1].index + marks[k - 1][0].length : 0, m.index);
    if (k) { const s = /\b(?:Pathfinder|GameMastery|Advanced (?:Player|Race|Class)|Ultimate|Occult Adventures|Mythic Adventures|Horror Adventures|Inner Sea|Bestiary)\b/.exec(seg); if (!s) continue; seg = seg.slice(s.index); }
    const title = tidyTitle(seg);
    if (title.length < 4 || title.length > 100 || GENERIC_TITLE.test(title)) continue;
    if (!out.includes(title)) out.push(title);
  }
  return out;
}
/** The PRODUCT a third-party page's Section 15 notice names: "Ultimate Battle © 2013, Legendary Games; Author …" -> {title:"Ultimate Battle", publisher:"Legendary Games"}.
 *  Only when the paragraph is ONE notice and not Paizo's: with several notices (a page that cites four books) the notice order does not say which book an
 *  entry came from, and we do not guess. Monster notices read "Acid Quasi-Elemental from the Tome of Horrors Complete" — the product is the part after "from the". */
export function thirdPartyProduct(tail) {
  const t = String(tail || "").trim();
  if (!t || t.length > 700 || t.includes("\n")) return null;
  const marks = [...t.matchAll(NOTICE_MARK)];
  if (marks.length !== 1) return null;
  const m = marks[0];
  if (/\bPaizo\b/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 90)) && !/Paizo Fans/i.test(t)) return null;
  const pubs = publishersFromNotice(t).filter((p) => !isPaizoish(p));
  if (!pubs.length) return null;
  let title = tidyTitle(t.slice(0, m.index)).replace(/\s*\(c\)$/i, "").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "");
  const fm = /\bfrom the (.{4,80})$/i.exec(title); if (fm) title = fm[1].trim();
  title = title.replace(/[.,;]?\s*(?:Authors?|Created by|Written by|Designed by)\b.*$/i, "").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "");   // "Advanced Feats: Visions of the Oracle. Author: …"
  if (/^product name\b|https?:|www\./i.test(title)) return null;                                                                          // a template placeholder or a web address, not a title
  const alnumKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (title.length < 3 || title.length > 90 || GENERIC_TITLE.test(title) || title.includes(";") || /section 15|open game licen|\bcopyright\b/i.test(title)) return null;
  if (pubs.some((p) => alnumKey(p) === alnumKey(title))) return null;       // "Dreamscarred Press © 2013, Dreamscarred Press" names no product
  return { title, publisher: pubs[0] };
}
/** "Product (Publisher)" for a third-party row whose notice names its product; the source unchanged otherwise (Paizo books, unconfirmed rows, multi-notice pages). */
export function productSource(source, tail, body, name) {
  const s = String(source || "").trim();
  if (!s || isPaizoish(s) || s === UNVERIFIED_SOURCE || /^Third-party \(unattributed\)$/.test(s)) return source;
  const key = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const one = (p) => {
    if (key(s).includes(key(p.title))) return /\)$/.test(s) ? s : `${p.title} (${p.publisher})`;      // already product-ish; respell "X from the Y" into the one form
    const pub = s.replace(/^3rd Party\s*[–-]\s*/i, "").replace(/^Section 15:?$/i, "").trim();      // "Section 15" is a heading a crawler mistook for a publisher
    const out = `${p.title} (${pub || p.publisher})`;
    return isPaizoish(out) ? source : out;      // a third-party title that merely contains "Pathfinder" ("Pathfinder Traits Database") must not read as a Paizo book
  };
  const p1 = thirdPartyProduct(tail);
  if (p1) return one(p1);
  // A page that cites several products. What decides which one an entry came from is only what the ENTRY says itself: every "Source …" line on it naming the
  // same product, or d20pfsrd filing it under that product (the current source IS one cited title). Otherwise we do not pick: with two or three cited products
  // we name them all, joined by "or" (true: the page cites them; nothing says which), and with more we keep the publisher.
  const ps = thirdPartyProducts(tail);
  if (!ps || !ps.length) return source;
  if (ps.length === 1) return one(ps[0]);
  if (/\)$/.test(s) && !isPaizoish(s)) return source;      // already "Product (Publisher)": settled by an earlier run, never rewritten by the several-products branch
  const filed = ps.filter((p) => key(s) === key(p.title));
  const named = filed.length === 1 ? filed[0] : productNamedByEntry(ps, body, name);
  if (named) return one(named);
  if (ps.length > 3 || ps.every((p) => key(s).includes(key(p.title)))) return ps.length > 3 ? source : s;
  const pubKey = (x) => key(String(x).replace(/\b(llc|inc|ltd)\b/gi, ""));
  const sameHouse = ps.every((p) => pubKey(p.publisher) === pubKey(ps[0].publisher) || pubKey(p.publisher).includes(pubKey(ps[0].publisher)) || pubKey(ps[0].publisher).includes(pubKey(p.publisher)));
  const pubName = s.replace(/^3rd Party\s*[–-]\s*/i, "").replace(/^Section 15:?$/i, "").trim();
  // the row's own publisher string stands for the whole page when the notices name only that house or people (an author credited as publisher)
  const personish = (x) => !/\b(games?|publishing|press|studios?|llc|inc|ltd|design|productions?|entertainment|house|works|enterprises|co)\b/i.test(x);
  const umbrella = !!pubName && ps.every((p) => personish(p.publisher) || pubKey(p.publisher).includes(pubKey(pubName)) || pubKey(pubName).includes(pubKey(p.publisher)));
  const out = (sameHouse || umbrella) ? `${ps.map((p) => p.title).join(" or ")} (${pubName || ps[0].publisher})` :ps.map((p) => `${p.title} (${p.publisher})`).join(" or ");
  return isPaizoish(out) ? source : out;
}
/** The source string for a row whose current source is the bare publisher "Paizo, Inc.": the book(s) its own notice names, in the
 *  originals' spelling. Unchanged when the source is anything else, when no Paizo notice names a book, or when more than two do. */
export function bookSource(source, tail, bookIndex) {
  if (!/^Paizo(?:, Inc\.)?$/.test(String(source).trim())) return source;
  const canon = [];
  for (const t of paizoNoticeTitles(tail)) { const c = bookIndex.get(bookKey(t)) || t; if (!canon.includes(c)) canon.push(c); }
  if (!canon.length) return bookFromCodes(source, tail, bookIndex);
  if (canon.length > 2) return source;
  registerPaizoBooks(canon);
  return canon.join("; ");
}
let CODES = null;
function loadCodes() {
  if (!CODES) { try { CODES = JSON.parse(readFileSync(new URL("./source-codes.json", import.meta.url), "utf8")).codes; } catch { CODES = {}; } }
  return CODES;
}
const CODE_SHAPE = "[A-Za-z][A-Za-z0-9:&\\-]*";   // any word: translateCodes only rewrites one that source-codes.json resolves, so "Source Advanced Player's Guide" is left alone
const SOURCE_CODES = new RegExp("\\bSource:?[ \\t]+((?:" + CODE_SHAPE + ")(?:\\s*[,;&]\\s*(?:" + CODE_SHAPE + "))*)(?![A-Za-z0-9:])", "g");
const NAMED_CODES = /(Sources named on the page for these sections: )([^\n]*?)\.(?=\n|$| )/g;
/** Product codes -> the book they name, in the words the originals use ("Source PZO1115 pg. 12" -> "Source Advanced Player's Guide pg. 12"; "Sources named on
 *  the page …: PZO1115; PPC:CoL." -> the two books). Only a code that source-codes.json resolves is touched, and only where d20pfsrd prints it: after "Source"
 *  or in the companion rows' "Sources named" list — never a bare "PC:" in prose. Returns the body unchanged when nothing applies. */
export function translateCodes(body, bookIndex) {
  const C = loadCodes();
  const book = (code) => { const e = C[code]; return e ? (bookIndex.get(bookKey(e.book)) || e.book) : null; };
  const swap = (list) => {
    const whole = book(list.trim());   // "PPC:P&P" holds an ampersand: try the whole token before splitting a list on "&"
    if (whole) return [whole];
    const parts = list.split(/(\s*[,;&]\s*)/), out = [];
    for (let i = 0; i < parts.length; i += 2) { const b = book(parts[i].trim()); if (!b) return null; if (!out.includes(b)) out.push(b); }
    return out;
  };
  let s = String(body).replace(SOURCE_CODES, (all, list) => { const out = swap(list); return out ? all.slice(0, all.length - list.length) + out.join(", ") : all; });
  s = s.replace(NAMED_CODES, (all, lead, list) => {
    const out = [];
    for (const p of list.split(/\s*;\s*/)) { const b = book(p.trim()) || p.trim(); if (b && !out.includes(b)) out.push(b); }
    return lead + out.join("; ") + ".";
  });
  return s;
}
/** Last resort for a Paizo row whose page names no book in Section 15: the product codes d20pfsrd prints in its "Source PZO1115" lines, decoded by
 *  build-source-codes.mjs into tools/d20/source-codes.json. Used only when every code on the page names the same ONE book. */
function bookFromCodes(source, tail, bookIndex) {
  const CODES = loadCodes();
  const found = new Set();
  for (const m of String(tail).matchAll(/\bSource:?\s+(P?PZO\d{4,5}[A-Za-z]?\d?|(?:PPC|PCS|PRG|PCh|PC):[A-Za-z0-9&\-]{1,8})/g)) { const e = CODES[m[1]]; found.add(e ? e.book : "?"); }
  if (found.size !== 1 || found.has("?")) return source;
  const c = bookIndex.get(bookKey([...found][0])) || [...found][0];
  registerPaizoBooks([c]);
  return c;
}
/** A Paizo book already named in a source string, respelled the way the AoN originals spell it, so the "Any book" filter never lists one book
 *  twice ("Pathfinder Roleplaying Game Advanced Race Guide" -> "Advanced Race Guide"). Anything that is not a Paizo book is returned as is. */
export function canonicalPaizoBook(source, bookIndex) {
  const s = String(source);
  if (!s || /^Paizo(?:, Inc\.)?$/.test(s.trim()) || !isPaizoish(s)) return source;
  return s.split(";").map((p) => { const t = p.trim(), c = isPaizoish(t) ? bookIndex.get(bookKey(t)) : null; return c || t; }).join("; ");
}

/** One spelling of the publisher for each product: the same book reaches us as "Frog God Games", "3PP – Frog God Games" and "Bill Webb, Frog God Games". Two
 *  publisher strings are the same publisher when one's letters-only key contains the other's; the most common spelling (then the shortest) wins.
 *  items: [{title, publisher}] -> Map(title -> Map(publisher -> canonical publisher)). Distinct publishers of a same-named product are left alone. */
export function unifyPublishers(items) {
  const key = (x) => String(x).toLowerCase().replace(/\b(llc|inc|ltd|co|3pp|3rd party)\b/g, "").replace(/[^a-z0-9]+/g, "");
  const byTitle = new Map();
  for (const { title, publisher } of items) { const m = byTitle.get(title) || byTitle.set(title, new Map()).get(title); m.set(publisher, (m.get(publisher) || 0) + 1); }
  const out = new Map();
  for (const [title, pubs] of byTitle) {
    const order = [...pubs].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).map((e) => e[0]), map = new Map();
    for (const p of order) { const home = [...map.values()].find((c) => key(c) && key(p) && (key(c).includes(key(p)) || key(p).includes(key(c)))); map.set(p, home || p); }
    out.set(title, map);
  }
  return out;
}

/** Every PRODUCT a third-party page's Section 15 paragraph cites, as [{title, publisher}] in order, de-duplicated by title — or null when the paragraph cannot be split
 *  with confidence (an author list running straight into the next title, a Paizo notice, a template). A page that repeats ONE notice ("X © 2022, Legendary Games
 *  … Section 15: Copyright Notice X © 2022, Legendary Games …") yields one product. */
export function thirdPartyProducts(tail) {
  const t0 = String(tail || "").replace(/Section 15:?\s*Copyright Notices?/gi, " ").replace(/\s+/g, " ").trim();
  if (!t0 || t0.length > 1600 || /\bPaizo\b/i.test(t0)) return null;
  const re = new RegExp(NOTICE_MARK.source, "gi"), marks = [...t0.matchAll(re)];
  if (!marks.length) return null;
  const alnumKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const out = []; let prevEnd = 0;
  for (let k = 0; k < marks.length; k++) {
    const m = marks[k];
    let seg = t0.slice(prevEnd, m.index);
    if (k > 0) {
      // the previous notice's authors run up to the next sentence boundary; what follows is this notice's title
      if (/^[\s;.,]*(?:Authors?|Created by|Written by|Text)\b/i.test(seg)) { const cut = /(?<!\b[A-Z]|\bJr|\bSr|\bDr|\bInc|\bLLC|\bLtd|\bCo)\.\s+(?=[A-Z0-9“"'‘])/.exec(seg); if (!cut) return null; seg = seg.slice(cut.index + cut[0].length); }
      seg = seg.replace(/^[\s;.,]+/, "").replace(/^All rights reserved\.?\s*/i, "");
    }
    let title = tidyTitle(seg).replace(/\s*\(c\)$/i, "").replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "");
    const fm = /\bfrom the (.{4,80})$/i.exec(title); if (fm) title = fm[1].trim();
    if (!title || title.length < 3 || title.length > 90 || GENERIC_TITLE.test(title) || /\b(?:Authors?|Created by|Written by)\b|section 15|open game licen|copyright|[;©]|^product name\b|https?:|www\./i.test(title)) return null;
    const after = t0.slice(m.index + m[0].length), pm = /^\s*(?:[-–]\s*(?:19|20)?\d\d\s*)?[,.]?\s*([^;.]+?)\s*(?=[;.]|,\s*published|\s+Authors?\b|\s+Created\b|$)/i.exec(after.replace(/\b(Jr|Sr|Dr|St|Mr|Mrs)\./g, "$1\u0001").replace(/\b([A-Z])\.(?=\s)/g, "$1\u0001").replace(/(\w)\.(\w)/g, "$1\u0002$2"));
    const publisher = pm ? pm[1].replace(/\u0001/g, ".").replace(/\u0002/g, ".").replace(/^[\s–—-]+/, "").replace(/[,\s]+$/, "").replace(/\b(Inc|Ltd|Co|Corp)$/, "$1.").trim() : "";
    if (!publisher || publisher.length < 3 || publisher.length > 80 || isPaizoish(publisher)) return null;
    if (!out.some((p) => alnumKey(p.title) === alnumKey(title))) out.push({ title, publisher });
    prevEnd = m.index + m[0].length + (pm ? pm.index + pm[0].length : 0);
  }
  return out;
}
/** A page that cites SEVERAL products: the one its entry names itself (a "Source …" line in the body, or the title in the entry's own name), else null. */
export function productNamedByEntry(products, body, name) {
  const key = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const src = (String(body || "").match(/\bSource:?[ \t]+[^\n]{2,90}/g) || []).map((l) => key(l.replace(/^Source:?[ \t]+/, "").replace(/\bpg\.?\s*\d+.*$/i, "")));
  // every Source line on the entry must name the SAME one product (an entry that cites two books, or one we cannot read, is not decided by one of them)
  if (!src.length) return null;
  const named = src.map((s) => products.filter((p) => s === key(p.title) || (s.length >= 8 && key(p.title).startsWith(s))));
  if (named.some((h) => h.length !== 1) || new Set(named.map((h) => h[0].title)).size !== 1) return null;
  return named[0][0];
}
