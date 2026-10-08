# Keeping the Codex repo small — plan (2026-10-08)

## Why now (measured)
- `.git` is **985 MB** (pack 875 MB; 953 MB of blobs over 100 commits since 2026-08-02). GitHub *recommends* repositories stay under 1 GB and **rejects any file over 100 MiB**.
- `data/ask-index.json` is **87.2 MB raw** (24.8 MB gzip / 19.9 MB brotli). It has crept up with every data release and will cross the 100 MiB wall.
- Working tree is 1.7 GB: `art/` 285 MB (4,037 WebP, avg 69 KB), `api/` 326 MB (52,000 small JSON files), `data/` 242 MB.
- More images are coming, so the art path needs a policy before the next batch, not after.

## Where the 953 MB of history comes from
| Share | What | Why it grows |
|---|---|---|
| 499 MB | `art/` (5,700 blobs for 4,037 files) | WebP is already compressed — git cannot delta it, and every re-encode/replace keeps the old blob forever |
| 156 MB | `data/cat/*` (177 blobs) | a handful of 7 MB bucket files are rewritten whole on every import |
| 118 MB | `data/ask-index.json` (12 versions, ~10 MB each) | a GENERATED file committed on every release |
| 142 MB | `api/` (75,000 blobs) | GENERATED from the data, committed on every release |
| 35 MB | `data/index.js` (31 versions) | source of truth — fine |

**About 260 MB (27%) of the history, and the worst per-release growth, is generated output that can be rebuilt from the data.** Art is the other half.

## The plan, in order
### 1. Stop committing generated files (biggest, safest win)
- Generate `api/` and `data/ask-index.json` at **Netlify build time** (`[build] command = "node tools/gen-api.mjs . && node tools/gen-ask-index.mjs ."`, `NODE_VERSION` pinned); add both to `.gitignore`; delete them from the index (`git rm -r --cached`).
- Effect: ~10 MB+ saved per release forever; the 100 MiB file wall disappears for good; `check-api` becomes true by construction.
- Risks and how they are handled: a build failure blocks the deploy (so it is first proven on a **branch deploy** of the same site, never straight on `main`); `gen-ask-index` needs several GB of heap (the branch deploy measures it); local testing needs one extra command (`npm`-style `node tools/build-generated.mjs`).
- Keep `tools/check-ask.mjs` and `check-api` as release gates — they run against freshly generated output.

### 2. Images: a policy and a separate home
1. **One compressor, run before anything is added** — `tools/art-compress.mjs` (sharp): long edge ≤ 1024 px, WebP q≈80 with `effort 6` (AVIF q≈50 where supported, WebP fallback), metadata stripped, plus a 256 px thumbnail for list views. Budget: **≤ 60 KB average, ≤ 150 KB hard cap**; the tool refuses anything over and prints a size report. Never re-encode files already shipped (each re-encode is a new blob).
2. **Art leaves git.** Put images on their **own Netlify site** (e.g. `art.pipsprojects.com`), deployed with the already-authenticated CLI (`netlify deploy --prod --dir art-out`) — only changed files upload (content-hashed), no git history at all, zero owner setup. The Codex keeps only the generated manifest (`data/art.js`, names + sizes). The one code change is the image base URL (plus CSP `img-src`, the service-worker rule, and `check-coverage`).
3. Source files live in the owner's folder (OneDrive already backs it up); the pipeline builds `art-out/` from there.
4. (Alternative if a CDN with no site limits is ever needed: Cloudflare R2 — free tier 10 GB, no egress fees — but it needs an account/token, so it is the fallback, not the default.)

### 3. Shrink the Ask index itself (also makes Ask cheaper and faster)
- 80.8 MB of the 87 MB is `postings` as JSON `[docIndex, tf]` pairs; `ask.mjs` already needed `memory: 4096` because JSON.parse turns tens of millions of tiny arrays into JS objects.
- Re-encode postings as delta-coded varints in a binary file (typed arrays, no per-posting objects): expected **~15–20 MB raw, ~8–10 MB gzip**, parsed in tens of milliseconds, function memory back to ~1 GB. Same BM25 results (`check-ask` must show the same 100/100 and 92/100 — the proof).

### 4. Stop rewriting 7 MB bucket files on every import (medium)
- Shard `data/cat/<bucket>.js` into ~500-entry files (`PF_REG` already merges registrations), so an import touches a few shards instead of whole buckets. Needs a loader change and `check-used`/`check-reachable` updates.

### 5. Optional: shrink the history that already exists
- `git filter-repo` could drop old `api/` and `ask-index.json` versions (−260 MB) and superseded art (up to −150 MB). **This rewrites history and needs a force-push and a fresh clone on the laptop** — outward-facing, so it is only done with the owner's explicit go-ahead, and only after steps 1–2 stop the growth.

## What each step costs / saves
| Step | Effort | Repo growth removed | Risk |
|---|---|---|---|
| 1 build-time generation | small (config + ignore) | ~10–15 MB per release, 100 MiB wall | low (proven on a branch deploy first) |
| 2 art policy + own site | medium | all future image growth | low-medium (CSP + SW + manifest) |
| 3 binary Ask index | medium | index 87 → ~15–20 MB, function memory ÷4 | medium (needs equal `check-ask` results) |
| 4 shard `data/cat` | medium | ~10 MB per import | medium |
| 5 history rewrite | small to run, big to coordinate | −260 to −400 MB once | needs owner OK; laptop re-clone |
