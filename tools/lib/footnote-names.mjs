/* Footnote digits that rode into 30 item NAMES from the source ("Cloak of Resistance1", "Belt of Giant Strength2").
 *
 * The scrape kept a superscript footnote marker as part of the title; the entry's own body heading is the clean name
 * ("Cloak of Resistance"). The stored rows are originals and stay untouched (additive-only; the public API mirrors them
 * exactly — check-api asserts that), so the app and the tools that must agree with it clean the name IN MEMORY, with this
 * one rule: an items row whose name ends in a letter followed by a single 1 or 2. A name is left alone when the clean form
 * is already another items row ("Ring of Protection1" next to a separate "Ring of Protection"): two identical names would
 * only make every link to it ambiguous.
 *
 * app.js carries the same rule in ES5 (`cleanFootnoteNames`). Keep the two identical: check-guide re-derives the set both
 * ways and fails if they disagree. */
export const FOOTNOTE_NAME = /^(.*[A-Za-z])[12]$/;
export function footnoteCleanName(row, taken) {
  if (row[2] !== "items") return null;
  const m = FOOTNOTE_NAME.exec(row[1]);
  if (!m) return null;
  return taken.has(m[1].toLowerCase()) ? null : m[1];
}
export function cleanFootnoteNames(IDX) {
  const taken = new Set();
  for (const r of IDX) if (r[2] === "items") taken.add(r[1].toLowerCase());
  let n = 0;
  for (const r of IDX) { const c = footnoteCleanName(r, taken); if (c) { r[1] = c; n++; } }
  return n;
}
