/* Generates an art prompt pack from data/themes.js.
 *
 * WHY THIS READS themes.js INSTEAD OF LISTING KEYS ITSELF
 * The art we commission and the art the app looks for must be the same set. When those were
 * maintained separately we shipped `spell-bulls-strength` art that the resolver could never ask
 * for, because two slug rules disagreed and nobody noticed for weeks. So the key list and the
 * variant counts come from themes.js, and this script REFUSES TO RUN if any declared key has no
 * scene description or if a description array is the wrong length. A missing scene is a hard
 * error, never a silently skipped image.
 *
 * Usage:  node tools/gen-art-prompts.mjs [repoRoot] [outDir] [batchNumbers...]
 *   e.g.  node tools/gen-art-prompts.mjs . "C:/…/CODEX IMAGES" 11 12
 * With no batch numbers it regenerates every batch. Emits Markdown always, and .docx when a
 * `docx` install is reachable via DOCX_MODULE.
 *
 * Art that already exists on disk is SKIPPED, so a pack never re-commissions a picture we have
 * already paid for — item-weapon-1..6 predate the variety-set expansion and must not be redrawn.
 */
import fs from "node:fs";
import path from "node:path";
import { ITEM_SCENES, ITEM_VARIETY } from "./art-scenes-items.mjs";
import { SPELL_THEME_SCENES, SCHOOL_SCENES, BODY_MOTIF_SCENES } from "./art-scenes-spells.mjs";
import { MONSTER_THEME_SCENES, TYPE_SCENES, CREATURE_SCENES, MONSTER_SCENES } from "./art-scenes-monsters.mjs";
import { FEAT_MOTIF_SCENES, ITEM_MOTIF_SCENES } from "./art-scenes-motifs.mjs";
import { MONSTER_MOTIF_SCENES, TRAIT_MOTIF_SCENES } from "./art-scenes-motifs2.mjs";
import { TRAIT_SCENES, HAZARD_SCENES, OPT_SCENES, ARCH_SCENES, RULES_SCENES as RULES_VARIETY, NPC_SCENES, NPC_ROLE_SCENES, NAMED_DEITIES } from "./art-scenes-world.mjs";

const slug = t => String(t).toLowerCase().replace(/['\u2019]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const ROOT = process.argv[2] || ".";
const OUT = process.argv[3] || ".";

/* House style, carried verbatim from the batch 1-9 packs so new art matches what is already
   on the site. Do not paraphrase these two strings — consistency of style across ~2,000
   images depends on the generator repeating them exactly. */
const SUFFIX =
  "Composition: subject in the RIGHT half of the frame, high in the upper third; the LEFT third open, " +
  "dark and uncluttered so overlaid title text stays readable. 16:9 cinematic banner, painted fantasy " +
  "illustration, dramatic directional lighting, rich muted palette, no text, no lettering, no watermark, no border.";

const STYLE = "Style: painterly digital oil in the manner of the existing PF1e Codex banners — " +
  "visible brushwork and a fine canvas grain, grounded realistic fantasy anatomy, never anime, cel-shaded " +
  "or cartoon. One strong directional key light with rim-light separating the subject, deep brown-black " +
  "shadows, warm amber-gold highlights, a desaturated muted background carrying a single saturated accent " +
  "colour. Heavy atmosphere: haze, drifting dust motes, god-rays. Subject rendered sharp, background " +
  "falling off softly.";

/* One entry per theme key in data/themes.js -> one description PER VARIANT.
   Variants are shown on different pages, so they must read as different pictures of the same
   idea, not the same picture twice. Write full words: an earlier pack used "cat." for category
   and the generator produced cats. */
const SCENES = {
  trip: [
    "A warrior hooking an opponent's lead ankle with the beard of a guisarme, the foe caught at the exact moment balance is lost, arms wheeling backward.",
    "A duelist sweeping a low leg-scythe kick beneath a raised shield, their opponent's boots leaving the ground, dust bursting outward from the pivot."
  ],
  disarm: [
    "A blade flicking upward beneath a crossguard, an opponent's sword spinning free and turning end over end in the air above the fight.",
    "A whip curling around the haft of a raised axe, the weapon being ripped sideways out of a startled grip."
  ],
  sunder: [
    "A greataxe crashing through the face of a wooden shield, splinters and iron bindings exploding outward in a spray.",
    "A warhammer striking a blade flat and shattering it, fragments of broken steel hanging in the air catching the light."
  ],
  grapple: [
    "Two fighters locked chest to chest in a wrestling clinch, boots dug into churned earth, every tendon straining.",
    "A brawler dragging an opponent down into a pinning hold, one arm locked across the throat, both bodies low to the ground.",
    "A constricting serpent coiled around an armoured torso, scales tightening, the trapped warrior's face contorted with effort."
,
    "A monk trapping a limb and rolling an opponent over one hip, both figures airborne for an instant.",
    "A pinned fighter face-down on stone, one arm levered up behind the shoulder blade."
    ],
  "bull-rush": ["A shield-bearing warrior slamming shoulder-first into an opponent and driving them bodily backward off their feet, dust exploding from the impact.",
    "A tower-shield line advancing as one and driving a knot of enemies backward off a bridge."
  ],
  overrun: ["A charging warhorse and rider running straight over a broken shield-line, bodies scattering aside beneath the hooves."],
  "dirty-trick": ["A rogue flinging a fistful of sand into an opponent's eyes at close quarters, the victim recoiling blind, a knife already coming up low."],
  "steal-maneuver": ["A thief's hand lifting a pouch from an opponent's belt mid-fight, the cord parting cleanly, the victim entirely unaware."],
  "reposition-drag": ["A warrior with a polearm hooked behind an opponent's knee, hauling them bodily out of a defensive line and off balance.",
    "A fighter hauling a spellcaster out of a doorway by the collar, boots skidding on flagstones."
  ],
  feint: [
    "A duelist selling a high committed thrust that is not real, their opponent's guard rising to meet nothing, the true low line already opening.",
    "A fighter's shoulder and eyes lying about the direction of an attack, the blade travelling somewhere else entirely, the opponent leaning the wrong way."
,
    "A fencer's blade dipping in invitation, the opponent committing to the opening that was never there."
    ],
  "maneuver-general": ["Two combatants at the moment of a grip-and-turn, weapons momentarily irrelevant, the whole contest reduced to leverage and body mechanics."],
  "power-attack": [
    "A two-handed greatsword at the top of its arc, the wielder's whole mass committed behind it, air visibly distorting along the edge.",
    "A massive overhead maul strike landing, the ground cratering and cracks running outward from the point of impact.",
    "A shield split down the middle by a descending axe, the wielder still following through."
,
    "A two-handed axe biting through a door and the man behind it, timber and splinters flying."
    ],
  "vital-strike": [
    "A single devastating thrust driving through a breastplate at the seam, everything else in the frame motionless.",
    "A blade withdrawn from a fatal blow, one bright line of impact light still fading along the wound channel.",
    "A spear delivered with both hands at full extension, the point emerging cleanly through heavy armour plate.",
    "A hunter's arrow striking a single perfect point on a great beast, the animal's mass folding around the hit."
,
    "A rapier point entering the eye-slit of a great helm with no wasted motion.",
    "A single strike on a charging beast that stops it dead, its momentum collapsing into the ground."
    ],
  "two-weapon": [
    "A fighter mid-flurry with paired blades, two separate attack arcs crossing in front of the body, both in motion at once.",
    "A ranger with sword and long knife working high and low simultaneously, an opponent's guard split between two threats."
  ],
  "finesse-duelist": [
    "A rapier duelist in a deep lunge, back leg extended, blade and arm one straight line, coat flaring behind.",
    "A swashbuckler beating an incoming blade aside and riposting in the same tempo, footwork precise on wet cobbles."
,
    "A duelist's blade sliding along an opponent's steel in a bind, sparks running down the length.",
    "A swashbuckler on a tavern table, boot on a tankard, blade extended with lazy precision."
    ],
  archery: [
    "An archer at full draw, string at the cheek, arrow steady, the whole body a held curve of tension.",
    "The instant of release: bowstring blurred, fletching just clearing the riser, the archer's eyes locked downrange.",
    "A ranger loosing from a crouch behind cover, a second arrow already nocked between the fingers of the draw hand.",
    "A volley of arrows leaving a line of archers together, the sky briefly full of shafts."
,
    "An archer shooting from horseback at full gallop, twisted backward in the saddle."
    ],
  thrown: [
    "A warrior mid-throw with a heavy javelin, hips rotated fully through, the shaft leaving the hand.",
    "A rogue releasing a fan of throwing knives, three blades in flight at different distances from the hand."
,
    "A handaxe turning end over end across a room toward a distant target."
    ],
  firearms: [
    "A gunslinger firing a heavy pistol, muzzle flash blooming, smoke curling back over the hammer.",
    "A musketeer sighting down a long barrel braced on a rampart, match-cord smouldering, powder horn at the hip."
,
    "A duellist's pistol raised at the moment of ignition, priming pan flaring white."
    ],
  charge: [
    "A lancer at full gallop with the lance couched and levelled, everything behind them reduced to speed-blurred dust.",
    "An infantry charge breaking into a run, spears lowering in ragged unison, banners streaming."
  ],
  mounted: [
    "A knight and warhorse turning together in tight formation, barding swinging, the animal's weight visibly part of the technique.",
    "A rider hanging low off the saddle at speed to strike beneath a shield line, one boot still hooked in the stirrup."
  ],
  "critical-hit": [
    "The exact instant armour fails: a plate seam splitting, the weapon driving through, impact light flaring white at the contact point.",
    "A blade finding the gap beneath a helmet's jaw, the victim's whole posture collapsing in the same frame.",
    "A hammer blow landing on a shield arm, the limb buckling wrongly, the shield already falling away."
,
    "A blade finding the gap under a raised arm, the strike landing exactly where armour is not.",
    "A hammer blow to a helm, the metal deforming and the wearer's knees already folding."
    ],
  "attacks-of-opp": [
    "A spearman punishing an opponent who tried to move past, the thrust landing into an exposed flank mid-step.",
    "A guard's blade snapping out to catch a caster the moment their hands begin a gesture, the spell dying unfinished."
,
    "A spearman punishing a foe who tried to run past, the point catching them mid-stride.",
    "A guard's blade flicking out at a caster who dared to cast within reach."
    ],
  "combat-expertise": [
    "A fighter trading reach for safety, blade angled defensively across the body, weight settled back, reading the opponent.",
    "A duelist in a tight controlled guard turning aside three successive attacks without giving ground.",
    "A veteran giving deliberate ground step by step, never breaking form, drawing an overcommitted opponent onto bad footing."
  ],
  "dodge-mobility": [
    "A fighter bending backward out of a blade's path, the edge passing a finger's width from the throat.",
    "An acrobat rolling under a swing and coming up already inside the opponent's reach."
,
    "A rogue bending backward under a horizontal cut, hair lifting as the blade passes."
    ],
  "reach-polearm": [
    "A halberdier holding a corridor alone, the long weapon sweeping a wide arc that nothing can close through.",
    "A phalanx of levelled pikes seen from the flank, a hedge of steel points at a single height."
  ],
  shield: [
    "A shield braced at the moment of impact, an axe head embedded in the boards, splinters flying.",
    "A shield-bash driving the boss into an opponent's face, head snapping back.",
    "A locked shield wall from low angle, overlapping rims forming one unbroken barrier, arrows standing in the wood."
,
    "A shield wall locked edge to edge, arrows standing in the fronts like a hedge.",
    "A buckler turning a thrust aside at the last instant, blade skidding off the boss.",
    "A shield swung as a weapon, rim catching an opponent under the jaw."
    ],
  armor: [
    "Ornate battle plate taking a glancing blow, the strike skating off curved steel in a shower of sparks.",
    "A warrior being buckled into heavy armour in a lamplit tent, each strap and plate settling into place."
,
    "A knight taking a heavy blow on the pauldron and simply walking through it.",
    "An armourer fitting a breastplate to a warrior, straps drawn tight in a lamplit shop."
    ],
  "toughness-saves": [
    "A battered warrior still standing amid fallen foes, bleeding, breathing hard, absolutely refusing to go down.",
    "A figure braced against a torrent of magical force, arms crossed before the face, ground scoured away behind them.",
    "A soldier shrugging off a blow that should have felled them, boots planted, jaw tight."
,
    "A warrior standing alone amid fallen comrades, bloodied and still upright.",
    "A figure braced against a wave of magical force, cloak shredding, feet holding."
    ],
  "monk-style": [
    "A monk flowing into a crane-like stance on a rain-slick temple terrace, one leg raised, arms wide and poised.",
    "A tiger-style strike: clawed hands driving forward in a low aggressive lunge, muscles bunched.",
    "A serpentine style of coiling deflection, the practitioner's arms winding around an incoming attack.",
    "A grounded immovable stance, feet rooted wide, an opponent's full-force blow being absorbed without a step back.",
    "A leaping aerial technique frozen at apex, robes streaming, a spinning kick just beginning to unwind.",
    "A mantis-like stance with hooked hands held high and close, elbows tight to the body.",
    "A drunken swaying guard, apparently unbalanced, an attack sliding harmlessly past.",
    "A low crouching stance on one knee, fingertips brushing the ground, ready to spring.",
    "A two-handed pushing form, palms out, an opponent skidding backward on their heels."
  ],
  unarmed: [
    "A bare-knuckle strike landing clean on a jaw, sweat and spit flying, both fighters unarmoured.",
    "An elbow driven into an opponent's guard at close range, the whole body behind the short brutal motion.",
    "A monk's open palm strike stopping a charging opponent dead, dust ring pulsing outward from the point of contact.",
    "A grappler throwing an opponent over the hip, the victim inverted in mid-air above churned ground."
,
    "A monk's elbow strike landing at close quarters, the opponent's guard collapsed inward."
    ],
  "ki-meditation": [
    "A monk seated in perfect stillness on a wind-scoured peak, faint inner light at the brow, clouds far below.",
    "A practitioner drawing a breath before action, a soft luminous current visibly gathering along the arms and hands."
  ],
  metamagic: [
    "A spell being reshaped mid-cast: concentric glowing rune-rings expanding and folding around an outstretched hand.",
    "A caster stretching a spell's geometry between both palms, the lattice distending like worked glass.",
    "A silent casting with no gesture at all, only the eyes and a bloom of contained light behind them.",
    "A spell compressed to a dense burning point in the fingertips, far brighter than its size should allow.",
    "A ritual diagram rotating in the air, layers of script sliding over one another into a new configuration.",
    "A spell held unreleased in a closed fist, light escaping between the fingers.",
    "Two spells braided together into a single working above a caster's open hands."
,
    "A caster splitting one spell into two divergent bolts with a twist of the wrist."
    ],
  "spell-focus": [
    "A wizard with one school's sigil burning brighter than all the others orbiting them.",
    "A caster driving a spell through a shimmering magical ward, the barrier splitting apart around it.",
    "A scholar-mage bent over a single spell diagram, everything else in the study dark and forgotten."
  ],
  counterspell: ["Two casters locked opposite each other, one spell unravelling into loose sparks the instant it meets the other's raised hand."],
  summoning: [
    "A summoning circle blazing on flagstones as a great shape resolves out of the light within it.",
    "A caster with arm outflung as a called creature steps through a tear in the air behind them."
,
    "A summoning circle flaring as something large begins to push through from the far side."
    ],
  familiar: [
    "A caster shoulder to shoulder with a bonded raven, a faint tether of light linking the two.",
    "A cat familiar curled on an open spellbook, eyes reflecting arcane light, its wizard working in the background."
,
    "A raven familiar landing on a wizard's shoulder, both heads turning to the same thing at once."
    ],
  "animal-companion": [
    "A ranger and a great wolf moving as one through undergrowth, both alert to the same distant sound.",
    "A druid resting a hand on the shoulder of an enormous bear, entirely unafraid, the animal leaning into the touch."
,
    "A ranger and wolf moving through undergrowth in perfect step, neither looking at the other.",
    "A druid resting a hand on a great bear's flank as it stands guard over them."
    ],
  bloodline: [
    "A sorcerer whose inherited power shows physically: faint draconic scaling along the forearms, eyes lit from within.",
    "An ancestral shape looming as a translucent presence behind a caster, echoing their raised-arm gesture."
  ],
  "channel-energy": [
    "A cleric with holy symbol raised, a wave of golden light rolling outward through a battlefield.",
    "A priest channelling dark energy, black-violet light guttering from the holy symbol, undead stirring behind.",
    "Healing light pouring from a cleric's hands into a wounded companion, wounds visibly closing.",
    "A burst of energy radiating from a raised holy symbol in a crypt, undead recoiling from it."
  ],
  "hex-witch": [
    "A witch tracing a hex sigil in the air, the mark hanging and burning where the finger passed.",
    "A crone stirring a cauldron, the rising steam forming the face of a distant victim."
  ],
  "rage-barbarian": [
    "A barbarian mid-roar, eyes wild, veins standing out, weapon raised in both hands.",
    "A berserker taking a wound without breaking stride, fury entirely overriding pain.",
    "A raging warrior driving through a shield wall by pure violence, defenders scattering."
,
    "A barbarian mid-roar with a wound already forgotten, weapon raised for another blow."
    ],
  bardic: [
    "A bard mid-performance on a battlefield's edge, playing while the fight rages, allies visibly lifted by it.",
    "A singer in a torchlit hall, the whole room turned toward them, sound made almost visible in the smoky air."
,
    "A bard on a tavern bench, the whole room leaning toward the song without noticing.",
    "A skald bellowing a war-chant on a shield wall's flank, warriors around them straightening."
    ],
  "smite-paladin": [
    "A paladin's blade blazing with holy light as it descends on a fiendish foe, the light hurting the target.",
    "A knight kneeling to lay glowing hands on a dying soldier, radiance spilling between the fingers."
  ],
  "judgment-teamwork": [
    "Two allies fighting back to back in perfect coordination, shields overlapping into one wall.",
    "An inquisitor's judgment settling visibly over a battlefield as a cold ring of light, allies moving in unison beneath it."
,
    "Two allies fighting back to back in a tight circle, covering each other's blind sides."
    ],
  arcane: [
    "A wizard's hand wreathed in disciplined arcane fire, geometric sigils rotating around the wrist.",
    "A blade sheathed in crackling arcane energy mid-swing, magic and steel working as one weapon."
  ],
  "mesmerist-stare": [
    "An unblinking mesmerist holding a victim's gaze, hypnotic rings coiling outward from the eyes.",
    "A victim frozen mid-motion, pupils blown wide with reflected light, the mesmerist calm behind them."
  ],
  "psychic-occult": [
    "A psychic with fingers to the temple, a lattice of thought-light unfolding outward from the skull.",
    "Two minds meeting as overlapping translucent shapes above a seated figure, an alien geometry between them."
,
    "A psychic pressing fingertips to their temple as an opponent staggers untouched.",
    "Two minds meeting as visible thought-light arcing between two seated figures."
    ,
    "A psychic's projected thought striking an opponent as a visible ripple in the air."
  ],
  "spirit-medium": [
    "A medium seated in a candlelit circle as a translucent spirit leans in over their shoulder.",
    "A shaman surrounded by drifting ancestral shapes, each half-formed from smoke and light.",
    "A haunted room where a spirit's outline is briefly visible in disturbed dust and guttering flame."
,
    "A medium seated in a circle of candles as a translucent figure leans over their shoulder.",
    "A shaman's spirit animal half-visible in the smoke of a low fire."
    ],
  necromancy: [
    "A necromancer raising skeletal figures from broken ground, sickly green light pooling in the earth.",
    "A hooded caster drawing a thread of life-force from a dying thing into their own cupped hand."
,
    "A necromancer's hand raised over a battlefield as bodies begin to shift and stand.",
    "Skeletal hands breaking up through graveyard soil around a robed figure's boots.",
    "A dark-robed figure drawing a thread of pale life-light out of a dying man's chest."
    ],
  shadow: [
    "A figure stepping bodily into their own cast shadow and disappearing into it.",
    "Shadows detaching from a wall and rising into standing shapes with their own intent.",
    "A pool of darkness spreading across a floor faster than any cast shadow should."
  ],
  planar: [
    "A rift tearing open in the air, a wholly different sky visible through the gap.",
    "A horned fiend stepping across a burning summoning boundary, brimstone light beneath.",
    "A radiant celestial descending with wings spread, light too bright to look at directly."
,
    "A rift opening in mid-air over a summoning floor, another sky visible through the tear.",
    "A devil's contract unrolling on a table, the signature line glowing faintly red."
    ],
  fire: [
    "A caster hurling a roaring gout of flame, heat distorting everything behind the stream.",
    "A blade wreathed in fire cutting a bright arc through darkness, embers trailing the swing."
,
    "A wall of flame roaring up along a corridor, silhouetting a figure who walks out of it."
    ],
  cold: ["A wave of frost racing outward across stone and water, everything it touches locking into rime and ice.",
    "A blast of frost freezing a charging beast mid-leap, ice spreading across its hide."
  ],
  lightning: ["A bolt of lightning discharging from a caster's outstretched hand, the whole scene lit blue-white for one instant.",
    "A bolt earthing through an armoured figure, arcs crawling over every plate."
  ],
  "acid-poison": [
    "A vial of acid striking armour and eating through it, the metal bubbling and running.",
    "A blade drawn across a poisoner's flask, a bead of dark venom gathering along the edge."
,
    "A blade drawn across a whetstone slick with venom, a bead of it hanging from the edge."
    ],
  "earth-stone": [
    "A caster driving a fist into the ground, a ridge of raised stone erupting in a line away from them.",
    "A figure of living rock rising out of a hillside, boulders settling into shoulders.",
    "Stone armour crusting over a warrior's skin, granite plates locking across the chest and arms."
,
    "A stone fist erupting out of a flagstone floor to catch an opponent mid-run.",
    "A dwarf braced in a doorway as the mountain itself seems to hold behind them."
    ],
  "air-flight": [
    "A figure rising off the ground on a column of wind, cloak and hair thrown upward.",
    "A winged silhouette banking hard against a vast bright sky, far above the landscape."
,
    "A figure lifting off a cliff edge on a hard updraft, cloak snapping straight out."
    ],
  water: [
    "A wave rearing under a caster's raised hands, held impossibly upright before breaking.",
    "A swimmer moving powerfully through green underwater light, bubbles trailing behind."
  ],
  stealth: [
    "A rogue flattened into deep shadow beside a lit corridor, utterly still as a guard passes.",
    "A blade sliding in from behind an unaware sentry, the assassin's face half-lit and calm."
  ],
  intimidate: [
    "A warrior roaring into an enemy's face at arm's length, the target visibly breaking.",
    "A towering armoured figure stepping forward as lesser foes back away, weapons wavering."
,
    "A warrior lifting a visor to show a face that empties a room.",
    "A single figure walking toward a line of armed men who are all beginning to step back.",
    "A hand slamming a severed helm onto a table in a crowded hall, silence spreading outward.",
    "A looming silhouette in a doorway, lamplight behind, everything in the room turned toward it.",
    "A cornered enemy dropping their weapon before a blow has even been struck."
    ],
  diplomacy: [
    "Two rival envoys clasping hands across a table, tension easing in the faces around them.",
    "A courtier speaking quietly to a seated noble, the whole room's attention bending toward the exchange."
,
    "Two rival captains shaking hands over a map while their soldiers watch from either side."
    ],
  "bluff-disguise": [
    "A spy pulling on another's face like a mask, the true features still half visible beneath.",
    "A confident liar mid-sentence, entirely believable, one hand hiding a stolen key behind the back."
  ],
  perception: [
    "A scout catching one wrong detail in a crowded market, eyes narrowing on it while everything else blurs.",
    "A ranger crouched at a trailhead, seeing the single broken stem that gives the ambush away."
,
    "A scout's eyes catching the one wrong shadow in a treeline at dusk."
    ],
  knowledge: [
    "A scholar in a towering library, a shaft of light falling on the one open book that matters.",
    "A sage comparing a monster's claw against an illustrated bestiary plate by candlelight.",
    "An archaeologist reading carved glyphs on a buried wall, brushing away centuries of dust.",
    "A student surrounded by orbiting diagrams of planes and stars, tracing one line of reasoning.",
    "An old master and a young apprentice over a table of maps and instruments, mid-explanation.",
    "A cluttered study at night, one scholar surrounded by open books and a single answer found."
  ],
  athletics: [
    "A climber hauling over a cliff lip by fingertips, legs swinging over a long drop.",
    "A runner clearing a wide rooftop gap at full stretch, the street far below."
,
    "A figure vaulting a chasm between rooftops, both feet clear of the tiles.",
    "A climber hauling over a cliff lip in rain, forearms corded with effort."
    ],
  "heal-medicine": ["A field surgeon working fast on a wounded soldier by lamplight, hands bloodied, instruments laid out on cloth.",
    "A field surgeon working by lantern light in a tent, hands steady, patient still."
  ],
  survival: [
    "A tracker kneeling over a print in wet ground, reading it while the trail runs on into mist.",
    "A lone traveller building a fire under a rock overhang as weather closes in behind them."
,
    "A tracker kneeling to read a print in mud, the trail running away into fog.",
    "A lone traveller building a fire in driving snow, back to the wind."
    ],
  "traps-thievery": ["A thief's picks at work inside a complex lock, the mechanism drawn in warm light, a trap needle visible and unsprung.",
    "A thief's picks turning in a lock, ear against the plate, breath held."
  ],
  leadership: [
    "A commander with sword raised turning a wavering line, soldiers rallying to the gesture.",
    "A captain briefing companions over a campaign map, every face turned toward them.",
    "A banner going up on contested ground as troops surge past it."
,
    "A commander on a rise pointing with a sword, an army moving in the indicated direction.",
    "A captain hauling a wavering soldier back into line by the shoulder strap."
    ],
  linguistics: ["A translator working between an ancient inscribed tablet and a fresh page, script transforming under the pen."],
  "item-creation": [
    "A wizard-smith at an enchanting bench, hammer poised over a glowing blade on runic anvil-plates.",
    "A crafter binding a final rune into a finished item, the magic settling into it and going quiet."
,
    "An enchanter tracing a rune onto a blade with a stylus of light.",
    "A wizard's workshop at night, a half-finished staff clamped in a vice, glowing at one end.",
    "A smith quenching a blade as sigils flare briefly along the fuller."
    ,
    "A ring cooling on a jeweller's mandrel with a rune still glowing in the band."
  ],
  alchemy: [
    "An alchemist's bench mid-reaction, glassware boiling over into coloured smoke.",
    "A bomb-thrower lighting a fuse, the flask already swinging back for the throw."
,
    "An alchemist's bench mid-experiment, retort boiling over into a cascade of coloured smoke."
    ],
  "item-mastery": ["A hand raised holding a wondrous item blazing to life, its power visibly answering the wielder, light spilling between the fingers."],
  "natural-attacks": [
    "A beast's jaws closing on an armoured arm, teeth grating on steel.",
    "Raking claws opening four parallel lines across a shield face."
,
    "A beastfolk warrior's claws extending fully as they drop into a hunting crouch."
    ],
  "dragon-breath": [
    "A dragon's head rearing back and then unleashing a torrent of elemental breath down a valley.",
    "A humanoid with draconic heritage exhaling a cone of energy, throat and chest lit from inside."
  ],
  "race-dwarf": ["A dwarven warrior braced behind a heavy shield in a stone hall, beard braided with iron rings, absolutely immovable."],
  "race-elf": ["An elven archer among ancient trees, longbow half-drawn, dappled forest light across a composed face."],
  "race-gnome": ["A gnome tinkerer surrounded by half-built clockwork, goggles up, delighted by something just gone right."],
  "race-halfling": ["A halfling moving nimbly along a tavern rafter above an oblivious crowd, purse in hand, grinning.",
    "A halfling scout slipping between the legs of a fight, entirely unnoticed."
  ],
  "race-orc-gnoll": ["A half-orc warrior with a notched greataxe over one shoulder, tusks and scars catching hard low light."],
  "race-goblinoid": ["A goblin warband boiling out of a drainage tunnel with torches and crude blades, all teeth and motion."],
  "race-planetouched": ["A tiefling and an aasimar standing back to back, one horned and shadowed, one haloed in faint gold."],
  "race-beastfolk": [
    "A catfolk scout balanced on a rooftop ridge, tail counterweighting, eyes reflecting lamplight.",
    "A tengu in travelling clothes on a rainy street, feathers slick, sharp-eyed and mid-negotiation."
  ],
  "race-giant": ["An enormous giant rising against the sky, a boulder hefted overhead, tiny figures scattering below."],
  "initiative-speed": [
    "A duelist already moving while everyone else is still reacting, the first to understand the fight has started.",
    "A blade half-drawn in a blur of motion, the wielder's eyes fixed and the crowd behind still frozen."
  ],
  "extra-resource": [
    "A cupped pair of hands overflowing with more light than they should be able to hold.",
    "A reserve of power visibly kept back behind a caster, waiting, banked like coals.",
    "A depleted vessel refilling itself, light climbing back up the inside of a carved reliquary."
  ],
  "story-destiny": [
    "A lone figure at a campfire writing in a battered journal, past deeds rising as images in the smoke.",
    "A traveller at a fork in an old road under a huge sky, one path already chosen."
  ],
  "faith-obedience": [
    "A kneeling supplicant in a shaft of cathedral light, holy symbol glowing faintly at the throat.",
    "A pilgrim performing a daily rite at a roadside shrine at dawn, breath visible in cold air.",
    "A devotee tending an altar flame beneath towering carved statuary, incense in coloured beams."
,
    "A pilgrim kneeling on stone before a weathered shrine at dawn, head bowed.",
    "A cleric holding a holy symbol high in a dark place, light pushing the dark back."
    ],
  "performance-combat": ["A gladiator playing to a roaring arena crowd mid-fight, arms spread, sand and sunlight everywhere."],
  "siege-vehicle": ["A siege engine crew winding back a great catapult before a besieged wall, rope and timber under enormous strain.",
    "A trebuchet crew hauling on ropes as the counterweight drops and the arm sweeps up."
  ],
  "curse-disease": [
    "A cursed mark spreading visibly across a victim's skin in dark branching lines.",
    "A plague-stricken figure wrapped in rags at a shuttered door, the street behind them empty."
,
    "A withered hand laying a curse on a doorframe, the wood darkening around the print.",
    "A plague ward of sickbeds under high windows, a physician moving between them.",
    "A figure watching their own reflection age decades in a still pool."
    ],
  "light-radiance": [
    "A blazing point of holy light held aloft, driving shadows physically back down a corridor.",
    "Dawn breaking hard over a battlefield, the first light picking out a standing figure."
  ],
  "blood-sacrifice": [
    "A caster drawing their own blood across a palm to pay a spell's price, the sigil beneath drinking it.",
    "A martyr standing between an enemy and their companions, already wounded, refusing to move.",
    "A hand pressed to a wound, blood running between the fingers onto a glowing sigil below."
,
    "A blade drawn across a palm above a stone bowl, the offering already smoking."
    ],
  "multiclass-dabble": ["A student borrowing from a second discipline: a fighter awkwardly but successfully tracing a spell sigil, sword still in the off hand."],
  "weapon-training": [
    "A weapon master's rack of blades in a lamplit armoury, each one maintained to perfection.",
    "A drill instructor correcting a recruit's grip on a training sword in a muddy yard.",
    "A soldier performing a maintenance ritual on a sword by firelight, whetstone and oiled cloth.",
    "A veteran selecting a weapon from a wall of them, hand closing on exactly the right one.",
    "A soldier drilling alone at a pell in an empty yard at first light."
  ]
};

/* The straggler set. Deliberately GENERIC — these back feats that matched no theme, so they must
   not imply any specific mechanic. Evocative rulebook furniture, nothing more. */
const FALLBACK_SCENES = [
  "An adventurer's gear laid out on oiled leather before a journey: notched blade, buckler, rope, lantern.",
  "A lone torchbearer at the mouth of a dark dungeon corridor, light reaching only a few paces in.",
  "A party of four silhouetted on a ridge at sunset, travel-worn, looking out over unknown country.",
  "A tavern back table strewn with maps, coins and a half-drawn plan, faces lit from below by a candle.",
  "A whetstone drawn along a blade's edge in close firelight, sparks and metal dust.",
  "A heavy iron-bound door standing ajar in a stone wall, darkness beyond, hinges rimed with age.",
  "A campfire at night with weapons stacked within reach and one figure keeping watch.",
  "A weathered stone bridge over a gorge in mountain mist, a single traveller crossing.",
  "An armoury wall of racked polearms and shields in raking lamplight.",
  "A battlefield after the fighting, banners down, smoke drifting across broken ground.",
  "A scholar's desk at night: open tome, guttering candle, scattered notes and an unlit lamp.",
  "A city gate at dawn with carts queuing and guards checking papers under a portcullis.",
  "A forest track in heavy rain, a hooded figure walking away from the viewer.",
  "A ruined temple interior with roots breaking through the flagstones and light falling from a hole above.",
  "A ship's deck in high wind, rigging taut, crew braced against the roll.",
  "A blacksmith's forge at full heat, hammer raised, orange light filling the workshop.",
  "A mountain pass under snow with a rope line of climbers strung across it.",
  "An underground cavern lit by luminous fungus, still black water reflecting the glow.",
  "A market square crowded with traders and livestock beneath striped awnings.",
  "A watchtower silhouette against a stormy sky, one lit window near the top.",
  "A crypt stair descending into darkness, cobwebs broken recently by someone's passage.",
  "A frozen lake at dusk with a distant figure crossing the ice, long shadow behind.",
  "A desert caravan strung out along a dune ridge in low golden light.",
  "A monastery courtyard at dawn with practitioners at their forms in ordered rows.",
  "An alchemist's shelf of labelled bottles catching lamplight, contents faintly luminous.",
  "A war council tent with a map table and standing officers, lamplight from above.",
  "A river ford with stepping stones and a broken cart half in the water.",
  "A wizard's tower seen from below at night, one high window blazing with light.",
  "A prison corridor of barred doors receding into gloom, a single lantern burning.",
  "A hillside standing-stone circle in fog at first light.",
  "A guild hall interior with a great fireplace and long tables, business being conducted.",
  "A coastal cliff path with seabirds and heavy surf far below.",
  "A dense marsh at twilight, mist on the water, a rickety boardwalk running into it.",
  "A great library's spiral stair rising through tiers of shelved books.",
  "A gladiator's tunnel looking out into a sunlit arena, crowd noise implied by the light.",
  "A wagon train circled for the night on open plain, fires between the wheels.",
  "A stormy crossroads gibbet and signpost, rain hammering down, no travellers in sight.",
  "A shuttered village at dusk with one lit window and a road running past.",
  "A stone stair spiralling up inside a tower, worn hollow at the centre of each step.",
  "A rope bridge over a chasm in drifting cloud.",
  "A cellar door thrown open onto steps descending into dark.",
  "A field of standing crops with a treeline beyond and weather coming in.",
  "A cluttered guardroom with a brazier, a bench and a rack of arms.",
  "A moonlit graveyard of leaning headstones and long grass.",
  "A mountain shrine with prayer flags snapping in wind.",
  "A ford crossing at dawn, mist lying flat on the water.",
  "A ruined watchtower with ivy through its arrow slits.",
  "A caravan halted on a plain, animals picketed and fires lit.",
  "A cave mouth framed by hanging roots, daylight ending a few paces in.",
  "A city rooftop view across chimneys and washing lines at sunset.",
  "A flooded crypt with water to the knee and carvings above the tideline.",
  "A forge yard at night with sparks rising into the dark.",
  "A wide stone bridge into a walled city, traffic at the gate.",
  "A hunting camp in autumn woods, kit hung out of reach of animals.",
  "A cliff-edge path with the sea far below and gulls at eye level.",
  "A grand hall with long tables cleared and one figure still seated.",
  "A frozen waterfall in a narrow gorge, blue ice catching light."
];

/* Named art for individual feats: the ones people actually look up. Each is one image, one page.
   The Core Rulebook list is completed first (batches 1-9 stopped alphabetically at "S"), then the
   most-discussed non-Core feats. */
const NAMED_FEATS = [
  // --- remaining Core Rulebook feats ---
  ["Armor Proficiency, Heavy", "feat-armor-proficiency-heavy", "A knight fully armoured in heavy plate standing at ease, the sheer mass of the harness evident in the stance."],
  ["Armor Proficiency, Medium", "feat-armor-proficiency-medium", "A soldier in a well-fitted chain hauberk and scale, moving easily, straps and buckles worn smooth with use."],
  ["Craft Rod", "feat-craft-rod", "An enchanter binding the final sigil into a metal rod on a workbench, the shaft lighting along its length."],
  ["Extra Rage", "feat-extra-rage", "A barbarian finding one more surge of fury after exhaustion, fists clenching, eyes reigniting."],
  ["Improved Channel", "feat-improved-channel", "A cleric's channelled wave of light rolling further and brighter than expected, reaching the far wall."],
  ["Improved Two-Weapon Fighting", "feat-improved-two-weapon-fighting", "A duelist delivering a rapid four-strike sequence with paired blades, multiple arcs overlapping."],
  ["Iron Will", "feat-iron-will", "A lone figure standing unmoved inside a swirling assault of mind-magic, jaw set, eyes clear."],
  ["Lightning Reflexes", "feat-lightning-reflexes", "A rogue twisting aside from a jet of flame at the last instant, the blast passing behind them."],
  ["Scribe Scroll", "feat-scribe-scroll", "A wizard inscribing a scroll with a quill, letters igniting into light as they are written."],
  ["Selective Channeling", "feat-selective-channeling", "Healing light rolling through a melee and curving deliberately around enemies to reach only allies."],
  ["Self-Sufficient", "feat-self-sufficient", "A lone traveller mending their own wound by firelight, needle and thread, pack open beside them."],
  ["Shatter Defenses", "feat-shatter-defenses", "A frightened opponent's guard falling apart entirely, weapon drooping as the attacker steps in."],
  ["Shield Focus", "feat-shield-focus", "A warrior's shield angled with perfect economy, an incoming blade skating harmlessly off the rim."],
  ["Shield Master", "feat-shield-master", "A fighter using a shield as an offensive weapon, boss driving forward while the blade works behind it."],
  ["Shield Proficiency", "feat-shield-proficiency", "A recruit learning to carry a shield properly, the instructor adjusting the arm straps."],
  ["Shield Slam", "feat-shield-slam", "A shield bash driving an opponent bodily backward off their feet, boots leaving the ground."],
  ["Shot on the Run", "feat-shot-on-the-run", "An archer loosing an arrow mid-sprint between two pieces of cover, never breaking stride."],
  ["Sickening Critical", "feat-sickening-critical", "A wounded foe doubling over, face grey, the wound visibly wrong and spreading."],
  ["Silent Spell", "feat-silent-spell", "A bound and gagged caster completing a spell with eyes alone, light blooming without a sound."],
  ["Simple Weapon Proficiency", "feat-simple-weapon-proficiency", "A rack of simple arms — spear, club, crossbow, dagger — in a training yard under morning light."],
  ["Skill Focus", "feat-skill-focus", "A craftsman utterly absorbed in a single task, the rest of the workshop dark around the work."],
  ["Snatch Arrows", "feat-snatch-arrows", "A monk plucking an arrow out of the air a hand's breadth from the chest, fingers closed on the shaft."],
  ["Spell Focus", "feat-spell-focus", "A wizard with one school's sigil burning far brighter than the others circling them."],
  ["Spell Mastery", "feat-spell-mastery", "A wizard casting from memory with the spellbook closed and set aside on the table."],
  ["Spell Penetration", "feat-spell-penetration", "A spell punching through a shimmering resistance barrier, the ward splitting apart around the bolt."],
  ["Spellbreaker", "feat-spellbreaker", "A warrior's blade snapping out to catch a caster mid-gesture, the half-formed spell collapsing."],
  ["Spirited Charge", "feat-spirited-charge", "A lancer striking home at full gallop, the lance shattering with the force of the impact."],
  ["Spring Attack", "feat-spring-attack", "A skirmisher darting in, striking, and already withdrawing, motion traced through the whole movement."],
  ["Staggering Critical", "feat-staggering-critical", "A foe reeling from a terrible wound, unable to do more than stay upright."],
  ["Stand Still", "feat-stand-still", "A guard halting a charging opponent dead in their tracks with a braced polearm across the body."],
  ["Stealthy", "feat-stealthy", "A figure slipping between shadows in a lamplit alley, barely more than a suggestion of movement."],
  ["Step Up", "feat-step-up", "A fighter closing the instant an opponent tries to disengage, staying inside their reach."],
  ["Still Spell", "feat-still-spell", "A caster in chains completing a spell with no gesture at all, magic gathering regardless."],
  ["Strike Back", "feat-strike-back", "A warrior answering a long polearm thrust from outside their reach, blade lashing back along the shaft."],
  ["Stunning Critical", "feat-stunning-critical", "An opponent's eyes rolling as a blow lands, weapon falling from suddenly nerveless hands."],
  ["Stunning Fist", "feat-stunning-fist", "A monk's palm strike landing on a sternum, the target's whole body locking rigid."],
  ["Throw Anything", "feat-throw-anything", "An alchemist hurling an improvised object — a stool leg, a bottle — with lethal accuracy."],
  ["Tiring Critical", "feat-tiring-critical", "A foe sagging with exhaustion after a punishing wound, weapon tip dragging in the dirt."],
  ["Toughness", "feat-toughness", "A scarred veteran taking a heavy blow and simply absorbing it, still advancing."],
  ["Tower Shield Proficiency", "feat-tower-shield-proficiency", "A soldier behind an enormous tower shield planted in the earth, arrows standing in its face."],
  ["Trample", "feat-trample", "A warhorse running straight over a fallen opponent, rider low over the neck."],
  ["Turn Undead", "feat-turn-undead", "Undead recoiling and fleeing from a raised holy symbol blazing with light."],
  ["Two-Weapon Defense", "feat-two-weapon-defense", "A duelist using both blades defensively, forming a crossed guard that turns an attack aside."],
  ["Two-Weapon Fighting", "feat-two-weapon-fighting", "A fighter attacking with sword and long knife simultaneously, two arcs crossing before the body."],
  ["Two-Weapon Rend", "feat-two-weapon-rend", "Both blades landing at once and pulling apart, opening a terrible wound between them."],
  ["Unseat", "feat-unseat", "A lance strike lifting an armoured rider clean out of the saddle, horse running on beneath."],
  ["Vital Strike", "feat-vital-strike", "A single devastating thrust driving through armour at the seam, everything else motionless."],
  ["Weapon Finesse", "feat-weapon-finesse", "A rapier duelist in a deep precise lunge, speed and placement doing the work instead of strength."],
  ["Weapon Focus", "feat-weapon-focus", "A warrior and one particular blade, the weapon clearly an extension of the arm, grip perfectly set."],
  ["Weapon Specialization", "feat-weapon-specialization", "A veteran delivering a technically perfect cut with a signature weapon, form flawless."],
  ["Whirlwind Attack", "feat-whirlwind-attack", "A fighter spinning at the centre of a ring of enemies, blade sweeping every one of them at once."],
  ["Widen Spell", "feat-widen-spell", "A spell's area of effect blooming far wider than expected, the edge of the effect racing outward."],
  ["Wind Stance", "feat-wind-stance", "A fighter moving so fluidly that arrows pass through the space they have already left."],
  // --- most-discussed non-Core feats ---
  ["Fey Foundling", "feat-fey-foundling", "An infant left at a fairy ring in moonlight, faint fey lights watching from the treeline."],
  ["Dervish Dance", "feat-dervish-dance", "A scimitar dancer mid-spin, robes flaring into a circle, blade tracing a bright ring."],
  ["Slashing Grace", "feat-slashing-grace", "A duelist wielding a slashing blade with fencer's precision, weight forward on the front foot."],
  ["Fencing Grace", "feat-fencing-grace", "A rapier held in an elegant high guard, the duelist's posture pure economy and balance."],
  ["Piranha Strike", "feat-piranha-strike", "A light blade delivering a flurry of shallow rapid cuts, each one drawing blood."],
  ["Furious Focus", "feat-furious-focus", "A two-handed warrior swinging with total commitment and no loss of accuracy, eyes locked on the target."],
  ["Cornugon Smash", "feat-cornugon-smash", "A brutal blow landing while the attacker roars into the victim's face, terror and impact together."],
  ["Hurtful", "feat-hurtful", "A warrior following a terrifying shout instantly with a second punishing strike."],
  ["Dreadful Carnage", "feat-dreadful-carnage", "A foe cut down as surrounding enemies recoil in visible horror at the sight."],
  ["Enforcer", "feat-enforcer", "A thug delivering a deliberately painful non-lethal blow with a sap, the victim's face contorted."],
  ["Raging Vitality", "feat-raging-vitality", "A barbarian staying upright and furious despite a mortal-looking wound, refusing to fall."],
  ["Extra Hex", "feat-extra-hex", "A witch with an additional hex sigil burning alongside the others orbiting her hand."],
  ["Extra Revelation", "feat-extra-revelation", "An oracle receiving a further vision, a second mystery's light kindling behind the eyes."],
  ["Extra Discovery", "feat-extra-discovery", "An alchemist's notebook open to a newly completed formula, the successful mixture still glowing."],
  ["Extra Arcana", "feat-extra-arcana", "An arcanist's reservoir showing one more stored working, an extra sigil in the ring."],
  ["Extra Channel", "feat-extra-channel", "A cleric channelling again after the light should have been spent, holy symbol flaring anew."],
  ["Additional Traits", "feat-additional-traits", "A character sheet's worth of formative moments shown as small vignettes around a central figure."],
  ["Boon Companion", "feat-boon-companion", "A ranger's animal companion grown notably larger and stronger, standing shoulder to shoulder with them."],
  ["Eldritch Heritage", "feat-eldritch-heritage", "A non-caster manifesting inherited sorcerous power for the first time, startled by their own hand."],
  ["Racial Heritage", "feat-racial-heritage", "A human with an ancestor's legacy showing faintly through — an orcish set to the jaw, a dwarf's build."],
  ["Prodigy", "feat-prodigy", "A young artisan producing work far beyond their years, masters looking on in surprise."],
  ["Rapid Reload", "feat-rapid-reload", "A crossbowman's hands blurring through a reload cycle, bolt already coming up to the groove."],
  ["Clustered Shots", "feat-clustered-shots", "Three arrows standing in a single palm-sized group on a target's chest plate."],
  ["Snap Shot", "feat-snap-shot", "An archer loosing at point-blank range into an enemy who has just stepped into reach."],
  ["Point-Blank Master", "feat-point-blank-master", "An archer calmly drawing and firing while an enemy is right on top of them, no panic at all."],
  ["Outflank", "feat-outflank", "Two allies on opposite sides of one enemy, exchanging a glance and striking in the same instant."],
  ["Precise Strike", "feat-precise-strike", "Two flanking companions driving blades into the same gap in an opponent's armour."],
  ["Paired Opportunists", "feat-paired-opportunists", "Two fighters punishing the same opening simultaneously, blades converging."],
  ["Broken Wing Gambit", "feat-broken-wing-gambit", "A fighter deliberately dropping their guard to bait an attack, an ally already moving to punish it."],
  ["Butterfly's Sting", "feat-butterflys-sting", "A warrior creating a perfect opening and stepping aside so an ally can land the killing blow."],
  ["Vicious Stomp", "feat-vicious-stomp", "A boot driving down onto a foe who has just been knocked to the ground."],
  ["Ki Throw", "feat-ki-throw", "A monk redirecting an opponent's momentum into a throw, the victim inverted mid-air."],
  ["Combat Stamina", "feat-combat-stamina", "A fighter drawing on deep reserves late in a long fight, breathing hard but still precise."],
  ["Dazing Spell", "feat-dazing-spell", "A spell landing and leaving its victim standing blank-eyed and unresponsive amid the aftermath."],
  ["Persistent Spell", "feat-persistent-spell", "A spell's effect refusing to disperse, clinging to a target who has clearly tried to shake it off."],
  ["Rime Spell", "feat-rime-spell", "A frost spell leaving its victim locked in a shell of ice, limbs frozen mid-motion."],
  ["Elemental Spell", "feat-elemental-spell", "A familiar spell arriving in the wrong element, fire guttering into cold blue as it travels."],
  ["Intensified Spell", "feat-intensified-spell", "A spell burning far past its normal limit, the caster braced against their own working."],
  ["Spell Perfection", "feat-spell-perfection", "A single spell cast flawlessly at the height of a mage's power, the air itself deferring to it."],
  ["Craft Construct", "feat-craft-construct", "An artificer completing a great construct in a workshop, its eyes lighting for the first time."]
];

/* ---------------------------------------------------------------- build --- */
/* Named art for individual magic items: one image, one entry — the ones players actually look up.
   Names are the EXACT index entries, verified against data/index.js. Several look wrong and are
   not: AON concatenates the enhancement bonus onto the name, so the real entry really is
   "Cloak of Resistance1" and "Pearl of Power1st". Using a tidied-up name here would produce art
   the resolver could never ask for. */
const NAMED_ITEMS = [
  ["Bag of Holding Type I", "item-bag-of-holding-type-i", "A worn canvas sack held open, its interior impossibly deep and dark, a faint edge of another space visible inside."],
  ["Handy Haversack", "item-handy-haversack", "A leather backpack with three flaps open at once, each revealing far more depth than the pack's outside allows."],
  ["Cloak of Resistance1", "item-cloak-of-resistance1", "A plain travelling cloak on a stand, a faint protective shimmer running through the weave."],
  ["Ring of Protection1", "item-ring-of-protection1", "A simple band on a raised finger, a soft ward of light haloing the hand."],
  ["Amulet of Natural Armor1", "item-amulet-of-natural-armor1", "A carved bone amulet on a thong, the skin beneath it faintly toughened and scaled."],
  ["Bracers of Armor1", "item-bracers-of-armor1", "A pair of light bracers with a translucent shell of force flaring outward from the forearms."],
  ["Belt of Giant Strength2", "item-belt-of-giant-strength2", "A broad studded belt with a heavy buckle, the wearer's arms visibly corded with new power."],
  ["Headband of Vast Intelligence2", "item-headband-of-vast-intelligence2", "A jewelled headband at the brow, faint diagrams of thought turning in the air behind the skull."],
  ["Boots of Speed", "item-boots-of-speed", "Boots mid-stride trailing streaks of motion, the ground beneath blurring away."],
  ["Winged Boots", "item-winged-boots", "Boots with small feathered wings at the heels, lifting a figure just clear of the ground."],
  ["Boots of Elvenkind", "item-boots-of-elvenkind", "Soft green leather boots crossing dry leaves without disturbing a single one."],
  ["Slippers of Spider Climbing", "item-slippers-of-spider-climbing", "Slippers gripping a sheer vertical wall, the wearer walking upward as if on level ground."],
  ["Cloak of Elvenkind", "item-cloak-of-elvenkind", "A grey-green cloak whose wearer has almost vanished against the forest behind them."],
  ["Efficient Quiver", "item-efficient-quiver", "A slim quiver holding far more than it should: arrows, javelins and a bow staff all at once."],
  ["Portable Hole", "item-portable-hole", "A circle of black cloth unfolded on a floor, opening into a shaft of true darkness."],
  ["Carpet of Flying10-ft.-by-10-ft.", "item-carpet-of-flying10-ft-by-10-ft", "A patterned carpet hovering level above the ground, tassels stirring in its own draught."],
  ["Deck of Many Things", "item-deck-of-many-things", "An ornate card deck fanned on a table, one card turned face-up and glowing ominously."],
  ["Rod of Wonder", "item-rod-of-wonder", "A gnarled rod discharging wild mismatched effects at once — butterflies, sparks, a gust of leaves."],
  ["Staff of the Magi", "item-staff-of-the-magi", "A tall rune-carved staff held upright, immense contained power visible as light under its surface."],
  ["Robe of the Archmagi", "item-robe-of-the-archmagi", "A deep midnight robe on a stand, silver sigils across it moving slowly like constellations."],
  ["Robe of Useful Items", "item-robe-of-useful-items", "A patched robe covered in small cloth patches shaped like a ladder, a door, a boat."],
  ["Pearl of Power1st", "item-pearl-of-power1st", "A luminous pearl held between finger and thumb, a spell rekindling inside it."],
  ["Instant Fortress", "item-instant-fortress", "A small metal cube on the ground mid-expansion, a stone tower unfolding upward from it."],
  ["Cube of Force", "item-cube-of-force", "A small cube projecting a shimmering barrier of force in a perfect box around its bearer."],
  ["Immovable Rod", "item-immovable-rod", "An iron rod hanging fixed in empty air, a pack hung from it, utterly unmoving."],
  ["Rope of Climbing", "item-rope-of-climbing", "A rope rising on its own into darkness above, its end curling like a questing snake."],
  ["Decanter of Endless Water", "item-decanter-of-endless-water", "A stoppered flask gushing an impossible torrent of clear water across dry stone."],
  ["Eyes of the Eagle", "item-eyes-of-the-eagle", "A pair of crystal lenses on a cloth, distant landscape sharply visible within them."],
  ["Goggles of Night", "item-goggles-of-night", "Dark goggles showing a pitch-black room rendered in clear silvery detail."],
  ["Hat of Disguise", "item-hat-of-disguise", "A plain hat lifted from a head, the face beneath changing between two people mid-motion."],
  ["Helm of Brilliance", "item-helm-of-brilliance", "A gem-studded helm blazing with white light, each stone a separate star."],
  ["Horn of Blasting", "item-horn-of-blasting", "A great brass horn sounding, a visible cone of force shattering stone before it."],
  ["Iron Flask", "item-iron-flask", "A squat iron flask with a heavy stopper, something straining against the seal from within."],
  ["Lantern of Revealing", "item-lantern-of-revealing", "A lantern whose beam shows an invisible figure standing plainly in the light."],
  ["Mirror of Opposition", "item-mirror-of-opposition", "A tall mirror from which a duplicate is stepping out, identical and hostile."],
  ["Necklace of Fireballs Type I", "item-necklace-of-fireballs-type-i", "A necklace strung with glowing spheres, one being plucked free and already alight."],
  ["Periapt of Wound Closure", "item-periapt-of-wound-closure", "A dark amber periapt at a throat as a wound below it visibly knits shut."],
  ["Scarab of Protection", "item-scarab-of-protection", "A gold and lapis scarab brooch, a curse breaking apart into sparks against it."],
  ["Sovereign Glue", "item-sovereign-glue", "A small pot of amber adhesive with a brush, two objects fused inseparably beside it."],
  ["Universal Solvent", "item-universal-solvent", "A vial of clear liquid dissolving a bond, the join running away like water."],
  ["Stone of Good Luck (Luckstone)", "item-stone-of-good-luck-luckstone", "A polished agate in a palm, dice on the table beyond it all showing high faces."],
  ["Wings of Flying", "item-wings-of-flying", "A cloak unfurling into a great pair of leathery wings mid-leap."],
  ["Dust of Appearance", "item-dust-of-appearance", "Glittering dust thrown into the air, outlining invisible shapes where it settles."],
  ["Dust of Disappearance", "item-dust-of-disappearance", "Fine dust falling over a figure who is fading out of sight as it lands."],
  ["Elixir of Truth", "item-elixir-of-truth", "A clear elixir in a small glass, held out toward a seated and unwilling subject."],
  ["Folding Boat", "item-folding-boat", "A wooden box on a shingle beach unfolding into a full-sized boat."],
  ["Gem of Seeing", "item-gem-of-seeing", "A faceted gem held to one eye, illusions beyond it showing as hollow outlines."],
  ["Glove of Storing", "item-glove-of-storing", "A glove with a weapon vanishing into the palm mid-gesture."],
  ["Marvelous Pigments", "item-marvelous-pigments", "Pots of pigment and a brush beside a painted door that has become a real opening."],
  ["Medallion of Thoughts", "item-medallion-of-thoughts", "A medallion at a throat, faint ribbons of another person's thought curling toward it."],
  ["Pipes of the Sewers", "item-pipes-of-the-sewers", "A set of reed pipes played in a drain mouth, rats streaming toward the piper."],
  ["Ring of Invisibility", "item-ring-of-invisibility", "A ring on a hand that is fading out of sight from the fingertips inward."],
  ["Ring of Feather Falling", "item-ring-of-feather-falling", "A figure descending gently past a tower window, cloak billowing slowly upward."],
  ["Ring of Sustenance", "item-ring-of-sustenance", "A plain ring on a hand beside an untouched meal and a burnt-out candle at dawn."],
  ["Ring of Spell Storing", "item-ring-of-spell-storing", "A ring with several small spell-lights orbiting the band, waiting to be released."],
  ["Ring of Regeneration", "item-ring-of-regeneration", "A ring above a wound that is closing over as it is watched."],
  ["Ring of Djinni Calling", "item-ring-of-djinni-calling", "A ring pouring out smoke that gathers into the towering shape of a djinni."],
  ["Rod of Absorption", "item-rod-of-absorption", "A rod drinking an incoming spell, the magic spiralling into its tip and vanishing."],
  ["Rod of Lordly Might", "item-rod-of-lordly-might", "An ornate rod part-transformed, one end already reshaped into a blade."],
  ["Rod of Rulership", "item-rod-of-rulership", "A jewelled rod raised before a crowd, every face turned toward it in unison."],
  ["Staff of Fire", "item-staff-of-fire", "A staff with its head engulfed in controlled flame, heat warping the air above."],
  ["Staff of Healing", "item-staff-of-healing", "A pale staff laid across a wounded figure, soft light spreading from the contact."],
  ["Staff of Power", "item-staff-of-power", "A heavy staff crackling with barely contained force, its holder braced against it."],
  ["Alchemist's fire", "item-alchemists-fire", "A thrown flask bursting into clinging orange flame across stone."],
  ["Tanglefoot bag", "item-tanglefoot-bag", "A burst bag spraying expanding adhesive strands that snare boots to the ground."],
  ["Thunderstone", "item-thunderstone", "A stone striking the floor and releasing a visible shockwave ring of sound."],
  ["Antitoxin", "item-antitoxin", "A small labelled vial being uncorked beside a victim with blackened veins."],
  ["Holy water", "item-holy-water", "A flask of blessed water shattering on undead flesh, searing white where it lands."],
  ["Smokestick", "item-smokestick", "A stick pouring out dense grey smoke that fills a corridor in seconds."],
  ["Tindertwig", "item-tindertwig", "A twig flaring alight on first strike, held to a lantern wick in the dark."],
  ["Sunrod", "item-sunrod", "A rod glowing steady daylight-white, held up in a lightless cavern."],
  ["Caltrops", "item-caltrops", "Iron caltrops scattered across flagstones, points always upward."],
  ["Masterwork tool", "item-masterwork-tool", "A superbly made tool in a fitted case, every surface finished with obvious care."],
  ["Alchemist's kit", "item-alchemists-kit", "A compact travelling alchemy kit open on a table, burner and glassware fitted into place."],
  ["Bag of Holding, Minor", "item-bag-of-holding-minor", "A small drawstring pouch swallowing a full-sized helmet without changing shape."],
  ["Bag of Holding (Giant) Type V", "item-bag-of-holding-giant-type-v", "An enormous sack propped open, a cart's worth of goods disappearing into it."],
  ["Tanglefoot bundle", "item-tanglefoot-bundle", "A bundle of tanglefoot charges strapped together in an alchemist's satchel."],
  ["Alchemist's Suit", "item-alchemists-suit", "A heavy protective alchemist's suit on a stand, glass faceplate and sealed seams."],
  ["Alchemist's kindness", "item-alchemists-kindness", "A small paper packet of powder beside a cup of water and a wincing patient."],
  ["Figurine of the Concealed Companion", "item-figurine-of-the-concealed-companion", "A tiny carved animal figurine in a palm, faintly warm and about to wake."],
  ["Totemic Figurine", "item-totemic-figurine", "A carved totem figurine on a stone, ancestral shapes suggested in the grain."],
  ["Unlucky Figurine", "item-unlucky-figurine", "A crude figurine with a cracked face, everything around it subtly going wrong."],
  ["Mindbind Figurine", "item-mindbind-figurine", "A figurine wrapped in fine wire, faint thought-light trapped beneath the windings."],
  ["Ramming", "item-ramming", "A reinforced weapon head mid-impact against a barred door, timber splitting."],
  ["Rampaging", "item-rampaging", "A weapon trailing a wake of destruction, its wielder already moving to the next target."],
  ["Haramaki", "item-haramaki", "A light quilted belly-wrap armour laid out flat, ties extended."],
  ["Ram (combat-trained)", "item-ram-combat-trained", "A heavy-horned war ram in harness, head lowered and ready."],
  ["Adamantine Battleaxe", "item-adamantine-battleaxe", "A battleaxe of dark adamantine, edge unnaturally black and perfectly keen."],
  ["Adamantine Dagger", "item-adamantine-dagger", "A short adamantine dagger on cloth, the metal drinking the light around it."],
  ["Akitonian Blade", "item-akitonian-blade", "A blade of alien red metal, forms and proportions subtly wrong to the eye."],
  ["Aklys", "item-aklys", "A hooked club with a long cord at its butt, coiled ready to be recalled after a throw."],
  ["Air repeater", "item-air-repeater", "A compressed-air repeating weapon on a bench, reservoir and magazine exposed."],
  ["Aasen mortar", "item-aasen-mortar", "A squat siege mortar on a timber bed, muzzle angled high, crew tools stacked beside it."],
  ["Altar of Abadar", "item-altar-of-abadar", "A stone vault altar with an intricate golden lock, keys and coins worked into the carving."],
  ["Absinthe (bottle)", "item-absinthe-bottle", "A green bottle and a slotted spoon on a marble table, sugar dissolving into cloudy liquor."]
];

globalThis.window = {};
(0, eval)(fs.readFileSync(`${ROOT}/data/themes.js`, "utf8"));
(0, eval)(fs.readFileSync(`${ROOT}/data/art.js`, "utf8"));
const THEMES = globalThis.window.PF_THEMES;
const VARIETY = globalThis.window.PF_VARIETY;
const PRESENT = new Set(globalThis.window.PF_ART);

/* A batch is just a list of parts. Every part is validated against themes.js before anything
   is written, and art that ALREADY EXISTS is skipped so a pack never re-commissions a picture
   we have already paid for (item-weapon-1..6 predate the variety-set expansion). */
const BATCHES = {
  10: {
    file: "BATCH10-Feats",
    title: "BATCH 10 (Feats)",
    blurb: "This batch completes feat art: every one of the 3,457 feat pages ends up backed by an image\nserving no more than about 20 pages, down from a single image currently serving 2,010.",
    parts: [
      { kind: "themes", bucket: "feats", scenes: SCENES, section: "Theme art" },
      { kind: "bodythemes", bucket: "feats", scenes: FEAT_MOTIF_SCENES, section: "Feat body motif art" },
      { kind: "variety", name: "feat-scene", scenes: FALLBACK_SCENES, section: "General feat scenes" },
      { kind: "named", list: NAMED_FEATS, section: "Named feats" }
    ]
  },
  11: {
    file: "BATCH11-Items-Objects",
    title: "BATCH 11 (Items — what the object is)",
    blurb: "Items is the largest bucket in the Codex — 6,677 pages, a quarter of everything. These are the\nOBJECT themes: art keyed to what a thing actually is, replacing a single general-store image\nthat currently backs 1,931 pages.",
    parts: [
      { kind: "themes", bucket: "items", scenes: ITEM_SCENES, section: "Item theme art" },
      { kind: "bodythemes", bucket: "items", scenes: ITEM_MOTIF_SCENES, section: "Item body motif art" },
      { kind: "variety", name: "item-neck", scenes: ITEM_VARIETY["item-neck"], section: "Body slot: neck" },
      { kind: "variety", name: "item-head", scenes: ITEM_VARIETY["item-head"], section: "Body slot: head" },
      { kind: "variety", name: "item-body", scenes: ITEM_VARIETY["item-body"], section: "Body slot: body" },
      { kind: "variety", name: "item-eyes", scenes: ITEM_VARIETY["item-eyes"], section: "Body slot: eyes" },
      { kind: "variety", name: "item-shoulders", scenes: ITEM_VARIETY["item-shoulders"], section: "Body slot: shoulders" },
      { kind: "variety", name: "item-wrists", scenes: ITEM_VARIETY["item-wrists"], section: "Body slot: wrists" }
    ]
  },
  12: {
    file: "BATCH12-Items-Variety-And-Named",
    title: "BATCH 12 (Items — variety sets and named items)",
    blurb: "The other half of items. The variety sets catch entries no name rule can depict — 'Weapons' and\n'Armor' are largely abstract magic qualities like Keen, Bane and Vorpal — and the named list\ncovers the famous magic items players actually look up.",
    parts: [
      { kind: "variety", name: "item-scene", scenes: ITEM_VARIETY["item-scene"], section: "General goods scenes" },
      { kind: "variety", name: "item-wondrous", scenes: ITEM_VARIETY["item-wondrous"], section: "Wondrous item scenes" },
      { kind: "variety", name: "item-weapon", scenes: ITEM_VARIETY["item-weapon"], section: "Weapon scenes" },
      { kind: "variety", name: "item-armorset", scenes: ITEM_VARIETY["item-armorset"], section: "Armour scenes" },
      { kind: "variety", name: "item-artifact", scenes: ITEM_VARIETY["item-artifact"], section: "Artifact scenes" },
      { kind: "named", list: NAMED_ITEMS, section: "Named magic items" }
    ]
  },
  13: {
    file: "BATCH13-Spells",
    title: "BATCH 13 (Spells)",
    blurb: "Spell themes plus the per-school variety sets. Themes only reach 44% of spells — spell names\nare poetry, not description — so the school sets carry the rest and are sized for it. Today\nschool-transmutation alone backs 682 pages.",
    parts: [
      { kind: "themes", bucket: "spells", scenes: SPELL_THEME_SCENES, section: "Spell theme art" },
      { kind: "bodythemes", bucket: "spells", scenes: BODY_MOTIF_SCENES, section: "Body motif art" },
      ...varietyFamily(SCHOOL_SCENES, "School scenes")
    ]
  },
  14: {
    file: "BATCH14-Monsters",
    title: "BATCH 14 (Monsters and hazards)",
    blurb: "Monster THEMES here are not creature portraits — real monsters already resolve by name,\nsubtype or type. These cover the rules-shaped pages that live in the monster bucket: Universal\nMonster Rules, Templates and Animal Companions. The type sets catch creatures with no portrait.",
    parts: [
      { kind: "themes", bucket: "monsters", scenes: MONSTER_THEME_SCENES, section: "Monster rules and template art" },
      { kind: "bodythemes", bucket: "monsters", scenes: MONSTER_MOTIF_SCENES, section: "Habitat art" },
      ...varietyFamily(TYPE_SCENES, "Creature type scenes"),
      ...varietyFamily(CREATURE_SCENES, "Creature subtype scenes"),
      { kind: "variety", name: "monster-scene", scenes: MONSTER_SCENES, section: "General bestiary scenes" },
      ...varietyFamily(HAZARD_SCENES, "Hazard scenes")
    ]
  },
  15: {
    file: "BATCH15-Traits-Options-Archetypes",
    title: "BATCH 15 (Traits, class options, archetypes)",
    blurb: "All variety sets, keyed to facets the data already carries — trait category, class-option type,\nparent class. Trait names are evocative rather than categorical, so no keyword table can sort\nthem; the category facet can. trait-region alone backs 448 pages today.",
    parts: [
      { kind: "bodythemes", bucket: "traits", scenes: TRAIT_MOTIF_SCENES, section: "Trait body motif art" },
      ...varietyFamily(TRAIT_SCENES, "Trait category scenes"),
      ...varietyFamily(OPT_SCENES, "Class option scenes"),
      ...varietyFamily(ARCH_SCENES, "Archetype scenes")
    ]
  },
  16: {
    file: "BATCH16-Rules-NPCs-Deities",
    title: "BATCH 16 (Rules, NPCs, and the last of the pantheon)",
    blurb: "The rules bucket is 3,102 pages on 40 scenes. This takes it to 181. NPCs go 12 to 48. And the\nremaining 163 deities finish that bucket at 463 of 463 — which also gives the 57 religion traits\nwhose deity had no art a picture of their own god.",
    parts: [
      { kind: "variety", name: "rules", scenes: RULES_VARIETY, section: "Rules scenes" },
      { kind: "variety", name: "npc", scenes: NPC_SCENES, section: "NPC scenes" },
      ...varietyFamily(NPC_ROLE_SCENES, "NPC role art"),
      { kind: "named", list: NAMED_DEITIES, keyFrom: "deity-", section: "Deities" }
    ]
  }
};

// Expand a whole family of variety sets ("school-", "trait-", "type-", "opt-", "arch-", "hazard-")
// into one part each, so a batch names the family rather than forty individual sets.
function varietyFamily(map, section) {
  return Object.entries(map).map(([name, scenes]) => ({ kind: "variety", name, scenes, section }));
}

const problems = [], spare = [];
function buildBatch(n) {
  const spec = BATCHES[n], out = [];
  for (const part of spec.parts) {
    if (part.kind === "themes") {
      const table = THEMES[part.bucket];
      if (!table) { problems.push(`batch ${n}: no theme table for bucket "${part.bucket}"`); continue; }
      for (const row of table) {
        const key = row[0], variants = row[3] || 1, scenes = part.scenes[key];
        if (!scenes) { problems.push(`${part.bucket}/${key} is declared in themes.js but has NO scene description`); continue; }
        // Too FEW descriptions is a hard error — that image would be commissioned blind.
        // Too many is fine and expected: size-variants rebalances counts as the data shifts, and
        // a spare description costs nothing. Surface it so it can be tidied, do not block on it.
        if (scenes.length < variants) { problems.push(`${part.bucket}/${key} declares ${variants} variant(s) but has only ${scenes.length} description(s)`); continue; }
        if (scenes.length > variants) spare.push(`${part.bucket}/${key} (+${scenes.length - variants})`);
        for (let v = 1; v <= variants; v++) {
          const artKeyName = `theme-${part.bucket}-${key}-${v}`;
          if (PRESENT.has(artKeyName)) continue;
          out.push({ section: part.section, label: `${key} (variant ${v} of ${variants})`, key: artKeyName, subject: scenes[v - 1] });
        }
      }
      for (const key of Object.keys(part.scenes))
        if (!table.some(r => r[0] === key)) problems.push(`scene described for ${part.bucket}/"${key}", which is NOT a theme in themes.js`);
    } else if (part.kind === "variety") {
      const count = VARIETY[part.name];
      if (!count) { problems.push(`batch ${n}: variety set "${part.name}" is not declared in PF_VARIETY`); continue; }
      if (!part.scenes || part.scenes.length < count) {
        problems.push(`variety "${part.name}" declares ${count} scene(s) but only ${part.scenes ? part.scenes.length : 0} are described`); continue;
      }
      if (part.scenes.length > count) spare.push(`${part.name} (+${part.scenes.length - count})`);
      for (let v = 1; v <= count; v++) {
        const artKeyName = `${part.name}-${v}`;
        if (PRESENT.has(artKeyName)) continue;          // already drawn — nothing to commission
        // A null slot is only legal when its art already exists; needing one is a hard error.
        if (part.scenes[v - 1] == null) { problems.push(`variety "${artKeyName}" has no art and no scene description`); continue; }
        out.push({ section: part.section, label: `${part.name} scene ${v}`, key: artKeyName, subject: part.scenes[v - 1] });
      }
    } else if (part.kind === "bodythemes") {
      const table = (globalThis.window.PF_BODY_THEMES || {})[part.bucket];
      if (!table) { problems.push(`batch ${n}: no body-motif table for "${part.bucket}"`); continue; }
      for (const [key, , variants] of table) {
        const scenes = part.scenes[key];
        if (!scenes) { problems.push(`body motif ${part.bucket}/${key} has NO scene description`); continue; }
        if (scenes.length < (variants || 1)) { problems.push(`body motif ${part.bucket}/${key} declares ${variants} but has only ${scenes.length}`); continue; }
        for (let v = 1; v <= (variants || 1); v++) {
          const k = `theme-${part.bucket}-${key}-${v}`;
          if (PRESENT.has(k)) continue;
          out.push({ section: part.section, label: `${key} (body motif ${v} of ${variants})`, key: k, subject: scenes[v - 1] });
        }
      }
    } else if (part.kind === "named") {
      for (const row of part.list) {
        // Either [label, key, subject] or, with keyFrom, [label, subject] with the key derived.
        const [label, key, subject] = part.keyFrom ? [row[0], part.keyFrom + slug(row[0]), row[1]] : row;
        if (PRESENT.has(key)) continue;
        out.push({ section: part.section, label, key, subject });
      }
    }
  }
  return out;
}

const WANT = process.argv.slice(4).filter(a => /^\d+$/.test(a)).map(Number);
const batchNums = WANT.length ? WANT : Object.keys(BATCHES).map(Number);
const built = {};
for (const n of batchNums) built[n] = buildBatch(n);

if (problems.length) {
  console.error("REFUSING TO GENERATE — themes.js and the scene lists disagree:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
for (const n of batchNums) {
  const dupes = built[n].map(i => i.key).filter((k, i, a) => a.indexOf(k) !== i);
  if (dupes.length) { console.error(`batch ${n} duplicate keys: ${dupes.join(", ")}`); process.exit(1); }
}

async function emit(n) {
  const spec = BATCHES[n], items = built[n];
  const sections = [...new Set(items.map(i => i.section))];
  const lines = [];
  lines.push(`# PF1e Codex — Art Prompts — ${spec.title}`);
  lines.push("");
  lines.push(`**${items.length} images.**`);
  lines.push("");
  lines.push(spec.blurb);
  lines.push("");
  lines.push("## How to use this");
  lines.push("");
  lines.push("1. Generate one image per prompt below, in order.");
  lines.push("2. **Save each file using the exact _filename_ given in bold.** The site looks images up by that");
  lines.push("   name; a renamed file is an invisible file.");
  lines.push("3. Render at **1280x720** (16:9). Larger is fine and will be downscaled on ingest; smaller is not.");
  lines.push("4. If the generator produces two candidates per prompt, keep both — the ingest step picks one and");
  lines.push("   the spare stays available as an alternate.");
  lines.push("5. Drop everything into the `CODEX IMAGES` folder. Nothing else is needed.");
  lines.push("");
  for (const sec of sections) {
    const mine = items.filter(i => i.section === sec);
    lines.push(`## ${sec} (${mine.length})`);
    lines.push("");
    for (const it of mine) {
      lines.push(`### ${it.label}`);
      lines.push(`**${it.key}**`);
      lines.push("");
      lines.push(`${it.subject} ${SUFFIX} ${STYLE}`);
      lines.push("");
    }
  }
  fs.writeFileSync(path.join(OUT, `PF1e-Codex-Art-Prompts-${spec.file}.md`), lines.join("\n"), "utf8");
  fs.writeFileSync(path.join(OUT, `${spec.file.split("-")[0]}-keys.json`), JSON.stringify(items.map(i => i.key), null, 1), "utf8");
  console.log(`\n${spec.file}: ${items.length} prompts`);
  for (const sec of sections) console.log(`   ${sec}: ${items.filter(i => i.section === sec).length}`);

  try {
    const { Document, Packer, Paragraph, HeadingLevel } = await import(process.env.DOCX_MODULE || "docx");
    const kids = [new Paragraph({ text: `PF1e Codex — Art Prompts — ${spec.title}`, heading: HeadingLevel.TITLE })];
    kids.push(new Paragraph({ text: `${items.length} images. Save each file under the exact filename shown in bold. Render at 1280x720 (16:9).` }));
    for (const sec of sections) {
      const mine = items.filter(i => i.section === sec);
      kids.push(new Paragraph({ text: `${sec} (${mine.length})`, heading: HeadingLevel.HEADING_1 }));
      for (const it of mine) {
        kids.push(new Paragraph({ text: it.label, heading: HeadingLevel.HEADING_2 }));
        kids.push(new Paragraph({ text: it.key + ".webp" }));
        kids.push(new Paragraph({ text: `${it.subject} ${SUFFIX} ${STYLE}` }));
      }
    }
    const buf = await Packer.toBuffer(new Document({ sections: [{ children: kids }] }));
    fs.writeFileSync(path.join(OUT, `PF1e-Codex-Art-Prompts-${spec.file}.docx`), buf);
    console.log("   wrote .docx");
  } catch { console.log("   (.docx skipped — set DOCX_MODULE to a local `docx` install)"); }
}
if (spare.length) console.log(`
spare descriptions (harmless, counts were rebalanced): ${spare.length} — ${spare.slice(0, 6).join(", ")}${spare.length > 6 ? " …" : ""}`);
for (const n of batchNums) await emit(n);
