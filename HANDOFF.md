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

`art/<key>.webp`. **1,652 images, 171 MB.** The extension lives in exactly one place —
`ART_EXT` in `app.js` — because it appears in both the gallery and `applyArt`.

**WebP since v57.** The library was re-encoded from JPEG at q78 with no resize: 226 MB → 171 MB,
27% off, visually identical. That headroom is what makes the theme build-out affordable — per-entry
art for 25,926 entries is ~86 generation batches and was never on the table.

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
traits     trait-<category>
feats      feat-<name> -> THEME -> feat-scene-<n> -> feat-<type> -> cat-feats
items      item-<name> -> THEME -> rawCat variety (weapon/armorset/artifact) -> rawCat art
           -> body slot -> item-wondrous-<n> -> item-scene-<n> -> item-generalstore
spells     spell-<name> -> school-<school>
monsters   race-<name> -> creature-<subtype> -> type-<t> (dragons and outsiders split on
           alignment) -> cat-monsters
deities    deities-pantheon
```

### Keyword themes (`data/themes.js`)

A layer between named art and the category fallback. Before it, **one image backed 2,010 feat
pages** and another backed 1,931 item pages. Themes match words that recur across many entries
(`trip`, `metamagic`, `sneak attack`), so a page gets art about what it actually does without
commissioning 25,926 pictures.

Each row is `[key, nameRegex, textRegex, variants]`. Name is tried first across the whole table,
then text — names are precise ("Improved Trip"), body text is chatty. `variants` images share a
key and are picked by hashing the entry id: arbitrary, but the same on every visit.

⚠ **Table order IS the mechanism — most specific first.** "Improved Trip" matches both `trip` and
`weapon-training`; it only resolves correctly because `trip` is listed first. A broad theme placed
high silently steals hundreds of entries from everything below it, and nothing looks broken
because every page still gets *a* picture.

```bash
node tools/check-themes.mjs .      # fails if a theme is too broad, dead, or under-varied
```

That guard is not optional bookkeeping. The first draft of `weapon-training` also matched the bare
adjectives improved/greater/master/advanced and quietly claimed 139 unrelated feats; the check
caught it, and caught six undersized variant counts on its first run. It also prints how much art
each bucket still owes, so batch sizes are measured rather than guessed.

Theme keys are gated on the `ART` manifest, so declaring a theme changes nothing visually until
its images exist — 3,336 unnamed feats would otherwise fire a 404 apiece.

### Variety sets

Art assigned by hashing the entry id: arbitrary, but identical on every visit. **Every set's size
is declared once, in `PF_VARIETY` in `data/themes.js`** — they used to be scattered across three
files, which is why `check-reachable` had 40 and 12 hard-coded and drifted out of step with the app.

Raising a count is safe: each key is gated on the manifest and falls through to the previous
candidate, so a number can be raised *before* the art exists. **Lowering one strands art on disk
that nothing references.** `item-weapon` and `item-armorset` keep their original 1..6 keys as an
ungated fallback beneath the expanded set, so the expansion could ship before the new art.

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

Both the prompt pack and the ingest read `data/themes.js`, so what we commission and what the app
looks for cannot drift apart:

```bash
# 1. write the pack (REFUSES to run if any declared theme lacks a scene description)
DOCX_MODULE=file:///…/node_modules/docx/dist/index.mjs \
  node tools/gen-art-prompts.mjs . "C:/Users/mailp/Box/CODEX IMAGES"

# 2. ingest what came back — resize, WebP, verify each file decodes
SHARP_MODULE=file:///…/node_modules/sharp/dist/index.mjs \
  node tools/ingest-art.mjs --src "C:/Users/mailp/Box/CODEX IMAGES" \
                            --keys "C:/Users/mailp/Box/CODEX IMAGES/BATCH10-keys.json"

# 3. refresh the manifest and re-check
node tools/gen-art-manifest.mjs . && node tools/check-themes.mjs . && node tools/check-reachable.mjs .
```

`tools/ingest-art.ps1` is **gone** — it used GDI+, which cannot write WebP, so it would have
produced `.jpg` files the app can no longer request.

⚠ The ingest **skips keys already in `art/` unless you pass `--replace`.** The source PNGs for
batches 1–9 are still in the same folder, so without that guard a routine run would silently
downscale the entire 1600×900 library to the new 1280×720 target.

⚠ `sharp` and `docx` are deliberately NOT repo dependencies. This repo has no `package.json` on
purpose — Netlify publishes straight from the root, and adding one risks turning a static deploy
into a build. Install them anywhere and point `SHARP_MODULE` / `DOCX_MODULE` at them; ESM ignores
`NODE_PATH`, so an explicit path is the only thing that works.

**Resolution policy.** Batches 1–9 were generated and stored at 1600×900. From batch 10 the
prompt packs ask for **1280×720**, which is ~32% smaller on disk and still comfortably above the
~904 CSS px the band actually renders at (`#main` is `max-width: 1000px`). Do not re-encode the
existing set to match: it would shrink the working tree while adding a fresh copy of every blob to
git history, so the clone gets *bigger*. Only new art changes size.

For **named** art (one image, one entry) add the keys to `ART_PLANNED` in `app.js`. **Theme** keys
need no such edit — `themes.js` is their plan, and `gen-art-prompts.mjs` emits a `BATCH<n>-keys.json`
that the ingest checks against. Then check `#/art`, where anything planned but absent shows
outlined in red with a running count.

Source images and the prompt packs live in `C:\Users\mailp\Box\CODEX IMAGES`.
Prompt packs: the two originals plus `BATCH3` … `BATCH10-Feats` (325 prompts: 195 theme images,
37 general feat scenes, 93 named feats).
⚠ Reuse the house style verbatim from those documents, and keep the sentence placing the
subject on the RIGHT with the LEFT third clear — the original left placement to chance, which
is why nine class bands had to be mirrored afterwards.
⚠ No abbreviations in filenames. `cat-deities.jpg` once produced cat gods; `sub-` was renamed
to `creature-` for the same reason.

---

## What is left

**Named art is complete at 1,652 images.** The open work is the theme build-out.

### Theme build-out (in progress)

Measured pressure, not guesswork — run `node tools/check-themes.mjs .` for current numbers.

| Batch | Content | Images | Status |
|---|---|---|---|
| 10 | Feats — theme art, general scenes, 93 named | 433 | **pack written** |
| 11 | Items, object themes + body slots | 290 | **pack written** |
| 12 | Items, variety sets + 93 named magic items | 313 | **pack written** |
| 13 | Spells — 140 theme + 106 school scenes | 190 | **pack written** |
| 14 | Monsters — themes, types, 101 subtype scenes, hazards, stragglers | 278 | **pack written** |
| 15 | Traits, class options, archetypes | 286 | **pack written** |
| 16 | Rules (141), NPCs (36), the last 163 deities | 301 | **pack written** |

**All seven packs are written — 2,091 prompts, about 84 hours of generation.** Packs and their
`BATCHnn-keys.json` manifests live in `C:UsersmailpBoxCODEX IMAGES`. Ingest picks the
manifests up automatically; `--keys` is only needed to restrict to one batch.

Once they land, **every page in the Codex is backed by an image serving at most ~30 pages**, down
from 2,010. The one deliberate exception is `class-cavalier` at 45 — those are the 37 cavalier
orders, and showing all of them cavalier art is correct, not a defect.

### The three checks, and what each is for

```bash
node tools/check-themes.mjs .                              # tables sane: not too broad, not dead
node tools/check-reachable.mjs .                           # no art on disk that nothing requests
node tools/check-coverage.mjs . "…/Box/CODEX IMAGES"       # nothing requested that nobody drew
```

The third is the one that catches the expensive mistake. The other two cannot see a key the
resolver will ask for that is neither drawn nor in any pack — a gap that stays invisible until a
page quietly falls back months later.

⚠ **Do not size variant counts by hand.** `ceil(claimed / 20)` is wrong: variants are assigned by
HASH, so the split is random, not even — 183 rings over 10 images averages 18 but peaks near 28.
Run `node tools/size-variants.mjs .` then `--apply`, **repeatedly until it reports "converged
after 1 round"** — one pass can leave work behind. Then re-run `gen-art-prompts.mjs`.

### Spells match on the STAT BLOCK, not the name

Spell names are poetry — "Aphasia", "Blush of Youth" — so name matching alone reached only 44%.
But the index snippet opens with the stat block: `School enchantment (compulsion) [mind-affecting]`.
Subschool and descriptors are **authored categories**, far more reliable than any guess at a name,
and matching them took coverage to **73%**. Aphasia lands on `charm-mind` off `(compulsion)` alone.

If a bucket has structured data in its text, match on that before inventing name keywords.

⚠ **size-variants only ever GREW a count, so repeated --apply runs ratcheted.** An unlucky hash
split bumped a theme, the next run measured the new split and bumped again — `cold` ended up with
7 images for 15 pages. It now resets each count to what its claim justifies before growing, floored
at whatever is already drawn so art is never stranded. **It is idempotent now: a second --apply
reports 0 changes.** If it does not, something is wrong.

⚠ **Existing art is not the same as adequately-spread art.** The sizer originally treated "this
key has a file" as "fine" and so never noticed `creature-aquatic` backing 211 pages — worse than
anything in items. Any single image can be overloaded; the sizer now routes subtype art through
variety sets like everything else.

⚠ **Batch 10 must be regenerated before it is used.** Feat theme art grew 209 → 288 when the 549
"Combat Stamina" rules entries started sharing the feat theme table — more pages on the same
themes means more variants. The added keys are new variant NUMBERS, so any art already generated
from the old pack stays valid; the pack simply needs re-emitting to pick up the extra 79.

⚠ **Do not size variant counts by hand.** `ceil(claimed / 20)` is wrong: entries are assigned to
variants by HASH, so the split is random, not even — 183 rings over 10 images averages 18 but
peaks near 28. The first items pass left 93 images over target, the worst backing 56 pages. Run:

```bash
node tools/size-variants.mjs .            # report what the counts should be
node tools/size-variants.mjs . --apply    # write them into data/themes.js
```

Re-run it until it reports "converged after 1 round" — a single pass can leave work behind. Then
re-run `gen-art-prompts.mjs` so the packs match the counts.

Once batches 10-12 land, **no image in feats or items backs more than 23 pages** (the single
exception is `item-technology`, a rawCat image with no variant knob). That is down from 2,010.

⚠ **Do not size variant counts by hand.** `ceil(claimed / 20)` is wrong: entries are assigned to
variants by HASH, so the split is random, not even — sizing 183 rings across 10 images gives an
average of 18 but a worst case near 28. The first pass at items left 93 images over target, the
worst backing 56 pages, and it also revealed that batch 10 had been undersized. Run:

```bash
node tools/size-variants.mjs .            # report what the counts should be
node tools/size-variants.mjs . --apply    # write them into data/themes.js
```

It runs the real resolution chain over every entry, raises whatever is over target, and repeats
until it converges. Re-run `gen-art-prompts.mjs` afterwards so the packs match.

Target is **no image backing more than 20 pages**. Going below that costs several more batches for
a difference no reader can perceive; the budget is better spent on named art for entries people
actually look up. Do **not** commission per-entry art for all 25,926 entries — that is ~86 batches
(~6 weeks of generation) to improve pages nobody visits.

Everything below is a known limit, not outstanding work.

- `magical beast` and `outsider` have no dedicated creature-type art. Outsiders resolve by
  alignment to celestial/fiend/elemental; magical beasts fall back to the category banner.
- 2,051 feats carry no type and 4,813 items no slot, so they keep the category banner. That is
  a data limitation, not a bug.
- `creature-chaotic`, `creature-good` and `creature-lawful` exist but are **structurally
  unreachable**: precedence always finds a more specific family first, so no monster ever
  resolves to a bare alignment subtype. Only `evil` wins, and only for 7. Harmless, ~450 KB.
  `tools/check-reachable.mjs` reports them; that is expected, not a regression.
- `cat-deities.jpg` is retired and deliberately unshipped.

### Slug rules must agree everywhere

`artKey()` in `app.js`, the prompt packs, and `tools/` must slug names identically. Apostrophes
are **dropped**, not turned into separators: `Bull's Strength` → `bulls-strength`. When these
disagreed, the art for that spell existed on disk and was simply unreachable — the app looked
for `spell-bull-s-strength` forever and silently fell back to the school image.

Run after any art or data change:

```bash
node tools/check-reachable.mjs .    # every entry-derived art file must be reachable
```

## Conventions worth keeping

- Every entry page must end up with a backdrop. If you add a bucket, give it a `CAT_FALLBACK`.
- `CAT_ART` is the single source for category art; `CAT_FALLBACK` aliases it. Do not fork it.
- The gallery at `#/art` is the QA surface for art. Use it after every ingest.
