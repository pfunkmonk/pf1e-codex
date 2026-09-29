/* BODY MOTIF scenes for MONSTERS and TRAITS.
 *
 * MONSTERS are keyed off the Environment line in the stat block — habitat, which is the single
 * most visual fact about a beast and cuts across creature type. These must read as a PLACE that
 * something lives in, with the inhabitant implied rather than specified: the same image backs an
 * aberration and a magical beast, so it cannot commit to an anatomy.
 *
 * TRAITS are keyed off the trait's backstory. Their category facet says only "Social" or "Region";
 * the body says whether that was a battlefield, a temple, or a debt owed.
 */
export const MONSTER_MOTIF_SCENES = {
 "habitat-underground": [
  "A cavern throat descending into black, water beading on the walls.",
  "A lightless tunnel with something's eyeshine at the limit of the lamp.",
  "A vast underground vault with columns of natural stone.",
  "A chasm floor seen from a ledge, mist far below.",
  "A flooded cave passage with a low airgap.",
  "A fungal forest glowing faintly in a deep cavern.",
  "A worked tunnel long abandoned, tool marks still in the rock.",
  "A crevice mouth in a cave wall, too narrow for a person.",
  "A subterranean lake, still and black, with a shingle shore.",
  "A cramped tunnel junction lit by a single guttering torch, claw marks scoring the walls.",
  "A vast cavern ceiling lost in darkness above a phosphorescent lake.",
  "A collapsed mineshaft choked with rubble and the glint of old pick-axes.",
  "A narrow crevice descending into absolute black, a dropped stone's echo taking far too long to return.",
  "An abandoned dwarven gallery, support pillars carved with faded reliefs.",
  "A slick limestone passage dripping steadily into a black pool.",
  "A warren of interconnected burrows just wide enough for something to have dug them.",
  "A sunken crypt antechamber, dust undisturbed for centuries except for one fresh trail.",
  "A subterranean river vanishing beneath a low stone arch."
 ],
 "habitat-aquatic": [
  "A reef wall dropping away into deep blue, shapes at the edge of sight.",
  "A kelp forest with light shafting down through the canopy.",
  "A wreck on the seabed colonised by something.",
  "A tidal flat at low water, channels cut through the mud.",
  "A sunlit coral shelf dropping away into cold blue depths.",
  "A kelp forest swaying in the current beneath a fisherman's hull."
 ],
 "habitat-desert": [
  "A dune field at low sun, one line of tracks crossing it.",
  "A rock canyon in white heat, shade only at the base.",
  "A salt pan cracked to the horizon with a shimmer above it.",
  "An oasis ringed with palms, tracks converging on the water.",
  "A dune sea at midday, heat shimmer blurring the horizon."
 ],
 "habitat-arctic": [
  "A snowfield under low grey cloud with a shape on the ridge.",
  "A glacier face with blue ice and meltwater at its foot.",
  "A frozen forest, every branch furred with rime.",
  "A wind-scoured ice field under a pale, low sun."
 ],
 "habitat-swamp": [
  "Black water and hanging moss with a channel leading away.",
  "A cypress stand half-drowned, roots breaking the surface.",
  "A bog pool with gas bubbling up through the surface.",
  "A stagnant mangrove channel choked with hanging moss and biting insects."
 ],
 "habitat-mountain": [
  "A high ridge above cloud with a cave mouth on the face.",
  "A scree slope under a bare peak.",
  "A narrow pass between rock walls, wind-scoured.",
  "A cliff ledge with a nest and scattered bones.",
  "An alpine meadow below a snowline.",
  "A gorge spanned by nothing, river far below.",
  "A knife-edge ridge trail with sheer drops on both sides.",
  "A boulder-strewn alpine slope above the treeline, cloud shadow racing across it.",
  "A narrow mountain pass walled in by sheer granite on either side."
 ],
 "habitat-forest": [
  "Deep woodland with light in shafts and something between the trunks.",
  "A jungle wall of green with a game trail pushed through it.",
  "An ancient forest of enormous trees, canopy closed overhead.",
  "A clearing at dusk with watching eyes at the treeline.",
  "A pine forest under snow, tracks between the trunks.",
  "A fallen giant of a tree with a hollow big enough to enter.",
  "A canopy walkway view with movement in the branches.",
  "A woodland stream with heavy prints in the bank.",
  "A thicket too dense to see into, recently disturbed.",
  "A mist-filled wood at first light, shapes resolving and not.",
  "A sunlit clearing ringed by ancient, moss-hung trees.",
  "A dense thicket where the canopy blocks out most of the sky.",
  "A fallen giant tree half-swallowed by ferns and undergrowth.",
  "A quiet woodland stream winding between root-tangled banks.",
  "A stand of blackened, fire-scarred trunks in an otherwise green wood.",
  "A narrow deer track vanishing into deep old-growth timber.",
  "A rain-soaked forest floor thick with fallen leaves and fungus.",
  "A clearing scattered with strange standing stones half-claimed by ivy."
 ],
 "habitat-plains": [
  "Open grassland to the horizon with a herd blurred by heat.",
  "A steppe under a huge sky, grass moving in one direction.",
  "A windswept grassland rolling to the horizon under a wide sky."
 ],
 "habitat-urban": [
  "A night alley with one lit window above and something in the dark.",
  "A ruined district reclaimed by weeds and worse.",
  "A rooftop skyline with a silhouette that should not be there.",
  "A narrow rooftop gap between two leaning tenements at dusk."
 ],
 "habitat-planar": [
  "A landscape under a wrong-coloured sky that obeys no local physics.",
  "A void of drifting stone islands with no ground beneath."
 ],
 "group-swarm": [
  "A moving carpet of small bodies pouring through a gap.",
  "A cloud of flying things darkening the light behind them.",
  "A dense, shifting mass moving as one across a cracked courtyard."
 ],
 "group-pack": [
  "A hunting pack fanned out across open ground, closing.",
  "A herd moving as one mass with the young in the centre.",
  "A war band silhouetted on a ridge with crude standards raised.",
  "A loose ring of watchful shapes circling at the edge of firelight."
 ]
};

export const TRAIT_MOTIF_SCENES = {
 "heritage-blood": [
  "A family portrait on a wall with one face turned away.",
  "A birthmark that is unmistakably a rune.",
  "A lineage carved into a stone wall, one name freshly cut.",
  "A cradle carved with ancestral patterns.",
  "Three generations around one hearth.",
  "A face reflected in still water, considering itself.",
  "A signet ring pressed into a young palm.",
  "An ancestor's armour in a hall, sized for someone else.",
  "A locket opened to a portrait with familiar features.",
  "A bloodline chart on vellum with a branch circled.",
  "A child's hand and an elder's hand, the same shape.",
  "A tomb effigy whose face the visitor shares.",
  "An old scar carried by every generation in a painting.",
  "A door in a house that has always been in the family.",
  "A grave visited yearly, the grass worn to a path.",
  "A heirloom blade too old for its current owner.",
  "A name spoken over a newborn in a lamplit room.",
  "A crowd where one face stands out as related to another.",
  "A young woman's eyes flashing an unnatural color in candlelight, a family locket clutched in her hand.",
  "A weathered family crest carved above a farmhouse door, half-worn by generations of hands.",
  "A child tracing an old bloodline tree painted across a manor's entrance hall.",
  "A merchant comparing features with an old portrait, seeing an unmistakable resemblance.",
  "A grandmother's ring passed to a waiting granddaughter's palm by firelight.",
  "A birthmark catching lamplight as a healer examines a newborn.",
  "A dusty family Bible open to a hand-annotated genealogy.",
  "A traveler recognizing kin by a distinctive gait glimpsed across a crowded square.",
  "An heirloom blade unsheathed for the first time in a generation.",
  "A twin pair of siblings finishing each other's sentence without a glance exchanged."
 ],
 "loss-vengeance": [
  "A funeral pyre on a beach with one mourner remaining.",
  "A burned homestead with a single figure standing in the ash.",
  "A name carved into a blade's flat with a knifepoint.",
  "A lone figure standing before a burned homestead, jaw set, sword already in hand.",
  "A name carved into a tavern's beam, visited nightly by the same grim patron."
 ],
 "mentor-training": [
  "An old hand correcting a young grip on a weapon.",
  "A practice yard at dawn with two figures and no audience.",
  "A workshop where a master watches an apprentice fail.",
  "A book being handed across a table to someone younger.",
  "A empty training ground with two sets of footprints.",
  "A teacher's chair, occupied, and a student's, not.",
  "An old swordmaster correcting a student's stance with a light tap of his cane.",
  "A scholar guiding a novice's hand across an open tome by candlelight.",
  "A veteran archer adjusting a recruit's draw on a windy practice range."
 ],
 "faith-devotion": [
  "A wayside shrine with fresh offerings at its foot.",
  "A holy symbol held in both hands, worn smooth by thumbing.",
  "A temple interior with light through high windows onto empty benches.",
  "A vigil kept alone beside an altar through the night.",
  "A procession carrying an icon through narrow streets.",
  "A prayer said over a meal in a poor kitchen.",
  "A pilgrim's staff leaning by a door.",
  "A censer swinging in a dim nave, smoke rising.",
  "A hand laid on a sick brow in a plain room.",
  "A congregation standing as one at dawn.",
  "A holy book chained to a lectern, open at a marked page.",
  "A pilgrim kneeling before a roadside shrine, coin left in the offering bowl.",
  "A young acolyte polishing a temple's holy symbol until it gleams.",
  "A worshiper's lips moving in quiet prayer at a candlelit altar.",
  "A devotee's palms pressed together as dawn light breaks through stained glass.",
  "A traveling priest blessing a farmer's field before the planting.",
  "A congregation's heads bowed as incense curls upward through temple rafters."
 ],
 "wealth-trade": [
  "A merchant's counting house with ledgers open.",
  "Stacked coins and scales on a counting table.",
  "A purse cut and falling in a crowded market.",
  "A beggar's bowl on a busy street.",
  "A merchant's ledger open beside a stack of coin, an abacus close at hand.",
  "A caravan master counting crates by lantern light before the gates close."
 ],
 "wilderness": [
  "A tracker kneeling to read a print in mud.",
  "A lone camp in driving snow, back to the wind.",
  "A ridge walked at dusk with the valley below.",
  "A hunter's cabin hung with pelts and traps.",
  "A lone ranger reading broken branches and disturbed leaves at a trailhead.",
  "A hunter's lean-to shelter woven from branches beside a low campfire.",
  "A woodsman's axe buried in a stump beside a half-split pile of firewood."
 ],
 "city-streets": [
  "A night alley with one lit window above.",
  "A rooftop run across tiles at dusk.",
  "A crowded market where one hand is where it should not be.",
  "A street urchin ducking between market stalls, one step ahead of a shouting vendor.",
  "A lamplighter making his rounds down a narrow, fog-wrapped city lane."
 ],
 "battle-veteran": [
  "A shield with a device worn nearly away by use.",
  "A veteran's scarred forearms resting on a table.",
  "A battlefield after, with weapons standing as markers.",
  "A soldier lacing a bracer by firelight before a fight.",
  "A muster in a courtyard at dawn, ranks forming.",
  "A helm set down on a stump, its owner sitting beside it.",
  "A trench before an assault, everyone quiet.",
  "A war banner hanging in a hall, its device barely readable.",
  "A single figure walking away from a fought-over field.",
  "A field of old earthworks with grass grown over them.",
  "A scarred soldier's hands steady despite the chaos remembered in his eyes, cleaning a well-used blade.",
  "A retired mercenary studying an old battle standard hung above a hearth.",
  "A veteran's fingers tracing an old wound through a worn tunic.",
  "A campaign map spread on a table, pins marking battles long since fought.",
  "A grizzled sergeant drilling raw recruits in a muddy yard, voice hoarse from years of command.",
  "A soldier's kit laid out for inspection, every strap worn smooth from use.",
  "An old shield hung on a wall, its dents each telling a different story."
 ],
 "arcane-study": [
  "A grimoire open on a windowsill, pages turning without wind.",
  "An apprentice's bench of failed and half-working charms.",
  "A first cantrip lighting a child's hands in a dark room.",
  "A tower study at night, instruments among the books.",
  "A circle of chalk on a bedroom floor, hastily drawn.",
  "A candle burning with a flame the wrong colour.",
  "A wand kept hidden inside a coat lining.",
  "A library of chained volumes with one lectern lit.",
  "A rune practised over and over down a page.",
  "A scholar asleep at a desk with a spell still glowing.",
  "A summoning circle scrubbed from a floor but still faintly visible.",
  "An orrery turning slowly in a dusty tower room.",
  "A shelf of components in labelled jars, one nearly empty.",
  "A staff leaning in a corner beside a made bed.",
  "A student hunched over a spellbook by candlelight, ink-stained fingers tracing a diagram.",
  "A cluttered study crowded with astrolabes, scrolls and half-finished notes.",
  "A wizard's apprentice carefully copying a glyph, tongue between her teeth in concentration."
 ],
 "social-tongue": [
  "A crowded tavern where one conversation matters.",
  "A noble's receiving room with petitioners waiting.",
  "A negotiator reading the moment a room turns.",
  "A back-alley handshake over a small package.",
  "A street performer working a ring of onlookers.",
  "A courtroom with the crowd pressed to the rail.",
  "A letter read aloud to someone who cannot read.",
  "A gambling table with the stakes visibly too high.",
  "A whispered word behind a raised hand at a feast.",
  "A guild hall mid-argument, banners above.",
  "A door held open a moment longer than needed.",
  "A masked figure at a ball reading the room from the edge.",
  "A market haggle at the moment the price breaks.",
  "A queue of petitioners outside a closed door.",
  "A toast raised at a table where nobody trusts anybody.",
  "A diplomat's fluent gesture bridging a tense moment between two foreign envoys.",
  "A trader haggling cheerfully in three languages at once across a crowded stall.",
  "A bard collecting phrases from a sailor fresh off a foreign ship.",
  "A scholar comparing two ancient texts written in different scripts.",
  "A traveler's relief as a stranger's words finally resolve into something understood."
 ],
 "saves-willpower": [
  "A figure braced against a wave of force, feet planted.",
  "A warrior shrugging off a blow that should have felled them.",
  "A lone figure refusing to look away from something terrible.",
  "A hand thrown up against a blast that breaks around it.",
  "Someone standing upright in a crowd that has all knelt.",
  "A mind holding against an intrusion, jaw set, eyes open.",
  "A captive's unflinching stare meeting an interrogator's gaze without wavering.",
  "A monk's calm breathing unbroken despite the chaos erupting around her.",
  "A prisoner's jaw set firm against a tempter's honeyed offer."
 ],
 "skill-knack": [
  "A craftsman's hands moving with practised certainty.",
  "A cluttered study where one scholar has found the answer.",
  "A lockpick turning with an ear pressed to the plate.",
  "A workbench where a difficult thing has just come right.",
  "A locksmith's fingers finding a lock's give with practiced, unhurried ease.",
  "A cook's knife moving in an easy blur across a cluttered kitchen board.",
  "A rigger scrambling aloft with the unthinking confidence of long practice."
 ]
};
