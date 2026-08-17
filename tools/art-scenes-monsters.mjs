/* Scene descriptions for the MONSTERS bucket.
 *
 * THEMES here are NOT creature portraits. Real monsters resolve by name, subtype or type long
 * before the theme layer — 2,115 of 3,919 do. These cover the rules-shaped rawCats that happen to
 * live in this bucket: Universal Monster Rules, Templates and Animal Companions.
 *
 * TYPE_SCENES are the per-type variety sets that catch the creatures with no portrait of their
 * own, so they must read as that type's FLAVOUR rather than any one creature.
 */
export const MONSTER_THEME_SCENES = {
  "animal-bigcat": [
    "A great hunting cat crouched low on a branch, weight shifted forward, eyes fixed.",
    "A lion mid-stride across open grassland at golden hour, mane heavy with dust."
  ],
  "animal-canine": ["A wolf standing alert at a treeline in snow, breath steaming, pack shapes behind it."],
  "animal-bear": ["A great bear rearing on its hind legs at the edge of a river, water streaming off its fur."],
  "animal-bird": [
    "A hunting bird at the moment of stoop, wings swept back, talons opening.",
    "A large raven on a weathered post, head cocked, eye bright and assessing."
  ],
  "animal-reptile": [
    "A crocodile half-submerged in still water, only eyes and nostrils breaking the surface.",
    "A coiled serpent raised and hooded, tongue extended, scales catching light.",
    "A horned dinosaur standing broadside in tall ferns, dwarfing the trees behind.",
    "A monitor lizard on hot rock, throat pulsing, claws splayed.",
    "A raptor mid-run through undergrowth, sickle claw lifted clear of the ground."
  ],
  "animal-aquatic": [
    "A shark turning below the surface, seen from above through green water.",
    "A giant octopus filling a flooded chamber, one arm exploring a doorway.",
    "A shoal parting around something large and unseen in deep blue water."
  ],
  "animal-insect": [
    "A giant beetle's armoured carapace filling the frame, mandibles working.",
    "A great spider descending on a line of silk out of dark rafters.",
    "A scorpion the size of a dog on desert stone, tail arched forward.",
    "A column of soldier ants pouring over a fallen log.",
    "A mantis reared up in tall grass, forelimbs folded and ready."
  ],
  "animal-hoofed": [
    "A warhorse rearing in harness, hooves high, mane flying.",
    "A great stag standing in morning mist, antlers wide and dark.",
    "A mammoth walking through snow, trunk raised, tusks sweeping."
  ],
  "animal-primate": ["A great ape braced on knuckles at the edge of a jungle clearing, shoulders enormous."],
  "animal-small": [
    "A swarm of rats pouring over a cellar step in a moving carpet.",
    "A bat cloud boiling out of a cave mouth against a dusk sky."
  ],
  "template-undead": [
    "A living figure and its undead counterpart side by side, the same face gone grey and hollow.",
    "A corpse rising with its wounds still open, eyes lighting from within.",
    "A translucent spirit peeling away from a body it used to occupy.",
    "A withered mummified form unwrapping one bandaged arm.",
    "A vampire's silhouette in a doorway with no reflection in the mirror beside it."
  ],
  "template-fiend": [
    "A creature part-transformed by fiendish corruption, horns breaking through the skull.",
    "A beast with burning eyes and blackened hide standing in a scorched circle.",
    "Infernal script crawling across a living creature's skin like a brand.",
    "A shadow on a wall that has horns the caster does not."
  ],
  "template-celestial": ["A creature haloed in clean light, feathers of a wing just visible behind the shoulder."],
  "template-elemental": [
    "A creature made of living flame holding a roughly humanoid shape.",
    "A beast of packed ice and frost, vapour pouring off its flanks.",
    "A form of tumbled stone and earth rising out of the ground.",
    "A shape of moving water holding together without a vessel.",
    "A creature of wind and dust, outline defined only by what it carries."
  ],
  "template-beast": [
    "A person mid-change into a savage animal form, clothing tearing away.",
    "A hulking feral version of an ordinary animal, scarred and oversized."
  ],
  "template-construct": [
    "A stone golem standing motionless in an alcove, seams visible.",
    "A clockwork figure with its chest panel open, gears turning inside.",
    "An animated suit of armour with nothing inside the visor.",
    "A construct of bound iron plates, joints glowing at the pins.",
    "A wooden automaton mid-step, grain and joinery clearly visible.",
    "A crude flesh-stitched construct on a slab, restraints hanging loose.",
    "A brass mechanism unfolding into a standing humanoid shape."
  ],
  "template-mutation": [
    "A creature grown far beyond its natural size, dwarfing a doorway.",
    "A beast with an extra pair of limbs, all of them moving.",
    "An animal whose eyes have gone clever and calculating.",
    "A creature crusted with unnatural mineral growth along its spine.",
    "A beast wreathed in a faint aura of borrowed power.",
    "A twisted version of a familiar animal, proportions subtly wrong.",
    "A creature whose form flickers between two different shapes.",
    "A monster with mismatched parts fused into one body.",
    "An animal with armour plating grown over its natural hide.",
    "A beast trailing a residue of raw magic as it moves.",
    "A creature scaled up to titanic size against a ruined city.",
    "An animal rendered translucent, skeleton visible within.",
    "A beast with a second head sharing the same shoulders.",
    "A creature marked with glowing sigils across its flanks.",
    "An ordinary animal standing in an unnaturally upright, deliberate posture."
  ],
  "umr-sense": ["A creature's head turning toward something behind a wall, eyes closed, clearly perceiving it anyway."],
  "umr-attack": ["A beast's jaws closing on an arm and hauling backward, claws already coming up."],
  "umr-defense": ["A wound on a monster closing over as fast as it is opened, blade still in motion."],
  "umr-magic": [
    "A creature's gaze meeting a victim's, the victim already stiffening to stone.",
    "A beast exhaling a cone of raw energy, chest still swelling with it."
  ],
  "umr-movement": ["A creature bursting up through solid ground, earth spraying outward."],
  "umr-affliction": ["A wound blackening outward from a bite, veins darkening under the skin."]
};

export const TYPE_SCENES = {
  "type-aberration": [
    "A mass of eyes and tendrils filling a flooded chamber.",
    "A creature whose anatomy makes no sense, limbs where none should be.",
    "A boneless shape flowing through a doorway too small for it.",
    "A thing with a mouth that opens the wrong way.",
    "A pale wet form clinging to a cavern ceiling.",
    "An impossible geometry of flesh turning slowly in dark water.",
    "A creature trailing feelers that taste the air ahead of it.",
    "A shape in deep water lit from below, outline never quite resolving."
  ],
  "type-animal": [
    "A predator crouched in long grass, only the eyes clearly visible.",
    "A herd moving across an open plain under a wide sky.",
    "A bird of prey on a bare branch against grey cloud.",
    "A river full of something large moving beneath the surface.",
    "A pack circling in snow at the edge of firelight.",
    "A great beast drinking at a pool at dusk.",
    "Tracks in mud leading away into fog.",
    "A nest high on a cliff face with something stirring in it.",
    "A forest clearing full of watching animal eyes.",
    "A watering hole at dawn crowded with animals that have all stopped drinking at once."
  ],
  "type-construct": [
    "A motionless guardian figure in an alcove, dust on its shoulders.",
    "A mechanism grinding into motion after long stillness.",
    "A workshop of half-finished constructs on stands.",
    "A stone sentinel cracked but still standing at a gate."
  ],
  "type-dragon": [
    "A great winged shape circling above a mountain valley.",
    "A dragon's eye filling the frame, slit pupil narrowing.",
    "Claws closing over a heap of coin and treasure.",
    "A serpentine body coiled through the pillars of a ruined hall.",
    "A dragon's head lowering into a cavern mouth, breath already gathering.",
    "Wings spread against a burning sky at dusk.",
    "A dragon asleep on its hoard, one eye barely open.",
    "Scales in extreme close view, each one the size of a shield.",
    "A dragon rising from a lake in a sheet of falling water."
  ],
  "type-fey": [
    "A ring of mushrooms in a moonlit glade with something watching from the trees.",
    "A slender figure of bark and blossom standing where no one stood a moment ago.",
    "Lights dancing over a marsh at night, leading somewhere.",
    "A door in the trunk of an ancient tree, standing slightly open.",
    "A creature of leaves and antlers regarding the viewer with amusement.",
    "A revel glimpsed through undergrowth, too bright and too old."
  ],
  "type-humanoid": [
    "A war party silhouetted on a ridge at dusk, weapons raised.",
    "A tribal camp of hide tents with fires burning low."
  ],
  "type-magical-beast": [
    "A lion-bodied creature with a second, wrong head turning toward the viewer.",
    "A winged beast perched on a broken column, tail lashing.",
    "A creature with a mane of quills bristling in threat.",
    "A great cat with a scorpion's tail arched over its back.",
    "A serpent-bodied beast with too many eyes coiled in a ruin.",
    "A shaggy beast with glowing eyes at the mouth of a cave.",
    "A horned quadruped standing in mist, clearly not natural.",
    "A creature with feathered wings and a beast's body mid-leap.",
    "A many-headed thing rising from a swamp, all heads turning together.",
    "A luminous beast drinking from a still forest pool at night."
  ],
  "type-monstrous-humanoid": [
    "A horned figure standing upright in a labyrinth corridor.",
    "A winged humanoid perched on a battlement, claws gripping stone.",
    "A serpent-bodied figure with a human torso raised from a pool.",
    "A hulking shape in a doorway, proportions almost but not quite human.",
    "A creature with a bird's head and a warrior's body holding a spear.",
    "A figure of stone-grey skin and jutting tusks in a mountain pass."
  ],
  "type-ooze": [
    "A translucent mass creeping down a corridor wall, objects suspended inside it.",
    "A pool on flagstones that is very slowly moving uphill.",
    "A gelatinous form filling a passage entirely, edges brushing both walls."
  ],
  "type-outsider": ["A figure that does not belong to this world standing calmly in a mortal room."],
  "type-plant": [
    "A tree that has pulled its roots free and taken a step.",
    "A mass of vines with something looking out from inside it.",
    "A vast flower opening in a swamp, interior lined with teeth.",
    "Fungal growths the height of a man in a lightless cavern.",
    "A hedge that has closed across a path that was open."
  ],
  "type-undead": [
    "A skeletal figure in rusted mail standing at a crypt door.",
    "A translucent shape drifting down a manor corridor.",
    "A corpse-pale hand pushing up out of grave soil.",
    "A shrouded form on a throne in a lightless hall.",
    "A graveyard under mist with several silhouettes upright among the stones.",
    "A withered face beneath a hood, eyes lit from within."
  ],
  "type-vermin": [
    "A tide of chittering things pouring through a gap in the stonework.",
    "A single oversized insect filling a doorway, antennae working."
  ]
};

/* Subtype variety sets. `creature-aquatic` alone backed 211 pages on one image — existing art
   is not the same as adequately-spread art. The bare creature-<subtype> key stays beneath these
   as the final fallback. */
export const CREATURE_SCENES = {
  "creature-aeon": [
    "An impassive geometric being of rings and eyes, enforcing balance in a grey void."
  ],
  "creature-agathion": [
    "A noble beast-headed celestial with feathered wings on a sunlit hillside."
  ],
  "creature-air": [
    "A being of coiling wind and dust, outline visible only in what it carries.",
    "A vortex of wind and dust holding a rough shape.",
    "A gale carving a visible path across open ground.",
    "Air compressed into a lens that bends the light behind it."
  ],
  "creature-angel": [
    "A radiant winged figure descending in a column of clean light."
  ],
  "creature-aquatic": [
    "A dark shape circling below the surface, seen from a boat's shadow.",
    "A finned humanoid rising from kelp with a barbed spear.",
    "A vast eel coiling out of a sunken doorway.",
    "A reef of coral towers with something moving between them.",
    "A shoal parting around a predator in blue water.",
    "A drowned hall lit by shafts from a broken ceiling, shapes drifting.",
    "A crab the size of a cart clattering across a tidal flat.",
    "A luminous jellyfish bloom in lightless deep water.",
    "A shark turning in a shaft of surface light.",
    "A tentacle rising from black water beside a hull.",
    "An armoured fish-thing in a flooded corridor.",
    "A pod of great shapes breaching in open sea at dusk.",
    "A sea serpent's coils breaking the surface in three places.",
    "A cold trench floor with pale eyeless things walking on it.",
    "A shipwreck colonised by something that was not there before."
  ],
  "creature-archon": [
    "A lawful celestial in burnished armour holding a spear and a horn."
  ],
  "creature-asura": [
    "A many-armed fiend of broken divinity in a ruined temple."
  ],
  "creature-augmented": [
    "A creature altered beyond its natural form, changes visible along the spine."
  ],
  "creature-augmented-humanoid": [
    "A humanoid remade by outside power, features no longer entirely their own."
  ],
  "creature-azata": [
    "A joyful chaotic celestial trailing streamers of coloured light."
  ],
  "creature-boggard": [
    "A hulking frog-folk warrior rising from swamp water with a club."
  ],
  "creature-clockwork": [
    "A brass automaton mid-step, gears visible through an open chest plate."
  ],
  "creature-cold": [
    "A creature of packed ice and frost, vapour pouring off it.",
    "A shape moving through a blizzard, seen only as displaced snow."
  ],
  "creature-daemon": [
    "A gaunt fiend of pure malice above a plain of ash.",
    "A skeletal-winged horror presiding over a field of the dead."
  ],
  "creature-dark-folk": [
    "A small dark-skinned figure with huge eyes in a lightless tunnel."
  ],
  "creature-demon": [
    "A chaotic fiend of horns and hooked limbs in a burning waste.",
    "A bloated demon lord on a throne of bones.",
    "A swarm of lesser demons pouring through a rift.",
    "A serpentine demon coiled around a broken pillar."
  ],
  "creature-derro": [
    "A pale mad dwarf-thing with oversized eyes and an aetheric device."
  ],
  "creature-devil": [
    "A disciplined fiend in infernal plate holding a contract and a blade."
  ],
  "creature-div": [
    "A twisted spirit of ruin standing in a poisoned oasis."
  ],
  "creature-dwarf": [
    "A stout armoured figure in a mountain hall, axe across the shoulders."
  ],
  "creature-earth": [
    "A creature of tumbled stone and ore heaving up out of the ground.",
    "A mass of stone and ore heaving upward out of the ground.",
    "Rock flowing like water around a raised hand."
  ],
  "creature-elemental": [
    "A being of raw elemental force holding a roughly humanoid shape.",
    "Two opposed elements bound into one unstable creature."
  ],
  "creature-elf": [
    "A tall slender figure with a longbow in an ancient wood."
  ],
  "creature-evil": [
    "A shape of concentrated malevolence in a darkened shrine."
  ],
  "creature-extraplanar": [
    "A figure that plainly does not belong to this world standing in a mortal room.",
    "A being stepping through a tear in the air, one foot still elsewhere.",
    "A creature whose outline bends the light around it.",
    "A visitor from another plane on a hilltop under a wrong-coloured sky.",
    "A summoned outsider standing patiently inside a binding circle.",
    "A shape whose shadow falls in a direction nothing else does.",
    "A creature of impossible geometry in a chamber of right angles.",
    "A traveller between worlds at a threshold of carved stone.",
    "A being wreathed in the residue of the plane it came from.",
    "A form that flickers between two appearances as it moves.",
    "An outsider regarding a mortal with unreadable patience."
  ],
  "creature-fire": [
    "A creature of living flame in a roughly humanoid shape.",
    "A beast whose hide cracks open to show magma beneath.",
    "A column of living flame in a scorched circle, roughly humanoid.",
    "Fire held and shaped between two open palms.",
    "A wall of flame roaring up along a corridor.",
    "Embers spiralling upward from a figure standing unburnt."
  ],
  "creature-giant": [
    "An enormous humanoid stooping under a doorway built for it.",
    "A giant on a mountain ridge silhouetted against cloud.",
    "A giant's hand closing around a full-sized shield.",
    "A frost giant in furs on a glacier, breath steaming.",
    "A fire giant at an enormous forge, hammer raised."
  ],
  "creature-gnoll": [
    "A hyena-headed raider with a flail at a burning camp."
  ],
  "creature-goblinoid": [
    "A pack of small green raiders swarming over a wall.",
    "A hulking bugbear stepping out of shadow with a morningstar."
  ],
  "creature-great-old-one": [
    "An incomprehensible vastness half-seen beyond a rift in a black sky."
  ],
  "creature-herald": [
    "A deity's chosen messenger in unmistakable divine livery."
  ],
  "creature-human": [
    "A gathering of ordinary people who are plainly more than they appear.",
    "A lone figure on a road, unremarkable and dangerous."
  ],
  "creature-incorporeal": [
    "A translucent figure drifting through a solid wall.",
    "A shape visible only where dust hangs in its outline.",
    "A face forming briefly in cold mist in a corridor."
  ],
  "creature-inevitable": [
    "A construct of law and gears striding implacably down an endless corridor."
  ],
  "creature-kami": [
    "A nature spirit bound to an ancient tree, face suggested in the bark."
  ],
  "creature-kyton": [
    "A chain-wrapped fiend in a lightless chamber, hooks catching the light."
  ],
  "creature-leshy": [
    "A small plant-spirit of gourd and vine standing in a garden."
  ],
  "creature-mythic": [
    "A creature haloed in legendary power, the ground scorched where it stands."
  ],
  "creature-native": [
    "An outsider born to this world, standing easily in a mortal street.",
    "A planetouched figure whose heritage shows only in the eyes."
  ],
  "creature-oni": [
    "A horned ogre-spirit in lacquered armour on a mountain road."
  ],
  "creature-orc": [
    "A tusked warrior in scavenged plate at the head of a warband."
  ],
  "creature-planar": [
    "A creature shaped by the plane it belongs to, elements of it woven in.",
    "A being standing where two planes overlap, half in each."
  ],
  "creature-protean": [
    "A serpentine chaos-thing whose form will not hold still."
  ],
  "creature-psychopomp": [
    "A masked shepherd of souls at a threshold between worlds."
  ],
  "creature-qlippoth": [
    "A pre-mortal horror of wrong anatomy in an abyssal pit.",
    "A thing of eyes and hooks that predates the concept of sin."
  ],
  "creature-rakshasa": [
    "A tiger-headed fiend in silks with backward-facing hands."
  ],
  "creature-ratfolk": [
    "A whiskered trader with a heavy pack in a narrow tunnel market."
  ],
  "creature-reptilian": [
    "A scaled humanoid with a spear at a swamp's edge.",
    "A cold-eyed serpentfolk in ancient jewelled regalia."
  ],
  "creature-robot": [
    "A humanoid machine with glowing optics in a derelict corridor.",
    "A hovering drone scanning a dark room with a cold beam."
  ],
  "creature-sahkil": [
    "A fear-spirit of bone and shadow leaning over a sleeper."
  ],
  "creature-shapechanger": [
    "A figure caught between two forms, neither settled.",
    "A person whose reflection is a beast."
  ],
  "creature-swarm": [
    "A living carpet of small bodies pouring through a doorway.",
    "A cloud of flying things darkening a lantern's light.",
    "A boiling mass moving across a floor with one purpose."
  ],
  "creature-troop": [
    "A tight formation of soldiers moving and fighting as one body."
  ],
  "creature-water": [
    "A shape of moving water holding together without a vessel.",
    "A wave rearing and holding its shape without breaking.",
    "Water walking upright across a flooded floor.",
    "A whirlpool turning in place in still air.",
    "A figure moving inside a shell of running water."
    ]
};

/* The straggler set: 307 monsters that no name, theme, subtype or type could place — obscure
   real animals (Capybara, Bustard, Amargasaurus), odd templates and small monster families.
   Generic bestiary furniture by design: a page here should look like a bestiary, not a wrong guess. */
export const MONSTER_SCENES = [
  "A bestiary page spread open on a naturalist's desk with a specimen jar beside it.",
  "A field sketchbook of anatomical studies weighted open by a stone.",
  "A cave mouth with something unseen moving in the dark beyond.",
  "A forest clearing at dusk with watching eyes at the treeline.",
  "A riverbank with heavy tracks pressed into the mud.",
  "A hunter's blind overlooking a game trail at first light.",
  "A naturalist's collection of horns, shells and skulls on shelves.",
  "A menagerie cage with straw and a shape resting in shadow.",
  "A skeleton mounted and wired together in a study hall.",
  "A dense thicket with a path pushed through it by something large.",
  "A marsh at dawn with ripples spreading from nothing visible.",
  "A cliff ledge with a nest and scattered bones.",
  "A snowfield with a single line of tracks crossing it.",
  "A tidal pool with unfamiliar shapes under the surface.",
  "A grassland at noon with a herd blurred by heat haze.",
  "A ruined barn with something bedded down inside.",
  "A canopy walkway with movement in the branches above.",
  "A desert wadi with burrow mouths in the bank.",
  "A lantern-lit tunnel with eyeshine at the limit of the light.",
  "A trapper's line of snares along a hedgerow.",
  "A drover's road with a strange carcass at the verge.",
  "A shepherd's hut with claw marks on the door.",
  "A rock pool cave with pale things clinging to the ceiling.",
  "A moorland at dusk with a silhouette on the ridge.",
  "An old orchard where something has been stripping the bark."
];
