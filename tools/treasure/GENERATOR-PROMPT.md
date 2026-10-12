# Prompt: build a creature-aware treasure generator on the PF1e Codex treasure tags

Paste everything below this line into the generator session.

---

You are building (or upgrading) a **Pathfinder 1e treasure generator** that produces treasure lists appropriate to the creature(s) that hold them. A bear in the woods must not have a ladder, but may have gold or gear left by an adventurer it killed. A dragon's pile should look like a dragon's pile; a sahuagin raiding party should carry weapons and loot from ships.

All the creature knowledge and item knowledge you need already exists as **tags in the PF1e Codex's public JSON API**. Your job is to consume those tags faithfully. **Do not re-derive, scrape, or hard-code your own item/creature classification, and do not modify the Codex repo.** If you believe a tag is wrong, collect the case (id, name, tag, why) and report it to the owner; do not patch around it silently.

## 1. Where the data lives (read-only, public, CORS open, no key)

Base URL: `https://codex.pipsprojects.com/api/v1/`  -  static JSON on a CDN, `Cache-Control: public, max-age=300, must-revalidate`.

| File | What | Size |
|---|---|---|
| `treasure.json` | **The vocabulary. Fetch and read this first.** Every tag's meaning, Paizo's tables, themes and the creature tags that attract them, flags, caveats, `howToUse`. | 14 KB |
| `treasure-items.json` | `{dataVersion, count, items:[…]}` - 8,105 items | 2.6 MB (~310 KB brotli) |
| `treasure-creatures.json` | `{dataVersion, count, creatures:[…]}` - 7,553 stat-blocked monsters | 3.0 MB (compresses well) |
| `entries/{id}.json` | The full Codex entry (raw `body` text and any `tables`) for any item or creature id | small |
| `names.json` | `[id, name, bucket]` for every Codex entry (51,994) | for name lookup |
| `https://codex.pipsprojects.com/api/` | Human-readable docs, including a worked example | |

Shapes:

```json
// item
{"id":"475ac0422e830335","name":"Bracers of Antiquity","category":"Magic Equipment","book":"Chronicle of Legends",
 "tags":["bulk:pocket","class:wondrous","handling:wear","letter:G","letter:H","letter:I","magic:magic","role:caster",
         "route:carried","route:hoard","route:victim","slot:wrists","state:durable","theme:arcane","theme:scholarly","value:unpriced"],
 "wt":1}                                  // optional: pr (price, gp) | bonus (+N, for enchantments) | wt (lb)
// creature
{"id":"547525f126ec30bf","name":"Goblin","book":"Pathfinder RPG Bestiary",
 "tags":["budget:npc-gear","culture:goblinoid","ethos:unholy","habitat:coastal","habitat:forest","habitat:plains","hands:yes",
         "lair:community","letter:A","letter:B","letter:D","letter:E","letter:F","letter:G","letter:H","mind:average",
         "route:carried","route:hoard","route:victim","size:Small","style:martial","subtype:goblinoid","type:humanoid","uses-items"],
 "cr":0.333,"int":10}                     // optional: cr, int
```

**Loading:** fetch the three treasure files once, cache them (IndexedDB / disk / memory) keyed by `dataVersion`, and build `Map<tag, Set<id>>` indexes. 8k items and 7.5k creatures are trivial to filter in memory. Entry ids are stable until the Codex data is rebuilt; **store id AND name** with anything you persist, and re-resolve via `names.json` if an id misses. Creature names follow the source books and are inconsistent: Bestiary inversions such as `"Bear, Black"` and `"Skeleton, Troll"` sit beside plain names such as `"Ancient Red Dragon"` and `"Goblin"` - match user input against both word orders with a token match, then confirm by id.

## 2. The model in one paragraph

Two layers. **Layer 1 is Paizo's own system** from *Ultimate Equipment* (Random Treasure): each creature has a **budget word** from its stat block's Treasure line, and a set of **treasure types A-I** from its creature type; each treasure type says what *kind* of thing the treasure is made of. **Layer 2 is our expansion**, because Paizo's letters never say whether a creature could actually *have* an item: four **routes** by which an item reaches a creature, plus portability, handling, durability, sizing, role, ethos, and 29 **themes** matched to the creature's habitat, culture, element and ethos. Every tag is a namespaced string (`class:weapon`, `route:victim`, `theme:nautical`); filter with `includes()`.

### Paizo letters (verbatim from `treasure.json`)
A Coins · B Coins and gems · C Art objects · D Coins and small objects (potions, rings, scrolls, wands) · E Armor and weapons · F Combatant gear (armor, coins, potions, weapons, wondrous items) · G Spellcaster gear (coins, potions, scrolls, staves, wands, wondrous items) · H Lair treasure (a wide mix, many magic items and coins) · I Treasure hoard (virtually any item, usually for major encounters).

Creature type → letters (Paizo): aberration ABDE (+FGH if cunning) · animal ABDE (treasure usually left in lairs, not carried) · construct EF (+BCH if guarding treasure) · dragon ABCHI · fey BCDG · humanoid ABDEFG (+H for a whole community) · magical beast ABDE · monstrous humanoid ABCDEH · ooze ABD (any treasure is accidental) · outsider: GM's choice (we expand: ABDEFG if it can use items, else ABDE) · plant ABDE · undead ABDE (+FG if intelligent) · vermin ABD. Conditional letters are already resolved into each creature's `letter:` tags using: *cunning* = Int ≥ 8; *intelligent* (undead) = has an Int score; *community* = Organization mentions tribe/band/clan/community/village/horde/warband/settlement/army/company/legion/cult. The one condition we cannot know is **guarding** (constructs): add B, C, H yourself when a construct is placed to guard a hoard.

### Budget words (`budgetWords` in `treasure.json`)
`none` ×0 · `incidental` ×0.5 · `standard` ×1 · `double` ×2 · `triple` ×3 · `npc-gear` = discard the base value and equip the creature as an NPC.

## 3. Creature tag dictionary

| Namespace | Values | Meaning |
|---|---|---|
| `type:` | the 13 Pathfinder types | creature type |
| `subtype:` | evil, aquatic, fire, giant, extraplanar, native, goblinoid, … | stat-block subtypes |
| `budget:` | none / incidental / standard / double / triple / npc-gear | from the Treasure line. 2,162 creatures have **no** Treasure line: their value is the commonest word for their type and they carry `flag:budget-suggested` |
| `letter:` | A-I | Paizo treasure types, conditions resolved |
| `route:` | carried / hoard / victim | which routes are open to it (see §4). Oozes get `victim` only (accidental) |
| `mind:` | mindless, animal (Int 1-2), dim (3-7), average (8-12), sharp (13-17), genius (18+), unknown | from Int |
| `hands:` | yes / no | can it wield/wear (humanoid-shaped, humanoid subtype, gear line, manufactured weapons in its melee line) |
| `uses-items` | flag | `hands:yes` AND mind ≥ dim. **The gate for `route:carried`.** |
| `lair:` | solitary / group / community | from Organization |
| `style:` | martial / caster / both / none | has Gear/weapons → martial; has spells → caster |
| `habitat:` | any, planar, warm, forest, underground, aquatic, coastal, plains, mountain, cold, hills, swamp, desert, urban, plane-fire/air/earth/water | from Environment |
| `culture:` | human, orc, goblinoid, giant, kobold, gnoll, reptilian, underfolk, drow, pirate, criminal, elf, dwarf, halfling, gnome, demon, devil, angel, … | from subtypes and unambiguous name words |
| `element:` | fire, earth, air, cold, water, electricity, acid | native element |
| `ethos:` | holy, unholy, lawful, chaotic | from alignment |
| `size:` | Fine … Colossal | |
| `flag:` | `hoarder` (dragon, or text says it hoards) · `budget-none` · `budget-suggested` · `accidental-treasure` (ooze) · `treasure-in-lair-only` | |

Numeric fields: `cr` (0.125-40) and `int` where known.

## 4. Item tag dictionary and the four routes

| Namespace | Values | Meaning |
|---|---|---|
| `class:` | weapon, armor, shield, **enchantment**, ring, rod, staff, wand, potion, scroll, wondrous, artifact, intelligent, gear, tool, kit, clothing, food, herb, alchemical, contraband, focus, entertainment, animal-gear, mount, vehicle, siege, structure, service, technology, drug, trade-good, other | |
| `magic:` | mundane / magic / artifact | |
| `bulk:` | pocket (≤1 lb) / carry (≤25) / haul (≤100) / fixed (>100, or vehicle/siege/structure) | |
| `handling:` | wield / wear / use / consume / none | |
| `slot:` | body slot where one exists | |
| `letter:` | D E F G H I | Paizo types the item can be made of. Cheap mundane gear deliberately has **none** |
| `route:` | **carried / hoard / victim / placed / unique** | see below |
| `role:` | combat / caster / both / utility | for wondrous, rod, ring, intelligent, technology |
| `ethos:` | holy / unholy / lawful / chaotic | only when aligned in nature or origin |
| `theme:` | up to 3 of the 29 themes | |
| `value:` | lt10, 10-99, 100-999, 1k-4999, 5k-9999, 10k-49999, 50k+, **bonus**, **unpriced** | |
| `fit:sized` | flag | weapons, armor, shields, clothing, enchantments, animal gear: scale to the wearer's `size:` |
| `state:` | durable / perishable | |
| `applies-to:` | weapon / armor | on enchantments |
| `flag:cursed` | flag | 87 items |

**The four routes** (the heart of "a bear has no ladder"):
- `route:carried` - on a creature's person and used by it. Requires the creature's `uses-items`. Armor, shields, weapons and magic items count whatever they weigh; other gear must be ≤ 10 lb (a rope, not a ladder).
- `route:hoard` - collected and kept in a lair. Portable and valuable (≥ 25 gp or magical).
- `route:victim` - left behind by whatever it killed or robbed: durable, portable gear a traveller or adventurer would have. **A bear can have this; it cannot use it.** Never food, herbs, trade goods, vehicles, mounts, structures.
- `route:placed` / `route:unique` - set pieces and artifacts. **Never rolled.** They are in the data so you can offer them as GM-placed extras.

**Black Bear, as the model case:** stat block says `Treasure none` → `budget:none`, `flag:budget-none`; `hands:no`, `mind:animal` → no `uses-items`, no `route:carried`; it is a predator that kills travellers → `route:victim` stays open, so a dead adventurer's kit is possible but, by the book, the planned amount is nothing; keep any scavenged loot **small**. Its valued pool (letters A B D E × route victim) is ~2,200 items: weapons, armor, shields, rings, potions, enchantments - never a ladder, vehicle, mount, structure, artifact, or food.

## 5. The algorithm (follow it; defaults marked *tunable* are our recommendations, not Paizo's)

**Step 1 - Resolve the creature(s).** By id from `treasure-creatures.json`. For a group, generate per *kind*; do not average.

**Step 2 - Base budget.** The Codex contains the Core tables. Fetch `entries/beebb56b6a8a261e.json` ("Placing Treasure", Core Rulebook pg. 399): `tables[1]` is **Table 12-5, treasure per encounter by Average Party Level and campaign speed (Slow/Medium/Fast)** (its first two rows are headers: `["","Treasure per Encounter"]` then `["Average Party Level","Slow","Medium","Fast"]`; rows 1-20 follow, values like `"260 gp"`); `tables[0]` is Table 12-4 (PC wealth by level). The user supplies APL and speed (default Medium); that row is the **encounter** base value. Core text in the same entry: easy encounters award one level lower, challenging/hard/epic one/two/three higher; low-fantasy halves, high-fantasy doubles; encounters against NPCs award about three times a monster encounter because of NPC gear. Split the encounter value among the creatures by CR share (*tunable*). For a single creature with CR below 1, scale the CR-1 row by its CR (*tunable*).

**Step 3 - Apply the budget word.** `value = base × multiplier`. `none` → 0 *but* see victim loot below. `npc-gear`: ignore the base; either (a) parse the creature's **own Treasure line**, which usually lists its exact gear - fetch `entries/{id}.json`, read the `Treasure NPC gear (...)` text, and match item names against the item table, or (b) fall back to PC wealth at the creature's level from Table 12-4. The Ultimate Equipment NPC-gear table itself is not in the Codex. `flag:treasure-in-lair-only`: put it all on the hoard side, none on its person.

**Step 4 - Split by where it is.** *On the creature*: items with `route:carried` (only if `uses-items`). *In the lair*: `route:hoard`, typically the larger share, scaled up for `lair:group` / `lair:community`. *Left by victims*: `route:victim`, always small (§ below). A solitary animal has no "on person" share at all.

**Step 5 - Choose item kinds from the letters.** A/B: coins (and gems for B); C: art objects; D: small magic; E: arms and armor; F: combat gear; G: caster gear; H: lair mix; I: hoard. **Coins, gems and art are not Codex items** - generate them from the budget yourself (§6). Letters present on the creature decide which kinds appear; `style:martial` leans F/E, `style:caster` leans G/D, `both` either.

**Step 6 - Build the valued pool.** `valued = items where (shares a letter: with the creature) AND (shares a route: with the creature)`, minus `route:unique`/`route:placed`, minus `flag:cursed` unless the user opts in, minus `class:technology` unless the setting uses technology (default off), minus `class:enchantment` (handled in step 9). Apply user setting filters (§7).

**Step 7 - Weight the pool** (*tunable multipliers*):
- **Theme match** ×3 for each item `theme:X` whose `themes[X].attractedBy` (in `treasure.json`) intersects the creature's own tags; cap at ×9. An item with no theme is neutral (×1).
- **Role vs style:** `role:combat` with `style:martial` ×2, `role:caster` with `style:caster` ×2, `role:both` ×1.5, mismatch ×0.5.
- **Ethos:** matching ethos ×2; opposite (holy vs `ethos:unholy`) ×0.2.
- **Hoarder / noble:** for `flag:hoarder` creatures, `theme:noble` ×2 and higher `value:` bands ×1.5.
- **Size:** `fit:sized` items must be re-sized to the creature's `size:`; prefer items made for that size when a size variant exists (`theme:giant-scale` for Large+ wielders).

**Step 8 - Spend the budget.** Draw weighted without replacement. Use `pr` (gp). Items without a price: `value:bonus` and `value:unpriced` (see §6) need pricing or skipping. Suggestions (*tunable*): no single item above ~50% of the remaining budget; allow a final overshoot of ≤ 10%; stop when the remainder is smaller than the cheapest eligible item; give the remainder back as coin.

**Step 9 - Enchantments.** `class:enchantment` entries (Flaming, Bane, Spell Resistance…) are *abilities*, not objects. Pair an enchantment with a `class:weapon` / `class:armor` / `class:shield` drawn from the same pool, matching its `applies-to:`; the `bonus` (+N) is its price modifier.

**Step 10 - Incidental gear.** Items with **no `letter:` tag** (1,266) are cheap mundane items - rope, bedroll, backpack, tools, clothing, rations. They are eligible by route alone: `route:victim` for durable kit (387 items, median price 2 gp, max 20 gp) and `route:carried` for what a hands-and-mind creature has on it (593 letterless items in all, including food and alchemical items that never count as victim kit). Add a few as flavour **on top of** the budget, never as part of it. Skip anything `state:perishable` for old victim loot.

**Victim loot when `budget:none`** (the bear): you may still offer 0-3 `route:victim` items worth at most ~1 level of incidental treasure *(tunable)*, clearly labelled "scavenged / left by a past victim". Make that behaviour a user toggle, default on for animals, magical beasts, vermin, oozes, plants, aberrations, monstrous humanoids, undead and dragons (the creatures that profile as `route:victim`).

**Reproducibility:** accept a seed; log which tags caused each inclusion; return the budget used, the budget word, the route each item came by, and any warnings.

## 6. Known gaps - handle them explicitly

- **Coins, gems, art objects are not items.** Make them from the budget. Core Rulebook "Building a Treasure Hoard" (`entries/7bbf51a7ef933c4f.json`, pg. 400) gives the gem values: low-quality 10 gp · semi-precious 50 · medium 100 · high 500 · jewels 1,000 · grand jewels 5,000+; fine artwork 100 gp or more; minor jewelry 50 gp; normal jewelry 100-500 gp. Coins: copper/silver/gold/platinum in any mix (silver and gold most common).
- **Unpriced items.** 341 items are `value:bonus` (enchantments: price from the bonus) and 1,664 are `value:unpriced` (mostly magic weapons and armor with no listed cost). Core Magic Item Creation (`entries/e56489fbd9aa28f1.json`, pg. 548) has the formulas: a +N weapon costs 2,000 gp × N² (plus the base weapon, +300 masterwork); armor/shield 1,000 gp × N² (plus base, +150 masterwork); special abilities add to the effective bonus. **Verify against that entry before hard-coding.** If you cannot price an item, skip it and say so.
- **Wands, scrolls and potions are almost absent** (51 potions, 3 scrolls, 1 wand) - the Codex builds them from spells. Generate consumables yourself from spell level × caster level; if your project already has a consumables pricing engine (the Character Generator has `consumables.js`), use it rather than re-deriving.
- **Not profiled:** NPCs, templates, animal companions, mythic monsters. Handle those through their base creature plus NPC gear.
- **Creatures without a Treasure line (2,162):** `flag:budget-suggested`; show the user that the word is suggested, not the book's.
- **Themes are soft.** A blind second pass over a 7% sample agreed with the first on themes 79% of the time (overlap or both empty), alignment 97%, role 92%, class 96%, "would a traveller carry it" 87%. Use themes as weights, never as hard filters. Use `route:` and `letter:` as the hard filters.
- **`class:technology` (sci-fi Numeria items) and third-party material** are in the pool. Default technology off; let the user filter by `book`.
- **Ids are stable only until the Codex data is rebuilt.** Store id + name.

## 7. User-facing settings to expose

Average Party Level · campaign speed (slow/medium/fast) · fantasy level (low ×0.5, normal, high ×2) · cursed items allowed · technology allowed · third-party sources allowed (filter by `book`) · "scavenged loot for zero-treasure creatures" toggle · seed · per-creature or per-encounter generation · lair vs on-person view · mythic/legendary flavour (optional).

## 8. Acceptance tests (write these first; they are the contract)

1. **Black Bear** (`Bear, Black`): `budget:none`; no `route:carried` item ever; no `class:vehicle|mount|structure|siege|service|food|artifact`; no Ladder; its valued pool is drawn only from letters A/B/D/E × `route:victim` (~2,200 items); incidental gear may include a 50 ft. rope, never a ladder.
2. **Gelatinous Cube** (ooze): every item has `route:victim`; letters A/B/D only, so weapons and armor never appear but rings and potions do.
3. **Goblin** (`budget:npc-gear`): has `uses-items`; carried items are weapon/armor/shield/gear a goblin can wield; `fit:sized` items are for Small.
4. **Ancient Red Dragon**: `budget:triple`, `flag:hoarder`, letters A B C H I, `route:hoard`; artifacts (`route:unique`) never appear in a rolled hoard.
5. **A mindless skeleton** (`Skeleton, Troll` etc.): `route:victim` only, nothing carried (mindless, so no `uses-items`), `budget:none`.
6. **Weighting:** a fire giant's or salamander's pile is measurably richer in `theme:fire` than a forest dryad's; a sea creature's richer in `theme:nautical`; a holy item is ≥5× rarer in an `ethos:unholy` creature's pile than a neutral one.
7. **Budget:** with fixed seed and APL, total `pr` of rolled items never exceeds budget + 10%; `budget:none` rolls zero planned value; `triple` rolls ≈ 3× `standard`.
8. **Determinism:** same seed + same `dataVersion` ⇒ identical output.
9. **No dangling ids:** every id in the output resolves in `entries/{id}.json`.
10. **Data guard:** if `treasure.json` `dataVersion` changes between sessions, re-fetch and re-index; if an id no longer resolves, re-resolve by name.

## 9. Rules of engagement

- The Codex repo is **not yours to edit**. Report tag problems as a list: `{id, name, tag, expected, why}`.
- Display the Codex licence notice wherever you show its data (the API sends `license` and `notice` in every file). Content is OGL 1.0a; the Codex is an unofficial fan reference.
- Never invent item or creature facts; every number shown must trace to a tag, a field, an entry body, or a labelled *tunable* default.
- Start by fetching `treasure.json` and read `howToUse` and `caveats` verbatim before writing code. Then build the acceptance tests, then the generator.
