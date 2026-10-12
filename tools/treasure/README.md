# Treasure tags

Tags that say which items suit which creatures' treasure, published as `/api/v1/treasure.json`, `treasure-items.json` and `treasure-creatures.json` for the Compendium and Character Generator.

- **Code:** `tools/lib/treasure-tags.mjs` (pure; read its header first). `tools/lib/api-build.mjs` publishes it. `tools/check-treasure.mjs` is the gate (the build runs it).
- **Layer 1 is Paizo's own system** (Ultimate Equipment, Random Treasure): budget words from the stat block's Treasure line, treasure types A-I, creature type -> types.
- **Layer 2 is ours:** routes (`carried`, `hoard`, `victim`, `placed`, `unique`), portability, handling, durability, sizing, role, ethos, themes.
- **Creature profiles are computed** from each stat block (Int, type line, Treasure / Environment / Organization lines, gear and melee lines). No judgment involved.
- **Item classes, bulk, routes, letters are rules.** **Item themes, ethos, role, "would a traveller carry it", class corrections** were decided by *reading each item*, and are stored in `judgments.json` keyed by entry id (the keyword rules are the fallback for any id with no judgment).

## When the Codex data changes

- A new item has no judgment, so it gets the keyword-rule themes. That is fine, but to do it properly: write a chunk file of the new items (see below), read them, and merge.
- An item that disappears leaves a stale id in `judgments.json`; `check-treasure.mjs` fails until it is removed.
- Entry ids are rebuilt when an importer rebuilds the data. After a rebuild, re-key `judgments.json` by name+book (the file stores `n`, the item's name, for exactly this).

## Re-judging items

1. Write chunks: one JSON object per line - `id, name, cat, cls, gp, wt, kit, role, guess, ethosGuess, desc` (the rule suggestions and the first ~260 characters of the description).
2. Read each line and write back `{"id","themes":[<=3],"ethos":[...]}` plus `role` / `kit` / `cls` / `skip` ONLY where you disagree with the suggestion.
3. `node tools/treasure/merge-judgments.mjs <chunkDir> <outDir> --write` (refuses to write unless every id came back exactly once).
4. `node tools/build-generated.mjs` then `node tools/check-treasure.mjs .`

Judge themes by what the item **is and who makes and uses it**, not by words in its text: "boots of water walking" are not nautical because of the water. Most items deserve 0 or 1 theme.
