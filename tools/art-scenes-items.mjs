/* Scene descriptions for the ITEMS bucket. Consumed by gen-art-prompts.mjs, which cross-checks
 * every key and count against data/themes.js and refuses to run on a mismatch.
 *
 * Variants must read as DIFFERENT OBJECTS of the same kind, not the same object twice — that is
 * the whole point of a variant. Items make this easy: twelve rings can be twelve genuinely
 * different rings. Write full words; an early pack used "cat." for category and got cats.
 */
export const ITEM_SCENES = {
  // ---- weapons ----
  "firearm-ammo": [
    "A row of paper powder cartridges laid out on oiled cloth beside a powder horn and a brass measure.",
    "A handful of lead bullets and a bullet mould on a gunsmith's bench, lead still bright from casting.",
    "An alchemical cartridge cut open to show its layered charge, dragon's-breath powder glittering inside.",
    "A bandolier of prepared cartridges hanging against dark leather, brass caps catching the light."
  ],
  "arrow-bolt": [
    "A quiver of goose-fletched arrows standing upright, points down, in low raking light.",
    "A single broadhead arrow held close, the edge honed bright, binding thread neat behind the head.",
    "A sheaf of crossbow bolts bundled with cord, squat and heavy, iron heads blunt and dark.",
    "A fan of throwing darts laid in a fitted case lined with worn velvet.",
    "Barbed shuriken arranged in a ring on dark cloth, each one a different silhouette.",
    "A fletcher's bench mid-work: shafts, feathers, glue pot and a half-finished arrow.",
    "An arrow with a rune-etched head resting alone on stone, faint light in the engraving."
  ],
  firearm: [
    "An ornate flintlock pistol on velvet, lockwork and brass furniture picked out in warm light.",
    "A long musket leaning against a stone parapet, match-cord smouldering at the lock.",
    "A double-barrelled pepperbox revolver, barrels rotated mid-cycle, oil sheen on the metal.",
    "A heavy blunderbuss with a flared muzzle, stock worn smooth by decades of use.",
    "A siege culverin on a timber carriage, breech banded with iron, muzzle sooted.",
    "A finely engraved duelling pistol in a fitted case with powder flask and ball mould."
  ],
  "bow-crossbow": [
    "A recurve longbow braced against a stump, string taut, limbs bound in horn and sinew.",
    "A heavy crossbow spanned and loaded, windlass hanging from the stock.",
    "A compact hand crossbow beside a bracer of tiny bolts on a table.",
    "A staff sling and a pouch of smooth river stones on a woven mat."
  ],
  "blade-sword": [
    "A longsword laid across a table, crossguard and pommel plain, edge freshly honed.",
    "A curved scimitar half-drawn from a tooled leather scabbard, watered steel visible.",
    "A slender rapier standing point-down in floorboards, swept hilt catching lamplight.",
    "A katana on a lacquered stand, blade a single clean line, tsuba delicately pierced.",
    "A heavy falchion with a broad cleaving edge resting against a butcher's block.",
    "A greatsword driven into earth as a marker, hilt wrapped in worn cord.",
    "A pair of matched shortswords crossed on dark cloth.",
    "A cavalry sabre with a knuckle-bow guard hanging from a saddle horn.",
    "An ancient bronze-age blade, green with age, displayed on stone.",
    "A cutlass jammed point-first into a ship's rail, salt-pitted and practical."
  ],
  "blade-dagger": [
    "A plain fighting dagger with a blackened blade and cord-wrapped grip on rough wood.",
    "A jewelled ceremonial dagger on silk, its pommel stone glowing faintly."
  ],
  axe: [
    "A bearded battleaxe with a hooked beard and rune-stamped cheek, haft bound in leather.",
    "A woodsman's hand hatchet buried in a splitting block, chips scattered around it."
  ],
  bludgeon: [
    "A flanged steel mace resting head-down on a stone step.",
    "A heavy warhammer with a spiked reverse, haft banded in iron.",
    "A three-headed flail hanging from a peg, chains still swinging slightly.",
    "A knotted wooden club worn glass-smooth by long use."
  ],
  "polearm-spear": [
    "A halberd standing against an armoury wall, axe blade and spike catching the light.",
    "A cavalry lance in a saddle bucket, pennon limp in still air.",
    "A boar spear with a crossbar behind the head, shaft scarred by tusks.",
    "A row of pikes racked at a uniform angle, points receding into gloom."
  ],
  "exotic-weapon": [
    "A coiled leather bullwhip on a fence rail, handle plaited and worn.",
    "A weighted throwing net gathered in one hand, lead beads along its hem.",
    "A pair of bolas swinging in an arc, three stone weights blurred."
  ],
  "weapon-quality": [
    "A blade edge crawling with contained flame, metal glowing dull red beneath the fire.",
    "A sword rimed in frost, cold vapour pouring off the steel onto the floor.",
    "A weapon crackling with caged lightning, small arcs walking along the fuller.",
    "A blade so keen the light along its edge appears to part rather than reflect.",
    "A sword hovering unheld in mid-air, turning slowly as though choosing a target."
  ],
  // ---- armour ----
  "armor-heavy": [
    "A full suit of articulated plate on an armour stand, every lame and rivet crisp.",
    "Banded mail over a padded gambeson, iron strips overlapping across the ribs.",
    "A splint harness hanging in a lamplit armoury, straps loose, greaves below."
  ],
  "armor-medium": [
    "A steel breastplate on a stand, one shoulder strap unbuckled and hanging.",
    "A chainmail hauberk pooled on a bench, links catching a hundred small highlights."
  ],
  "armor-light": [
    "A studded leather cuirass on a peg, brass studs dulled by wear.",
    "A quilted padded jack laid flat, stitching lines running in neat channels."
  ],
  "shield-item": [
    "A heavy kite shield with a faded painted device, edge notched from use.",
    "A round wooden shield with an iron boss, planks visible through worn paint.",
    "A small steel buckler hanging from a belt hook, mirror-polished.",
    "A tower shield planted in earth, arrows standing in its face.",
    "A heater shield propped against a bench beside its arming straps.",
    "An ornate ceremonial shield of chased silver on a wall mount."
  ],
  "barding-tack": [
    "A full set of horse barding on a wooden frame, chamfron staring blankly forward.",
    "A tooled riding saddle on a rail with stirrups hanging still.",
    "A bridle and bit hanging from a stable nail, leather dark with oil."
  ],
  // ---- worn wondrous ----
  "ioun-stone": [
    "Three luminous ioun stones orbiting slowly in the air above an open palm.",
    "A single amber ioun stone hanging motionless in a shaft of light.",
    "A dull, burnt-out ioun stone lying inert on a workbench beside a jeweller's loupe.",
    "A ring of pale ioun stones circling a seated figure's head, leaving faint trails.",
    "An ioun stone being drawn from a padded case with tweezers, glowing faintly."
  ],
  "ring-item": [
    "A plain gold band on dark velvet, a single line of script running inside it.",
    "A heavy signet ring with a carved intaglio crest, wax and seal beside it.",
    "A silver ring set with a moonstone that seems lit from within.",
    "A ring of braided wire and iron, crude and old, on rough sacking.",
    "A serpent ring swallowing its own tail, scales finely chased.",
    "A ring with a hinged bezel standing open to reveal a hidden cavity.",
    "A wide bronze ring cut with runes, verdigris in the grooves.",
    "A ring of woven grass and green stems, still living.",
    "A black ring that drinks the light around it, edges hard to fix.",
    "A jewelled ring blazing with refracted colour on a raised hand.",
    "A cracked ring mended with gold along the fracture.",
    "A stack of several mismatched rings on one weathered finger."
  ],
  "amulet-neck": [
    "A heavy amulet on a thick chain, its central stone burning with slow inner light.",
    "A silver holy pendant lying against dark cloth, edges worn smooth by thumbing.",
    "A beast-tooth necklace strung on sinew with carved bone spacers.",
    "A jewelled collar of overlapping gold plates, high and stiff.",
    "A scarab brooch of lapis and gold, legs tucked, wings closed.",
    "A locket standing open to show a faded portrait inside.",
    "A torc of twisted gold with animal-head terminals.",
    "A periapt of dull grey stone hanging on a plain cord.",
    "A necklace of small glass vials, each holding a different coloured liquid.",
    "A medallion split into two halves that fit together along a jagged seam."
  ],
  "cloak-cape": [
    "A heavy travelling cloak hanging from a peg, hem heavy with dried mud.",
    "A cloak of layered feathers shifting colour as it moves.",
    "A fine embroidered mantle spread across a chair back, thread catching the light.",
    "A ragged grey cloak that blends into the stone wall behind it.",
    "A fur-lined winter cloak with frost still on the shoulders.",
    "A shimmering cape caught mid-swirl, lining flashing an impossible colour.",
    "A short shoulder cape fastened with a heavy circular brooch."
  ],
  "boots-footwear": [
    "A pair of worn travelling boots caked in road dust, laces trailing.",
    "Tall riding boots with buckled straps standing beside a hearth.",
    "Soft leather slippers, almost weightless, on a silk cushion.",
    "Iron-shod greaves and sabatons laid out with an armourer's tools.",
    "Fur-topped winter boots with snow melting off the welts.",
    "Sandals of woven cord and bronze studs on a stone step.",
    "A pair of boots hovering a finger's width above the floorboards."
  ],
  "gloves-bracers": [
    "A pair of supple leather gloves laid palm-up, seams fine and even.",
    "Steel gauntlets with articulated finger lames resting on a workbench.",
    "Engraved bracers of bright metal standing upright on a shelf.",
    "Fingerless archer's gloves with a worn thumb tab and bracer.",
    "Silk evening gloves draped over a chair arm, faintly luminous at the cuff.",
    "Heavy smith's mitts scorched dark at the fingertips.",
    "Bracers of lacquered wood and cord, eastern in make.",
    "A single gauntlet on a stand, empty and slightly clenched.",
    "Gloves crackling faintly with contained energy between the fingers."
  ],
  "belt-girdle": [
    "A broad tooled leather belt with a heavy cast buckle on a workbench.",
    "A girdle of linked gold plates laid in a curve on dark velvet.",
    "A soldier's belt hung with pouches, sheath and a coil of cord.",
    "A silk sash wound and knotted, tassels hanging free.",
    "A studded war belt with a large gemmed clasp at its centre."
  ],
  "helm-crown": [
    "A great helm on a stand, visor slotted, dents hammered smooth.",
    "A jewelled crown on a cushion, points catching light from above.",
    "A simple silver circlet resting on an open book.",
    "A horned ceremonial helm of bronze and hide."
  ],
  "headband-hat": [
    "A jewelled headband with a central gem alight, resting on dark cloth.",
    "A wide-brimmed travelling hat, brim shadowing an empty stand.",
    "A soft hood of grey wool pushed back off the shoulders.",
    "A wound turban of fine cloth, one end left hanging.",
    "A leather headband stamped with a repeating rune pattern.",
    "A veil of thin gauze lifting slightly in an unseen draught."
  ],
  "mask-goggles": [
    "A blank porcelain mask on a stand, expressionless and faintly unsettling.",
    "Brass-framed goggles with layered smoked lenses on a workbench.",
    "A carved wooden festival mask with painted eyes and a fixed grin.",
    "A plague doctor's beaked leather mask hanging from a hook.",
    "Wire-rimmed spectacles resting on an open ledger.",
    "A half-mask of black silk, ribbons trailing.",
    "A visor of dark crystal set in a metal frame, faint reflections moving inside it."
  ],
  "robe-vestment": [
    "A wizard's robe of deep midnight cloth, sleeves embroidered with silver script.",
    "A priest's vestment laid over an altar rail, holy symbols worked into the hem.",
    "A plain travelling tunic and belt hanging on a peg.",
    "A heavy brocade coat on a tailor's dummy, buttons of polished horn.",
    "A ragged patched robe, road-worn and much mended.",
    "A layered eastern robe folded precisely on a lacquered chest.",
    "A ceremonial gown of shifting iridescent fabric on a stand."
  ],
  // ---- slotless wondrous ----
  wand: ["A slender wand of pale wood in an open case, its tip faintly charred with use."],
  staff: [
    "A gnarled wooden staff leaning in a corner, top worn smooth by a hand.",
    "A metal-shod staff with a crystal head, light pooling inside the stone.",
    "A staff carved with a spiral of runes running its whole length.",
    "A blackthorn staff bound with iron rings and old cord.",
    "A tall ceremonial staff topped with a cast bronze beast's head.",
    "A plain quarterstaff across two pegs, both ends banded and dented.",
    "A staff of living wood still bearing green leaves at the tip.",
    "A bone staff strung with small charms that would rattle if moved.",
    "A broken staff mended at the join with wire and pitch."
  ],
  "rod-scepter": [
    "A short iron rod with a faceted head resting on dark velvet.",
    "A jewelled sceptre of office lying across an open ledger.",
    "A slim silver rod etched with a single continuous line of script.",
    "A heavy black rod with a weighted, blunt end, plainly a weapon too.",
    "A rod of twisted copper and glass, its core faintly luminous.",
    "A gentleman's cane with a hidden seam below the grip.",
    "A conductor's baton of pale wood in a fitted case.",
    "A rod capped at both ends with carved beast heads facing outward.",
    "A stubby rod bristling with small protruding studs and keys.",
    "A ceremonial rod wound with faded ribbon and dried flowers.",
    "A rod of dark stone, cold-looking, resting on a folded cloth."
  ],
  "figurine-idol": [
    "A small carved stone lion figurine on a table, poised as if about to move.",
    "A crude wooden idol of a squat forest god, mouth open, eyes hollow.",
    "A jointed wooden puppet slumped in a chair, strings pooled beside it."
  ],
  "orb-sphere": [
    "A crystal ball on a bronze stand, mist turning slowly inside it.",
    "A dark metal orb the size of a fist, seams glowing faintly along its meridians."
  ],
  "bag-container": [
    "A worn leather satchel with its flap open, contents in shadow.",
    "A drawstring pouch spilling coins across a tavern table.",
    "An iron-bound travelling chest with a heavy hasp, lid slightly ajar.",
    "A wicker basket packed with straw and wrapped bundles.",
    "A canvas backpack propped against a milestone, straps frayed.",
    "A small lacquered box open to reveal a fitted velvet interior."
  ],
  "bottle-vial": [
    "A row of stoppered glass vials in a padded case, each a different colour.",
    "A dusty wine bottle with a wax-sealed neck, label illegible.",
    "A ceramic jug with a cork stopper on a rough kitchen table.",
    "A cut-crystal decanter half full, light refracting through the liquid.",
    "A tiny phial on a chain, contents luminous.",
    "A cracked earthenware jar sealed with cloth and twine."
  ],
  "book-scroll": [
    "A heavy leather-bound tome on a lectern, clasps unfastened.",
    "A rolled vellum scroll with a broken wax seal beside it.",
    "A wizard's spellbook lying open, script glinting slightly on the page.",
    "A stack of well-thumbed journals tied with a leather cord.",
    "A scroll case of tooled leather, cap off, a scroll edge protruding."
  ],
  "mirror-lens": ["An ornate hand mirror face-up on a dressing table, reflecting a room that is not quite the one around it."],
  "horn-instrument": [
    "A great curved war horn banded in silver, hanging from a baldric.",
    "A wooden lute resting against a stool, one string loose.",
    "A set of reed pipes bound with cord, laid on a stone wall.",
    "A small hand drum with a painted skin head and beater.",
    "A silver flute in a lined case, keys catching the light."
  ],
  "bell-chime": ["A small bronze hand bell on a table, clapper still, a bar of light across its rim."],
  "lantern-light": [
    "A hooded iron lantern burning low on a stone floor, shutters half closed.",
    "A pitch torch guttering in a wall bracket, smoke streaming upward.",
    "A single candle in a brass holder, wax pooled and running.",
    "A hanging brazier of glowing coals throwing red light upward."
  ],
  "gem-stone": [
    "A handful of cut gemstones spilled across dark cloth, facets throwing colour.",
    "A single large uncut crystal on a stand, cloudy and internally fractured.",
    "A river-worn stone with a natural hole through it, hung on cord.",
    "A jeweller's tray of sorted stones under a bright working lamp."
  ],
  "dust-powder": [
    "A pinch of glittering dust falling from between finger and thumb.",
    "A stoppered horn of coarse grey powder tipped on its side, contents spilling.",
    "A shallow dish of fine coloured pigment beside a brush.",
    "A cone of incense burning on a brass plate, smoke rising straight.",
    "A leather pouch of powder open at the neck, contents faintly luminous.",
    "Chalk dust settling over a half-drawn diagram on flagstones."
  ],
  "rope-cord": [
    "A coil of thick hemp rope on a dock post, fibres frayed at the cut end.",
    "A knotted climbing rope hanging down a rock face into shadow.",
    "A length of fine silk cord wound on a wooden spool."
  ],
  "carpet-banner": [
    "A rolled patterned carpet standing on end against a wall, edges tasselled.",
    "A faded war banner hanging in a hall, its device barely readable."
  ],
  "cauldron-pot": [
    "A black iron cauldron over low coals, surface just beginning to move.",
    "A copper pot and ladle on a scrubbed kitchen table."
  ],
  "key-lock": [
    "An oversized iron key on a ring, teeth complex and worn.",
    "A heavy padlock hanging open on a hasp, shackle swung wide.",
    "A set of iron manacles on stone, chain pooled beside them."
  ],
  "deck-game": ["A fanned deck of illustrated cards face-up on a table, one card turned apart from the rest."],
  "talisman-charm": [
    "A cluster of small charms on a thong: bone, feather, iron, coin.",
    "A parchment talisman inscribed with a sigil, pinned to a beam.",
    "A carved wooden ward hanging above a doorway, worn by weather."
  ],
  "holy-symbol": [
    "A silver holy symbol on a chain, laid on an altar cloth.",
    "A small travelling shrine standing open, candle stubs inside.",
    "A stone altar with offerings and burnt-down candles across its top."
  ],
  // ---- mundane goods ----
  "drink-alcohol": ["A row of tankards and a tapped barrel on a tavern counter, foam sliding down the sides."],
  "food-ration": [
    "Travel rations laid out on cloth: hard bread, dried meat, cheese, an apple.",
    "A laden feast table seen down its length, roast and bread and pitchers."
  ],
  "herb-spice": ["Bundles of dried herbs hanging from a beam above a table of open spice jars."],
  "animal-livestock": [
    "A saddled riding horse standing patiently at a hitching rail.",
    "A pair of yoked oxen in harness at the edge of a ploughed field.",
    "A hunting hound sitting alert on flagstones, ears up."
  ],
  "artisan-tools": [
    "A carpenter's tools laid out in order on a bench: saw, chisels, mallet, square.",
    "A blacksmith's anvil with tongs and hammers racked behind it."
  ],
  "adventuring-kit": [
    "A full adventurer's kit laid out on oiled leather, every item in its place.",
    "A climbing kit: pitons, hammer, coiled rope and harness on stone.",
    "A thieves' kit open to show picks and probes in fitted loops.",
    "A healer's kit with rolled bandages, scissors and small bottles.",
    "A scribe's kit: ink, quills, penknife, sand shaker and blotter.",
    "A cook's travelling kit, pans nested and strapped together.",
    "A surveyor's kit with chain, rod and a brass instrument in a case.",
    "A mess kit and canteen strapped to a pack frame.",
    "A grooming kit open on a folding stool, razor and mirror visible.",
    "A hunter's kit with snares, skinning knife and a coil of wire.",
    "A disguise kit with pigments, false hair and small brushes."
  ],
  "trap-restraint": [
    "A sprung steel bear trap on leaf litter, jaws closed on nothing.",
    "A wire snare set across a game trail, barely visible.",
    "A scatter of iron caltrops across flagstones.",
    "An empty iron cage with its door standing open."
  ],
  "alchemical-good": [
    "A flask of acid on a workbench, the glass slightly etched from within.",
    "A tanglefoot bag and thunderstone side by side on a shelf.",
    "An alchemist's bench mid-reaction, a retort fuming into a condenser."
  ],
  "poison-drug": [
    "A tiny vial of dark venom beside a blade with a bead of it on the edge.",
    "A pouch of dried narcotic leaf spilled across a low table.",
    "A jar of thick ointment with a bone spatula laid across the rim."
  ],
  "medicine-heal": ["Rolled linen bandages, a poultice and small bottles laid out on a field surgeon's cloth."],
  "clothing-cloth": ["Bolts of cloth stacked on a merchant's table, silk and wool and linen side by side."],
  "shelter-camp": ["A canvas tent pitched under trees with a bedroll visible through the open flap."],
  "writing-paper": [
    "An inkwell, quill and half-written page on a writing desk.",
    "A stack of blank parchment weighted with a stone, sealing wax beside it.",
    "A sealed letter with a pressed wax seal on a salver."
  ],
  "boat-vehicle": [
    "A heavy timber wagon with its team unhitched, tailgate down.",
    "A small rowing boat drawn up on a shingle beach, oars shipped.",
    "A river barge tied at a wooden jetty, cargo lashed under canvas."
  ],
  "mining-farm": [
    "A pick and shovel leaning against a mine cart on rails.",
    "A scythe and sickle hanging on a barn wall above stacked sheaves."
  ],
  "fishing-hunting": ["Fishing rods, a creel and a net drying on a river bank at dawn."],
  "trade-goods": [
    "Stacked coins and a set of merchant's scales on a counting table.",
    "Ingots of silver and copper stacked in a strongroom, stamped with marks."
  ],
  "optical-device": [
    "A brass spyglass extended on a chart table beside dividers.",
    "An hourglass on a windowsill, sand halfway through."
  ],
  technology: ["A salvaged technological device on a bench, indicator lights glowing cold blue through grime."],
  "construct-part": [
    "A clockwork mechanism opened to show meshed brass gears and a mainspring.",
    "A disassembled construct's arm on a workbench among tools and wire."
  ]
};

/* Variety sets. Deliberately GENERIC — these back items that matched no theme, so they must not
   imply any specific object. Shops, vaults, workbenches: rulebook furniture. */
export const ITEM_VARIETY = {
  "item-scene": [
    "A general store interior with goods stacked to the rafters and a counter across the front.",
    "A merchant's stall under a striped awning, wares laid out on trestle boards.",
    "A cluttered workshop bench seen from above, tools and part-finished work everywhere.",
    "A warehouse aisle of crates and barrels receding into dim light.",
    "A pedlar's cart with its sides folded down to display small goods.",
    "A quartermaster's stores, shelves labelled and stacked in military order.",
    "A pawnbroker's window crowded with mismatched objects.",
    "A cooper's yard with barrels in various stages of assembly.",
    "A rope-walk with long lines stretched into the distance.",
    "A tannery drying rack hung with cured hides.",
    "A chandler's shop, dipped candles hanging in ranks.",
    "A dockside pile of crates and coiled hawsers under a crane.",
    "A caravan's goods laid out on blankets at a desert waystation.",
    "A cellar of stacked casks with a lantern hung on a nail.",
    "An ironmonger's wall of hanging hardware and tools.",
    "A market square at dawn as traders set out their goods.",
    "A saddler's shop with tack hung on every wall.",
    "A glassblower's bench with a furnace glowing behind it.",
    "A potter's shelf of drying vessels in even rows.",
    "A weaver's loom half-strung in a sunlit room.",
    "A miller's storeroom with sacks stacked against the wall.",
    "A fishmonger's slab under a canvas shade, ice and baskets.",
    "A butcher's shop with hooks and blocks, sawdust on the floor.",
    "A baker's cooling racks stacked with loaves.",
    "A spice merchant's counter of open sacks in graded colours.",
    "An apothecary's wall of labelled drawers and jars.",
    "A bookbinder's bench with presses and stacked signatures.",
    "A locksmith's bench covered in disassembled mechanisms.",
    "A jeweller's workbench under a bright lamp, loupe and tweezers.",
    "A tailor's shop with bolts of cloth and a dressmaker's form.",
    "A shipwright's yard with timber and a hull under construction.",
    "A wheelwright's yard, wheels leaning in a row against a fence.",
    "A stable tack room hung with bridles and blankets.",
    "A granary interior with light falling through high slats.",
    "A smokehouse hung with curing meat in dim brown light.",
    "A brewer's room of copper vats and wooden mash tuns.",
    "A vintner's cellar with bottles racked to the ceiling.",
    "A mine head with carts, tools and a winding gear.",
    "A quarry face with cut blocks stacked and ready.",
    "A charcoal burner's clearing with smoking earth mounds.",
    "A beekeeper's row of skeps in a walled garden.",
    "A herbalist's drying loft hung with bundled plants.",
    "A scriptorium with sloped desks and stacked codices.",
    "A cartographer's table strewn with rolled and pinned maps.",
    "An armoury storeroom of racked weapons under dust sheets.",
    "A siege park with engines under canvas covers.",
    "A customs house counter with ledgers, scales and seals.",
    "A caravanserai courtyard with unloaded packs and resting animals.",
    "An auction room with lots numbered on a long table.",
    "A cluttered curiosity shop, objects crowding every surface.",
    "A pilgrim's stall selling tokens and charms outside a temple.",
    "A festival market with bunting and crowded stalls.",
    "A ruined shop with goods spilled and shelves collapsed.",
    "A snowbound trading post with sledges drawn up outside.",
    "A river-landing trade post with bales stacked on the bank.",
    "A gnome tinker's workshop, half-built devices on every surface.",
    "A dwarven forge-hall with tools racked along the wall.",
    "An elven craft-bower of hanging woven goods.",
    "A pack train being loaded at first light on a mountain track.",
    "A tinker's wagon interior, every surface hung with small wares.",
    "A general store counter with a ledger, scales and a bell.",
    "A dusty attic storeroom with sheeted furniture and crates.",
    "A well-organised pantry of jars, sacks and hanging bundles.",
    "A cluttered scholar's study with instruments among the books.",
    "A guild storeroom with stamped and numbered crates.",
    "A lamplit back room where goods change hands quietly.",
    "A dockworker's shed of hooks, slings and cargo nets.",
    "A wagon repair yard with axles and spare wheels.",
    "A shepherd's hut with crooks, shears and fleeces.",
    "A hunter's cabin hung with pelts and traps.",
    "A fisherman's shed with nets, floats and creels.",
    "A carpenter's shop knee-deep in shavings.",
    "A mason's yard with dressed stone and templates.",
    "A dyer's yard with hanging skeins in strong colours.",
    "A papermaker's drying frames stacked in a loft.",
    "A candle-lit stockroom counted at night by one clerk.",
    "A caravan quartermaster checking goods against a list.",
    "A frontier trading counter with furs stacked opposite tools.",
    "A temple storeroom of vestments, censers and candles.",
    "A theatre property store crammed with costumes and props.",
    "A cluttered alchemist's supply shop, jars floor to ceiling.",
    "A monastery cellar of plain, precisely ordered stores.",
    "An abandoned market at dusk, empty trestles and blowing straw.",
    "A ship's hold packed with lashed cargo under a swinging lamp.",
    "A goods wagon interior seen from the open rear doors.",
    "A collector's cabinet of small labelled curiosities.",
    "A wayside inn's storeroom with barrels and hanging hams.",
    "A crowded chandlery of ship's stores and cordage.",
    "A pedlar counting stock into a ledger by candlelight.",
    "A guild warehouse aisle with numbered bays receding away.",
    "A junk shop where nothing is arranged and everything is for sale.",
    "A supply depot with crates stencilled and stacked to a line.",
    "A trestle of second-hand goods outside a city gate.",
    "A well-swept shop floor at closing, shutters half down.",
    "A back room where crates are being opened and checked.",
    "A stall of mismatched hardware under an oiled tarpaulin.",
    "A wagon being loaded with goods at first light.",
    "A shopkeeper reaching down a high shelf with a hooked pole.",
    "A store cellar of sacks and barrels lit by one grating.",
    "A counting bench with coins, tallies and a strongbox.",
    "A trader's tent interior hung with goods on every side.",
    "A quayside stack of bales waiting under a canvas cover.",
    "A cluttered corner where unsold stock has accumulated.",
    "A repair bench with broken goods awaiting attention.",
    "A market porter's handcart piled and roped.",
    "A stockroom door standing open on ordered shelves."
  ],
  "item-wondrous": [
    "A vault shelf of enchanted objects, each faintly lit from within.",
    "A single artefact on a velvet cushion under a glass dome.",
    "A wizard's curiosity cabinet of drawers standing part-open.",
    "A treasure hoard spilling across stone, gold and glinting objects.",
    "An object floating unsupported above a pedestal, turning slowly.",
    "A warded display case, sigils burning faintly across the glass.",
    "A collection of oddments on a workbench, one clearly not ordinary.",
    "An item wrapped in cloth being unwound to reveal a soft glow.",
    "A shelf of objects in a moonlit tower room, dust undisturbed.",
    "An enchanted object resting in a chalk circle on flagstones.",
    "A reliquary standing open, its contents throwing coloured light.",
    "An auction lot on a draped plinth under a single lamp.",
    "A trove in a dragon's lair, objects half buried in coin.",
    "A magical object being appraised under a jeweller's glass.",
    "A row of items on a temple altar as offerings.",
    "An object recovered from silt, still caked but shining through.",
    "A locked strongbox opened to a soft light from inside.",
    "An enchanted item on a battlefield among the fallen.",
    "A shelf in a wizard's laboratory, instruments and oddities together.",
    "An object on a shop counter with the shopkeeper's hand withdrawing.",
    "A hoard glimpsed by torchlight in a low crypt chamber.",
    "An item bound in chains and sealed with wax and script.",
    "A workbench where a magical object is mid-repair.",
    "An artefact set into a stone niche in an ancient wall.",
    "A drifting object caught in a beam of coloured window-light.",
    "A magical item held out on an open palm as an offering.",
    "A pile of confiscated enchanted goods in an evidence room.",
    "An object suspended in a stasis field, faint distortion around it.",
    "A collection laid out for study with notes and calipers.",
    "An item in a traveller's pack, glow leaking through the canvas.",
    "A magical object on a stone plinth in a forgotten shrine.",
    "A cache hidden beneath a floorboard, lifted open.",
    "An item being handed between two figures in shadow.",
    "A tray of enchanted trinkets at a night market stall.",
    "An object mounted as a trophy above a great hearth.",
    "A hoard in a flooded chamber, light refracting off the water.",
    "An item in a display of a noble's private collection.",
    "A shelf of failed experiments, each faintly and wrongly lit.",
    "An artefact in a war camp tent, guarded and covered.",
    "A magical object being lowered into a padded travelling case.",
    "An item resting in a bird's nest of gathered bright things.",
    "A collection of objects arranged in a ritual pattern on the floor.",
    "An enchanted item on an anvil, being unmade rather than made.",
    "A vault door standing open on ranked shelves of treasures.",
    "An object in a beggar's bowl, entirely out of place.",
    "A magical item half sunk in ice, visible through the surface."
  ],
  "item-weapon": Array.from({ length: 51 }, (_, i) => [
    "A weapon rack in a lamplit armoury, blades and hafts in ordered rows.",
    "A single sword on a workbench with whetstone and oiled cloth.",
    "A weapon's edge in extreme close view, light running along the bevel.",
    "A blade quenched in a smith's trough, steam boiling upward.",
    "A weapon planted point-first in churned battlefield earth.",
    "A sword being drawn from a scabbard, half the blade showing.",
    "A weapon hanging above a hearth as an heirloom.",
    "A blade laid across an altar as an offering.",
    "A weapon caught mid-swing, motion blurring the tip.",
    "A rack of practice weapons in a training yard.",
    "A sword's hilt in close detail, grip wrapping worn smooth.",
    "A weapon lying beside a fallen shield after a fight.",
    "A blade wrapped in cloth being unwrapped on a table.",
    "A weapon carried across a shoulder on a road at dusk.",
    "A sword on a smith's anvil, hammer resting beside it.",
    "A blade reflecting firelight in a darkened room.",
    "A weapon in a merchant's stand among a dozen others.",
    "A sword thrust into a stone cairn as a grave marker.",
    "A weapon being inspected against the light for flaws.",
    "A blade with a fresh notch in its edge, close and hard-lit.",
    "A weapon on a war table beside maps and markers.",
    "A sword strapped to a saddle beside a bedroll.",
    "A blade being polished by lamplight, cloth blackened.",
    "A weapon in a rack aboard a ship, secured against roll.",
    "A sword laid on velvet for appraisal, tag on the guard.",
    "A weapon at rest against a tent pole in a war camp.",
    "A blade half buried in snow, hilt standing proud.",
    "A weapon lifted overhead against a bright sky.",
    "A sword crossed with its scabbard on dark cloth.",
    "A blade cooling on a rack after tempering.",
    "A weapon in a shrine niche, wreathed in dried flowers.",
    "A sword in a duelling case, fitted and lined.",
    "A blade held level toward the viewer, foreshortened.",
    "A weapon among spoils piled after a battle.",
    "A sword being handed hilt-first between two figures.",
    "A blade on a butcher's block in a mercenary's quarters.",
    "A weapon leaning by a door within easy reach.",
    "A sword on a bier beside its owner's helm.",
    "A blade in a forge's coals, glowing orange along its length.",
    "A weapon in a rack behind a tavern bar.",
    "A sword driven through a shield, both pinned to a wall.",
    "A blade in the hands of an armourer being fitted to a hilt.",
    "A weapon standing in an umbrella stand of assorted arms.",
    "A sword being carried wrapped across the back on a mountain path.",
    "A blade laid out with its parts for cleaning.",
    "A weapon caught in a shaft of light in a dark armoury.",
    "A sword on a stone table in a ruined hall.",
    "A blade being tested for balance on one finger.",
    "A weapon and its whetstone on a doorstep at evening.",
    "A sword returned to its rack, the space beside it empty.",
    "A blade in silhouette against a burning horizon."
  ][i]),
  "item-armorset": Array.from({ length: 23 }, (_, i) => [
    "A full armour harness on a stand in a lamplit hall.",
    "Mail hanging on a rack, links catching a hundred highlights.",
    "A breastplate being hammered out on a stake anvil.",
    "Armour laid out piece by piece on a workbench before assembly.",
    "A helm and gorget resting together on a bench.",
    "Armour being buckled onto a figure by an unseen squire.",
    "A dented cuirass propped against a wall after a battle.",
    "Armour polished to a mirror finish under a bright lamp.",
    "A stack of shields and armour plates in a quartermaster's store.",
    "Scale armour spread across a table, individual scales visible.",
    "A padded gambeson hanging beside the plate it goes under.",
    "Armour in a crate packed with straw for transport.",
    "A suit of armour standing empty in a dark corridor.",
    "Armour being repaired, a new plate riveted in place.",
    "Leather armour being oiled and worked by hand.",
    "A war harness on a mannequin in a noble's hall.",
    "Armour half buried in mud on an old battlefield.",
    "Ranked armour stands receding down an armoury aisle.",
    "A helm alone on a shelf, visor open on darkness.",
    "Armour laid across a tomb effigy in a chapel.",
    "Rusted armour hanging in a flooded cellar.",
    "Armour catching low sunlight through a high window.",
    "A gauntlet and vambrace laid out with armourer's tools."
  ][i]),
  "item-artifact": [
    "An artefact of obvious age and power on a stone plinth, air distorting faintly around it.",
    "A legendary object half buried in the floor of a ruined temple.",
    "An artefact bound in chains and warded with script on every link.",
    "A relic in a shaft of light through a collapsed roof, dust turning around it.",
    "An artefact held in a stone hand as part of a great statue.",
    "A powerful object at the centre of a ritual circle, sigils burning.",
    "An artefact recovered from ice, still frozen into a block.",
    "A relic on an altar in a hall of kneeling stone figures.",
    "An artefact whose light is the only illumination in a black chamber.",
    "A legendary weapon set into a cleft rock on a windswept height."
  ],
  "item-neck": [
    "An amulet on a chain laid across dark velvet.",
    "A pendant hanging at a throat, catching a single highlight.",
    "A heavy chain of office on a wooden stand.",
    "A cord necklace of carved beads coiled on a table."
  ],
  "item-head": [
    "A helm on a stand in three-quarter view, visor closed.",
    "A circlet resting on a folded cloth beside a mirror."
  ],
  "item-body": [
    "A robe on a tailor's dummy, fabric falling in heavy folds.",
    "A body harness of layered leather and cloth on a stand."
  ],
  "item-eyes": [
    "A pair of lenses in a fitted case, glass tinted faintly amber.",
    "Goggles hanging by their strap from a workbench hook."
  ],
  "item-shoulders": [
    "A cloak hanging from a peg, hem swaying slightly.",
    "A shoulder mantle of layered plates on an armour stand."
  ],
  "item-wrists": [
    "A pair of bracers standing upright on a shelf, engraving catching light.",
    "Wristbands of braided leather and metal laid crossed on cloth."
  ]
};
