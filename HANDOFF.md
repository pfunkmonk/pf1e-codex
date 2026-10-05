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

## Known debt — read before changing art resolution

**The resolution chain is written out FIVE times**, and they must agree:

| Where | What it does |
|---|---|
| `entryArtKey()` in `app.js` | the real thing — what a reader actually sees |
| `resolve()` in `tools/size-variants.mjs` | simulates it to size every variant count |
| `resolvesEarlier()` in `tools/check-themes.mjs` | decides which entries reach the theme layer |
| `resolvesEarlier()` in `tools/derive-body-themes.mjs` | decides which entries reach the body layer |
| `chain()` in `tools/check-used.mjs` | walks every entry to see which files a page actually lands on |

**You can now measure the drift instead of hoping.** `node tools/check-used.mjs . --predict 20`
prints `id -> resolved key` as JSON for a stratified sample; load the site, walk those ids, and
compare the key each page actually paints. Last run: **300 sampled, 300 agreed, 0 disagreements.**
Do this after any edit to the chain — it is the only check that compares the tools against the app
rather than against each other.

Every one of them has drifted at least once, and drift is silent — each page still gets *a*
picture, so nothing looks broken:

- `check-reachable` reported 603 false positives after the rules changed under it.
- `check-themes` counted real wolves against `animal-canine`, inflating it 12 → 31 and failing the
  build over a problem that did not exist.
- `size-variants` treated "this key has a file" as "adequately spread" and never noticed
  `creature-aquatic` backing 211 pages.

**The fix, when someone has a clear run at it:** extract the chain into `data/resolve.js` assigning
`window.PF_RESOLVE`, loaded by `index.html` and `eval`-ed by the tools exactly as they already do
with `themes.js`. One implementation, five consumers. It was not attempted during the art work
because every check was passing and a mid-flight refactor of the thing all the checks depend on is
how you end up trusting a green build that is measuring nothing.

Until then: **after editing `entryArtKey`, update the other four in the same commit**, re-run all
checks plus `size-variants` until it reports 0 changes, and finish with the `--predict` diff
above so you know the tools still agree with the app.

---

## JSON API

`https://codex.pipsprojects.com/api/v1/` — the same data as the site, as static read-only JSON, CORS
open, no key. Human docs at `/api/`; the machine-readable manifest is `/api/v1/index.json`.

| Path | What |
|---|---|
| `api/v1/index.json` | manifest: totals, every bucket and category with counts, `dataVersion`, licence notice |
| `api/v1/<bucket>.json` | every entry in a bucket, no body, one entry per line (git-diff friendly) |
| `api/v1/names.json` | `[id, name, bucket]` for everything — one small file for cross-bucket lookup |
| `api/v1/entries/<id>.json` | one entry in full: body text and any tables |
| `api/index.html` | the docs page — GENERATED, so its counts and example can never go stale |

**It is generated. After ANY data change — an importer, a data repair, a rebuild — run**

```bash
node tools/gen-api.mjs .        # writes api/ ; idempotent, only changed files are touched
node tools/check-api.mjs .      # must pass; fails until you have regenerated
```

**and commit `api/`.** It is ~28k files / ~93 MB, but output is fully deterministic (no timestamp, no
locale-dependent sort) so a re-run over unchanged data changes nothing and git sees nothing.

Design decisions worth knowing:

- **Static on purpose.** The site has no backend and no build step; a function would have meant one
  (and a 50 MB bundle limit against ~63 MB of bodies). So the API is files on the same CDN. It is
  therefore PUBLIC and read-only by construction — exactly the data the site already serves.
- **`tools/lib/api-build.mjs` is the only place the API is built.** `gen-api` writes what it returns;
  `check-api` re-derives it and compares. Two copies of that logic would make "generated == committed"
  a comparison of two guesses — the art chain has been written out five times and drifted every time.
- **It exposes exactly what the app does.** The predicate for the hidden "1st Level"…"9th Level" pages
  is lifted out of `app.js`'s `isJunkEntry` rather than re-typed; if that function is reshaped the
  generator fails loudly instead of leaking junk pages into a public API.
- **`check-api` has two halves on purpose.** FRESHNESS (byte-identical to a fresh build) forces a
  regeneration; TRUTH (bodies byte-equal to `data/cat`, table row counts equal `PF_TABLES`, no U+FFFD,
  every id has exactly one file) means a bug in the builder cannot also be a bug in its test. Verified
  by mutation: a truncated body, a deleted file and a stray file are each caught.
- **`gen-api` never deletes** — stale entry files are reported and removed only with `--prune`.
- **Bodies are served RAW and their layout is NOT uniform.** At v73 only ~9% start with the entry name,
  ~44% with a `Source` line, ~47% with something from the original page (a breadcrumb such as
  `Rules Index | GM Screen`, a subtitle, intro prose). I first documented "line one is the name" from
  a small sample and it was false for half the data; the manifest now carries the measured split in
  `totals.bodyLayout`. Consumers should read `name`/`source`/`book`/`facets`, not parse the body.
- **IDs are opaque and stable only while the data is not rebuilt** — the upstream generator that
  minted the originals is not in this repo, and the ids are not derivable from anything. Recovered
  entries have deterministic minted ids (`sha256("pf1e-codex-option|…")[:16]`).
- **No art in the API.** Resolving an entry's art needs the chain, which is already written out five
  times. Adding a sixth copy for a data API was not worth it.
- **51 tables in `PF_TABLES` are keyed to ids no entry has**, so they can be displayed neither by the
  app nor the API. Pre-existing; `check-tables` reports the count.

Headers and redirects for `/api/*` live in `netlify.toml` (open CORS, 5-minute cache, `/api/v1` →
manifest). Licence: the site's existing OGL 1.0a notice travels in the manifest, every list header and
every entry file.

---

## "Ask the Codex" — the AI FAQ (2026-09-28)

`#/ask` in the app, `netlify/functions/ask.mjs` on the server. Answers a plain-English rules question,
grounded ONLY in the Codex's own entries, with those entries always returned as citations so an answer
is never uncheckable. **This is the one deliberate exception to "no backend, no API keys"** — an LLM
key can never live in the browser, so it lives here.

**Setup (one manual step, not yet done as of this writing):** in the Netlify dashboard for this site,
Site configuration → Environment variables → add `CODEX_ASK_API_KEY` (the value is encrypted at rest
by Netlify and is injected only into this server-side function at request time — it is never part of
the deployed client bundle). Until it's set, `/ask` replies with a clean 503 rather than erroring.

**Retrieval is lexical (BM25), not embeddings.** `tools/gen-ask-index.mjs` builds `data/ask-index.json`
(an inverted index over EVERY entry's FULL body, no per-doc character cap, credit paragraph excluded)
from the same data `gen-api` reads. Run it in the same "after any data change" ritual as `gen-api`:

```bash
node tools/gen-ask-index.mjs .   # writes data/ask-index.json (~86 MB; ~24.6 MB gzipped over the wire)
```

Why lexical: PF1e rules content is name-dense and precisely worded, so a corpus-measured term index
beats a vector index for this data and needs no embedding pipeline to keep in sync with every
d20pfsrd batch. Scoring is BM25, OR-style across query terms (any term can contribute; IDF makes a
common word contribute almost nothing on its own — no hand-curated stopword list), plus an exact
entry-name match boost scaled by how rare the name's own words are in the corpus. That boost was
originally a flat bonus matched by raw substring — found and fixed before shipping because it let
"King" match inside "flanking" and "Heir" match inside "their"; matching is now token-boundary. See
the header comments in `gen-ask-index.mjs` and `ask.mjs` for the detail, and memory
`tth-ask-rules-lookup` for the sibling project's version of the AND-vs-OR bug this design avoids.

**Retrieval breadth (2026-09-28, rebuilt the same day it shipped): budget-based, not a fixed count.**
The original version indexed only the first ~3,000 characters of a body and returned a flat top 8 —
correct-feeling in testing, wrong in practice: a real question ("what's the DC to stabilize when
dying?") had its answer in the data all along, ranked 26th and 34th, comfortably outside top 8. Owner
feedback: *"look at the entire codex db (no curated lists, no character limits, etc...) I don't want
to have to ask twice just because it missed something."* Fixed by removing the per-doc index cap
(above) and replacing the fixed count with `CONTEXT_CHAR_BUDGET` in `ask.mjs` (200,000 characters,
~50k tokens): every candidate is pulled in, highest-scored first, until the budget is spent — a broad
question can surface dozens of entries, a narrow one doesn't waste it. A relative-to-top-score cutoff
was tried first to keep narrow questions from padding with noise; measured against six real questions
before shipping, it didn't generalize (predictable for a query with a sharp score cliff, useless for
one that decays smoothly, and would have re-introduced the original miss for a third kind) — removed
in favor of telling the model itself to ignore irrelevant passages, which it does far more reliably
than a lexical score threshold can. **This is still not literally "the entire corpus"** — the corpus
is ~131 MB of body text, far past any model's context window, and literally unlimited would cost
accordingly on every question; the budget is the one disclosed, generous ceiling. `MAX_ANSWER_TOKENS`
is 3,000 (was 500) so a genuinely thorough answer isn't cut off, and the system prompt no longer caps
word count — it now explicitly asks for thoroughness (exceptions, interactions, related options) over
brevity, while keeping the "don't invent a limit that wasn't retrieved" rule from the original design.
This costs and takes meaningfully more per question than the original narrow version — the owner was
told this plainly and confirmed it's what they want.

**Generation:** Claude Sonnet 5 (`claude-sonnet-5`), system-prompted the same way TTH's Ask earned the
hard way (memory `tth-ask-rules-lookup`) for its correctness rules — lead with the rule and its
numbers, always state limits, refuse to invent one that wasn't retrieved — but deliberately DIVERGES
from TTH's brevity mandate (TTH: "faster than looking it up in the book," under 150 words) because
this project's owner asked for the opposite: thorough, not clipped. Don't "fix" this back to TTH's
style — it's a different product with a different stated requirement, not an oversight.

The answer is rendered as light markdown in the app (`fmtAskAnswer` in `app.js`: `#`/`##` headers,
`**bold**`, `- ` lists, paragraphs — escaped first, no library) since a thorough multi-section answer
needs some structure to stay scannable; a flat wall of text with the old `\n` → `<br>` rendering
would not have held up at this length.

**Retrieval review (2026-10-03) — one live miss, four systematic causes.** A 10-question accuracy test of the live
Ask scored 9/10; the miss ("Can I use an immediate action when it is not my turn…") never retrieved the core rule.
Root cause was NOT that one entry: `immediate action` (how people ask) never matched the title `Immediate Actions`
because nothing folded plurals — in the term index or the title boost. Reviewing found three more, all fixed:
1. **No stemming** → `stem()` (plural `s`/`ies`/`es` + `'s` only) in BOTH `tools/gen-ask-index.mjs` and `ask.mjs`
   (hand-synced, like the tokenizer was; **change one → change both → `node tools/gen-ask-index.mjs .`**).
2. **A rule living as a section inside a big entry was invisible** (`Stunned:` inside Conditions ranked 205th;
   `Standard Actions` inside Actions in Combat 63rd). The index now stores each entry's *section terms* (`Term:` leads,
   short headings followed by a `Source` line, title parts split on and/or/`( )`), dropping any heading shared by >40
   entries (`Benefit`, `Special`…); `retrieve()` boosts an entry whose section term is in the question
   (`SECTION_BOOST_SCALE = 1` — 3 lifted whole chapters that ate the budget; tuned on held-out questions, not just the ones that motivated it).
3. **Question scaffolding scored like content** — `happen` had idf 4.2, `how`/`what` 2.6, vs `breath` 3.0, so GM-advice
   pages outranked the Drowning rule (58th). `QUERY_STOP` (a short function-word/question list) is removed from the BM25
   terms ONLY (index untouched; title/section matching still sees every token). This reverses the 09-28 "no stopword
   list" stance — measured, idf alone was not enough.
4. **`break` → skip**: the budget loop stopped at the first entry that didn't fit, so one 168k-char chapter ("Combat")
   ended the list after 3–4 entries. It now skips an oversized entry and keeps filling.

**`tools/check-ask.mjs` is the regression check (run after ANY change to ask.mjs / gen-ask-index.mjs / the data, after
regenerating the index).** 77 natural-language questions; each passes only if a *retrieved* entry's body contains the
sentence that answers it (every sentence read from the source text — a memory-written "10% stabilize chance" was 3.5,
not this ruleset). Before → after: **68/77 → 77/77 retrieved, top-10 54 → 72.** Measure on a held-out set too: the first
version (section boost 3, no stoplist) won the tuning set 43/44 yet LOST held-out recall (31→28) by crowding the budget.
Still weak by nature (lexical): a question whose answer is spread over a huge chapter, and one with only generic words.

**Saved Answers (`#/saved`, 2026-09-28).** "💾 Save this answer" under a result stores
`{id, ts, question, answer, citations, citationsOmitted}` to `localStorage["pf_saved_answers"]` —
same pattern as My Characters (`pf_chars`), works fully offline, nothing sent anywhere to save one.
Capped at 200 (oldest dropped) so it can't fill the origin's storage quota. `resetAppData()`'s
generic `pf_*` wipe already covers it — no separate code needed there, just the confirm text updated
to mention it. `renderAskCites()` is shared between the live result and the saved list so citation
rendering can't drift between the two.

**Cost / abuse guards (2026-09-28):**
- **Netlify's own platform rate limit** (`rateLimit` in the function's `config` export — a real
  edge-enforced feature, docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting, NOT
  something defined in `netlify.toml` for a function): 15 requests/60s per IP (was 6 until 2026-10-04), blocked with a 429
  before the request even reaches this function's code. This is the actual defense against a bot or
  a script hammering the endpoint — the in-function `rateLimited()` below it is a second, much
  weaker layer (state held per warm Lambda container, so a caller spread across cold starts can
  exceed it; kept anyway as defense in depth, effectively free).
- **Raised 2026-10-04 (live game, from the laptop): limits are per IP, and a whole table on one Wi-Fi is ONE IP.**
  The in-function `RATE_LIMIT` was 8 per 5 minutes — 8 for the entire group. Now 40/5 min in-function and 15/60s at
  the edge. Measured the same day: a burst of 8 POSTs got the in-function JSON 429 at #7; the edge limit never fired.
- **The client reads `/ask` as text, not `r.json()`** (2026-10-04). Before, any non-JSON reply — Netlify's own page
  for a function timeout (502/504) or an edge 429 — threw into `.catch` and showed "Couldn't reach the Codex — check
  your connection", which players reported as "can't connect to the LLM". Now it names the real cause from the HTTP
  status; `.catch` is left for genuine network failures. Answers take 5–26 s (function log), so timeouts are plausible.
- **Honeypot + minimum time-on-page** on the client form (`viewAsk` in `app.js`, same pattern as the
  feedback form): a hidden field a script auto-fills, and a submit under 1.2s after the page loaded,
  both rejected server-side before retrieval or an API call — stops a scripted browser filling the
  actual form, though not a bot that skips the form and POSTs `/ask` directly (the rate limit above
  is what stops that one).
- Question length capped (4–300 chars); `max_tokens` capped at 500 on the Claude call; a same-origin
  check on the request's Origin header (trivially spoofable server-to-server, but stops another
  site's page from quietly burning the key through a visitor's browser).
- **None of the above caps total dollars spent — only Anthropic's own limit does that, and only at
  MONTHLY granularity** (the Console has no daily option). Set it at
  console.anthropic.com → Settings → **Plans & Billing → Spending Limits** (organization-wide) or
  **Settings → Workspaces → \<workspace\> → Limits** (scoped to one workspace/key — create a
  dedicated workspace for the Codex's key if you want this isolated from any other project's spend).
  Anthropic alerts at configurable thresholds (e.g. 50/75/90%) before the hard cap hits, at which
  point further calls 429 rather than keep charging. This is a manual dashboard step only the
  account owner can do — nothing in this repo can set it.

**Deliberately NOT under `/api/*`.** That path already carries a public, CORS-open, 5-minute-cached
header block meant for the static JSON API; `/ask` is same-origin-only and per-request dynamic, so it
has its own `netlify.toml` header block (`Cache-Control: no-store`) and its own path.

**Bundling the index into the function (`included_files`) was tried and reverted.** It would avoid the
one HTTP round-trip on a cold start, but broke Netlify's local bundler on this machine (a Windows-only
`EBUSY` copying the 66 MB file) — and since that bundling step also runs at real deploy time, an
equivalent failure there would break every future deploy of the whole site, not just this feature. A
plain `fetch()` of `data/ask-index.json` from the function's own origin measured ~1.2s end-to-end on a
cold container in local testing (retrieval + 8 entry fetches + the real Claude call); if production
latency ever needs improving, retry `included_files` against Netlify's own (Linux) build first — never
assume Windows-local behaviour carries over.

**Local dev:** `netlify dev` (not the plain static server used for everything else) actually runs the
function. No `package.json`/dependencies needed — the function uses only `fetch` and Node built-ins.

---

## AoN coverage audit (2026-09-29) — read before ever trusting "N missing" from a URL-key diff

Asked "what else is missing from the AoN/d20pfsrd scrapes," found `~/dev/aon-database-builder` could
build a full, fresh `pages.jsonl` from the real raw scrape (`C:\Users\mailp\OneDrive\Desktop\AON PAGES
PARSED\START`, 49,000 files — the earlier small `output/` sample in that repo was NOT the full corpus,
don't mistake it for one again) via `python aon_builder.py <START> --output <dir>` (Python at
`C:\Users\mailp\AppData\Local\Programs\Python\Python312\python.exe`). That let d20pfsrd-style rigor
(re-derive names from the raw pages themselves, not guess) replace the book-title spot-check this
started as.

**d20pfsrd: re-ran `d20-match.mjs --snap D:/CODEX/d20-pilot` fresh against the current Codex.** Of
40,123 entry-kind pages, 39,942 are correctly-excluded duplicates and every one of the remaining 181
"held" pages checks out as a genuine duplicate on inspection (exact "same text as the existing row",
or an inverted name form like Shortsword/Short sword). Nothing missing there.

**AoN: an 8-category URL-key diff first claimed 298 items + 6 feats + 2 deities + 18 rules pages
missing. Owner asked to verify it wasn't duplicative of the d20pfsrd import before importing anything
— that check is what found the diff itself was wrong, not the data:**
1. **The item "gaps" were a matching bug, not missing content.** AoN's `ItemName=` query value is
   often a DISAMBIGUATOR for one row of a price table ("Ale (mug)"), not the entry's real name
   ("Ale") — the Codex already had the real entry. Re-deriving each candidate's actual on-page name
   (strip AoN's own pipe-separated category nav chips — see `deeperTraitCat`-style parsing, same
   family of bug as the trait-facet one — then take the first content line) and checking BOTH
   substring directions against every existing item name dropped 298 (of a sloppier 156-unique-page
   count) to **1**, checked against all 3,849 unique item pages this time, not just the original 298.
2. **The feat/rules "gaps" were a silent scrape fallback.** All 6 "missing" feats and all 18 "missing"
   rules pages turned out to be the IDENTICAL page byte-for-byte (same `content_sha256`) — AoN's
   generic category-browse page, returned with HTTP 200 for a query string that doesn't resolve to a
   real entry. Confirmed live (not just in the archived scrape): `FeatDisplay.aspx?ItemName=Augmented
   Summoning` on the real site today also silently falls back to the generic Feats page. **A 200
   status is not proof a page is real — a content-hash collision across "different" candidates is
   the tell.** 1 of 2 "missing" deities was the same story; the other ("Nyarlathotep (Haunter of the
   Dark)") was a real page but a duplicate of the "Nyarlathotep" the Codex already has, reached via a
   third URL alias.
3. **What survived, hand-verified against both the Codex and the FULL d20pfsrd raw archive (zero
   hits in either):** one entry — **Spices** (items, *Adventurer's Guide* pg. 14, seven named spices
   with distinct disease/environment-resistance benefits). Recovered by
   `tools/import-aon-orphans-2026-09-29.mjs` (same id-minting family as `import-typed-orphans.mjs`:
   `pf1e-codex-typed|bucket|name`; same body convention as every other original row — no appended
   license paragraph, the site's blanket AoN attribution already covers it).

**Archetypes and traits: 100%/100%** (1,320/1,320 — AoN's `FixedName` param is already class-prefixed
exactly like the Codex, no ambiguity; traits matches the earlier facet-merge audit). Spells, monsters,
NPCs, and prestige classes were also checked at 100% before the matching-bug fix, so those numbers
already stood. **Net result of the whole audit: the Codex's AoN coverage was already effectively
complete.** The lesson worth keeping for the next one: never trust "N missing" from a raw key diff
without re-deriving names from actual page content and checking for content-hash collisions across
the "missing" set — both of those checks are what turned 324 false alarms into 1 real one.

## Data

All content is static JS assigning `window.PF_*` globals. There is no backend.

| File | Global | Notes |
|---|---|---|
| `data/index.js` | `PF_INDEX` | 10 MB. Rows: `[id,name,slug,rawCat,source,snippet,facets]` |
| `data/meta.js` | `PF_META` | totals, groups, facet vocabularies, the Start Here guide |
| `data/art.js` | `PF_ART` | **generated** — which art files exist on disk |
| `data/tables.js` | `PF_TABLES` | structured tables keyed by entry id, lazy-loaded |
| `data/cat/<slug>.js` | via `PF_REG` | full entry bodies, lazy-loaded per category |
| `data/themes.js` | `PF_THEMES`, `PF_BODY_THEMES`, `PF_VARIETY`, `PF_THEME_FALLBACK`, `PF_NPC_ROLES` | hand-written: every art rule in one place |
| `data/bodythemes.js` | `PF_BODY_THEME`, `PF_BODY_CLASS` | **generated** by `derive-body-themes.mjs` — id → motif, and NPC id → class |
| `data/artplan.js` | `PF_ART_PLAN` | **generated** by `gen-art-prompts.mjs` — the full roadmap; lazy, gallery only |

Cold-start order is fixed by `index.html`: `meta → quickref → index → art → themes → bodythemes → app`.
`themes.js` and `bodythemes.js` must load **before** `app.js`, which reads them at definition time.
`tables.js`, `feattree.js` and `artplan.js` are deliberately NOT on that path.

**The step that produces `data/*.js` in Codex row format is not in this repo**, and its entry ids
cannot be reproduced (they are not `sha256(url)[:16]`, which is what the upstream stages use). Data
changes are therefore made as idempotent repair passes over the built files.

The stages that ARE on this machine, and which the class-option recovery used:

| Stage | Where | What it holds |
|---|---|---|
| raw capture | `Desktop\AON PAGES PARSED\START` | 49,000 archived AoN page exports (`.txt`, each with a `URL:` header). **Nothing was ever scraped by us** |
| `aon_builder.py` | `D:\CODEX\aon-database-builder\` | cleans those into `FINISH\pages.jsonl` (28,432 pages after dedup). Offline, stdlib only |
| `aon_structured_prep.py` | `FINISH\structured\` | types them into spells/feats/traits/... and **quarantines everything it cannot type** |

⚠ **`_quarantine.jsonl` is 129 MB and holds 13,424 pages** — larger than the typed output. Most
are genuinely duplicative index pages, but it is also where the 1,713 class options were found.
Before concluding the Codex is missing something because it "was never captured", grep the
quarantine: the page is usually sitting in it.

### Repairs already applied to the data

- **A SECOND recovery pass, 2026-09-08 — 783 more entries.** Auditing the whole quarantine
  (13,424 pages) turned up more than class options, and a *different* loss besides.

  | What | Count | Where it had been |
  |---|---|---|
  | Mythic path abilities | 404 | quarantined `PathAbilities.aspx` (9 pages) |
  | Mythic path features | 22 | quarantined `MythicPaths.aspx` — Wild Arcana, Fleet Charge, Rally |
  | Eidolon subtypes / base forms | 36 | quarantined `Eidolon*.aspx` |
  | Favors | 5 | quarantined `MagicFavorsDisplay.aspx` |
  | Spells | 125 | **typed correctly, never indexed** |
  | Feats | 165 | **typed correctly, never indexed** |
  | Summon tables | 939 rows | quarantined `MasterSummonList.aspx` |

  `tools/import-typed-orphans.mjs` handles the second kind. `aon_structured_prep.py` sorted these
  into `spells.jsonl` / `feats.jsonl` correctly and the step that built `data/index.js` dropped
  them — the Codex had "Beast Shape I" and "II" but not "III" or "IV", "Summon Monster 1" and "2"
  but not 3-9, and **no "Detect Thoughts" at all**. Bodies come from `<stem>.detail.jsonl`, whose
  `raw` field is already in `data/cat/<bucket>.js` shape.

  ⚠⚠ **Match EXACTLY on the name; never fuzzily.** A fuzzy pass was wrong in both directions: it
  called "Beast Shape III" a variant of "Beast Shape I" (it is a different spell), and called all
  1,320 archetypes missing because the Codex stores them class-prefixed
  ("Aerochemist" → "Alchemist Aerochemist").

  ⚠⚠ **MAGIC ITEMS ARE EXCLUDED ON PURPOSE.** 166 look missing by name and every one is already
  present under a mangled VARIANT name carrying the full parent body — "Bag of Tricks" lives as
  "Bag of Tricks Aquamarine", "Cloak of Resistance" as "Cloak of Resistance1". Importing them
  would have added 166 duplicate pages. The test that caught it: does any existing item body's
  FIRST LINE equal the candidate's name?

### Summon tables live on the spell they belong to

AoN prints the whole 9-level creature list on every Summon Monster page; the Codex had captured it
onto "Summon Monster 1" and "2" only, all 105 rows on each, and 3-9 did not exist. Each of the 18
summon spells now carries the slice it can use — Summon Monster N gets levels 1..N — plus the
deity-specific additions for its level from `MasterSummonList.aspx` (939 rows, previously nowhere).
Rebuild with `tools/import-summon-tables.mjs`. The complete 9-level lists live in
`tools/sources/summon-lists.json`, a file the tool only ever READS — it used to take them from
Summon Monster 1's own table, which it then overwrote, so a second run sliced the slice and Summon
Monster 2-9 all showed only level 1. That shipped in v71 and was fixed in v73. `tools/check-tables.mjs`
now asserts that Summon Monster N lists exactly levels 1..N; it fails with 16 problems on the broken
data, so it would have caught it.


- **1,713 CLASS OPTIONS recovered (2026-09-08).** The Codex was never scraped from AoN — it was
  built from a folder of archived page exports, and the structuring step turned each PAGE into
  entries. AoN publishes class options two ways, and only one survived that:

  | AoN shape | Example | Result |
  |---|---|---|
  | one detail page per option | `KineticistTalentsDisplay.aspx?ItemName=Kinetic+Fist` | captured individually — **in the Codex** (278 wild talents, 75 bloodlines, 24 stares) |
  | every option on ONE page | `AlchemistDiscoveries.aspx` | the listing page is the ONLY copy, and it looks exactly like a duplicative index (`Feats.aspx`, `Monsters.aspx?Letter=All`) — **quarantined, content lost** |

  So the bucket held zero discoveries, rogue talents, witch hexes, rage powers or masterpieces.
  `tools/import-class-options.mjs` reads those pages back out of
  `…/FINISH/structured/_quarantine.jsonl` (nothing is fetched from the network) and rebuilds them.
  Idempotent — a second run adds nothing. **Re-run it after any data rebuild, or the options
  disappear again.** Options went 835 → 2,970; the index 25,926 → 28,356 (28,347 of them visible in the app).

  ⚠ Two traps found while writing it, both of which silently DELETE content:
  - **Dedup on name alone drops real options.** "Charm" and "Healing" are cleric domains *and*
    witch hexes; "Familiar" is a magus arcanum *and* a rogue talent; "Tremorsense" is an evolution
    *and* a druid power. Scoped to `category + name`, which also keeps the tool idempotent.
  - **The Unchained lists are NOT duplicates.** 32 of the 151 shared rogue-talent names carry
    rewritten text, so merging them into the core list would have served Rogue (Unchained) players
    the chained rules. They get their own categories.


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

`art/<key>.webp`. **3,959 images, 270.6 MB — every planned key is drawn.** The extension lives in exactly one place —
`ART_EXT` in `app.js` — because it appears in both the gallery and `applyArt`.

**WebP since v57.** The library was re-encoded from JPEG at q78 with no resize: 226 MB → 171 MB,
27% off, visually identical. That headroom is what makes the theme build-out affordable — per-entry
art for 25,926 entries is ~86 generation batches and was never on the table.

### Two lists, two questions — do not merge them

| | |
|---|---|
| `ART_PLANNED` in `app.js` | every key we INTEND to have. **Derived** from `data/artplan.js`. Drives the gallery. |
| `ART` from `data/art.js` | what is actually ON DISK. Generated. Gates resolution. |

⚠ `ART_PLANNED` used to be a literal list of 1,652 keys inside `app.js`, and it went stale the
instant the theme system began generating keys — the gallery would have shown 1,652 of 3,784 and
reported the other 2,132 as not even planned. It is now generated into `data/artplan.js` by
`gen-art-prompts.mjs` and **loaded lazily by the gallery alone** (~84 KB, no business on the
cold-start path). Nothing about the roadmap is hand-maintained any more.

Conflating these is what made the gallery report "452 of 452 generated" when a third had not
been drawn: it inferred presence from `img.onerror`, which never fires for lazy-loaded images
below the fold. Presence is now a data question answered by the manifest.

### Class options fall back to the OWNING CLASS

The recovered options have no `opt-*` art of their own, and without a fallback all 1,713 landed on
`cat-classoptions` — one picture for 1,713 pages, the same failure that once put 2,010 feats on a
single image. `entryArtKey` now ends the options branch with `optionClassArt(row)`, which reads the
`cls` facet the importer writes and returns that class's `arch-<class>` scene set (all 39 classes
have one). "Rogue (Unchained)" has no set of its own, so the parenthetical is dropped and the base
class used.

It is DERIVED from the facet rather than a second rawCat table, so importing another option family
needs no art wiring at all — give the rows a `cls` and they inherit their class's scenes.

⚠ Those sets serve archetypes too, so the added load pushed them well over target
(`arch-summoner-2` backed 88 pages). `size-variants` grew 18 of them, which is what **BATCH15's 128
prompts** are. Until that art lands the counts are safe because `varietyKey` falls back to hashing
within what is ON DISK.

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

For **named** art (one image, one entry) add the keys to the pack's named list; the plan regenerates. **Theme** keys
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

## Art round 2 (2026-09-29) — target tightened to ~14 pages/image, 2,165 more prompts commissioned

Retargeted with `node tools/size-variants.mjs --target 14 --apply` (was 20 — the "do not go below
~20" line below is now superseded). Delivered as `PF1e-Codex-Art-Prompts-BATCH17` … `BATCH24` to
`C:\Users\mailp\Dropbox\pipsprojects-handoff\CODEX ART PROMPTS` (BATCH10–16 from the previous round
were only ever delivered as prompts there too — check that folder before assuming either round's
images exist yet; `art-packs/BATCH10-24-keys.json` in the repo are pending manifests, not proof of
ingestion). BATCH24 is hand-written, not generator output — see the gap below.

Three things worth knowing before the next round repeats this work:

- **`DUMP_NEEDS` (the env var `gen-art-prompts.mjs` uses to report shortfalls) only sees two of the
  three art-declaration systems** — named art and `data/themes.js` keyword themes. It is blind to
  the third, **body motifs** (`tools/art-scenes-motifs*.mjs`, `BODY_MOTIF_SCENES` in
  `art-scenes-spells.mjs`): a motif shortfall only ever produces a hard "REFUSING TO GENERATE" with
  no NEEDS entry, so a `DUMP_NEEDS` pass alone will silently miss a real gap. Diagnose a refusal
  with `node tools/gen-art-prompts.mjs ... > out.log 2>&1` (redirect order matters — `2>&1 > out.log`
  drops stderr) and read what actually printed, not just the NEEDS dump.
- **`PRESENT` (what the generator treats as "already have it") only checks `data/art.js`, not
  anything already committed to an `art-packs/*.json` manifest.** A plain re-run after committing a
  batch's keys will re-list every prompt from every prior round, cumulative, forever. To get a
  "new-only" plan: temporarily merge all existing pack keys into a scratch copy of `data/art.js`,
  generate to a throwaway `OUT` dir, then revert `data/art.js` and confirm with `git diff --stat --
  data/art.js` that it's byte-identical to what's committed.
- **5 small variety categories have no generator batch section at all** (3rd-party drawbacks,
  3rd-party traits, the clockwork and illumination spell schools, the tools trait) — not a bug,
  just never wired. BATCH24 covers them by hand, in the house style, so a future generator pass that
  adds support for them should recognize those 10 keys as already covered rather than re-commission
  them.

Also found and fixed while closing out `check-coverage`: 5 stale keys in the old `BATCH10-keys.json`
(`theme-feats-fire-13`…`-17`) that the target=14 resize orphaned (that theme shrank 17→7 variants) —
trimmed from the manifest; skip generating them if you haven't already.

---

## Status — the art programme is COMPLETE (baseline below is the v72 snapshot — see round 2 above)

**All 3,959 images are drawn, ingested and live** (v72). Named art finished at 1,652; the
seven theme batches added 2,132; the class-option recovery added the last 175. Every pack regenerates to **0 prompts**, every
gallery group reads "N of N", and `check-coverage` reports nothing commissioned that is not drawn.

Measured against the real chain: **3,759 of 3,959 files (94.9%) are shown on at least one of the
28,356 pages, and no entry anywhere is without art.** The ~200 never shown are the older facet sets
the body-motif layer now catches first (all 22 `opt-wild-talents`, most `trait-<category>`, the
`hazard-<category>` sets). They are kept deliberately as a safety net if a motif regex is ever
narrowed — `check-used` will list them, and that is expected, not a defect.

Worst-case load is now ~30 pages per image, down from 2,010 (pre-round-2; round 2 retargets to ~14
pages/image — see above, count not yet re-measured post-round-2 since those images aren't ingested
yet). The one deliberate exception is `class-cavalier` at 55: those are the cavalier orders, and
giving all of them cavalier art is correct.

⚠ **The 1,652 batch-1..9 originals are 1600x900; everything newer is 1280x720.** Their source PNGs
are still in the Box folder, so a plain ingest leaves them alone. `--replace` would silently
downscale the entire library — never pass it without meaning to.

### If you commission more art

Batches and their `BATCHnn-keys.json` manifests live in the Box folder
`C:\Users\mailp\Box\CODEX IMAGES` (write it with real backslashes — an earlier edit of this file
lost them to a shell heredoc). Ingest picks the manifests up automatically; `--keys` is only needed
to restrict to one batch. Generation runs about 12 hours per 300 images.

**Do not go below ~20 pages per image** — it costs several batches for a difference no reader
perceives. Spend it on named art instead. And never commission per-entry art for all 25,926
entries: that is ~86 batches. **(Superseded by round 2, 2026-09-29 — retargeted to ~14. The user
made this call explicitly this round; do not revert it on your own read of this older note.)**

### The seven checks, and what each is for

```bash
node tools/check-themes.mjs .                              # tables sane: not too broad, not dead
node tools/check-reachable.mjs .                           # no art on disk that nothing CAN request
node tools/check-coverage.mjs . "…/Box/CODEX IMAGES"       # nothing requested that nobody drew
node tools/check-used.mjs .                                # no art that nothing ACTUALLY shows
node tools/check-tables.mjs .                              # tables on a page say the right thing
node tools/check-api.mjs .                                 # the JSON API is fresh and true to the data
node tools/check-guide.mjs .                               # Start Here links, counts, intro copy
```

`check-reachable` and `check-used` are not the same question. The first is structural — could the
resolver ever ask for this key? The second walks all 25,926 entries and asks which files a page
actually lands on. A key can be perfectly reachable and still never win, because a more specific
candidate always beats it. That is how the older facet sets (`opt-wild-talents`, `trait-<cat>`,
`hazard-<cat>`) went quiet once the body-motif layer started catching their entries first.

`check-coverage` is the one that catches the expensive mistake. The other two cannot see a key the
resolver will ask for that is neither drawn nor in any pack — a gap that stays invisible until a
page quietly falls back months later.

⚠ **Do not size variant counts by hand.** `ceil(claimed / 20)` is wrong: variants are assigned by
HASH, so the split is random, not even — 183 rings over 10 images averages 18 but peaks near 28.
Run `node tools/size-variants.mjs .` then `--apply`, **repeatedly until it reports "converged
after 1 round"** — one pass can leave work behind. Then re-run `gen-art-prompts.mjs`.

### Spells match on the STAT BLOCK and the full DESCRIPTION, not the name

Spell names are poetry — "Aphasia", "Blush of Youth" — so name matching alone reached only 44%.
But the index snippet opens with the stat block: `School enchantment (compulsion) [mind-affecting]`.
Subschool and descriptors are **authored categories**, far more reliable than any guess at a name,
and matching them took coverage to **73%**. Aphasia lands on `charm-mind` off `(compulsion)` alone.

Then a third layer, because the snippet is only ~200 characters and stops before the prose.
"Blush of Youth" is a page about a blood ritual worked by a circle of secondary casters; from the
index it is nothing but "necromancy". The full bodies live in `data/cat/<bucket>.js` and average
1,458 characters, and matching visual motifs in them places another **339 spells** — taking spell
coverage past **85%**. `ritual-circle` alone claims 59 spells spanning necromancy, conjuration
AND transmutation: a motif no school-based fallback could ever group.

Bodies are lazy-loaded and `applyArt` runs before `loadCat` returns, so this CANNOT be matched at
runtime without blocking the render or swapping the picture out from under the reader. It is
precomputed instead:

```bash
node tools/derive-body-themes.mjs .      # rewrites data/bodythemes.js (12 KB, id -> motif)
```

**Re-run it after editing a motif regex or after any data refresh**, then re-run size-variants and
gen-art-prompts. Motifs rank BELOW the stat block deliberately: subschool and descriptors are
authored categories, prose motifs are inferred, and a spell that mentions blood once is not about
blood.

Body motifs now cover **all five large buckets** — 3,830 entries in total:

| bucket | placed by description | signal |
|---|---|---|
| traits | 1,427 | backstory prose (category says only "Social" or "Region") |
| items | 1,115 | the `Category` label, finer than the rawCat facet |
| monsters | 740 | the `Environment` line — habitat |
| spells | 339 | subschool and descriptors, then prose |
| feats | 209 | the Benefit line |
| options | 492 | the `Element` and `Type` fields |
| hazards | 305 | the delivery `Type` — injury, ingested, inhaled, contact |

**4,627 entries in total.** A body-motif row may carry a 4th field naming an EXISTING art key to
reuse instead of commissioning new art: the kineticist elements borrow `creature-fire`,
`creature-water`, `creature-air` and `creature-earth`. When the reuse target is itself a variety
set, the borrowed pages hash across it and size-variants grows that set to cover **both**
populations — otherwise 45 fire talents would have piled onto one elemental image.

⚠ **ARCHETYPES were measured and deliberately left alone.** Name themes reach only 20% of 1,320,
and the parent class band they would displace is already the right picture — an Alchemist archetype
should look like an alchemist. A motif must be MORE specific than the fallback it displaces; at 20%
this one is not, so it would trade good art for a guess four times out of five.

### NPCs reuse art we already own

NPCs were the last bucket on a pure hash — `npc-1..N` assigned at random, which is exactly what it
looked like. They have two signals and both point at existing images: their stat block names a
class ("Halfling commoner 4") and their name states a job ("Aldori Swordlord", "Besmaran Priest").
**405 of 487 now resolve to art the Codex already owns**, and only six roles needed anything new —
sailor, merchant, commoner, tavern, scholar, tradesman.

Order is class, then role, then the `npc` set. Step one deliberately ignores the NPC classes
(commoner, expert, aristocrat, warrior, adept): CLASS_INHERIT maps commoner to rogue, which would
hand an *Accomplished Angler* a rogue portrait. Those fall to the role rules, where the name says
"angler" and gets a tradesman. The `npc` set shrank from 48 back to 12 as a result.

⚠ **Each bucket needs its own text preparation, and getting it wrong is silent.** `matchText()` in
derive-body-themes.mjs:
  - FEATS: cut the "Combat Stamina" block. It is appended verbatim to 320 of the 725 stragglers and
    swamps every real signal.
  - ITEMS: cut everything from "Construction Requirements". That section lists the SPELLS NEEDED TO
    CRAFT the item, not what it does — it tagged Akhentepi's Armor as healing-item because crafting
    needs *cure critical wounds*, and three suits of armour as summon-item for *summon monster I*.
    A recipe is not an object. The header is kept, because the Category label lives there.
  - SPELLS: cut everything before "Description" (the stat block is handled by the snippet rules).

**Audit new motifs against real matches before trusting them** — print the matched text in context.
Both faults above looked perfectly healthy in the summary counts.

If a bucket has structured data in its text, match on that before inventing name keywords — and if
its snippet is truncated, the full body is worth a precompute.

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
