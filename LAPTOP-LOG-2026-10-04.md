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
