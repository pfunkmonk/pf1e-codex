# PF1e Codex — Art Manifest

Running record of every generated image evaluated, which version was chosen, and where it's used on the site.
**As new batches arrive, add rows here.** Chosen images are processed to `PF1e-Reference/art/<key>.jpg` (1600px, ~70% JPEG) and wired into the app.

Legend — **Placement**: `hero` = full darkened home backdrop (light text over it) · `side` = category banner, art bleeds from the RIGHT with text on a scrimmed left panel · `band` = class-entry top band that fades to solid panel before the stat text · `pending` = processed & available but not yet wired.

## Batch 1 — evaluated 2026-08-02  (v1/v2 pairs, judged by 4 reviewers)

| key | chosen | placement | wired? | note |
|---|---|---|---|---|
| home-hero | **v2** | hero | ✅ | party pushed left, open sky center; reads well darkened |
| home-parchment | **v1** | pending | ⬜ | soft even tan; candidate global page texture (not yet used) |
| cat-classes | **v1** | side (Classes) | ✅ | four archetypes read clearly, clean dark left |
| cat-classoptions | **v1** | side (Class Options) | ✅ | crossroads-of-destiny; misty open left |
| cat-races | **v2** | side (Races) | ✅ | right-weighted diverse cast, dark upper-left |
| cat-archetypes | **v1** | side (Archetypes) | ✅ | hero facing mirror-portals; empty dark left |
| cat-feats | **v2** | side (Feats) | ✅ | duelist lunging right; calm dark left |
| cat-traits | **v2** | side (Traits) | ✅ | mentor+youth in dark doorway (keep text far-left) |
| cat-spells | **v1** | side (Spells) | ✅ | caster right-of-center, clean dark-brown left |
| cat-monsters | **v1** | side (Monsters) | ✅ | dragon over lesser beasts, clean misty left |
| cat-npcs | **v1** | side (NPCs) | ✅ | packed market right, dark alley left |
| cat-items | **v1** | side (Equipment & Items) | ✅ | overflowing trove right (keep text upper-left) |
| cat-rules | **v2** | side (Rules) | ✅ | glowing tome right, calm library left |
| cat-skills | **v2** | side (Skills sub-page) | ✅ | rogue picking lock, refined lighting, dark corridor left |
| cat-hazards | **v1** | side (Afflictions & Hazards) | ✅ | all three traps read; clean dark left |
| cat-deities | ~~v2~~ RETIRED | — | ⬜ | ⚠ came out as cat-gods (the "cat-" filename confused the model); de-wired. Replaced by `deities-pantheon.jpg` (BATCH 2). Deities page shows the SVG sun until the new image is generated. |
| deities-pantheon | (batch 2) | side (Deities) | ⬜ | NEW prompt in BATCH-2 docx: majestic humanoid pantheon, explicit "no cats". Awaiting generation. |
| school-abjuration | **v2** | pending | ⬜ | strongest BLUE identity (ward dome) |
| school-conjuration | **v2** | pending | ⬜ | clean golden portal + summoning circle |
| school-divination | **v1** | pending | ⬜ | cool SILVER scrying visions |
| school-enchantment | **v1** | pending | ⬜ | clear rose-PINK hypnotic motes |
| school-evocation | **v1** | pending | ⬜ | blazing RED-orange blast |
| school-illusion | **v1** | pending | ⬜ | iridescent PURPLE phantom duplicates |
| school-necromancy | **v2** | pending | ⬜ | stronger signature GREEN fog/moon |
| school-transmutation | **v1** | pending | ⬜ | literal stone-to-gold, AMBER, clean left |
| class-fighter | **v1** | band (Fighter) | ✅ | dwarf+halberd+spider high in frame |
| class-barbarian | **v1** | band (Barbarian) | ✅ | raging half-orc, subject in upper frame |
| class-rogue | **v1** | band (Rogue) | ✅ | hooded rogue+dagger, very dark |
| class-cleric | **v1** | band (Cleric) | ✅ | raised holy symbol + golden light |
| class-wizard | **v1** | band (Wizard) | ✅ | old wizard in tower study casting |

### Notes / follow-ups
- **cat-deities** is a *cat-god pantheon* (colossal crowned feline deities). Left in as a fun read; regenerate with a "no cats, human/humanoid divine figures" prompt if you'd rather it be serious.
- **Schools (8)** and **home-parchment** are processed and available in `art/` but not wired yet — schools will back individual spell entries by school; home-parchment is a candidate subtle page texture. Say the word and I'll wire them.
- Placement rule of thumb honored from reviews: **text always on the dark/left (or on solid panel); art bleeds to the right or sits behind a heavy scrim.** Usability first.
- Wired so far: home hero, all 13 category splashes + Skills, and 5 class entry bands (fighter, barbarian, rogue, cleric, wizard).

## Batch 1b — new class art + schools wired (2026-08-02, evaluated by 4 reviewers)

Classes are TOP-BAND backdrops (art fades to panel before stat text). All wired ✅ via `applyArt("class-<name>")`.

| class | chosen | note |
|---|---|---|
| alchemist | v2 | flask+green burst high, goggled face up top |
| antipaladin | v1 | crisp spiked-armor knight, unholy green halo |
| arcanist | v2 | glowing orb + casting hand at top, dramatic |
| bard | v1 | single lit elven lutist high-right, near-black left |
| bloodrager | v1 | electric blood-lightning + raging face up top |
| brawler | v2 | tight crop, snarling fighter + wrapped-fist punch |
| cavalier | v2 | upright rider + lion banner flying across top |
| druid | v1 | antlered head to top edge, green staff-glow |
| gunslinger | v1 | muzzle-flash + gun-arm across upper third |
| hunter | v1 | archer + leaping saber-cat, true "in tandem" |
| inquisitor | v2 | hooded head + radiant symbol upper-right, dark left |
| investigator | v1 | noir detective center-left, dark alley right |
| magus | v1 | rune-wreathed blade + head high across band |
| medium | v1 | ghost face directly above channeler, centered |
| mesmerist | v1 | (only v1 generated) |
| monk | v2 | true airborne flying-kick, foot at top |
| oracle | v1 | glowing eyes + fan of spectral deity-faces |
| paladin | v1 | face+plate+blazing sword+horse all in top band |
| ranger | v2 | elf archer+hawk high-right in a light shaft, lynx anchor |
| sorcerer | v1 | draconic-scaled caster + fiery hair fill upper-left |
| summoner | v1 | armored eidolon looms upper-right, soul-tether |
| witch | v2 | hatted crone + black-cat + green cauldron smoke up top |

### Schools of magic — NOW WIRED ✅
The 8 school images back individual **spell entry** pages by school (`applyArt("school-<sch>")`, universal skipped), as a top band fading to panel. Chosen versions (from batch 1): abjuration v2, conjuration v2, divination v1, enchantment v1, evocation v1, illusion v1, necromancy v2, transmutation v1. Verified legible on an evocation spell.

**Still pending:** `deities-pantheon` + all BATCH-2 prompts (creature types, races, page backdrops, page-texture) — awaiting generation. `home-parchment` still unwired.

## Batch 2 — processed & wired 2026-08-12

Batch 2 had in fact been generated and was sitting in `Box\CODEX IMAGES`, but was never
processed into `art/` or wired — 68 of the 118 source keys had never shipped. Processed 41 of
them here (1600×900, ~70% JPEG, same as batch 1), taking the repo from 50 art keys to 91.

| group | keys | wiring |
|---|---|---|
| classes (12) | kineticist, ninja, occultist, psychic, samurai, shaman, skald, slayer, spiritualist, swashbuckler, vigilante, warpriest | none needed — `applyArt("class-<name>")` already derives the key |
| deities | `deities-pantheon` | none needed — `CAT_ART` already requested it; the file simply wasn't there, so the Deities page silently fell back to the SVG sun |
| races (17) | aasimar, catfolk, drow, dwarf, elf, gnome, goblin, half-elf, half-orc, halfling, human, kobold, orc, oread, ratfolk, tengu, tiefling | **new** — `applyArt("race-<name>")` on race entries |
| creature types (11) | aberration, animal, construct, dragon, fey, humanoid, monstrous-humanoid, ooze, plant, undead, vermin | **new** — `applyArt("type-<t>")` keyed off the monster `t` facet |

### v1/v2 selection — the 12 class bands were reviewed; the rest were not

| class | chosen | why |
|---|---|---|
| kineticist | **v2** | v1 puts the fire column and figure under the title; v2 moves him right and leaves a calm field left |
| samurai | **v2** | v1's subject sits left, directly under the title; v2 mirrors it — subject right, sunset sky left |
| spiritualist | **v2** | v1 puts both man and ghost under the title; v2 shifts them right over a dark graveyard left |
| ninja | v1 | bigger subject in the band; v2 drops its shuriken below the fold |
| occultist · psychic · shaman | v1 | face high and clear, calm left; each v2 is a top-down view that sinks the face out of the band |
| skald | v1 | the rune-song sweeps across the top band; v2 blocks the left with a dark back-of-head figure |
| slayer | v1 | v2's subject sits at ~55% height — entirely below the visible band |
| swashbuckler · vigilante · warpriest | v1 | face higher and larger, dark calm left already present |

⚠ **Races, creature types and tool/page art were NOT reviewed** — processed at v1. Both versions
remain in Box if any of them read poorly.

A first attempt scored the pair automatically (title-zone luminance/busyness vs in-band detail).
It reproduced the batch-1 human picks only **12/26 — worse than chance** — and recommended v1 for
samurai, which is plainly wrong. It was discarded; the table above is an eyeball pass. **Don't
trust a metric here without validating it against the reviewer picks first.**

## Batch 3 — every image shipped, every page backed 2026-08-12

The last 10 source images were processed (**art keys 107 → 117 = every usable image in Box**), and
entry art became a **resolution chain** (`entryArtKey()` in app.js) instead of four special cases.
Entry-page coverage went **20.3% → 100%** (5,255 → 25,926 pages); pages with *specific* rather than
category art went 5,255 → **7,700**.

Chain, most specific first:
1. `class-<name>` / `race-<name>` / `deities-pantheon` / `school-<school>` (spells)
2. **archetypes inherit their parent class's art** via the `cls` facet — 1,261 of 1,320 pages
3. monsters: `race-<name>` first (Goblin, Orc, Kobold, Drow, Lizardfolk, Aasimar…), then
   **alignment-aware families** — dragons split chromatic/metallic on evil/good, outsiders split
   celestial/fiend/elemental on good/evil/neither — then `type-<t>`
4. otherwise the entry's **category** image, so no page is ever bare

`ART` in app.js is an explicit set of every shipped key, so the chain picks the most specific image
that actually EXISTS without probing (probing would 404 on most pages).
⚠ **Ship a new image → add its key to `ART`, or nothing will use it.**

⚠ **Giants are matched on TYPE, not name.** AON inverts names, so "Ant, Giant" and "Beetle, Giant"
end in the word "giant" but are vermin. The rule is `type === "humanoid" && /giant/`, which excludes
all 35 comma-inverted bugs and also catches "Fire Giant King", which doesn't end in the word.
An earlier name-only rule shipped `type-giant` onto giant ants — caught in browser verification.

`page-texture` backs the **light theme only** (its palette is already parchment-tan `#f4ecd8`);
dark keeps grain alone, since a tan sheet washes it out. `home-parchment` backs `/cards`
(printable card sheet), `page-glossary` → `/cheat`, `misc-dice` → `/stacking`. All 23 routes with a
`.list-head` now carry a backdrop.

**Not shipped** (deliberate):
Only **`cat-deities`** — the retired cat-god image, replaced by `deities-pantheon`. It is the one
image in Box not shipped; re-add it only if you want the cat gods back as an easter egg.
(Everything previously listed here — `page-glossary`, `page-texture`, `misc-dice`, `race-lizardfolk`,
and the celestial/fiend/elemental/giant/chromatic/metallic subtypes — is now shipped and wired
per Batch 3 above. `race-lizardfolk` has no *race* entry but does back the Lizardfolk **monster**.)

### Mirrored 2026-08-12
`class-sorcerer`, `class-paladin`, `class-slayer` are **horizontally mirrored** versions of their v1
source — each originally put its subject on the LEFT, directly under the entry title. Flipping moves
the figure right and opens clean space for the heading, matching the rest of the set.

Re-derived from the Box PNG with `RotateNoneFlipX` **before** the resize, so they stay a single JPEG
pass rather than a re-compress of the shipped file. Reproduce with `mirror-art.ps1`.
⚠ Mirror only art with no lettering, insignia or handedness that must read correctly.
No cache-token bump was needed: Netlify serves `art/*` as `public,max-age=0,must-revalidate` with an
ETag and the service worker is network-first, so replaced images propagate on their own.

Still with **no art of their own**: the `magical beast` and `outsider` creature types have no
dedicated image (outsiders resolve to celestial/fiend/elemental by alignment; magical beasts fall
back to `cat-monsters`). Worth generating if you want them covered specifically.

### Batch 2b — tool & utility pages wired 2026-08-12
All 14 `tool-*` images plus `page-mycharacters` and `page-starthere` processed and wired, taking
art keys to **107**. Every tool view builds the same `.list-head` header, so these are wired ONCE
off the route (`ROUTE_ART` in app.js) rather than by editing 16 view functions. Treatment is the
`side` rule — art bleeds from the right, text on a panel scrim at the left. `cover` is safe on
these because the header is a short fixed band, unlike the full-height entry card.

### ⚠ The band CSS was broken the whole time
`.entry.has-art` used `background-size:cover`. An entry card runs 5000–5800px tall, so `cover`
scaled the 16:9 art to the card's **height** — a 5.6–6.5× blow-up showing only the top ~3% of the
picture. Every class band since batch 1b was a smear; the taller the page, the worse (Cavalier at
5805px showed 3.2% of its image and read as "no art at all"). Fixed by sizing the art layer to
the card **width** (`background-size:auto,100% auto`), which renders it at its natural aspect and
shows the top ~60% — the region these images were deliberately composed for.
