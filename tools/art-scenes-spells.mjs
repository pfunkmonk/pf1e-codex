/* Scene descriptions for the SPELLS bucket. Consumed by gen-art-prompts.mjs, which cross-checks
 * every key and count against data/themes.js and refuses to run on a mismatch.
 *
 * Two sets here. THEMES now cover 73% of unnamed spells. Name matching alone reached only 44%,
 * because spell names are poetry rather than description — "Aphasia" tells you nothing. The lift
 * comes from matching the SNIPPET, which opens with the stat block: "School enchantment
 * (compulsion) [mind-affecting]". Subschool and descriptors are authored categories, so they place
 * a spell far more reliably than its name ever could. SCHOOLS are the per-school variety sets that
 * catch whatever still has neither.
 */
export const SPELL_THEME_SCENES = {
  resurrection: ["A body on a bier surrounded by kneeling companions as the first breath returns and light floods the chest."],
  healing: [
    "A healer's hands closing over a deep wound, torn flesh knitting shut beneath a warm glow.",
    "A fallen fighter sitting up on a battlefield, colour returning to their face as a cleric withdraws.",
    "A battlefield medic's hands glowing over a chest wound as breathing steadies.",
    "A whole party restored at once, light settling over each of them in turn."
  ],
  undead: [
    "A robed caster raising both arms over broken ground as skeletal figures haul themselves upright.",
    "A pale hand touching a living shoulder, vitality draining visibly away into the toucher.",
    "A caster halting an advancing corpse mid-step with a raised palm."
  ],
  summoning: [
    "A chalk circle blazing on flagstones as a heavy shape resolves out of nothing inside it.",
    "A celestial creature descending through a shaft of light, wings still folding.",
    "A pack of summoned beasts appearing mid-lunge around a caster who has not moved.",
    "An outsider stepping out of a tear in the air, one foot already on the floor.",
    "A circle of summoned defenders appearing in a ring around their caster.",
    "A single enormous creature arriving in a courtyard too small for it.",
    "A swarm of small conjured things boiling out of a sigil on the floor.",
    "An elemental rising out of the material it is made from."
  ],
  teleport: ["Two figures dissolving into streaks of light at one end of a hall and reforming at the other.",
    "A party vanishing from a burning room in a single silent flash.",
    "A caster stepping through a doorway of light onto a distant hillside."
  ],
  divination: [
    "A scrying bowl showing a distant room in perfect detail while the seer's own room stays dark.",
    "A diviner surrounded by drifting images of possible futures, each slightly different.",
    "A caster's eyes filmed over white while their body stands motionless."
  ],
  illusion: [
    "A caster standing beside an exact duplicate of themselves, one of them faintly wrong.",
    "A stone wall rippling like water as a hidden corridor shows through the illusion.",
    "A figure fading from sight from the feet upward, footprints still pressing into dust.",
    "A phantom army cresting a ridge, banners and all, casting no dust.",
    "A door painted onto a blank wall that a hand is passing through.",
    "A creature's terror given visible shape only it can see.",
    "A silent scene playing out in the air above a caster's palm.",
    "A room that shows a different room to each person in it.",
    "A figure whose face keeps almost resolving and never does.",
    "A mirage of water shimmering across a desert road.",
    "A caster standing in plain sight while every eye slides past them."
,
    "A caster's reflection stepping out of a mirror and walking away independently."
    ],
  "charm-mind": [
    "A caster's outstretched hand and a guard's face going slack and agreeable mid-challenge.",
    "A crowd all turning to face one speaker at once with identical, untroubled expressions.",
    "A guard's hostile stance softening into open friendliness mid-challenge.",
    "A puppeteer's gesture and a person's limbs answering it.",
    "A crowd turning to face one speaker in perfect unison.",
    "A prisoner cheerfully unlocking their own cell door.",
    "Two figures locked eye to eye, one clearly losing.",
    "A commander's own soldiers turning slowly toward them.",
    "A whispered word entering an ear as a visible thread of light.",
    "A banquet where every guest has stopped mid-motion, enraptured.",
    "A warrior lowering a raised blade against obvious intent.",
    "A figure walking calmly toward a cliff edge, smiling.",
    "A caster's fingers moving and a distant person's mirroring them.",
    "A person arguing passionately for something they hated an hour ago."
  ],
  fear: ["A wave of visible dread rolling outward from a caster, armed men breaking and running from it.",
    "A lone figure radiating dread as armed men drop weapons and run."
  ],
  "sleep-daze": ["An entire guardroom slumped where they sat, cards still in one sleeping hand."],
  polymorph: [
    "A figure caught mid-transformation into a great bear, one arm still human.",
    "A wizard shrinking to the size of a mouse, robes collapsing around them.",
    "A caster's skin hardening into elemental stone from the fingertips inward.",
    "A druid unfolding into a bird of prey, the last of the human shape dissolving.",
    "A warrior swelling to giant size, armour straps bursting one by one.",
    "A caster flowing into a form of running water and away down a drain.",
    "A party all changed into birds, lifting from a tower window together."
  ],
  protection: [
    "A shimmering dome of force closing over a kneeling party as a blast breaks against it.",
    "A cleric's raised holy symbol projecting a wall of light that fiends recoil from.",
    "A translucent shield snapping into place a hand's width from an incoming blade.",
    "Runes of warding igniting in sequence around a doorway.",
    "A traveller walking unharmed through driving flame inside a bubble of calm air."
  ],
  "wall-barrier": [
    "A wall of roaring flame springing up across a corridor from floor to ceiling.",
    "A thicket of grasping vines erupting from flagstones to seal a passage."
  ],
  "weapon-buff": [
    "A plain sword igniting along its length as a caster draws a finger down the blade.",
    "A spectral weapon hovering unheld beside a cleric, matching their gestures.",
    "An arrow splitting into a dozen identical shafts in mid-flight.",
    "A blade's edge sharpening visibly, light narrowing to a hairline along it."
  ],
  "armor-buff": ["A figure's skin toughening into bark-like plates as a druid completes a gesture."],
  movement: [
    "A caster lifting smoothly off the ground with no wings and no effort, robes hanging straight down.",
    "A runner blurring into multiple overlapping images from sheer speed."
  ],
  planar: [
    "A caster standing half in one plane and half in another, the seam running down their body.",
    "A hall where the floor opens onto a burning sky and nobody falls.",
    "A summoned celestial and a summoned fiend facing off across a circle.",
    "A caster's holy word striking fiends like a physical wave.",
    "A doorway opening onto a plane of endless burning sky.",
    "A blasphemous utterance withering everything good in the room.",
    "A caster standing on ground that belongs to another world entirely."
  ],
  "curse-affliction": [
    "A pointing finger and a victim's eyes clouding over into blind white.",
    "A caster's whispered word rotting a strong man visibly into frailty.",
    "A sigil burning itself into a victim's forehead as they claw at it.",
    "A victim's limbs stiffening as a curse takes hold.",
    "A caster's finger tracing a mark that will not wash off.",
    "Sickness spreading visibly through a body as a spell lands.",
    "A once-strong figure withered to frailty in a moment.",
    "A pointing hand and a target clutching at blinded eyes."
  ],
  "light-dark": [
    "A brilliant point of light hanging above an outstretched palm, driving shadow into the corners.",
    "A sphere of absolute darkness swallowing a lit room from its centre outward.",
    "A sunburst detonating in a crypt, undead disintegrating in its wash.",
    "A lantern of daylight held up in a cavern, shadows fleeing to the walls.",
    "A caster swallowed by a sphere of darkness that eats even torchlight."
  ],
  fire: [
    "A fireball blooming at the far end of a hall, the shockwave already arriving.",
    "A thin jet of flame lancing from two fingers across a dark room.",
    "A ring of flame springing up around a caster in a defensive circle.",
    "A single flaming sphere rolling down a corridor of its own accord.",
    "A hand igniting a distant target with a snap of the fingers."
  ],
  cold: ["A cone of frost freezing everything in its path, a charging figure locked mid-stride in ice.",
    "A caster's breath freezing the air into a wall of drifting ice crystals."
  ],
  lightning: [
    "A bolt of lightning leaping from a caster's fingers straight down a stone corridor.",
    "Forked electricity arcing between several targets in sequence, each lit for an instant."
  ],
  acid: ["A gout of acid striking a door and eating through it, edges hissing and running."],
  sonic: ["A shouted word made visible as a distorting ring of force, glass shattering along its front.",
    "A caster's voice shattering a stone pillar into fragments."
  ],
  force: [
    "Darts of pure force streaking unerringly around cover to their target.",
    "An invisible hand lifting a heavy chest, dust falling from a shape that is not there.",
    "A wall of invisible force stopping a charge dead, bodies crumpling against nothing.",
    "A caster's fist striking from across a room with no arm attached to it."
  ],
  "earth-stone": [
    "The ground heaving upward into a wall of raw stone at a caster's gesture.",
    "A man turning to grey statue from the feet up, expression caught mid-shout.",
    "Solid rock softening to mud beneath an advancing column."
  ],
  "plant-nature": ["A druid's staff sprouting into a living tree, roots cracking the flagstones."],
  animal: [
    "A druid speaking with a circle of attentive woodland animals in a clearing.",
    "A swarm of summoned creatures pouring over a barricade."
  ],
  weather: ["A caster on a hilltop with both arms raised as a clear sky turns to storm above them.",
    "A caster parting a storm overhead into clear sky directly above them."
  ],
  water: ["A column of water rising out of a river and holding its shape at a caster's command.",
    "A wave rising at a caster's command and standing upright.",
    "A figure walking down into deep water and breathing easily."
  ],
  "symbol-rune": [
    "A glowing rune inscribed on a floor flaring white as the first intruder crosses it.",
    "A caster tracing an intricate sigil in the air that hangs there, burning.",
    "A doorway ringed with warding glyphs, each one lit a different colour."
  ],
  "mind-psychic": [
    "A caster and target locked eye to eye as visible thought passes between them.",
    "A person's memories spilling out into the air as readable fragments.",
    "A seated figure's mind depicted as a lit architecture behind their skull.",
    "A caster reading a sleeping person's dream as pictures above the bed.",
    "Two psychics duelling with nothing visible but their expressions."
,
    "A caster lifting a memory out of a subject's head as a slow drifting image."
    ],
  communication: [
    "A whispered message travelling as a thread of light across a night landscape to a distant ear.",
    "Two figures in different rooms speaking as if face to face, a shimmer between them."
  ],
  creation: ["A caster's gesture pulling a fully formed feast and table out of empty air.",
    "A bridge assembling itself plank by plank across a chasm.",
    "A wall of stone rising out of nothing to seal a corridor.",
    "A caster pulling a rope, a lantern and a meal out of empty air.",
    "A shelter unfolding from nothing on an exposed hillside."
  ],
  "blood-flesh": [
    "A wound opening on an untouched target as a caster clenches their fist.",
    "Flesh knitting and unknitting in an unnatural way under a caster's hand.",
    "A caster drawing a rope of blood out of the air and shaping it."
  ],
  "ritual-occult": ["Robed figures around a chalk diagram at midnight, candles at every vertex, one shape forming above."],
  "ability-buff": ["A warrior straightening as a blessing settles on them, muscles cording, eyes clearing."],
  "dispel-negate": ["A caster's counter-gesture unravelling an enemy spell into fading threads of light."],
  "trap-alarm": ["An invisible ward across a doorway flaring into visibility as something breaks it."]
};

/* Per-school variety sets. These back spells whose names could not be classified, so they must
   read as that school's FLAVOUR rather than any particular spell. */
export const SCHOOL_SCENES = {
  "school-abjuration": [
    "A glowing ward-circle inscribed on a tower floor, sigils turning slowly.",
    "A translucent barrier holding against a battering force, light rippling at the impact point.",
    "A protective sigil chalked across a doorway, freshly drawn.",
    "A caster with crossed forearms, a shield of light braced before them.",
    "A ring of standing stones humming with protective power at dusk.",
    "A locked chest wrapped in bands of glowing script.",
    "A dispelling gesture unwinding hostile magic into drifting threads.",
    "A sanctuary chamber where the air itself refuses intrusion."
  ],
  "school-conjuration": [
    "A summoning circle mid-activation, something arriving inside it.",
    "A portal standing open in a stone arch, another landscape beyond.",
    "Objects appearing out of empty air above an outstretched hand.",
    "An acid pool conjured onto flagstones, stone hissing beneath it.",
    "A caster stepping into one doorway of light and out of another.",
    "A creature half-arrived, its outline still resolving.",
    "A conjured wall of fog rolling across a floor.",
    "A banquet appearing fully laid on a bare table.",
    "A rain of conjured stones falling inside a room.",
    "A shimmering gate framed by carved runes.",
    "A tent and campsite unfolding from nothing on bare ground.",
    "A caster's hand emerging from a rip in the air across the room.",
    "A summoned steed materialising at a gallop.",
    "A cloud of conjured insects boiling out of a point in space."
  ],
  "school-divination": [
    "A scrying pool showing a distant scene in still water.",
    "A crystal ball on a stand with an image forming inside.",
    "A diviner reading scattered bones on a cloth.",
    "An eye of light hovering at a corridor's end, watching.",
    "A map with a route drawing itself across the parchment.",
    "A seer surrounded by faint overlapping images of what will happen.",
    "A hand hovering over an object, its history rising as pictures.",
    "A caster seeing the true form beneath an illusion, both shown at once.",
    "Cards laid in a spread, one turned and glowing.",
    "A telescope aimed not at the sky but at a wall, showing through it.",
    "A dream-vision of a distant place hanging above a sleeper."
  ],
  "school-enchantment": [
    "A caster's hand extended, a guard's expression turning friendly mid-word.",
    "A crowd all facing one direction with identical calm faces.",
    "A commanding gesture and a warrior lowering their weapon against their will.",
    "Threads of coloured light running from a caster's fingers to several heads.",
    "A figure walking willingly toward danger with a serene expression.",
    "A banquet hall where every guest has stopped, spellbound, mid-motion.",
    "A whispered suggestion visualised as a thread entering an ear.",
    "A sleeping guard slumped upright at their post.",
    "A duel where one combatant simply stops, entranced.",
    "A caster's eyes lit from within as they hold another's gaze.",
    "A courtier smiling under an enchantment they do not know they are under.",
    "A crowd's raised faces all lit by the same unnatural devotion."
  ],
  "school-evocation": [
    "A blast of raw energy tearing down a stone corridor.",
    "A caster with both hands thrust forward, force erupting from the palms.",
    "A detonation lighting a cavern from within.",
    "Bolts of energy streaking around cover toward a target.",
    "A column of fire from ceiling to floor in a great hall.",
    "Ice spreading explosively outward across a floor.",
    "Lightning earthing through a room, arcs crawling along metal.",
    "A shockwave of sound distorting the air in a visible ring.",
    "A caster wreathed in crackling contained power, about to release it.",
    "A crater still glowing at the centre of a scorched floor."
  ],
  "school-illusion": [
    "A figure standing beside a perfect double of themselves.",
    "A wall that is not there, the corridor showing faintly through it.",
    "A caster fading out of sight, outline last to go.",
    "A monstrous shape looming that casts no shadow.",
    "A landscape shimmering and resolving into a different landscape."
  ],
  "school-necromancy": [
    "A necromancer over disturbed graves as hands break the soil.",
    "A pale drain of life-light flowing from victim to caster.",
    "A crypt where the dead are standing up in ranks.",
    "A withered corpse animated and turning its head.",
    "A skull on a table with light kindling in its sockets.",
    "A caster's touch blackening living flesh at the contact point.",
    "A battlefield of the risen under a low red sky.",
    "A soul drawn out as a thread of pale vapour.",
    "A shrouded figure conducting a chorus of the dead.",
    "Bone assembling itself into a standing skeleton mid-air.",
    "A grave-mist creeping across a churchyard at night.",
    "A ritual over a shrouded body, sigils burning on the wrappings."
  ],
  "school-transmutation": [
    "A stone statue softening back into living flesh.",
    "A man turning to grey stone from the feet upward.",
    "A figure mid-shift into a great beast, one arm still human.",
    "A wizard shrunk to a hand's height beside a normal-sized boot.",
    "A warrior swelling to giant size, straps bursting.",
    "Iron bars bending like warm wax at a touch.",
    "A blade's edge visibly sharpening to a hairline.",
    "Rock flowing into thick mud beneath marching feet.",
    "A figure becoming translucent gaseous vapour from the legs up.",
    "A caster walking up a vertical wall as if it were floor.",
    "A runner blurred into overlapping images by speed.",
    "A body rising slowly off the ground with no visible support.",
    "A person breathing comfortably underwater, hair drifting upward.",
    "Wooden planks reshaping themselves into a finished door.",
    "A tiny object expanding to full size in an open palm.",
    "A large chest shrinking to fit between finger and thumb.",
    "A druid unfolding into a bird of prey mid-leap.",
    "Skin hardening into bark-like plates.",
    "A pair of wings sprouting from a caster's back.",
    "An ordinary rat swelling into a hound-sized beast.",
    "A caster's eyes changing to see clearly in total darkness.",
    "A figure stepping onto water and standing on the surface.",
    "A rusted blade restored to bright new steel.",
    "Lead ingots turning to gold on a workbench.",
    "A door dissolving into nothing under a laid hand.",
    "A caster's arm elongating far past its natural reach.",
    "A heavy stone lifted effortlessly by an unseen force.",
    "A figure leaping an impossible distance between rooftops.",
    "A knotted rope untying and retying itself in the air.",
    "A cracked wall knitting whole again from the fracture outward.",
    "A caster's features flowing into a different face entirely.",
    "A cart wheel repairing itself while still turning.",
    "A patch of barren ground erupting into full growth.",
    "A caster's shadow detaching and moving on its own."
  ]
};
