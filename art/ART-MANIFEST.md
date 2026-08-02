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
