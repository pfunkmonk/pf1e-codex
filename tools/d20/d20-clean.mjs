/* Stage 1+2: clean and CLASSIFY d20pfsrd pages.
 *
 * Input : <snap>/pages/*.txt  (a snapshot — never the live archive, which the crawler is writing)
 * Output: <snap>/pages.jsonl  one record per page
 *
 * Every page gets exactly one classification and nothing is dropped silently — the AoN pipeline
 * once lost 13,424 pages to a quarantine nobody read, so here the counts must balance and the
 * report names every page that could not be placed.
 *
 * Page shape (checked on samples from every section):
 *   TITLE:/URL:/ARCHIVED:/STATUS:            header block
 *   "Subscribe to the Open Gaming Network…"  ad line
 *   "Home >Magic >Spells (Paizo, Inc.) >S >" breadcrumb — carries the taxonomy AND the publisher
 *   <title>                                  the entry name
 *   <body>
 *   "Section 15: Copyright Notice" + notices  copyright block (OGL 1.0a requires it)
 *   "Discuss!" / "Join Our Discord!" / …      site footer — discarded
 *
 * Usage: node tools/d20/d20-clean.mjs [--snap D:/CODEX/d20-pilot]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf("--" + n); return i >= 0 ? argv[i + 1] : d; };
const SNAP = arg("snap", "D:/CODEX/d20-pilot");

const FOOTER = [/^Section 15: Copyright Notice/i, /^Discuss!$/, /^Join Our Discord!/, /^\s*Latest Pathfinder products/i,
                /^This site may earn affiliate/i];
const isPaizo = (s) => /paizo/i.test(s);

/* ---- one page ------------------------------------------------------------------------------ */
export function parsePage(text, file) {
  const lines = text.replace(/\r/g, "").split("\n");
  const head = {};
  let i = 0;
  for (; i < lines.length && i < 8; i++) {
    const m = /^(TITLE|URL|ARCHIVED|STATUS):\s*(.*)$/.exec(lines[i]);
    if (m) head[m[1]] = m[2].trim(); else if (!lines[i].trim() && head.STATUS) { i++; break; }
  }
  let rest = lines.slice(i);

  // ad line + breadcrumb
  let crumb = [];
  const ci = rest.findIndex((l) => /^Home\s*>/.test(l.trim()));
  if (ci >= 0) {
    crumb = rest[ci].split(">").map((s) => s.trim()).filter(Boolean);
    if (/^home$/i.test(crumb[0] || "")) crumb = crumb.slice(1);      // "Home" is the site root, not taxonomy
    rest = rest.slice(ci + 1);
  }
  rest = rest.filter((l) => !/^Subscribe to the Open Gaming Network/i.test(l) && !/^Contents\s*\[(show|hide)\]/i.test(l.trim()));

  // title line = first non-empty line after the breadcrumb
  let ti = rest.findIndex((l) => l.trim());
  const nameRaw = ti >= 0 ? rest[ti].trim() : "";
  rest = ti >= 0 ? rest.slice(ti + 1) : rest;

  // cut the footer; keep Section 15 separately
  let cut = rest.findIndex((l) => FOOTER.some((re) => re.test(l.trim())));
  if (cut < 0) cut = rest.length;
  const bodyLines = rest.slice(0, cut);
  const tail = rest.slice(cut);
  const s15 = [];
  const si = tail.findIndex((l) => /^Section 15: Copyright Notice/i.test(l.trim()));
  if (si >= 0) {
    for (const l of tail.slice(si + 1)) {
      const t = l.trim();
      if (/^Discuss!$/.test(t) || /^Join Our Discord!/.test(t) || /^\s*Latest Pathfinder products/i.test(t)) break;
      if (t) s15.push(t);
    }
  }
  const { lines: contentLines, children } = stripSubpages(bodyLines, nameRaw);
  const body = contentLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return { head, crumb, nameRaw, body, s15, file, children };
}

/* A page that has child pages opens with "Subpages" and a list of their names, THEN its own content
 * (the Fighter class page is 49,745 characters after that list; a Raven monster entry follows one
 * line). The first version of the classifier read the "Subpages" prefix as "placeholder" and would
 * have thrown away real classes, monsters and rules chapters. Strip only the link list: it ends at
 * the first line that is the page's own title, a stat-block label, a tab-separated row, or a real
 * sentence. What is stripped is kept as `children`, since parent -> child is structure worth having. */
// Environment/Organization/Treasure added at 4,000-page scale: a monster-FAMILY overview page ("Ceroptor",
// which lists itself alongside "Ceroptor, Bodied"/"Ceroptor, Swarm" under Subpages) has these three short
// lines right after its child list, before the real flavor prose — none of the existing labels catch them,
// so they were being swept up as three more bogus "children".
const LABEL = /^(CR|XP|DEFENSE|OFFENSE|STATISTICS|Price|School|Level|Aura|Benefit:|Prerequisites?:|Casting Time|Slot|Weight|Table:|Source|Alignment:|Role:|Hit Die:|Environment|Organization|Treasure)\b/i;
/** "Subpages" does not always open the page — Family Traits runs three paragraphs of category flavor
 * text FIRST, then "Subpages", then its child list. Find the heading anywhere, not just at the top,
 * and splice the child list back out; what is before and after it stays in the body untouched. A
 * "Subpages" heading with nothing list-shaped right after it (rare) is left alone rather than eating
 * real content. */
export function stripSubpages(lines, title) {
  const subI = lines.findIndex((l) => l.trim() === "Subpages");
  const want = String(title || "").trim().toLowerCase();
  if (subI >= 0) {
    const children = [];
    let i = subI + 1;
    for (; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) continue;
      const words = t.split(/\s+/).length;
      // A family-overview page can list ITSELF as the first subpage ("Ceroptor" -> "Ceroptor" /
      // "Ceroptor, Bodied" / "Ceroptor, Swarm") — only treat a title match as "list is over, this is
      // my own restated title" once at least one other child has already been collected, so this
      // legitimate leading self-reference isn't mistaken for the end of the list before it starts.
      if ((children.length > 0 && t.toLowerCase() === want) || LABEL.test(t) || /\t/.test(t) || words >= 9 || /[.!?:;]$/.test(t)) break;
      children.push(t);
    }
    if (children.length) return { lines: [...lines.slice(0, subI), ...lines.slice(i)], children };
  }
  // A BARE LINK LIST: no "Subpages" heading at all, straight into a list of similarly-tagged link
  // labels right after the title — found at 4,000-page scale: "(Bestiary) By Challenge Rating" opens
  // directly with "(Bestiary) CR under 1" / "(Bestiary) CR 1-2" / ... and nothing else, read as one
  // giant "entry" because there was no "Subpages" heading to strip. Recognized only when every
  // candidate line repeats the TITLE's own bracketed tag — specific enough that a real entry's
  // opening lines never accidentally look like this.
  const tagM = /^\(([^)]{2,30})\)/.exec(title || "");
  if (tagM) {
    const tag = `(${tagM[1]})`;
    const children = [];
    let i = 0;
    for (; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t) { if (children.length) break; continue; }
      if (!t.startsWith(tag) || /[.!?:;]$/.test(t) || t.split(/\s+/).length >= 12) break;
      children.push(t);
    }
    if (children.length >= 3) return { lines: lines.slice(i), children };
  }
  return { lines, children: [] };
}

/* ---- publisher / third-party --------------------------------------------------------------- */
const HUB_CLASSES = "alchemist|barbarian|bard|cavalier|cleric|druid|fighter|gunslinger|inquisitor|magus|monk|oracle|paladin|ranger|rogue|sorcerer|summoner|witch|wizard|antipaladin|ninja|samurai|arcanist|bloodrager|brawler|hunter|investigator|shaman|skald|slayer|swashbuckler|warpriest|kineticist|medium|mesmerist|occultist|psychic|spiritualist";
// Two folder-naming orders show up: "<publisher>-<class>-archetypes" (michael-mars-druid-archetypes) and
// "<class>-archetypes-<publisher>" (monk-archetypes-samurai-sheepdog). Some publishers get several numbered
// hubs for the same class ("orphaned-bookworm-productions-2..5") — strip the trailing "-N".
const HUB_RE = new RegExp("^(.+?)-(?:" + HUB_CLASSES + ")(?:-[a-z]+)*-archetypes$");
const HUB_RE2 = new RegExp("^(?:(?:" + HUB_CLASSES + ")-)?archetypes-(.+?)(?:-\\d+)?$");
const NOT_A_PUBLISHER = new Set(["animal-companion", "familiar"]);
function hubPublisherKey(seg) {
  const m = HUB_RE.exec(seg) || HUB_RE2.exec(seg);
  return m && !NOT_A_PUBLISHER.has(m[1]) ? m[1] : null;
}
/** A HUB PAGE is the folder's own index — ".../archetypes/radiance-house-druid-archetypes" itself, or a
 * bare ".../cleric/archetypes" — not one of the entries inside it. Its content, once "Subpages" is
 * stripped by stripSubpages, is a one-paragraph blurb, which the prose-share test in kindOf reads as a
 * real entry. There is no such thing as a d20 page named "Radiance House Druid Archetypes"; that IS the
 * list, so URL shape (not content) is what tells a hub apart from "Syamed Druid Archetype" one level in. */
export function isHubUrl(url) {
  const segs = new URL(url).pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] || "";
  return last === "archetypes" || hubPublisherKey(last) !== null;
}
// A company name has a legal-entity suffix; a bare product TITLE ("Vampire Hunter D", "Table: Fiendish")
// does not, so it is never enough evidence on its own.
const COMPANY = /(inc\.|llc|games|publishing|press|studios?|entertainment|productions?|ltd|wizards|paizo)/i;
// "Paizo Rules Systems" is a d20pfsrd TAXONOMY label (alternate rule systems Paizo originated — Mythic
// Adventures, Occult Adventures, Words of Power…), not a publisher identity: a page filed under it can
// still be a third-party addition to that system, and a further author-hub segment later in the same
// crumb already overrides it when present. Found the hard way at 4,000-page scale: 3 live "Mythic ___"
// feats (from Owen K.C. Stephens' "Mythic Options: The Missing Core Feats", 2013, with its own Section
// 15 notice) had no such trailing segment, so this bare match was the ONLY crumb evidence and wrongly
// asserted Paizo — exactly the "confident wrong credit" the owner said is worse than admitting we don't
// know. Excluded here so these fall through to Section 15 / other evidence instead.
const NOT_A_PUBLISHER_CRUMB = new Set(["paizo rules systems"]);
// A copyright notice usually spells out "©", but a handful render it as literal "(c) 2012" instead (an
// artifact of the source book, kept as-is by the archiver) — missed entirely until "Bukavac" (Midgard
// Bestiary, "(c) 2012 Open Design LLC" = Kobold Press) fell through to unverified despite carrying a
// perfectly good notice, just not shaped the way every check here was looking for.
const CR_MARK = /©|Copyright|\(c\)\s*\d{4}/i;
// d20pfsrd's inline "Source" lines mostly name a Paizo PRODUCT CODE, not a full title: PZO#### is Paizo's
// own SKU prefix; the rest are abbreviations for Paizo product lines (Player Companion, Campaign Setting,
// Chronicles, core rulebooks, Adventure Paths, the SRD itself). Found by reading actual pilot pages —
// "Ranger Combat Styles" cites "PZO1134" with no other evidence anywhere on the page, and would otherwise
// have stayed unmarked. This list only ever RULES CONTENT IN as Paizo; a code it doesn't recognize is left
// for the company-suffix / titled-source tiers below, never assumed third-party from absence alone.
const PAIZO_CODE = /^P{1,2}(ZO|PC|RG|CS|Ch|FU)[:\d]|^PFSRD$|^PFU$|^SoS$|^TOHC$|^S&SPG$|^AP\d|^d20srd\.org$|^d20 3\.5 System Reference Document/;
// Bare Paizo book titles that cite themselves without a product code (found reading pilot pages: Shield,
// Light cites "Source: Core Rulebook"; Weather cites "Pathfinder #7", an Adventure Path issue number).
// Extend this list as more turn up in the "titled-source" bucket the report prints.
const PAIZO_TITLE = /^(core rulebook|bestiary(\s\d)?|advanced (player'?s guide|race guide|class guide)|ultimate (combat|magic|equipment|intrigue|wilderness)|occult adventures|horror adventures|mythic adventures|pathfinder unchained|npc codex|monster codex|gamemastery guide|pathfinder #\d+|the world of vampire hunter d|paizo blog|pathfinder campaign setting)/i;
/** Inline "Source: X" / "Source X" lines (there can be many, one per table row on a feat/spell list).
 *  A code -> Paizo. "©" plus a company suffix -> third party, and we keep the name. A bare title with
 *  neither is NOT decided here — Vampire Hunter D turned out to be a real Paizo crossover book title
 *  with no code and no "©", confirmed only by reading the live site, so a titled source is reported as
 *  its own low-confidence bucket rather than guessed either way. */
function sourceEvidenceOf(body) {
  const vals = new Set();
  for (const m of body.matchAll(/^Source:?\s+(.{1,80})$/gim)) vals.add(m[1].trim().replace(/\.$/, ""));
  let paizoHit = false, thirdHit = null, titled = null;
  for (const v of vals) {
    if (PAIZO_CODE.test(v) || PAIZO_TITLE.test(v)) { paizoHit = true; continue; }
    const co = /(?:©|\(c\))[^A-Za-z]*(\d{4})?\s*(.+)/.exec(v);
    if (co && COMPANY.test(co[2]) && !isPaizo(co[2])) { thirdHit = co[2].replace(/\.\s*(all rights reserved.*)?$/i, "").trim(); continue; }
    if (COMPANY.test(v) && !isPaizo(v)) { thirdHit = v; continue; }
    if (!/^https?:/.test(v)) titled = v;                    // a plain title, no code, no company: can't tell
  }
  return { paizoHit, thirdHit, titled };
}
/** Some feat/spell TABLES are pre-split by source: a "Paizo" line, a table of rows, then a "3rd Party
 * Publishers" line, a publisher name, and another table. "Technique Feats" is exactly this — its own
 * per-row Source column cites "Vampire Hunter D" (a real but code-less Paizo book title, confirmed only
 * by reading the live site), which sourceEvidenceOf cannot read since it is a table CELL, not a "Source:
 * X" line. The section headers around the table are the more reliable signal, so read those instead: a
 * data row inside the "Paizo" zone is Paizo evidence; inside a named third-party zone it is third-party
 * evidence. A header row (last cell literally "Source") or an empty "Coming Soon" zone is not a row and
 * proves nothing — this page's own third-party zone is exactly that, empty, so it correctly stays quiet. */
function zoneEvidenceOf(body) {
  let zone = null, zonePublisher = null, awaitingName = false, paizoHit = false, thirdHit = null;
  for (const raw of body.split("\n")) {
    const t = raw.trim();
    if (!t) continue;
    if (/^paizo$/i.test(t)) { zone = "paizo"; awaitingName = false; continue; }
    if (/^3rd[\s-]?party publishers?$/i.test(t)) { zone = "third-pending"; awaitingName = true; continue; }
    if (awaitingName) { awaitingName = false; zone = (!/\t/.test(t) && t.length < 60 && COMPANY.test(t)) ? (zonePublisher = t, "third") : null; continue; }
    if (/^(coming soon|none listed|n\/a|tbd)$/i.test(t)) continue;
    if (zone && /\t/.test(t)) {
      const cells = t.split("\t").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && /^source$/i.test(cells[cells.length - 1])) continue;   // the header row, not a fact
      if (zone === "paizo") paizoHit = true;
      else if (zone === "third" && zonePublisher) thirdHit = zonePublisher;
    }
  }
  return { paizoHit, thirdHit };
}
export function publisherOf(crumb, url, s15, body = "") {
  // 1. explicit third-party sections
  let publisher = null, third = null;
  for (const seg of crumb) {
    if (/3rd[\s-]*party|third[\s-]*party/i.test(seg)) third = true;
    // "Spells (Paizo, Inc.)", "Barbarian Archetypes – Frog God Games" (publisher AFTER the dash) —
    // but also, found reading real import candidates ("Lapith" a race, "King Gobb" a Frog God deity):
    // a crumb segment that is JUST the publisher's name on its own (".../3rd Party Races/Rogue Genius
    // Games/"), and "Frog God Games – Gods" (publisher BEFORE the dash this time — the site is not
    // consistent about which side). Try every shape; a segment can only match one anyway.
    const par = /\(([^)]{3,60})\)\s*$/.exec(seg);
    const dashAfter = /\s[–-]\s(.{3,60})$/.exec(seg);
    const dashBefore = /^(.{3,60}?)\s[–-]\s/.exec(seg);
    const bare = COMPANY.test(seg) && !/3rd|third/i.test(seg) && !NOT_A_PUBLISHER_CRUMB.has(seg.toLowerCase()) ? seg : null;
    const cand = (par && par[1]) || (dashBefore && COMPANY.test(dashBefore[1]) && dashBefore[1]) || (dashAfter && dashAfter[1]) || bare;
    if (cand && COMPANY.test(cand)) publisher = cand.trim();
  }
  if (/3rd-party|third-party/i.test(url)) third = true;
  if (publisher) third = isPaizo(publisher) ? false : true;
  // 1a. INLINE SOURCE LINES. Checked before the hub folder: a per-row citation on the page itself beats
  // a folder-level inference. A named third party wins outright; failing that, a recognized Paizo code
  // settles it; a bare titled source with no code is recorded but does not decide the page (see below).
  let srcEv = null;
  if (!publisher) {
    srcEv = sourceEvidenceOf(body);
    const zoneEv = zoneEvidenceOf(body);
    const thirdHit = srcEv.thirdHit || zoneEv.thirdHit;
    if (thirdHit) { publisher = thirdHit; third = true; return { publisher, third, s15Third: true, evidence: "source" }; }
    if (srcEv.paizoHit || zoneEv.paizoHit) return { publisher: "Paizo, Inc.", third: false, s15Third: false, evidence: "source" };
  }
  // 1b. AUTHOR HUBS. d20pfsrd files archetypes under a folder named for their source —
  // ".../druid/archetypes/michael-mars-druid-archetypes/syamed-druid-archetype" — and the page itself
  // carries no Section 15 or Source line, so the folder is the only evidence of who wrote it (found by
  // the owner reading a page the pilot had left "unknown"). "paizo-*" hubs are Paizo (729 of ~1,100
  // archetype pages); "animal-companion" / "familiar" name a kind of thing, not a publisher.
  if (!publisher) {
    const segs = new URL(url).pathname.split("/").filter(Boolean);
    for (let i = 0; i < segs.length - 1; i++) {
      const key = hubPublisherKey(segs[i]);
      if (!key) continue;
      if (key === "paizo") { third = false; return { publisher: "Paizo, Inc.", third, s15Third: false, evidence: "hub" }; }
      publisher = key.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return { publisher, third: true, s15Third: s15.some((l) => CR_MARK.test(l) && !isPaizo(l)), evidence: "hub" };
    }
  }
  // 2. Section 15 as a cross-check only (never overrides a breadcrumb verdict)
  const s15Others = s15.filter((l) => CR_MARK.test(l) && !isPaizo(l) && !/Wizards of the Coast|System Reference Document|Open Game License/i.test(l));
  const s15Notices = s15.filter((l) => CR_MARK.test(l));
  const evidence = third !== null ? "breadcrumb" : null;
  if (third === null && s15Notices.length) {
    // The breadcrumb is silent (feats, traits, most items). Section 15 lists whose work the page
    // reproduces: every notice Paizo/Wizards -> Paizo content; any other publisher -> third party.
    third = s15Others.length > 0;
    return { publisher, third, s15Third: s15Others.length > 0, evidence: "section15" };
  }
  if (third === null && srcEv && srcEv.titled) return { publisher, third, s15Third: false, evidence: "titled-source", titledSource: srcEv.titled };
  return { publisher, third, s15Third: s15Others.length > 0, evidence };
}

/* ---- license note ---------------------------------------------------------------------------
 * d20pfsrd's legal page (read 2026-09-21, https://www.d20pfsrd.com/extras/legal/) declares: "All
 * content of this site not designated as Product Identity is declared Open Game Content" under
 * OGL 1.0a — a SITE-WIDE declaration, independent of whether a given page carries its own Section 15.
 * So every page gets a license note either way: its own Section 15 text when the page has one (232 of
 * 1,000 pilot pages do not — mostly the author-hub pages, e.g. Syamed Druid Archetype has no Section 15
 * at all, only the folder name identifies Michael Mars as the author), or a note citing the site
 * declaration plus whatever authorship this pipeline could establish (Section 15 > hub folder > "Paizo,
 * Inc. (Pathfinder Roleplaying Game Reference Document)" as the fallback for content with neither). */
// Shown on the Codex entry page itself for anything with evidence "unverified" — an invite, not an
// apology. The owner's call (2026-09-22): don't assert Paizo when we don't actually know; ask instead.
// Links to the real #/feedback form (app.js, live 2026-09-22) — a small Netlify Forms-backed page,
// linked from the site footer, that emails a submission straight to the owner. The entry-page renderer
// should turn the "#/feedback?entry=..." into a link and prefill `entry` with this row's name, the same
// way viewFeedback() already reads that query param.
export const UNVERIFIED_NOTICE = "Source not confirmed for this entry. If this is your work, use the Feedback link below to let us know so we can credit it properly.";
export function licenseNoteOf(s15, publisher, evidence) {
  if (s15.length) return s15.join(" ");
  if (evidence === "unverified") return UNVERIFIED_NOTICE;
  const who = publisher || "Paizo, Inc. (Pathfinder Roleplaying Game Reference Document)";
  const via = evidence === "hub" ? " (identified from the site's folder structure; the page itself carries no Section 15 notice)"
    : evidence === "source" ? " (identified from an inline Source citation on the page)"
    : "";
  return `Open Game Content under the site's blanket OGL 1.0a declaration (d20pfsrd.com/extras/legal/). Author/publisher: ${who}${via}.`;
}

/* ---- bucket mapping ------------------------------------------------------------------------ */
export function bucketOf(crumb, url) {
  const c = crumb.map((s) => s.toLowerCase());
  const has = (re) => c.some((s) => re.test(s));
  if (!c.length) return "rules";                       // a section landing page — general rules text
  const top = c[0];
  if (/^feats/.test(top)) return "feats";
  if (/^traits/.test(top)) return "traits";
  if (/^magic$/.test(top) && !/^magic-items/.test(new URL(url).pathname.split("/")[1] || "")) return "spells";
  if (/^magic items|^equipment|^magic-items/.test(top)) return "items";
  if (/^bestiary/.test(top)) return "monsters";
  if (/^races/.test(top)) return "races";
  if (/^(skills|gamemastering|basics|alternative rule|alignment|extras)/.test(top)) return "rules";
  if (/^classes/.test(top)) {
    if (has(/^archetypes$/) || has(/archetypes/)) return "archetypes";
    if (has(/prestige classes|base classes|core classes|hybrid classes|alternate classes|unchained classes|npc classes|monster classes/) && c.length <= 4) return "classes";
    return "options";
  }
  return "unmapped";
}

/* ---- entry vs index ------------------------------------------------------------------------ */
/* An index page is a list of names. The archive is plain text (no link structure), so the signal is
 * PROSE SHARE: the fraction of the text that lives in long lines. Measured on the pilot sample —
 * every true index sat below 0.45 (Artifacts 0.22, Potions 0.36, Wondrous Items 0.10, Magic Weapons
 * 0.29) and every real entry at 0.75 or above, including the long ones a "many short lines" rule
 * wrongly condemned (the Alchemist class page, the Ride skill page). */
export function kindOf(body, crumb) {
  const ls = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const flat = ls.join(" ");
  // Placeholders only. A real trait can be 66 characters ("Benefit: You gain a +2 bonus on…").
  if (flat.length < 30 || /^(if this page|open this in)/i.test(flat)) return "stub";
  if (ls.length < 6) return "entry";
  // A stat block is many SHORT lines, so the prose-share test below would call every monster,
  // spell and magic item an index. Labelled stat lines are proof of an entry.
  const labelled = ls.filter((l) => /^(CR|XP|AC|hp|Init|Fort|Speed|Melee|Str|School|Level|Casting Time|Components|Range|Duration|Price|Aura|CL|Slot|Weight|Prerequisites?|Benefit)\b/.test(l)).length;
  if (labelled >= 3) return "entry";
  const tot = ls.join("").length || 1;
  const prose = ls.filter((l) => l.split(/\s+/).length >= 12).join("").length / tot;
  if (ls.length >= 15 && prose < 0.5) return "index";
  if (!crumb.length) return "article";          // a section landing page: general rules text, not an entry
  return "entry";
}

/* A CATEGORY ROOT is the top of a taxonomy branch — "Core Races" over Dwarves/Elves/Gnomes..., "Family
 * Traits" over its member traits. It has a child list (like a hub) but is not gathered under an author
 * folder, so isHubUrl misses it. What is left after stripSubpages is flavor text about the CATEGORY, not
 * rules for a specific thing — short by construction, unlike a real entry that happens to have subpages
 * (the Fighter class page still runs 49,000 characters after its subpage list is stripped). */
// "Uncommon Races" runs 5,959 characters — over the blurb-length cutoff — because it gives each of its
// 14 children one summary sentence ("Changelings: The offspring of hags..."). That is still a category
// index, just a longer one: most of its "own" text is just naming its children back to it. Count how
// many children get their own "Name:" lead-in in the remaining text; a category root does this for most
// of them, a real entry with subpages (Fighter) does not do it for any.
function describedShare(children, body) {
  if (!children.length) return 0;
  let hit = 0;
  for (const c of children) {
    const core = c.replace(/\s*\([^)]*\)\s*/g, "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (core && new RegExp(`^${core}s?:`, "im").test(body)) hit++;
  }
  return hit / children.length;
}
// "Base Classes" lists ~11 real classes one-line-each, but its Subpages ALSO nest each class's own
// Archetypes/Discoveries/Mysteries sub-links (38 children total) — those never get a "Name:" line of
// their own, so describedShare (a count over ALL children) comes out under 30% even though the class
// summaries are the entire page. Measure by CHARACTERS instead: those ~11 "Name: summary" lines are
// most of the body regardless of how many undescribed nested links sit alongside them in Subpages.
function describedCharShare(children, body) {
  if (!children.length || !body.length) return 0;
  const uniq = [...new Set(children.map((c) => c.replace(/\s*\([^)]*\)\s*/g, "").trim()))].filter(Boolean);
  let covered = 0;
  for (const c of uniq) {
    const core = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = new RegExp(`^${core}s?:.*$`, "im").exec(body);
    if (m) covered += m[0].length;
  }
  return covered / body.length;
}
export function isCategoryRoot(children, crumb, chars, body) {
  return children.length > 0 && (chars < 4000 || describedShare(children, body) >= 0.5 || describedCharShare(children, body) >= 0.6);
}
/** A TOOL-LINK page points at an external database or generator instead of holding content itself
 * ("Magic Items DB": a paragraph of preamble, then "Open this in a new Window" and nothing else). The
 * existing stub check only fires when that phrase starts the page; here it is one line among several.
 * Also catches the embedded-frame phrasing found at 4,000-page scale ("Cleric/Oracle Spell List
 * (Filter)": "...if you can't see the spell filter, please click here to open it in a new window") —
 * same class of stub, different wording ("open it" not "open this", mid-sentence not line-initial). */
export function isToolLinkPage(body) {
  return body.split("\n").some((l) => /embedded frame|open (this|it) in a new (window|page)\b/i.test(l.trim()));
}
/* A CATALOG page is a single page that is actually MANY separate items — an equipment or goods table
 * (Animals & Animal Gear, Armor and Shields) rather than one entry. It has no child links (the rows are a
 * table, not a "Subpages" list) and no small set of labelled stat lines either, so it fails both the hub
 * and the entry tests and would otherwise be read as one giant "entry". It needs a dedicated table-row
 * importer, not the one-page-to-one-Codex-row matcher, so it is set aside rather than guessed at. */
export function isCatalogPage(bucket, chars, ls) {
  if (bucket !== "items") return false;
  const priced = ls.filter((l) => /\b\d[\d,]*\s*(gp|sp|cp)\b/i.test(l)).length;
  if (chars >= 8000 && priced >= 15) return true;
  // A SMALL catalog ("Bronze Age Weapons": ~2,000 chars, 5 priced rows) slipped past the size gate at
  // 4,000-page scale — the byte-count threshold was tuned against big examples (Armor and Shields,
  // Alchemical Creations) and never meant to be the only signal. A real single item is prose; d20's
  // own multi-item tables are TAB-separated ("Mattock\t12 gp\t1d6\t2d4…"), which a real entry's body
  // never contains regardless of size, so this catches a small catalog the size gate alone cannot.
  const tabPriced = ls.filter((l) => /\t/.test(l) && /\b\d[\d,]*\s*(gp|sp|cp)\b/i.test(l)).length;
  return tabPriced >= 3;
}

/* ---- run ----------------------------------------------------------------------------------- */
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}` || process.argv[1]?.endsWith("d20-clean.mjs")) {
  const files = fs.readdirSync(`${SNAP}/pages`).filter((f) => f.endsWith(".txt")).sort();
  const out = [];
  for (const f of files) {
    const text = fs.readFileSync(`${SNAP}/pages/${f}`, "utf8");
    const p = parsePage(text, f);
    const url = p.head.URL || "";
    const pub = publisherOf(p.crumb, url, p.s15, p.body);
    const bucket = bucketOf(p.crumb, url || "https://x/");
    const ls = p.body.split("\n").map((l) => l.trim()).filter(Boolean);
    const kind = (url && isHubUrl(url)) ? "index"
      : isCategoryRoot(p.children, p.crumb, p.body.length, p.body) ? "index"
      : bucket === "spells" && p.crumb.includes("Spells by Class") ? "index"
      : isToolLinkPage(p.body) ? "stub"
      : isCatalogPage(bucket, p.body.length, ls) ? "catalog"
      : kindOf(p.body, p.crumb);
    const titleTag = (p.head.TITLE || "").replace(/\s+[–-]\s+d20PFSRD$/i, "");
    // LAST RESORT, entries only: every third-party page found in this pipeline carried SOME marker
    // (a hub folder, a breadcrumb tag, an inline Source) — none turned up here, from evidence alone.
    // Earlier this defaulted straight to "Paizo, Inc." on the reasoning that absence of a marker
    // usually means Paizo — but that ASSERTS an attribution we don't actually have, and being
    // confidently wrong (crediting someone's third-party work to Paizo) is worse than saying nothing.
    // So `thirdParty` stays null (neither confirmed Paizo nor confirmed third-party) and `publisher`
    // stays unset; only `evidence` is stamped "unverified" so the page and this report can say so.
    // thirdParty === false is the ONLY "confirmed safe" signal from here on — true AND null both mean
    // "treat as non-commercial until someone confirms otherwise" for the eventual strip script.
    let publisher = pub.publisher, third = pub.third, evidence = pub.evidence;
    if (kind === "entry" && third === null && evidence == null) evidence = "unverified";
    out.push({
      file: f, url, title: titleTag, name: p.nameRaw, crumb: p.crumb,
      bucket, kind, publisher, thirdParty: third, s15Third: pub.s15Third, evidence, titledSource: pub.titledSource || null,
      license: licenseNoteOf(p.s15, publisher, evidence),
      children: p.children, s15: p.s15, chars: p.body.length, sha: crypto.createHash("sha256").update(p.body).digest("hex").slice(0, 16),
      body: p.body,
    });
  }
  fs.writeFileSync(`${SNAP}/pages.jsonl`, out.map((r) => JSON.stringify(r)).join("\n") + "\n");

  // ---- report: counts must balance ----
  const tally = (key) => out.reduce((m, r) => (m[key(r)] = (m[key(r)] || 0) + 1, m), {});
  const show = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  ");
  console.log(`pages cleaned: ${out.length} of ${files.length} snapshotted  ${out.length === files.length ? "(balanced)" : "(!! MISMATCH)"}`);
  console.log("\nkind     :", show(tally((r) => r.kind)));
  console.log("bucket   :", show(tally((r) => r.bucket)));
  console.log("3rd party:", show(tally((r) => (r.thirdParty === true ? "THIRD" : r.thirdParty === false ? "paizo" : "unknown"))));
  console.log("evidence :", show(tally((r) => r.evidence || "none")));
  // Every ENTRY page now gets a decided `evidence` tag, even when the attribution itself is left open
  // ("unverified" — see below); this count is entries with NEITHER, which would mean the fallback
  // itself failed to run and should always be 0.
  const unk = out.filter((r) => r.evidence == null && r.kind === "entry");
  const titled = out.filter((r) => r.titledSource);
  console.log(`\nENTRY pages with no evidence tag at all (pipeline bug if nonzero): ${unk.length}`);
  const unverified = out.filter((r) => r.evidence === "unverified");
  console.log(`UNVERIFIED attribution — no evidence anywhere, shown on-page as an open invite rather than asserted (${unverified.length}):`);
  for (const r of unverified) console.log(`   ${r.bucket.padEnd(10)} ${r.title.slice(0, 40).padEnd(41)} ${r.url.replace("https://www.d20pfsrd.com", "")}`);
  console.log(`\ntitled-source pages (a source line with no code/company match — extend PAIZO_TITLE or leave for review): ${titled.length}`);
  for (const r of titled.slice(0, 10)) console.log(`   ${r.title.slice(0, 40).padEnd(41)} titled source: "${r.titledSource}"`);
  const catalog = out.filter((r) => r.kind === "catalog");
  console.log(`\nCATALOG pages set aside (${catalog.length}) — many items on one page, needs a table-row importer:`);
  for (const r of catalog.slice(0, 8)) console.log(`   ${r.title}  (${r.chars} chars)`);
  const disagree = out.filter((r) => r.thirdParty === false && r.s15Third);
  console.log(`\nbreadcrumb says Paizo but Section 15 cites a non-Paizo source: ${disagree.length}`);
  for (const r of disagree.slice(0, 4)) console.log(`   ${r.title}  [${r.publisher}]  ${r.s15.find((l) => CR_MARK.test(l) && !/paizo/i.test(l))?.slice(0, 90)}`);
  const noS15 = out.filter((r) => !r.s15.length);
  console.log(`pages with NO Section 15 block: ${noS15.length}  (${(noS15.length / out.length * 100).toFixed(0)}%)`);
  const unmapped = out.filter((r) => r.bucket === "unmapped");
  console.log(`\nUNMAPPED (${unmapped.length}) — first few crumbs:`);
  for (const r of unmapped.slice(0, 8)) console.log(`   ${r.crumb.join(" > ")}  ::  ${r.title}`);
  const idx = out.filter((r) => r.kind === "index");
  console.log(`\nINDEX pages (${idx.length}) — first few:`);
  for (const r of idx.slice(0, 6)) console.log(`   ${r.title}  (${r.chars} chars)  ${r.crumb.join(" > ")}`);
  const stub = out.filter((r) => r.kind === "stub");
  console.log(`STUB pages (${stub.length}) — first few:`);
  for (const r of stub.slice(0, 5)) console.log(`   ${r.title}  (${r.chars} chars)  ${r.body.replace(/\n/g, " ").slice(0, 70)}`);
}
