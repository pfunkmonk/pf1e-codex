/* BODY MOTIF scenes for CLASS OPTIONS and HAZARDS.
 *
 * OPTIONS are keyed off the Element and Type fields in the stat block. Four of the elements are
 * absent here on purpose — fire, water, air and earth reuse the elemental creature art the Codex
 * already owns, declared as a 4th field on their rows in data/themes.js.
 *
 * HAZARDS are keyed off the delivery Type, which is the entire visual difference between one
 * poison and another: a blade with a bead on the edge, a cup with residue, a gas filling a
 * corridor, a coated handle. The rawCat could never express that — it just said "Poisons".
 */
export const OPTION_MOTIF_SCENES = {
  "element-aether": [
    "A figure surrounded by objects held motionless in the air, none of them touching anything.",
    "A shimmering field of force bending the light around an outstretched hand."
  ],
  "element-void": [
    "A sphere of absolute nothing hanging in a room, edges drinking the light.",
    "A figure haloed by cold starlight in a lightless place."
  ],
  "element-wood": [
    "Living branches erupting from a caster's forearm, still growing.",
    "A staff putting out green shoots in a bare hand."
  ],
  infusion: [
    "A raw elemental blast being reshaped mid-flight into a different form.",
    "Two elemental effects braided together into one stream."
  ],
  "utility-talent": ["A small, precise elemental effect used for work rather than war — a flame trimmed to a wick."],
  "bloodline-power": [
    "A sorcerer's eyes catching draconic light from within.",
    "Infernal script surfacing briefly across a caster's forearm.",
    "Feathers of a celestial wing showing through a shoulder.",
    "A caster's shadow moving independently in fey moonlight.",
    "Raw inherited power breaking the skin at the knuckles."
  ],
  "arcane-reservoir": [
    "A caster drawing power from a glowing well held in the palm.",
    "A reservoir of light in the chest, visibly draining as a spell is cast.",
    "An arcanist holding a half-formed spell in reserve above one hand.",
    "A spellbook open with power pooling in the gutter between pages.",
    "A caster topping up a failing light with a fresh pull of power."
  ],
  "domain-power": [
    "A cleric's holy symbol projecting one aspect of a god in light.",
    "A temple side-chapel dedicated to a single divine aspect.",
    "A granted power manifesting around a priest's raised hand."
  ],
  revelation: [
    "An oracle stopped mid-sentence by something only they can see.",
    "A revelation arriving as light behind clouded eyes."
  ]
};

export const HAZARD_MOTIF_SCENES = {
  "haz-injury": [
    "A blade drawn through a shallow trough of dark liquid.",
    "A dart with a discoloured tip being fitted to a blowpipe.",
    "A wound blackening outward from a small puncture.",
    "An arrowhead being dipped and set aside on a rag.",
    "A snake's fangs with venom beading at the points."
  ],
  "haz-ingested": [
    "A wine cup with a residue settled at the bottom.",
    "A hand tipping a folded paper of powder into a stew pot.",
    "A banquet plate untouched by the one who served it.",
    "A ring with a hinged bezel standing open above a goblet.",
    "A water barrel with something dissolving just below the surface."
  ],
  "haz-inhaled": [
    "A corridor filling with pale gas from a floor vent.",
    "A censer smoking in a sealed room with no windows.",
    "A burst pod releasing spores into still air."
  ],
  "haz-contact": [
    "A door handle glistening with something that should not be there.",
    "A page whose ink is still faintly wet.",
    "A gloved hand setting down a jar very carefully."
  ],
  "haz-curse": [
    "A cursed object on a table with its previous owner's effects beside it.",
    "A figure whose reflection moves a half-second late."
  ],
  "haz-madness": ["A room whose walls are covered floor to ceiling in the same written phrase."],
  "haz-proximity": [
    "A cold spot in a corridor where the dust will not settle.",
    "A nursery where a rocking chair is moving on its own.",
    "A stain on floorboards scrubbed a hundred times and still there."
  ],
  "haz-disease": ["A quarantine mark daubed fresh on a cottage door."]
};
