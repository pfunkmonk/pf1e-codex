# d20pfsrd → Codex import pipeline

Source: the archived crawl of d20pfsrd.com (42,743 pages, `D:\CODEX\family-site-archiver\archives\www.d20pfsrd.com-2026-09-21-full\`).
Working ledger and reports: `D:\CODEX\d20-pilot\` (`sample.json`, `pages.jsonl`, `matches.json`, `import-report.json`).

## One batch, start to finish

```
node tools/d20/d20-sample.mjs --n 5000          # draw a batch (cumulative ledger; never re-draws a page)
node tools/d20/d20-clean.mjs                    # parse, classify (entry / catalog / index / stub), attribute
node tools/d20/d20-xref.mjs                     # pull the individual pages that catalog rows point to, to convergence
node tools/d20/d20-clean.mjs                    # ...and re-clean the enlarged pilot
node tools/d20/d20-match.mjs                    # NEW / DUP / NAMESAKE / AMBIGUOUS against the Codex
node tools/d20/d20-conflicts.mjs                # rules-number conflicts against matched Codex entries
node tools/d20/d20-import.mjs                   # DRY RUN — read the report
node tools/d20/d20-import.mjs --apply           # writes data/; runs d20-verify.mjs itself; exit 1 = do not ship
node tools/gen-api.mjs . --prune && node tools/check-api.mjs .
# all 7 tools/check-*.mjs, bump the 3 cache tokens (app.js DATA_V, sw.js CACHE+V, index.html ?v=), push main, verify live
```

Stage in a scratch copy first when in doubt: `d20-import.mjs --root <copy of data/ + app.js> --apply`, then diff it against the repo.

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
