# LAPTOP LOG — 2026-10-04 (live-play session)

> **Desktop: read this first.** Everything done to the Codex from the laptop on 2026-10-04 is recorded here, newest
> entry at the bottom. Sibling logs with the same name live in `pf1e-character-companion` and `campaign-compendium`.
> `~/.claude/` memory does not travel between machines — this file does.

## Why the laptop was used

The owner ran a live game on 2026-10-04 and needed on-the-fly fixes from the laptop to charactergen, compendium,
and (added mid-morning) **codex.pipsprojects.com**. Standing instruction: every change is pushed immediately
(push to `main` = production; Netlify publishes the repo root, **no build step, no test gate**) and logged here.

## Laptop setup

| item | state |
|---|---|
| Local clone | `~/dev/pf1e-codex` at `f583dda0` (v112). Cloned to the Desktop first, then **moved to `~/dev`** per HANDOFF.md — the laptop's Desktop is iCloud-synced (`com.apple.icloud.desktop`), same `.git`-corruption risk the handoff names for OneDrive. |
| Pre-push check | `node --check app.js && node --check sw.js && node --check data/index.js` → **OK** |
| Push access | `gh` as `pfunkmonk`, push: true |
| Live | `https://codex.pipsprojects.com` serving `?v=112` |
| Backend | no Supabase; `netlify/functions/ask.mjs` holds `CODEX_ASK_API_KEY` server-side on Netlify (not needed locally) |

## Found during setup (NOT fixed — owner's call)

- `sw.js` has `var CACHE = "pf1e-codex-v112"` but `var V = "108"`. `V` builds every PRECACHE URL (`app.js?v=108`,
  `data/index.js?v=108`, …) while `index.html` requests `?v=112`, so the precache never matches what the page asks
  for: offline use misses, and installing the SW downloads the ~10 MB index a second time under a dead URL. Online
  use is unaffected. The file's own comment says V MUST match. Last set at `5aaf5757`; v109–v112 bumped CACHE but
  not V. Fix = `var V = "112"` (and bump all three tokens on the next release).

## Change log

| # | time (MT) | commit | change | deploy verified |
|---|---|---|---|---|
| 0 | morning | — | laptop setup above; no code changes | n/a |
| 1 | 10-05 | `45c6f0ec` | **Ask the Codex fixes** (players reported "can't connect to the LLM"). (a) `app.js` reads `/ask` as text and names the real cause from the HTTP status — 429 → "too many questions from this network", ≥500 → "took too long (HTTP n)"; "Couldn't reach the Codex — check your connection" is now ONLY a true network failure. Before, any non-JSON reply (Netlify timeout page, edge 429) landed there. (b) Rate limits raised — they are per IP and a table on one Wi-Fi is one IP: in-function `RATE_LIMIT` 8 → **40** per 5 min; edge `rateLimit` 6 → **15** per 60 s. HANDOFF.md "Cost / abuse guards" updated. No cache-token bump (sw.js fetches app.js no-store; no data changed). | **Yes** — live `app.js` served the new code ~60 s after push; 10 rapid honeypot POSTs all passed (pre-fix, #7 got 429); a real question returned 200 in 18.1 s. Client handler unit-tested against 7 simulated responses (200, JSON 429, plain 429, 502 HTML, 504 text, JSON 500, 404). |

## Evidence gathered (for whoever picks this up)

- Netlify function log for `ask` (Cloud compute → Functions → ask, "Last 2 days"): every Oct 3 invocation completed,
  5–26.5 s each, ~1.4 GB memory. **Zero invocations on Oct 4 before the laptop's probes** — so the failures players hit
  that day never reached the function (consistent with a non-JSON edge/timeout reply, not an Anthropic error).
- The 26,538 ms request on Oct 3 08:37 looks like it hit a ceiling. If timeouts keep showing up as
  "took too long (HTTP 502/504)", the levers are `CONTEXT_CHAR_BUDGET` (200k chars) and `MAX_ANSWER_TOKENS` (3000).
- Burst test, pre-fix: 8 honeypot POSTs → the in-function JSON 429 fired at #7; Netlify's edge `rateLimit` never did.

## HANDBACK TO DESKTOP — 2026-10-05

- Everything is committed and pushed; laptop working tree clean. `git pull` in `~/dev/pf1e-codex` on the desktop.
- Live: `45c6f0ec`, verified above. Site tokens still `v=112`.
- Still open (owner's call, not touched): the `sw.js` `var V = "108"` drift described above — fix on the next real
  release by setting V to the same number as the other three tokens.
- No Supabase involvement for the Codex.

