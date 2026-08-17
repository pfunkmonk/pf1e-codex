/* BODY MOTIF scenes for FEATS and ITEMS.
 *
 * These back entries whose name, type and stat block all said nothing useful, but whose full
 * description does. Matched offline by tools/derive-body-themes.mjs — see data/themes.js for why
 * that has to happen at build time rather than at render time.
 *
 * (Spell motif scenes live in art-scenes-spells.mjs, next to the rest of the spell art.)
 */

export const FEAT_MOTIF_SCENES = {
  "mythic-power": ["A figure blazing with legendary power, the ground beneath them scorched in a ring."],
  "wild-shape": ["A druid mid-change, half human and half great beast, clothing dissolving into hide."],
  "natural-weapon": ["Claws and fangs bared at close quarters, no weapon anywhere in the frame."],
  "animal-bond": ["A hunter and their companion animal moving as one, neither looking at the other."],
  "spell-like": [
    "A warrior producing a spell effect from a bare hand, no book and no components.",
    "An innate power surfacing unbidden, light leaking from between clenched fingers."
  ],
  "magic-item-use": ["A hand tilting a wand to read its charges, other trinkets spread on the table."],
  "energy-damage": ["A strike landing wreathed in raw elemental energy, the impact point white-hot."],
  "healing-recovery": ["A wound closing over on its own as its owner keeps fighting."],
  awareness: ["A scout's head snapping around to the one thing in the treeline that moved."],
  "speed-movement": ["A figure crossing broken ground at a dead run without breaking stride."],
  "social-skill": [
    "A negotiator reading the exact moment a room turns their way.",
    "A liar telling a flawless untruth to someone who plainly believes it."
  ],
  "ally-support": ["A fighter stepping into a gap in the line to cover a companion's blind side."],
  "saves-resilience": [
    "A figure braced against a wave of magical force, cloak shredding, feet planted.",
    "A warrior shaking off an effect that should have dropped them, jaw set.",
    "A last survivor standing amid fallen comrades, still upright.",
    "A hand thrown up against a blast, the blast breaking around them."
  ]
};

/* The cat-* keys come from the "Category" label in the item stat header — authored data, finer
   than the rawCat facet. The rest are prose motifs from the description. */
export const ITEM_MOTIF_SCENES = {
  "cat-mounts": [
    "A saddled riding horse waiting at a hitching rail outside an inn.",
    "A war-trained destrier in barding, a groom at the bridle.",
    "A pack mule loaded high on a mountain track.",
    "A hunting hound sitting alert on flagstones.",
    "A stable row with heads over every door.",
    "A camel train crossing dunes at low sun.",
    "A hawk hooded on a falconer's glove.",
    "A pony cart drawn up in a village square.",
    "An exotic riding beast led through a market, the crowd parting."
  ],
  "cat-advgear": [
    "A full adventurer's kit laid out on oiled canvas, every item in its place.",
    "A backpack propped against a milestone, straps frayed from the road.",
    "Rope, pitons and a grappling hook coiled beside a cliff edge.",
    "A bedroll, tinderbox and lantern arranged for a night camp.",
    "A waterskin, rations and a compass on a folded map.",
    "A climbing harness hanging from a peg beside a coil of line.",
    "A crowbar, hammer and spikes in a canvas roll.",
    "A pack frame loaded and roped, ready to lift."
  ],
  "cat-alchtools": [
    "An alchemist's bench of retorts and burners mid-reaction.",
    "A rack of stoppered reagent bottles in graded colours.",
    "A mortar and pestle with half-ground powder beside a scale.",
    "A portable alchemy kit open on a camp table.",
    "A condenser dripping steadily into a waiting flask.",
    "A shelf of labelled jars in an apothecary's back room.",
    "A glass alembic over a low blue flame.",
    "Measuring spoons and a folded paper of powder.",
    "Stained gloves and goggles set down beside an alchemist's workbook."
  ],
  "cat-tools": [
    "A carpenter's tools laid out in order on a bench.",
    "A blacksmith's tongs and hammers racked behind an anvil.",
    "A leatherworker's awls, needles and waxed thread.",
    "A mason's chisels and templates on cut stone.",
    "A jeweller's loupe, tweezers and tiny files under a bright lamp.",
    "A tinker's roll of small precise instruments."
  ],
  "cat-remedies": [
    "A physician's case of tinctures and folded powders.",
    "A poultice being spread on linen beside a patient.",
    "A row of remedy bottles with handwritten labels.",
    "A steaming cup pressed into a sick person's hands."
  ],
  "cat-clothing": [
    "A traveller's coat and boots hanging by a door.",
    "A tailor's dummy wearing a half-finished garment.",
    "A chest of folded clothing with a lavender sprig on top."
  ],
  "cat-alchweapons": [
    "A flask of alchemist's fire mid-throw, wick already lit.",
    "A bandolier of alchemical flasks across a chest.",
    "A thrown flask bursting into clinging flame on stone.",
    "A crate of packed alchemical munitions in straw."
  ],
  "cat-fooddrink": [
    "Travel rations laid out on cloth: bread, dried meat, cheese.",
    "A tavern table of tankards and a shared platter.",
    "A market stall of bread, fruit and hanging sausage."
  ],
  "cat-blackmarket": [
    "A lamplit back room where a wrapped package changes hands.",
    "A rack of restraints and unpleasant implements in a cellar."
  ],
  "cat-animalgear": [
    "A saddle, bridle and blanket laid out on a stable rail.",
    "Barding fitted to a wooden horse frame in an armoury."
  ],
  "cat-kits": ["A fitted kit open to show every tool in its own loop."],
  "cat-entertain": ["A tavern common room with music, dice and a full house."],
  "command-word": [
    "A hand raised over an object as a spoken word lights it from within.",
    "An item flaring awake mid-syllable, the speaker's lips still moving.",
    "A rod held up as its head kindles at a whispered command.",
    "An inert object on a table with a word inscribed along its side.",
    "A wielder speaking to a weapon that answers with light.",
    "A door opening at a spoken word, no hand touching it.",
    "An item glowing in response to a word, the room otherwise dark."
  ],
  consumable: [
    "A potion vial tipped back and drained in one motion.",
    "A folded paper of powder emptied into a waiting cup.",
    "An oil being smeared along a blade with a rag.",
    "A row of doses in a fitted case, one slot already empty.",
    "A pill pressed into a wounded companion's mouth.",
    "An emptied flask rolling away across floorboards.",
    "A cork drawn from a vial with the teeth, mid-fight."
  ],
  "summon-item": [
    "An object flaring as something large begins to arrive beside it.",
    "A figurine on flagstones with a shape resolving above it.",
    "A horn sounded and answering silhouettes appearing in the mist.",
    "A charm thrown down that opens into a summoning circle.",
    "An item held aloft as a called creature steps into being."
  ],
  "healing-item": [
    "A potion poured over a wound that closes as it lands.",
    "A salve worked into an injury by lamplight.",
    "A healer's kit open beside a patient on a camp cot.",
    "A restorative held out to a companion on one knee."
  ],
  "splash-thrown": [
    "A flask arcing through the air toward a knot of enemies.",
    "A burst on impact spraying its contents across a wide radius."
  ],
  "poison-toxin": [
    "A vial of dark venom beside a blade with a bead on its edge.",
    "An apothecary's shelf of skull-marked bottles.",
    "A dart with a discoloured tip being fitted to a blowpipe."
  ],
  "light-source": [
    "A hooded lantern burning low on a stone floor, shutters half closed.",
    "A rod of steady daylight-white light raised in a black cavern.",
    "A candle in a brass holder with wax pooled and running."
  ],
  "transport-item": [
    "A carpet hovering level above the ground, tassels stirring.",
    "An item flaring as its bearer vanishes from where they stood."
  ]
};
