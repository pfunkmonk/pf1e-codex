# d20pfsrd → Codex import pipeline

Source: the archived crawl of d20pfsrd.com (42,743 pages, `D:\CODEX\family-site-archiver\archives\www.d20pfsrd.com-2026-09-21-full\`).
Working ledger and reports: `D:\CODEX\d20-pilot\` (`sample.json`, `pages.jsonl`, `matches.json`, `import-report.json`).

## One batch, start to finish

```
node tools/d20/d20-sample.mjs --n 5000          # draw a batch (cumulative ledger; never re-draws a page)
node tools/d20/d20-clean.mjs                    # parse, classify (entry / catalog / index / stub), attribute
node tools/d20/d20-xref.mjs                     # pull the individual pages that catalog rows point to, to convergence
node tools/d20/d20-xref-coverage.mjs --show     # catalogs that are the ONLY home of their rows -> catalog-keep.json (imported as one table page each)
node tools/d20/d20-clean.mjs                    # ...and re-clean the enlarged pilot
node tools/d20/d20-match.mjs                    # NEW / DUP / NAMESAKE / AMBIGUOUS against the Codex
node tools/d20/d20-conflicts.mjs                # rules-number conflicts against matched Codex entries
node tools/d20/d20-import.mjs                   # DRY RUN — read the report
node tools/d20/d20-import.mjs --apply           # writes data/; runs d20-verify.mjs itself; exit 1 = do not ship
node tools/gen-api.mjs . --prune && node tools/check-api.mjs .
# all 7 tools/check-*.mjs, bump the 3 cache tokens (app.js DATA_V, sw.js CACHE+V, index.html ?v=), push main, verify live
```

Stage in a scratch copy first when in doubt: `d20-import.mjs --root <copy of data/ + app.js> --apply`, then diff it against the repo.

## Held verdicts (NAMESAKE / AMBIGUOUS) are resolved by the importer, not left for a person

`d20-match` marks pages "same name, different content" (NAMESAKE) or "same name, middling content" (AMBIGUOUS). A sample
of 1,473 showed most are genuinely different entries (a third-party "Shedu", two publishers' "Energy Weapon", regional
traits that share a name). So `d20-import` decides with its own guards:
- NAMESAKE is imported; on a same-name+bucket collision a NAMED third-party publisher is kept as `Name (Publisher)`,
  a Paizo/unconfirmed page (matcher says different content) as `Name (d20pfsrd)`.
- AMBIGUOUS is imported only from a named third-party publisher and only when the match is weak (cont < 0.25, cos < 0.6);
  anything else is probably the same entity re-worded and is reported as skipped.
- **Same text is a duplicate, whatever the matcher said.** At every name collision `contentOverlap` (5-word shingle
  containment, threshold `SAME_TEXT` 0.5) is checked against the existing row: an AoN original that merely carries extra
  "Source …" lines scores as a NAMESAKE by cosine but is the same text (~100 such duplicates shipped once). Only text that
  genuinely differs is kept as a suffixed namesake. Updating an existing row of the same id also requires the SAME PAGE
  (same opening text or overlap ≥ 0.5), or two different same-publisher pages ("Chilling Aura") overwrite each other.
- Suffixes are short: `shortSuffix` keeps the part after "from the …" and caps length; a book title starting "Pathfinder"
  counts as Paizo (`isPaizoish`), so it becomes `(d20pfsrd)`, not the book title.
- Two pages minting one id in a run: the first keeps the plain name, a second from a different publisher gets the suffix,
  a second from the same publisher is a duplicate and is skipped.

## Finishing an archive

`d20-sample.mjs --margin 0 --min-chars 0` draws the true remainder once the crawl has finished (the default margin
protects pages a running crawler might still be writing). After the last batch: run `d20-xref-coverage.mjs`, re-clean, and
read the skipped lists in `import-report.json` (`skippedHeldDuplicate`, `skippedExistingCollision`, `skippedInvertedDup`).

## Restoring what a DUP skip drops: `d20-lost.mjs` → `d20-supplements.mjs` (2026-10-03)

The importer is additive-only, so a page judged DUP of an existing AoN entry is skipped whole — and any EXTRA material
that d20 page carries (source-tagged supplement sections, ecology/habitat essays, FAQ, variant stat blocks) vanished with
it. Found when the Ask AI could not answer a dense-smoke question: "Dense Smoke Inhalation" (Source PAP25) was on the d20
"Environmental Rules" page and in no Codex entry. Measured over every not-imported page: **1,402 pages, ~3.2M characters,
2,311 sections** (≈3% of the pages).

```
node --max-old-space-size=12288 tools/d20/d20-lost.mjs          # -> <snap>/lost-sections.json  (read-only)
node tools/d20/d20-supplements.mjs                              # -> D:/CODEX/d20-supplements/{pages.jsonl,matches.json}
node tools/d20/d20-import.mjs --snap D:/CODEX/d20-supplements   # dry run; add --apply (runs d20-verify)
```

- **Detection** is a corpus-wide Bloom filter of every 5-word shingle in every Codex body; a d20 line is LOST when ≥80% of its
  shingles exist in NO entry (not merely not in the matched one), and a section is the maximal run of lines between two
  clearly-present prose lines. Never "first N characters of a line" — a label prefix ("Bleed: …") breaks that and the first
  attempt over-counted ~10×. Validated on the known case (found Dense Smoke) and on controls (Fireball, Grapple, Flanking: none).
- **Restoration** is a COMPANION entry per original, `<Name> — Additional Material (d20pfsrd)`, same bucket, own rawCat
  (`Additional Material (d20pfsrd)`), plain `{bk}` facets, attribution inherited from the d20 page record, each section's own
  `Source X` line kept plus one "Sources named on the page" line. The original is untouched (`d20-verify`: "original pages
  not altered"). The app links original ↔ companion (`companionNote`, app.js) and the companion takes its original's art.
- Noise filters in `d20-supplements`: sections that are lists of short names, a block repeated on ≥5 pages, and a page whose
  total is under `--min 400` characters (an orphan fragment) are not restored (~3% of the lost characters).
- Caveat: attribution is page-level (the pipeline's model). A page that mixes Paizo text with third-party sections carries one
  Section 15 notice; the sections' own `Source` tags are the only finer credit. Matters for any commercial flip.
- Defects this surfaced, fixed at the root: `publishersFromNotice` kept the dash in "Copyright 2008 – Name" (junk source,
  guarded by `d20-verify` "no junk source strings"); `d20-verify`'s nav-list check exempts supplements (a racial name list is content).

## The BOOK, not just the publisher (2026-10-06)

3,166 d20 entries + ~680 companions showed only "Paizo, Inc." as their source, and 273 original AoN rows had no source at all — yet the book was
in the data. d20pfsrd rarely prints a readable "Source" line, so `bkOf()` fell through to "Paizo, Inc.", but the entry's own **Section 15
notice** names the book ("Pathfinder Roleplaying Game Advanced Race Guide © 2012, Paizo Publishing, LLC; …") and is already copied into the body.

- `bookSource()` (d20-attrib) reads the PAIZO notices of a row whose source is the bare publisher: one or two books → the source; none, or more than
  two → unchanged. A third-party notice never names a Paizo book. Wired into `d20-import` (new rows) and `d20-repair` (live rows; `--apply`).
- **Naming matters**: the AoN originals spell books "Advanced Race Guide" / "Pathfinder RPG Bestiary"; a notice says "Pathfinder Roleplaying Game
  Advanced Race Guide". Two spellings would split the "Any book" filter, so `bookKey()` matches a notice title to the originals' spelling
  (`buildBookIndex`, `canonicalPaizoBook`); only an unmatched title (an Adventure Path, a module) is used as written. A two-book page keeps both in
  the source string and its first as the `bk` facet. Every AoN book spelling is registered with `isPaizoish()` (a book title that does not start
  "Pathfinder" is still Paizo).
- **Third-party rows are deliberately NOT changed**: their source is the publisher and the filter groups by it (13,654 rows have a product title in
  their notice — "Frog God Games" → "Rappan Athuk" — see HANDOFF for the open option).
- **Original rows** with a blank source (monster templates "Horror Adventures pg. 248", tricks/stares/amplifications "Allay Pain(Occult Realms pg. 16)",
  class-feature "Source: PRPG Core Rulebook") are filled by `tools/fix-original-sources.mjs` — strictly additive: only a BLANK source, only from the
  row's own text, body untouched. `d20-verify` allows exactly that exception and nothing else (mutation-tested: a changed snippet, an overwritten
  source, an extra facet each still fail "original pages not altered").
- Guards in `d20-verify`: no bare "Paizo, Inc." when the notice names the book; no Paizo book under a second spelling.
- Not recoverable: ~305 rows whose notice names no book, 5 originals whose text names none, and product CODES (PZO1110, PRG:APG…) — the archive has
  no legend page, and learning codes by co-occurrence is wrong (it called PFU the Core Rulebook; PFU is Pathfinder Unchained).

## The rule that keeps this safe

**Every defect found in an audit is fixed in the importer/classifier AND added to `d20-verify.mjs`.** The repair script
(`d20-repair.mjs`) is for cleaning rows that are already live; it is not a substitute. The verifier is independent of
the importer's own logic on purpose (a check that reuses the code it checks proves self-consistency, not correctness) and
every check has been mutation-tested: inject the fault into a scratch copy, confirm the SPECIFIC check fires.

| Defect that shipped once | Fixed in | Guarded by (`d20-verify.mjs`) |
|---|---|---|
| Real single spells classed as "catalogs" and dropped | `hasOwnStatBlock` in d20-clean | (classifier tests) |
| Multi-section catalog pages imported as one entry (Racial Feats) | `maxRepeatedTabLine`, case-sensitive School/Level | — |
| Name-list navigation page imported (Monsters by Role) | `commaListShare` in `isCatalogPage` | no name-list navigation page |
| Two different pages minting one id | intra-batch + cross-batch guards in d20-import | ids are unique |
| `Source` column said "Paizo" beside "Source not confirmed" | `repairSource` (d20-attrib) | no 'Paizo' source on an unconfirmed entry |
| Publisher shown as "Third-party (unattributed)" though the entry's own Section 15 names it | `repairSource` | no 'Third-party (unattributed)' when Section 15 names the publisher |
| Paizo credited as author of third-party content | `licenseNoteOf(…, third)`, `repairNote` | no invented Paizo authorship |
| Placeholder "Product Name Section 15 here" as the credit | `PLACEHOLDER_S15` | no placeholder where a Section 15 credit should be |
| Junk source strings | `tidySource` | no junk source strings |
| Duplicates of original pages under inverted names | `nameKeys` guard in d20-import | no d20 entry duplicates an original page |
| Gods filed under `options` | `bucketOf` + `isGodBody` backstop, `deities` importable | no god-shaped page outside deities |
| Source-template placeholder text in bodies | `stripTemplateJunk` | no source-template placeholder text |
| Stat block flattened onto one line | `breakFlatStatBlocks` | no stat block flattened onto a single line |
| Literal `~~~` dividers | `tidyDividers` | no garbled characters or leaked markup |
| Snippet out of step with a cleaned body | shared `snippetOf` | index snippet matches its body |
| Publisher ad widget ("Latest Products from this Publisher at OpenGamingStore.com!", 3 spellings) captured as body text; 7 entries were nothing but the ad | `AD_MARK` cut in `parsePage` | no crawler-captured advertisement text |
| Feat "publisher hub" pages (feat summary table with rows wrapped over two lines) and bare "Subpages" stubs imported as entries | `isCatalogPage` signals 1–2 (template fingerprint; `subpagesStubOwnChars`) | (classifier; measured by before/after diff over the whole pilot) |
| God SUMMARY tables (Deity/AL/Worshipers…) imported as entries | `isGodSummaryTable` | no god summary table posing as an entry |
| `{{template field}}` lines, credit line that is just "x" | `stripTemplateJunk`, `PLACEHOLDER_S15` | no source-template placeholder text / no placeholder where a credit should be |
| Blank publisher stat-block TEMPLATES ("XP ZZ,ZZZ", "{{Don't list entry if…}}", ~95 unfilled slots) imported as monsters | `blankTemplateSlots` ≥ 20 in `isCatalogPage` | no blank stat-block template |
| Original pages removed/altered | additive-only importer | original pages not removed / not altered |

**Rule for classifier changes:** measure every new signal across the WHOLE pilot (before/after list of newly-excluded pages)
and read the list. Batch 9's first "table-dominated page" signal flagged 54 pages — 18 of them were real content
("Knucklebone of Fickle Fortune", "Road or Trade Route") and it was dropped in favour of narrower signals.

Tables are rendered by the app (`fmtBody` → `renderTabTable`, tab-separated rows → `table.rt.rtx`), not by the importer.
Always look at a rendered long entry after a batch: size and line-length statistics said "fine" while every table was
running together.

## Adding a check

Add it to `d20-verify.mjs`, add a matching fault to the mutation list (see memory `d20-import-audit-2026-09-24`), and confirm it
fires on that fault and stays quiet on the live data.

## Files

- `d20-attrib.mjs` — shared, pure: attribution (`repairSource`/`repairNote`), duplicate keys, template/divider/stat-block
  cleaning, `snippetOf`, `isGodBody`. Used by the importer, repair and verify.
- `d20-xref*.mjs` — cross-reference pull (`d20-xref.mjs` drives `-catalogs`, `-gather`, `-pull`; `-index` builds the archive name index once).
- `d20-repair.mjs` — re-runnable cleanup of rows already live (dry run by default; `--apply`). Should report ~0 changes after every batch.
- `d20-verify.mjs` — the gate. `--root <repo>`, `--baseline <git rev>` (default `b9c50cfa`, the last commit before any d20 import).
