# PF1e Codex — Handoff

Current state, the traps, and what is left to do. Read this before changing anything.

**Live:** https://codex.pipsprojects.com · **Repo:** `pfunkmonk/pf1e-codex` (public)
**Local clone:** `~/dev/pf1e-codex` — deliberately NOT on the Desktop, because OneDrive sync
corrupts `.git`.
**Netlify:** siteId `25e63648-5ebb-458d-9451-ce5517dbd5c2`, site name `wondrous-starburst-47cb24`
— it contains no reference to "codex", so look the site up by its custom domain, not by name.

---

## Deploying

A push to `main` **is** a production release. Netlify publishes the repo root; there is
**no build step and no test gate**, so nothing will catch a broken `app.js` for you.

Before pushing:

```bash
node --check app.js && node --check sw.js && node --check data/index.js
```

### Bump three cache tokens together

`sw.js` force-freshens `app.js`, `styles.css` and `meta.js`, but **not** `data/index.js` or
`data/tables.js`. Without a token bump a returning client can pair a fresh `meta.js` with a
stale `index.js` — new filter categories over rows that lack them, i.e. filters that silently
return nothing.

| File | What to change |
|---|---|
| `index.html` | every `?v=NN` |
| `app.js` | `var DATA_V = "NN"` |
| `sw.js` | `var CACHE = "pf1e-codex-vNN"` and `var V = "NN"` |

**Images are the exception.** Netlify serves `art/*` as `public,max-age=0,must-revalidate` with
an ETag and the service worker is network-first, so replacing an image propagates on its own.
Do not bump tokens for an art-only change — it would force every client to re-download the
10 MB index for a few JPEGs.

### Verifying a data change locally

Serve on a **new port**. The browser HTTP-caches `data/*.js`, so you will otherwise see stale
data and conclude your fix failed. Unregistering the service worker is not enough, and the
strict CSP blocks `eval`, so you cannot hot-patch the payload in the page either.

---

## Data

All content is static JS assigning `window.PF_*` globals. There is no backend.

| File | Global | Notes |
|---|---|---|
| `data/index.js` | `PF_INDEX` | 10 MB. Rows: `[id,name,slug,rawCat,source,snippet,facets]` |
| `data/meta.js` | `PF_META` | totals, groups, facet vocabularies, the Start Here guide |
| `data/art.js` | `PF_ART` | **generated** — which art files exist on disk |
| `data/tables.js` | `PF_TABLES` | structured tables keyed by entry id, lazy-loaded |
| `data/cat/<slug>.js` | via `PF_REG` | full entry bodies, lazy-loaded per category |

**The generator that produces `data/*.js` is not in this repo and not on this machine.**
`D:\CODEX\aon-database-builder\` is a different, much smaller build. Data changes have been
made as idempotent repair passes over the built files.

### Repairs already applied to the data

- **Trait categories.** The upstream extractor read a bare word after `Category`, so it missed
  the four basic types, written `Category Basic (Social)`. 535 of 1,978 traits had no `cat` and
  were unreachable. Repaired from the full bodies in `data/cat/traits.js` — the truncated
  `index.js` snippets cannot resolve all of them. Facet went 11 → 15 categories.
- **Progression tables.** 49 entries (Cavalier, Monk, Samurai, Kineticist, Shifter, Rogue
  (Unchained) and ~43 prestige classes) had a table in their prose but no `PF_TABLES` record.
  Rebuilt from the archived AON pages under `Desktop\AON PAGES PARSED\`, which still hold real
  tab-delimited rows. `PF_TABLES` 728 → 777.
  ⚠ A naive detector flags 57. Eight are false positives — the wizard elemental schools, whose
  "rows" are spell lists (`1st - magic missile, …`). Only accept a table whose first two rows
  match consecutive body lines.
- **Monster subtypes.** Promoted onto rows as an `st` facet (1,774 monsters, 54 subtypes).
  They existed only in stat-block prose, which loads lazily — far too late for art selection.
  Precedence puts the named family first: a balor is `demon`, not `chaotic`.

---

## Art

`art/<key>.jpg`, 1600×900, ~70% JPEG. 258 of 452 planned backdrops exist.

### Two lists, two questions — do not merge them

| | |
|---|---|
| `ART_PLANNED` in `app.js` | every key we INTEND to have. Hand-maintained. Drives the gallery. |
| `ART` from `data/art.js` | what is actually ON DISK. Generated. Gates resolution. |

Conflating these is what made the gallery report "452 of 452 generated" when a third had not
been drawn: it inferred presence from `img.onerror`, which never fires for lazy-loaded images
below the fold. Presence is now a data question answered by the manifest.

### Resolution

`entryArtKey()` returns a most-specific-first **candidate chain**; `applyArt` walks it and uses
the first that loads, so a planned-but-undrawn key falls through to the category banner rather
than leaving a page bare. A 404 is remembered per session.

```
classes    class-<name> -> inherited (see below) -> cat-classes
races      race-<name> -> cat-races
archetypes parent class art via the cls facet -> cat-archetypes
traits     trait-<category>            feats  feat-<type>
items      by rawCat and slot          spells spell-<name> -> school-<school>
monsters   race-<name> -> creature-<subtype> -> type-<t> (dragons and outsiders split on
           alignment) -> cat-monsters
deities    deities-pantheon
```

**Class art inheritance** covers 212 entries with no images at all: 119 prestige classes mapped
to the base class each reads as, plus `/^Order of/`→cavalier (37), `/^Oath /`→paladin (15),
24 bloodrager bloodlines, and `(Unchained)`→base class. The Unchained rule falls through to the
map when the stripped base has no art of its own, so `Eidolon (Unchained)` reaches summoner.
Class coverage is 252 of 252.

**Weapons and armour** get one of six variants by an FNV-1a hash of the entry id. The data
records damage type for only 199 of 1,174 weapons and armour class for 72 of 456, so the choice
is arbitrary — but it must be the same arbitrary choice on every visit.

⚠ **Giants match on TYPE, not name.** AON inverts names, so "Ant, Giant" and "Beetle, Giant"
end in the word but are vermin. The rule is `type === "humanoid" && /giant/`.

### Adding new art

```powershell
tools\ingest-art.ps1          # resize into art/, then regenerate data/art.js
```

Then add the new keys to `ART_PLANNED` in `app.js` if they are not already there, and check
`#/art` — anything planned but absent shows outlined in red with a running count.

Source images and the prompt packs live in `C:\Users\mailp\Box\CODEX IMAGES`.
Prompt packs: the two originals plus `BATCH3-Races`, `BATCH4-Categories`, `BATCH5-Spells`.
⚠ Reuse the house style verbatim from those documents, and keep the sentence placing the
subject on the RIGHT with the LEFT third clear — the original left placement to chance, which
is why nine class bands had to be mirrored afterwards.
⚠ No abbreviations in filenames. `cat-deities.jpg` once produced cat gods; `sub-` was renamed
to `creature-` for the same reason.

---

## What is left

- **194 backdrops to generate**: 45 creature subtypes, 149 spells. Prompts are written and the
  wiring is done — dropping the files in and running the ingest is all that remains.
- `magical beast` and `outsider` have no dedicated creature-type art. Outsiders resolve by
  alignment to celestial/fiend/elemental; magical beasts fall back to the category banner.
- 2,051 feats carry no type and 4,813 items no slot, so they keep the category banner. That is
  a data limitation, not a bug.
- `cat-deities.jpg` is retired and deliberately unshipped.

## Conventions worth keeping

- Every entry page must end up with a backdrop. If you add a bucket, give it a `CAT_FALLBACK`.
- `CAT_ART` is the single source for category art; `CAT_FALLBACK` aliases it. Do not fork it.
- The gallery at `#/art` is the QA surface for art. Use it after every ingest.
