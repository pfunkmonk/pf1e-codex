/* PF1e Codex — keyword-derived art themes.
 *
 * THE PROBLEM THIS SOLVES
 * Per-entry art for 25,926 entries is not achievable (~86 batches of generation). But a single
 * fallback image per category is worse than it sounds: before this file existed, ONE picture
 * (`cat-feats`) backed 2,010 feat pages and another (`item-generalstore`) backed 1,931 item pages.
 * Themes sit between the two extremes — a modest set of images keyed off words that recur across
 * many entries ("trip", "metamagic", "sneak attack"), so a page gets art about what it actually
 * does without commissioning one picture per entry.
 *
 * HOW A THEME IS MATCHED
 * Each row is [key, nameRegex, textRegex, variants]. Every theme is tried against the entry NAME
 * first, in table order; only if nothing matches does a second pass try the body TEXT. Name beats
 * text because names are precise ("Improved Trip") and body text is chatty (a feat can mention
 * tripping in passing without being about it).
 *
 * ORDER IS THE ENTIRE MECHANISM — MOST SPECIFIC FIRST.
 * "Improved Trip" matches both `trip` and `weapon-training`; it resolves correctly only because
 * `trip` is listed first. Adding a broad theme high in the table will silently steal hundreds of
 * entries from the specific themes below it. `weapon-training` is deliberately LAST and deliberately
 * narrow: an earlier draft also matched the bare adjectives improved/greater/master/advanced and
 * hoovered up 139 unrelated feats, which is exactly the failure this ordering is meant to prevent.
 * tools/check-themes.mjs enforces the invariant — it fails the build if any theme claims more than
 * MAX_CLAIM entries (too broad to be meaningful) or fewer than MIN_CLAIM (dead weight).
 *
 * VARIANTS
 * `variants` is how many interchangeable images that theme has on disk, named
 * theme-<bucket>-<key>-<n>. The one shown is picked by hashing the entry id, so it is arbitrary
 * but STABLE — the same page shows the same picture on every visit. Counts are sized so no single
 * image backs more than ~20 pages. Raising a count is safe; the new file is used the moment it
 * lands. LOWERING one strands art on disk that nothing references any more.
 *
 * PROMPT PACKS ARE GENERATED FROM THIS FILE, NOT WRITTEN ALONGSIDE IT.
 * tools/gen-art-prompts.mjs reads these keys and variant counts and refuses to run if any key
 * lacks a scene description. That is deliberate: the art we commission and the art the app looks
 * for cannot drift apart, which is the same class of bug that once left `Bull's Strength` art on
 * disk but unreachable because two slug rules disagreed.
 */
window.PF_THEMES = {
  /* ---------------------------------------------------------------- FEATS --
     3,457 feats. 121 have their own named art; these 95 themes cover 2,611 of
     the remaining 3,336, and the 725 stragglers fall through to the
     `feat-scene-N` variety set declared in FALLBACK below. */
  feats: [
    // --- combat maneuvers ---
    ["trip",              /\btrip(ping)?\b|\bupending|\bfelling\b/i,      /\btrip combat maneuver\b/i, 2],
    ["disarm",            /\bdisarm|\bwrest\b/i,                          /\bdisarm\b/i, 2],
    ["sunder",            /\bsunder|\bshatter/i,                          /\bsunder\b/i, 2],
    ["grapple",           /\bgrappl|\bpin\b|\bconstrict|\bchokehold|\bstrangl/i, /\bgrapple[ds]?\b/i, 5],
    ["bull-rush",         /\bbull rush|\bshove\b|\bknockback/i,           /\bbull rush\b/i, 2],
    ["overrun",           /\boverrun|\btrample|\bstampede/i,              /\boverrun\b/i, 1],
    ["dirty-trick",       /\bdirty trick/i,                                /\bdirty trick\b/i, 1],
    ["steal-maneuver",    /\bsteal\b|\bpilfer|\bsnatch/i,                 /\bsteal combat maneuver\b/i, 1],
    ["reposition-drag",   /\breposition|\bdrag\b/i,                       /\breposition\b/i, 2],
    ["feint",             /\bfeint|\bmisdirect/i,                         /\bfeint\b/i, 3],
    ["maneuver-general",  /\bmaneuver|\bagile maneuvers\b/i,              /\bcombat maneuver (bonus|defense)\b/i, 1],
    // --- attack styles ---
    ["power-attack",      /\bpower attack|\bfurious|\bcleave|\bsmash|\bcrush|\bmighty\b/i, /\bpower attack\b/i, 4],
    ["vital-strike",      /\bvital strike|\bdevastat|\bstrike$/i,         /\bvital strike\b/i, 6],
    ["two-weapon",        /\btwo-weapon|\bdouble\b|\bambidext|\bdual\b/i, /\btwo-weapon fighting\b/i, 2],
    ["finesse-duelist",   /\bfinesse|\bgrace\b|\bfencing|\bduel|\bswashbuck|\bpanache|\briposte|\bparry/i, /\bweapon finesse\b|\bpanache\b/i, 4],
    ["archery",           /\bshot\b|\barcher|\bbow\b|\bmanyshot|\bdeadly aim|\bvolley|\barrow|\bfletch/i, /\bpoint.blank shot\b/i, 5],
    ["thrown",            /\bthrow(n|ing)?\b|\bjuggl|\bhurl|\bsling\b/i,  /\bthrown weapon\b/i, 3],
    ["firearms",          /\bfirearm|\bgun\b|\bpistol|\bmusket|\bgrit\b|\bammo|\bartillery|\bcartridge/i, /\bfirearm|\bgrit\b/i, 3],
    ["charge",            /\bcharge\b|\bspirited|\blance\b/i,             /\bwhen you charge\b/i, 2],
    ["mounted",           /\bmounted|\bride\b|\briding|\bcavalry|\bhorse|\bsaddle|\bsteed/i, /\bmounted\b/i, 2],
    ["critical-hit",      /\bcritical\b|\bstagger|\bstunning|\bbleeding|\bmaiming/i, /\bcritical hit\b/i, 5],
    ["attacks-of-opp",    /\bopportun|\bcombat patrol|\bcombat reflexes|\bstep up|\bspellbreaker|\bdisruptive/i, /\battacks? of opportunity\b/i, 4],
    ["combat-expertise",  /\bcombat expertise|\bexpertise\b|\bdefensive\b/i, /\bcombat expertise\b/i, 3],
    ["dodge-mobility",    /\bdodge|\bmobility|\bstance\b|\bnimble|\bevasi|\belusive/i, /\bdodge bonus\b/i, 3],
    ["reach-polearm",     /\breach\b|\blunge|\bpolearm|\bphalanx|\bspear/i, /\breach weapon\b/i, 1],
    // --- defence ---
    ["shield",            /\bshield|\bbash\b|\bbuckler|\bbulwark/i,       /\bshield bonus\b/i, 6],
    ["armor",             /\barmor|\bplate\b|\bmail\b|\bharness/i,        /\barmor check penalty\b/i, 4],
    ["toughness-saves",   /\btoughness|\bendur|\bdiehard|\bfortitude|\biron will|\breflexes|\bresilien|\bstalwart|\bhardy/i, /\bhit points\b/i, 5],
    // --- unarmed / monk ---
    ["monk-style",        /\bstyle\b/i,                                    /\bstyle feat\b/i, 8],
    ["unarmed",           /\bunarmed|\bpunch|\bkick\b|\bfist\b|\bbrawl|\bmartial arts|\bblow\b|\bgrab\b/i, /\bunarmed strike\b/i, 5],
    ["ki-meditation",     /\bki\b|\bqinggong|\bmeditat|\bascetic|\bmonastic/i, /\bki pool\b/i, 1],
    // --- magic ---
    ["metamagic",         /\bspell$|\bmetamagic|\bquicken|\bempower|\bmaximize|\bwiden|\bstill spell|\bsilent spell|\bextend|\benlarge|\bheighten|\bpersistent/i, /\bmetamagic\b/i, 8],
    ["spell-focus",       /\bspell focus|\bspell specialization|\bspell penetration|\bspell perfection|\bfocus$/i, /\bspell focus\b|\bspell penetration\b/i, 3],
    ["counterspell",      /\bcounterspell|\bdispel|\bnullif|\bantimagic/i, /\bcounterspell\b/i, 1],
    ["summoning",         /\bsummon|\bconjur|\bgate\b/i,                   /\bsummon monster\b/i, 3],
    ["familiar",          /\bfamiliar|\btumor\b/i,                         /\bfamiliar\b/i, 3],
    ["animal-companion",  /\bcompanion|\bboon companion|\bpack\b/i,        /\banimal companion\b/i, 4],
    ["bloodline",         /\bbloodline|\bheritage|\bdraconic|\babyssal\b/i, /\bbloodline\b/i, 2],
    ["channel-energy",    /\bchannel|\bturn undead|\bcommand undead/i,     /\bchannel energy\b/i, 4],
    ["hex-witch",         /\bhex\b|\bwitch|\bcackle|\bcauldron|\bcoven/i,  /\bhex\b/i, 2],
    ["rage-barbarian",    /\brag(e|ing)\b|\bbarbarian|\bfury|\bberserk|\bferocious|\bsavage/i, /\brage powers?\b/i, 4],
    ["bardic",            /\bbard\b|\bperform|\bsong\b|\bmasterpiece|\blingering|\bmelod|\bharmon|\bdirge/i, /\bbardic performance\b/i, 4],
    ["smite-paladin",     /\bsmite|\bpaladin|\blay on hands|\bmercy\b|\blitany|\bcrusad|\bchampion/i, /\bsmite evil\b|\blay on hands\b/i, 2],
    ["judgment-teamwork", /\bjudgment|\binquisit|\bbane\b|\bteamwork|\bcoordinat|\bpaired\b|\bgang\b/i, /\bteamwork feat\b|\bjudgment\b/i, 3],
    ["arcane",            /\barcane|\beldritch|\bmage\b|\bwizard|\bsorcer|\barcanist/i, /\barcane strike\b/i, 2],
    ["mesmerist-stare",   /\bstare\b|\bmesmer|\bhypnot|\bgaze\b/i,         /\bpainful stare\b/i, 2],
    ["psychic-occult",    /\bpsychic|\boccult|\bphrenic|\bmind\b|\btelepath|\bthought|\bmental|\bmindscape|\balien\b/i, /\bpsychic magic\b/i, 5],
    ["spirit-medium",     /\bspirit|\bmedium\b|\bshaman|\bseance|\bhaunt|\bwander/i, /\bspirit\b/i, 5],
    ["necromancy",        /\bundead|\bnecro|\bcorpse|\bghoul|\bzombie|\bskeleton|\bbone\b|\bgrave\b|\bdeath\b/i, /\bundead\b/i, 5],
    ["shadow",            /\bshadow|\bdark|\bnight\b|\bumbral|\bgloom/i,   /\bshadow\b/i, 3],
    ["planar",            /\bplanar|\bextraplanar|\bdemon|\bdevil|\bangel|\bcelestial|\bfiend|\bdamn|\bdimension|\binfernal|\babyss|\basura/i, /\bextraplanar\b/i, 5],
    // --- elemental ---
    ["fire",              /\bfire|\bflame|\bburn|\bblaz|\bcinder|\bpyro|\bash\b|\bsmoke/i, /\bfire damage\b/i, 3],
    ["cold",              /\bcold|\bfrost|\bice\b|\bfrozen|\bwinter|\brime\b|\barctic/i, /\bcold damage\b/i, 1],
    ["lightning",         /\blightning|\belectric|\bthunder|\bstorm|\bshock/i, /\belectricity damage\b/i, 2],
    ["acid-poison",       /\bacid|\bcorros|\bvenom|\bpoison|\btoxic|\bsting/i, /\bacid damage\b|\bpoison\b/i, 3],
    ["earth-stone",       /\bstone|\bearth|\bmountain|\bgranite|\bboulder|\bcrystal|\bmetal\b|\biron\b|\bsteel/i, /\bstone\b/i, 5],
    ["air-flight",        /\bwind\b|\bair\b|\bsky\b|\bcloud|\bflight|\bfly\b|\bwing|\baerial|\bsoar|\baltitude/i, /\bfly speed\b/i, 3],
    ["water",             /\bwater|\baqua|\bswim|\bsea\b|\bocean|\btide\b|\bwave\b|\bmarine|\bnaut/i, /\bswim speed\b/i, 2],
    // --- skills & social ---
    ["stealth",           /\bstealth|\bhide\b|\bsneak|\bcamouflage|\bvanish|\bsilent\b|\bambush|\bassassin/i, /\bstealth check\b|\bsneak attack\b/i, 2],
    ["intimidate",        /\bintimidat|\bdemoral|\bfear\b|\bterrif|\bdread|\bcornugon|\bmenac|\bfright|\bhorror/i, /\bintimidate check\b|\bdemoralize\b/i, 7],
    ["diplomacy",         /\bdiplomac|\bpersuas|\bnegotiat|\bcharm|\bcourt|\bnoble|\betiquette|\bfriend/i, /\bdiplomacy check\b/i, 3],
    ["bluff-disguise",    /\bbluff|\bdecei|\bdisguise|\blie\b|\bmask\b|\bimperson|\bswindl/i, /\bbluff check\b/i, 2],
    ["perception",        /\bpercept|\bsense\b|\balert|\bkeen\b|\bsharp|\bwatch|\bscout|\bwarning|\bsight\b/i, /\bperception check\b/i, 3],
    ["knowledge",         /\bknowledge|\blore\b|\bscholar|\bstud(y|ent|ied)|\bresearch|\bsavant|\bgraduate|\bacadem|\bsage\b|\bastrolog/i, /\bknowledge \(/i, 6],
    ["athletics",         /\bclimb|\bscal(e|ing)|\bathlet|\bjump|\bleap|\btumbl|\brun\b|\bsprint|\bacrobat|\bascen/i, /\bclimb speed\b|\bacrobatics check\b/i, 4],
    ["heal-medicine",     /\bheal|\bmedic|\bsurgeon|\bchirurg|\bacupunct|\banatom|\bremed/i, /\bheal check\b/i, 2],
    ["survival",          /\bsurvival|\btrack|\bforag|\bwilder|\bhunt|\btrapper|\bnomad|\bexplor|\badaptation/i, /\bsurvival check\b/i, 4],
    ["traps-thievery",    /\btrap|\bdisable|\block\b|\bthief|\bpick\b|\bburgl/i, /\bdisable device\b/i, 2],
    ["leadership",        /\bleader|\bcommand|\bcaptain|\btactic|\brally|\binspir|\ballied|\bassociate|\bpartner|\bteam\b/i, /\bleadership\b|\bcohort\b/i, 5],
    ["linguistics",       /\blinguist|\blanguage|\bscript|\bcipher|\btongue|\bglyph/i, /\blinguistics\b/i, 1],
    // --- crafting ---
    ["item-creation",     /\bcraft|\bforge\b|\bscribe|\bbrew|\bconstruct|\bcreate|\bartis|\bsmith/i, /\bitem creation\b/i, 6],
    ["alchemy",           /\balchem|\bbomb|\bmutagen|\bextract|\bdiscover|\belixir|\bpotion|\bdrug/i, /\balchemist\b|\bbombs?\b/i, 3],
    ["item-mastery",      /\bitem mastery/i,                               /\bitem mastery\b/i, 1],
    // --- creature / racial ---
    ["natural-attacks",   /\bbite\b|\bclaw|\bgore\b|\bnatural\b|\btail\b|\bhoof|\btalon|\brend\b|\bmaul|\bfang/i, /\bnatural attacks?\b/i, 3],
    ["dragon-breath",     /\bbreath\b|\bdragon/i,                          /\bbreath weapon\b/i, 1],
    ["race-dwarf",        /\bdwar/i,                                       /\bdwarf\b/i, 1],
    ["race-elf",          /\belf\b|\belven|\bdrow\b/i,                     /\belves\b/i, 1],
    ["race-gnome",        /\bgnome/i,                                      /\bgnome\b/i, 1],
    ["race-halfling",     /\bhalfling/i,                                   /\bhalfling\b/i, 2],
    ["race-orc-gnoll",    /\borc\b|\bgnoll/i,                              /\bhalf-orc\b/i, 1],
    ["race-goblinoid",    /\bgoblin|\bhobgoblin|\bbugbear|\bkobold/i,      /\bkobold\b/i, 1],
    ["race-planetouched", /\btiefling|\baasimar|\bifrit|\boread|\bsylph|\bundine|\bsuli\b/i, /\btiefling\b|\baasimar\b/i, 1],
    ["race-beastfolk",    /\bcatfolk|\bratfolk|\btengu|\bkitsune|\bvishkanya|\bnagaji|\bwayang|\bgrippli|\bshifter|\blizardfolk/i, /\btengu\b/i, 1],
    ["race-giant",        /\bgiant|\bogre\b|\btroll/i,                     /\bgiant\b/i, 1],
    // --- misc ---
    ["initiative-speed",  /\binitiative|\bquick\b|\bfast\b|\bswift\b|\bspeed\b|\bfleet\b|\bsudden|\bhast/i, /\binitiative check\b/i, 2],
    ["extra-resource",    /\bextra\b|\badditional\b|\bexpanded|\babundant/i, /\badditional uses\b/i, 3],
    ["story-destiny",     /\bstory\b|\bdestiny|\bfate\b|\bvengeance|\bredempt|\bascend|\blegacy|\bheir\b|\bbirthright|\bapotheosis/i, /\bstory feat\b/i, 2],
    ["faith-obedience",   /\bobedience|\bboon\b|\bevangel|\bexalted|\bsentinel|\bdeific|\bfaith|\bpray|\bholy|\bsacred|\bbless|\bpious|\bpilgrim|\breligio|\bdivine|\btemple|\bsaint|\bpurity/i, /\bdeific obedience\b|\bdeity\b/i, 5],
    ["performance-combat",/\bperformance|\bshowman|\bcrowd|\bgladiat|\barena|\bspectacl/i, /\bperformance combat\b/i, 1],
    ["siege-vehicle",     /\bsiege|\bvehicle|\bcatapult|\bballista|\bcannon|\bship\b|\bsail|\bcrew\b/i, /\bsiege engine\b/i, 2],
    ["curse-disease",     /\bcurse|\bdisease|\bplague|\bblight|\brot\b|\binfect/i, /\bcursed?\b|\bdisease\b/i, 5],
    ["light-radiance",    /\blight\b|\bradian|\bsun\b|\bdawn\b|\bbright|\bglow|\blumin/i, /\bbright light\b/i, 1],
    ["blood-sacrifice",   /\bblood|\bsacrific|\bwound|\bscar\b|\bpain\b|\bmartyr/i, /\bhit point damage\b/i, 4],
    ["multiclass-dabble", /\bamateur|\bdabbl|\bapprentic|\bnovice|\binitiate|\bstudent\b/i, /\bcount as .* levels?\b/i, 1],
    // LAST and NARROW on purpose. See the ordering note at the top of this file.
    ["weapon-training",   /\bweapon|\bsword|\bblade\b|\bproficien|\btraining\b|\bmartial\b/i, /\bweapon training\b|\bproficiency\b/i, 5]
  ],

  /* ---------------------------------------------------------------- ITEMS --
     6,677 entries, the largest bucket in the Codex — a quarter of every page.
     103 have their own art. These 68 themes claim 3,770 of the remaining 6,574;
     the 2,804 stragglers are absorbed by the rawCat variety sets (item-weapon,
     item-armorset, item-artifact) and the item-scene / item-wondrous sets.

     Three different problems live in this bucket and the ordering reflects it:
       - 1,806 MUNDANE goods (rope, ale, livestock, tools) under Miscellaneous
       - 1,063 slotless WONDROUS items, whose names are the only axis available
       - 1,174 "Weapons" that are a mix of real weapons, ammunition, and abstract
         magic qualities (Keen, Bane, Vorpal). The abstract ones cannot be themed
         from a name, so concrete weapon kinds are matched FIRST and the leftovers
         fall to the item-weapon variety set, which is exactly what it is for. */
  items: [
    ["firearm-ammo",    /\bcartridge|\bbullet|\bpellet|\bblack powder|\bshot\b/i, null, 4],
    ["arrow-bolt",      /\barrow|\bbolt\b|\bquiver|\bshuriken|\bdart\b|\bammunition/i, null, 7],
    ["firearm",         /\bpistol|\bmusket|\brifle|\bgun\b|\bcannon|\bmortar|\brepeater|\bfirearm|\bblunderbuss|\bculverin|\bpepperbox|\bair reservoir/i, null, 6],
    ["bow-crossbow",    /\bbow\b|\bcrossbow|\bballista|\bsling\b/i, null, 4],
    ["blade-sword",     /\bsword|\bblade\b|\brapier|\bscimitar|\bfalchion|\bkatana|\bsabre|\bsaber|\bcutlass|\bestoc/i, null, 10],
    ["blade-dagger",    /\bdagger|\bknife|\bkukri|\bdirk\b|\bstiletto|\bkerambit/i, null, 2],
    ["axe",             /\baxe\b|\bhatchet|\bbardiche/i, null, 2],
    ["bludgeon",        /\bhammer|\bmace\b|\bclub\b|\bflail|\bmaul\b|\bmorningstar|\bcudgel|\bquarterstaff|\bnunchaku|\bsap\b/i, null, 4],
    ["polearm-spear",   /\bspear|\bpike\b|\blance\b|\btrident|\bscythe|\bpolearm|\branseur|\bguisarme|\bnaginata|\bhalberd|\bglaive/i, null, 4],
    ["exotic-weapon",   /\bwhip|\bnet\b|\bbolas|\bchakram|\bkusari|\burumi|\baklys|\batlatl|\bboomerang|\bgarrote/i, null, 3],
    ["weapon-quality",  /\bbane\b|\bkeen\b|\bflaming|\bfrost\b|\bshock|\bcorrosive|\bvorpal|\bbrilliant|\bdancing|\bdefending|\bthundering|\bwounding|\bseeking|\bdistance|\bmerciful|\bmighty|\bagile\b|\badaptive/i, null, 5],
    ["armor-heavy",     /\bplate\b|\bbanded|\bsplint/i, null, 3],
    ["armor-medium",    /\bbreastplate|\bchainmail|\bchain mail|\bscale mail|\bbrigandine|\bcuirass/i, null, 2],
    ["armor-light",     /\bleather|\bpadded|\bchain shirt|\bstudded|\bharamaki|\blamellar/i, null, 2],
    ["shield-item",     /\bshield|\bbuckler|\btarge|\baegis/i, null, 6],
    ["barding-tack",    /\bbarding|\bsaddle|\bbridle|\bharness|\bstirrup|\bhorseshoe|\byoke\b/i, null, 3],
    ["ioun-stone",      /\bioun/i, null, 5],
    ["ring-item",       /\bring\b/i, null, 12],
    ["amulet-neck",     /\bamulet|\bnecklace|\bperiapt|\btorc\b|\bpendant|\bbrooch|\bmedallion|\bscarab|\bcollar|\bchoker/i, null, 10],
    ["cloak-cape",      /\bcloak|\bcape\b|\bmantle|\bshawl|\bwrap\b/i, null, 7],
    ["boots-footwear",  /\bboots|\bshoes|\bslippers|\bsandals|\bgreaves|\banklets/i, null, 7],
    ["gloves-bracers",  /\bgloves|\bgauntlet|\bbracers|\bvambrace|\bmitt|\bwristband/i, null, 9],
    ["belt-girdle",     /\bbelt\b|\bgirdle|\bsash\b/i, null, 5],
    ["helm-crown",      /\bhelm|\bcrown|\bcirclet|\bdiadem|\btiara|\bcoronet/i, null, 4],
    ["headband-hat",    /\bheadband|\bhat\b|\bcap\b|\bhood\b|\bturban|\bveil\b/i, null, 6],
    ["mask-goggles",    /\bmask\b|\bgoggles|\blenses|\bspectacles|\beyepatch|\bvisor/i, null, 7],
    ["robe-vestment",   /\brobe\b|\bvest\b|\btunic|\bgarb\b|\bshirt|\bcoat\b|\bjacket|\bdress\b|\bgown\b|\bapron|\bcostume|\bcorset/i, null, 7],
    ["wand",            /\bwand\b/i, null, 1],
    ["staff",           /\bstaff\b|\bstave/i, null, 9],
    ["rod-scepter",     /\brod\b|\bscepter|\bsceptre|\bcane\b|\bbaton/i, null, 11],
    ["figurine-idol",   /\bfigurine|\bstatuette|\bstatue|\bidol\b|\bdoll\b|\bpuppet|\beffigy|\btotem|\bfetish|\bicon\b/i, null, 3],
    ["orb-sphere",      /\borb\b|\bsphere|\bglobe|\bcrystal ball|\bmarble|\bbead\b/i, null, 2],
    ["bag-container",   /\bbag\b|\bpouch|\bsack\b|\bchest\b|\bbox\b|\bcase\b|\bcoffer|\bbarrel|\bhaversack|\bbackpack|\bportable hole|\bbasket|\bcrate/i, null, 6],
    ["bottle-vial",     /\bbottle|\bflask|\bvial\b|\bjar\b|\bjug\b|\burn\b|\bdecanter|\bphial/i, null, 6],
    ["book-scroll",     /\bbook\b|\btome\b|\bgrimoire|\blibram|\bmanual|\bcodex|\bfolio|\bscroll|\bspellbook|\bjournal|\bledger/i, null, 5],
    ["mirror-lens",     /\bmirror|\blooking glass|\bprism/i, null, 1],
    ["horn-instrument", /\bhorn\b|\bdrum\b|\bflute|\bharp\b|\blute\b|\bpipes|\bfiddle|\bviol\b|\blyre|\bmandolin|\binstrument|\bwhistle/i, null, 5],
    ["bell-chime",      /\bbell\b|\bchime|\bgong\b|\btuning fork/i, null, 1],
    ["lantern-light",   /\blantern|\btorch|\bcandle|\blamp\b|\bbeacon|\bbrazier|\bcenser/i, null, 4],
    ["gem-stone",       /\bstone\b|\bgem\b|\bpearl|\bcrystal|\bdiamond|\bruby|\bemerald|\bsapphire|\bopal\b|\bjade\b|\bamber|\bagate|\bquartz/i, null, 4],
    ["dust-powder",     /\bdust\b|\bpowder|\bsand\b|\bincense|\bsalt\b|\bpollen|\bpigment|\bchalk/i, null, 6],
    ["rope-cord",       /\brope\b|\bcord\b|\btwine|\bchain\b|\bladder|\bnetting|\bcable/i, null, 3],
    ["carpet-banner",   /\bcarpet|\brug\b|\bbroom|\bmat\b|\btapestry|\bbanner|\bflag\b|\bstandard\b/i, null, 2],
    ["cauldron-pot",    /\bcauldron|\bpot\b|\bkettle|\bpan\b|\bbowl\b|\bcrucible/i, null, 2],
    ["key-lock",        /\bkey\b|\block\b|\bpadlock|\bmanacle|\bshackle|\bfetter/i, null, 3],
    ["deck-game",       /\bdeck\b|\bcard\b|\bharrow|\bdice\b|\bgame\b|\bpuzzle/i, null, 1],
    ["talisman-charm",  /\btalisman|\bcharm\b|\bward\b|\bsigil|\brune\b|\bphylactery/i, null, 3],
    ["holy-symbol",     /\bholy symbol|\bunholy symbol|\baltar|\bshrine|\breliquar|\bprayer|\bfont\b|\bthrone/i, null, 3],
    ["drink-alcohol",   /\bale\b|\bwine\b|\bbeer\b|\bmead\b|\bwhiskey|\bbrandy|\brum\b|\bgin\b|\bvodka|\babsinthe|\bapplejack|\bliquor|\bspirits\b|\bgallon|\btankard|\bcask\b/i, null, 1],
    ["food-ration",     /\bfood\b|\bration|\bbread|\bmeat\b|\bcheese|\bmeal\b|\bfeast|\bfruit|\bgrain|\bflour|\bsugar|\bhoney|\bsoup|\bstew\b/i, null, 2],
    ["herb-spice",      /\bherb\b|\bspice|\bcumin|\bpepper|\bsaffron|\broot\b|\bleaf\b|\bleaves|\bseed\b|\bmoss\b|\bfungus|\bmushroom|\bbark\b/i, null, 1],
    ["animal-livestock",/\bhorse|\bpony|\bmule\b|\bdonkey|\box\b|\boxen|\bbison|\baurochs|\bboar\b|\bdog\b|\bhound|\bcat\b|\bbat\b|\bgoat|\bsheep|\bcattle|\bcamel|\belephant|\bfalcon|\bhawk\b|\bpigeon/i, null, 3],
    ["artisan-tools",   /\btools?\b|\bchisel|\bsaw\b|\bfile\b|\bawl\b|\bneedle|\bthread|\banvil|\bbellows|\btongs|\bimplement/i, null, 2],
    ["adventuring-kit", /\bkit\b|\bset\b|\bpack\b|\bsupplies/i, null, 11],
    ["trap-restraint",  /\btrap\b|\bsnare|\bcage\b|\bbranding|\bpillory|\bstocks\b|\bcaltrop|\bspike\b/i, null, 4],
    ["alchemical-good", /\balchemical|\balchemist|\bacid\b|\bantitoxin|\btanglefoot|\bthunderstone|\bsmokestick|\bpheromone|\bcoal\b|\bfuse\b|\bglue\b|\badhesive/i, null, 3],
    ["poison-drug",     /\bpoison|\bvenom|\btoxin|\bdrug\b|\bnarcotic|\bopium|\bpesh\b|\bsalve|\bointment/i, null, 3],
    ["medicine-heal",   /\bmedicine|\bbandage|\bpoultice|\bsplint|\bcrutch|\bsurgeon|\bhealer|\bremedy|\bantiplague/i, null, 1],
    ["clothing-cloth",  /\bcloth\b|\bsilk\b|\bwool\b|\blinen|\bblanket|\bbedroll|\btowel|\bfabric|\bcanvas|\bfur\b/i, null, 1],
    ["shelter-camp",    /\btent\b|\bshelter|\bbedding|\bhammock|\bbath\b|\bbed\b|\bcot\b|\bfurniture|\btable\b|\bchair/i, null, 1],
    ["writing-paper",   /\bink\b|\bquill|\bpaper|\bparchment|\bvellum|\bwax\b|\bseal\b|\bstylus|\bslate\b|\bpen\b/i, null, 3],
    ["boat-vehicle",    /\bwagon|\bcart\b|\bcarriage|\bsled\b|\bboat\b|\bship\b|\bcanoe|\braft\b|\bgalley|\bsail\b|\boar\b|\bvehicle|\bchariot/i, null, 3],
    ["mining-farm",     /\bpick\b|\bshovel|\bspade|\bhoe\b|\bplow|\bsickle|\bcrowbar|\bpiton|\bgrappling/i, null, 2],
    ["fishing-hunting", /\bfishing|\bhook\b|\blure\b|\bbait\b|\bdecoy|\btrapper|\bhunting/i, null, 1],
    ["trade-goods",     /\bcoin\b|\bgold\b|\bsilver\b|\bcopper\b|\bplatinum|\bingot|\bore\b|\btrade\b|\bgoods\b/i, null, 2],
    ["optical-device",  /\bglass\b|\bhourglass|\bspyglass|\btelescope|\bcompass|\bsextant|\bastrolabe|\bsundial/i, null, 2],
    ["technology",      /\bcybernetic|\bimplant|\bbattery|\bchip\b|\bcircuit|\bnanite|\brobot|\bandroid|\bplasma|\blaser|\bcomputer|\btimeworn/i, null, 1],
    ["construct-part",  /\bconstruct|\bautomaton|\bclockwork|\bgolem|\bmachine|\bengine\b|\bapparatus|\bdevice|\bgear\b|\bcog\b/i, null, 2]
  ],

  /* --------------------------------------------------------------- SPELLS --
     Spell NAMES are evocative rather than categorical ("Blush of Youth",
     "Cats and Mice"), so these themes reach only about 44% — far less than the
     78% feats manage. That is expected, not a defect: feat names are verb
     phrases that say what the feat DOES, while spell names are poetry. What
     these miss falls through to the per-school variety sets, which are sized
     for exactly that residual. A theme here is a bonus, not the backstop. */
  spells: [
    ["resurrection",  /\bresurrect|\braise dead|\breincarnat|\brevive|\bbreath of life|\brestore life/i, null, 1],
    ["healing",       /\bcure\b|\bheal\b|\bhealing|\brestor|\bregenerat|\bremove |\bmend\b|\bneutralize|\bsoothe|\bclose wounds/i, /\(healing\)/i, 4],
    ["undead",        /\banimate dead|\bundead|\bzombie|\bskeleton|\bghoul|\bwight|\bvampir|\blich|\bnecro|\bcorpse|\bgrave\b|\bslay living|\bdeath knell/i, /\[[^\]]*death/i, 3],
    ["summoning",     /\bsummon|\bplanar ally|\bplanar bind|\bgate\b|\binstant summons|\bcall\b/i, /\((summoning|calling)\)/i, 5],
    ["teleport",      /\bteleport|\bdimension|\btranslocat|\bblink\b|\bshadow walk|\bword of recall|\btransport|\bphase\b|\bethereal jaunt/i, /\(teleportation\)/i, 3],
    ["divination",    /\bdetect |\bscry|\bdivination|\baugury|\bcommune|\bforesight|\bclairvoy|\bidentify|\blocate|\btrue seeing|\bread \b|\bvision\b|\bprying eyes/i, /\(scrying\)/i, 3],
    ["illusion",      /\billusion|\bimage\b|\bphantasm|\bmirage|\bglamer|\binvisib|\bblur\b|\bdisplace|\bmislead|\bveil\b|\bhallucinat|\bsilent image|\bdisguise/i, /\((glamer|figment|phantasm|pattern|shadow)\)/i, 12],
    ["charm-mind",    /\bcharm|\bdominat|\bsuggestion|\bcommand\b|\bcompel|\bconfus|\bdespair|\bhold \b|\bhideous laughter|\benthrall|\bgeas|\bmodify memory|\btelepath|\bcalm emotions/i, /((compulsion|charm))/i, 14],
    ["fear",          /\bfear\b|\bterror|\bhorror|\bscare\b|\bcause fear|\bdoom\b|\bphantasmal killer|\bnightmare|\bpanic|\bbane\b/i, /[[^]]*fear|(fear)/i, 2],
    ["sleep-daze",    /\bsleep\b|\bdaze\b|\bslumber|\bunconscious|\bstun\b|\bhypnot|\bdeep slumber/i, /(sleep)|[[^]]*sleep/i, 1],
    ["polymorph",     /\bform\b|\bpolymorph|\bshape\b|\btransform|\bmetamorph|\bbeast shape|\balter self|\banimal aspect|\bgrowth\b|\benlarge|\breduce\b|\bsize\b/i, /\(polymorph\)/i, 7],
    ["protection",    /\bprotect|\bshield\b|\bward\b|\bsanctuary|\bresist|\bguard|\bbarrier|\bsafeguard|\bimmunity|\bendure|\bdeflect|\bfreedom\b/i, null, 5],
    ["wall-barrier",  /\bwall of|\bwall\b|\bfog\b|\bcloud\b|\bweb\b|\bentangle|\bgrease|\btentacles|\bspike\b|\bmire\b/i, null, 2],
    ["weapon-buff",   /\bweapon\b|\bblade\b|\bsword|\bmagic weapon|\bkeen\b|\bflame blade|\bspiritual|\barrow|\bshot\b|\bmissile/i, null, 4],
    ["armor-buff",    /\barmor\b|\bbarkskin|\bmage armor|\bstoneskin|\bnatural armor|\bshield of faith/i, null, 1],
    ["movement",      /\bfly\b|\bflight|\blevitat|\bfeather fall|\bexpeditious|\bspider climb|\bair walk|\bwind walk|\bjump\b|\bhaste\b|\bslow\b|\bspeed\b|\blongstrider|\bstride/i, null, 2],
    ["planar",        /\bplanar|\bethereal|\bastral|\bdemon|\bdevil|\bangel|\bcelestial|\bfiend|\binfernal|\babyss|\bholy\b|\bunholy|\bblasphemy|\bdictum|\bword of chaos|\bplane\b/i, /\[[^\]]*(evil|good|lawful|chaotic)/i, 7],
    ["curse-affliction",/\bcurse|\bbestow|\bblind|\bdeaf|\bdisease|\bcontagion|\bpoison|\bfeeblemind|\bwaves of|\bbaleful|\bmark of/i, /\[[^\]]*(curse|disease|poison|pain)/i, 8],
    ["light-dark",    /\blight\b|\bdaylight|\bdarkness|\bsunburst|\bsunbeam|\bglow\b|\bflare\b|\bblindness|\bshadow|\bgloom/i, /\[[^\]]*(light|darkness)/i, 5],
    ["fire",          /\bfire\b|\bflame|\bburn|\bblaz|\bincinerat|\bscorch|\bpyro|\bcinder|\bash\b|\bfirebrand/i, /\[[^\]]*fire/i, 5],
    ["cold",          /\bcold\b|\bfrost|\bice\b|\bfrozen|\bfreez|\bwinter|\brime\b|\bsnow|\bchill/i, /\[[^\]]*cold/i, 2],
    ["lightning",     /\blightning|\belectric|\bthunder|\bshock|\bstorm\b/i, /\[[^\]]*electricity/i, 2],
    ["acid",          /\bacid\b|\bcorros|\bmelt\b|\bdissolv/i, /\[[^\]]*acid/i, 1],
    ["sonic",         /\bsound\b|\bsonic|\bshout|\bscream|\bshriek|\bnoise|\bsilence|\bcacoph|\bsong\b/i, /\[[^\]]*sonic/i, 2],
    ["force",         /\bforce\b|\bhand\b|\bsphere\b|\btelekine|\bbattering/i, /\[[^\]]*force/i, 3],
    ["earth-stone",   /\bstone\b|\bearth\b|\brock\b|\bmeld\b|\bsoften|\btransmute|\bmove earth|\bmetal\b|\biron\b|\bcrystal/i, /\[[^\]]*earth/i, 3],
    ["plant-nature",  /\bplant\b|\btree\b|\bwood\b|\bvine\b|\bthorn|\bbriar|\bgrove|\bnature|\bbloom|\bgrasp|\bshillelagh|\bgoodberry/i, null, 1],
    ["animal",        /\banimal|\bbeast\b|\bvermin|\bswarm|\bmagic fang|\bbite\b|\bcharm animal|\bhold animal|\bspeak with animals/i, null, 2],
    ["weather",       /\bweather|\brain\b|\bwind\b|\bsleet|\bhail\b|\bcontrol winds|\bgust\b|\bfog cloud/i, /\[[^\]]*air/i, 2],
    ["water",         /\bwater\b|\baqua|\bocean|\bsea\b|\btide\b|\bwave\b|\bdrown|\bswim/i, /\[[^\]]*water/i, 3],
    ["symbol-rune",   /\bsymbol\b|\brune\b|\bglyph|\bsigil|\bexplosive runes|\bsepia|\bmark\b/i, null, 3],
    ["mind-psychic",  /\bpsychic|\bmind\b|\bthought|\bmemory|\bego\b|\bintellect|\bsynapse|\bmindscape|\bbrain/i, /[[^]]*(mind-affecting|meditative|draconic)/i, 6],
    ["communication", /\bmessage|\bsending|\btongues|\bwhisper|\bspeak\b|\bcomprehend|\bdream\b|\btelepathic bond|\bshare\b/i, /\[[^\]]*language-dependent/i, 2],
    ["creation",      /\bcreate\b|\bfabricat|\bmajor creation|\bminor creation|\bwish\b|\bmiracle|\bpermanen|\bsecure shelter|\brope trick|\bmagnificent/i, /\(creation\)/i, 5],
    ["blood-flesh",   /\bblood\b|\bflesh\b|\bbone\b|\bvital|\borgan|\bgore\b|\bwound|\brend\b|\bharm\b|\binflict/i, null, 3],
    ["ritual-occult", /\britual|\boccult|\bceremony|\bcircle\b|\binvocation|\bbinding\b|\bseance/i, /Occult Ritual/i, 1],
    ["ability-buff",  /\bstrength|\bdexterity|\bconstitution|\bintelligence|\bwisdom|\bcharisma|\bcunning|\bsplendor|\bgrace\b|\bendurance|\bheroism|\bbless\b|\bprayer|\brage\b/i, null, 1],
    ["dispel-negate", /\bdispel|\bnegate|\bbreak enchantment|\bantimagic|\bnullify|\bdismiss/i, null, 1],
    ["trap-alarm",    /\balarm|\btrap\b|\bsnare|\bguards and wards|\bforbiddance|\bhallow|\bunhallow/i, null, 1]
  ],

  /* ------------------------------------------------------- MONSTER RULES --
     NOT for creatures. Real monsters resolve by name, subtype or type, which
     already covers 3,152 of 3,919. These match the rules-shaped rawCats that
     happen to live in the monster bucket — Universal Monster Rules, Templates
     and Animal Companions — none of which is a creature with a portrait. */
  monsters: [
    // Animal companions FIRST: AON inverts names, so "Ant, Giant" and "Assassin Bug, Giant"
    // end in "giant" and were being claimed by a template rule. Same inversion trap as type-giant.
    ["animal-bigcat", /\bcat\b|\blion|\btiger|\bleopard|\bpanther|\bcheetah|\blynx|\bjaguar|\bsmilodon/i, null, 2],
    ["animal-canine", /\bdog\b|\bwolf|\bjackal|\bhyena|\bfox\b|\bcoyote|\bdire wolf/i, null, 1],
    ["animal-bear",   /\bbear\b|\bbadger|\bwolverine|\bboar\b|\bpig\b|\bhog\b/i, null, 1],
    ["animal-bird",   /\bbird\b|\beagle|\bhawk\b|\bowl\b|\braven|\bfalcon|\bvulture|\bcondor|\bparrot|\broc\b|\baxe beak|\barchaeop/i, null, 2],
    ["animal-reptile",/\blizard|\bsnake|\bviper|\bcrocodile|\balligator|\bturtle|\btortoise|\bmonitor|\bcobra|\bpython|\bdinosaur|\bsaurus|\braptor|\bceratops/i, null, 5],
    ["animal-aquatic",/\bfish\b|\bshark|\bdolphin|\bwhale|\boctopus|\bsquid|\bcrab\b|\beel\b|\bmanta|\bseal\b|\bwalrus|\bangler|\bstingray/i, null, 3],
    ["animal-insect", /\bant\b|\bbeetle|\bspider|\bscorpion|\bwasp|\bbee\b|\bmantis|\bcentipede|\bfly\b|\bbug\b|\bmoth\b|\btick\b|\blocust/i, null, 5],
    ["animal-hoofed", /\bhorse|\bpony|\bcamel|\belk\b|\bdeer|\bstag\b|\bantelope|\bgoat|\bram\b|\bbison|\bbull\b|\box\b|\bmoose|\brhino|\bhippo|\belephant|\bmammoth/i, null, 3],
    ["animal-primate",/\bape\b|\bmonkey|\bbaboon|\bgorilla|\bchimp|\blemur/i, null, 1],
    ["animal-small",  /\brat\b|\bmouse|\bweasel|\bferret|\bbat\b|\bhare|\brabbit|\bsquirrel|\bmole\b|\bhedgehog|\botter|\bskunk/i, null, 2],
    // Templates — creature modifiers, not creatures.
    ["template-undead",/\bundead|\blich|\bvampir|\bghost|\bskeleton|\bzombie|\bghoul|\bshade\b|\bwraith|\bmummy|\brevenant|\bhaunt/i, null, 5],
    ["template-fiend",/\bfiend|\bdemon|\bdevil|\bdaemon|\bkyton|\binfernal|\babyssal|\bhalf-fiend|\baccursed|\bcorrupt/i, null, 4],
    ["template-celestial",/\bcelestial|\bangel|\bempyreal|\bholy\b|\bblessed|\bhalf-celestial|\bapostle/i, null, 1],
    ["template-elemental",/\belemental|\bfire\b|\bfrost\b|\bice\b|\bmagma|\bstorm\b|\bthunder|\baqueous|\baerial|\bearth\b/i, null, 5],
    ["template-beast",/\bbeast\b|\banimal|\bferal|\bsavage|\bdire\b|\blycanthrop|\bwere\b|\bprimal|\btotem/i, null, 2],
    ["template-construct",/\bconstruct|\bclockwork|\bgolem|\bautomaton|\banimated|\bmechanic/i, null, 7],
    ["template-mutation",/\bmutant|\bevolved|\bawakened|\bvariant\b|\balter ego|\bmythic|\badvanced\b/i, null, 1],
    // Universal Monster Rules — pure rules pages.
    ["umr-sense",     /\bvision\b|\bsense\b|\bsight\b|\bblindsen|\bblindsight|\bdarkvision|\bscent\b|\btremorsense|\btelepathy/i, null, 1],
    ["umr-attack",    /\battach|\bbleed\b|\bconstrict|\bgrab\b|\bpounce|\brake\b|\brend\b|\btrample|\bswallow|\bpull\b|\bpush\b|\btrip\b/i, null, 1],
    ["umr-defense",   /\bregenerat|\bfast healing|\bdamage reduction|\bimmun|\bresist|\bhardness|\bincorporeal|\bamorphous|\bevasion/i, null, 1],
    ["umr-magic",     /\bspell-like|\bspell resistance|\bsummon\b|\bcurse\b|\bgaze\b|\bbreath weapon|\baura\b|\btraits\b/i, null, 1],
    ["umr-movement",  /\bamphibious|\bburrow|\bclimb\b|\bflight|\bfly\b|\bswim\b|\bfreeze\b|\bhold breath|\bcompression/i, null, 1],
    ["umr-affliction",/\bdisease|\bpoison|\bparalys|\bpetrif|\benergy drain|\babilit(y|ies) (damage|drain)|\bfear\b|\bstench/i, null, 1]
  ]
};

/* EVERY variety set in the app, in one place: name -> how many numbered images exist.
 * A variety set is art assigned by hashing the entry id — arbitrary, but the same on every visit.
 * These were previously scattered across three files (RULES_SCENES/NPC_SCENES in app.js, the
 * weapon and armour counts inline in itemArt, the feat fallback here), which meant a tool could
 * not enumerate them and check-reachable had to hard-code 40 and 12. Now everything reads this.
 *
 * Raising a count is safe: app.js gates each key on the ART manifest and falls through to the
 * previous choice, so a number can be raised BEFORE the art is generated. LOWERING one strands
 * art on disk that nothing references. */
window.PF_VARIETY = {
  "npc-role-sailor": 1,
  "npc-role-merchant": 1,
  "npc-role-commoner": 1,
  "npc-role-tavern": 1,
  "npc-role-scholar": 1,
  "npc-role-tradesman": 1,
  "monster-scene": 25,
  "creature-aeon": 1,
  "creature-agathion": 1,
  "creature-air": 4,
  "creature-angel": 1,
  "creature-aquatic": 15,
  "creature-archon": 1,
  "creature-asura": 1,
  "creature-augmented": 1,
  "creature-augmented-humanoid": 1,
  "creature-azata": 1,
  "creature-boggard": 1,
  "creature-clockwork": 1,
  "creature-cold": 2,
  "creature-daemon": 2,
  "creature-dark-folk": 1,
  "creature-demon": 4,
  "creature-derro": 1,
  "creature-devil": 1,
  "creature-div": 1,
  "creature-dwarf": 1,
  "creature-earth": 3,
  "creature-elemental": 2,
  "creature-elf": 1,
  "creature-evil": 1,
  "creature-extraplanar": 11,
  "creature-fire": 6,
  "creature-giant": 5,
  "creature-gnoll": 1,
  "creature-goblinoid": 2,
  "creature-great-old-one": 1,
  "creature-herald": 1,
  "creature-human": 2,
  "creature-incorporeal": 3,
  "creature-inevitable": 1,
  "creature-kami": 1,
  "creature-kyton": 1,
  "creature-leshy": 1,
  "creature-mythic": 1,
  "creature-native": 2,
  "creature-oni": 1,
  "creature-orc": 1,
  "creature-planar": 2,
  "creature-protean": 1,
  "creature-psychopomp": 1,
  "creature-qlippoth": 2,
  "creature-rakshasa": 1,
  "creature-ratfolk": 1,
  "creature-reptilian": 2,
  "creature-robot": 2,
  "creature-sahkil": 1,
  "creature-shapechanger": 2,
  "creature-swarm": 3,
  "creature-troop": 1,
  "creature-water": 5,
  "arch-alchemist": 5,
  "arch-antipaladin": 1,
  "arch-arcanist": 1,
  "arch-barbarian": 3,
  "arch-bard": 4,
  "arch-bloodrager": 1,
  "arch-brawler": 1,
  "arch-cavalier": 2,
  "arch-cleric": 2,
  "arch-druid": 5,
  "arch-fighter": 4,
  "arch-gunslinger": 2,
  "arch-hunter": 2,
  "arch-inquisitor": 3,
  "arch-investigator": 3,
  "arch-kineticist": 1,
  "arch-magus": 2,
  "arch-medium": 1,
  "arch-mesmerist": 2,
  "arch-monk": 5,
  "arch-ninja": 1,
  "arch-occultist": 1,
  "arch-oracle": 2,
  "arch-paladin": 3,
  "arch-psychic": 1,
  "arch-ranger": 4,
  "arch-rogue": 6,
  "arch-samurai": 1,
  "arch-shaman": 1,
  "arch-skald": 2,
  "arch-slayer": 2,
  "arch-sorcerer": 1,
  "arch-spiritualist": 2,
  "arch-summoner": 2,
  "arch-swashbuckler": 1,
  "arch-vigilante": 2,
  "arch-warpriest": 1,
  "arch-witch": 3,
  "arch-wizard": 3,
  "hazard-corruptions": 1,
  "hazard-curses": 2,
  "hazard-diseases": 3,
  "hazard-drugs": 2,
  "hazard-haunts": 1,
  "hazard-madnesses": 1,
  "hazard-poisons": 1,
  "opt-adv-armor-training": 1,
  "opt-adv-weapon-training": 2,
  "opt-blessings": 3,
  "opt-bloodlines": 5,
  "opt-construct-mods": 2,
  "opt-disciplines": 2,
  "opt-domains": 2,
  "opt-emotional-focus": 1,
  "opt-exploits": 1,
  "opt-implement-schools": 1,
  "opt-mysteries": 2,
  "opt-orders": 1,
  "opt-phrenic": 2,
  "opt-schools": 1,
  "opt-shifter": 2,
  "opt-spirits": 1,
  "opt-stares": 2,
  "opt-tricks": 3,
  "opt-unique-patrons": 1,
  "opt-wild-talents": 21,
  "school-abjuration": 4,
  "school-conjuration": 1,
  "school-divination": 3,
  "school-enchantment": 1,
  "school-evocation": 2,
  "school-illusion": 1,
  "school-necromancy": 3,
  "school-transmutation": 14,
  "trait-campaign": 2,
  "trait-combat": 10,
  "trait-cosmic": 1,
  "trait-drawback": 1,
  "trait-equipment": 1,
  "trait-exemplar": 1,
  "trait-faction": 1,
  "trait-faith": 8,
  "trait-family": 1,
  "trait-magic": 8,
  "trait-mount": 1,
  "trait-race": 3,
  "trait-region": 8,
  "trait-religion": 2,
  "trait-social": 2,
  "type-aberration": 2,
  "type-animal": 1,
  "type-construct": 3,
  "type-dragon": 3,
  "type-fey": 2,
  "type-humanoid": 1,
  "type-magical-beast": 2,
  "type-monstrous-humanoid": 1,
  "type-ooze": 2,
  "type-outsider": 1,
  "type-plant": 1,
  "type-undead": 3,
  "type-vermin": 1,
  "item-wrists": 1,
  "item-shoulders": 2,
  "item-head": 2,
  "item-eyes": 2,
  "item-body": 2,
  "item-neck": 3,
  "rules": 156,          // rules pages have no category to sort them by
  "npc": 12,
  "feat-scene": 45,     // feats matching no theme (725 of them)
  "item-scene": 14,     // mundane goods: Miscellaneous, Equipment, Magic Equipment
  "item-wondrous": 31,  // wondrous items no theme or slot caught
  "item-weapon": 48,    // Weapons rawCat — largely abstract magic qualities (Keen, Bane, Vorpal)
  "item-armorset": 22,  // Armor rawCat, same
  "item-artifact": 6
};

/* Which variety set catches a bucket's unthemed entries, after every other candidate has missed.
   tools/check-themes.mjs fails the build if a set is too small for the stragglers it must absorb. */
/* A "*" suffix means the bucket does NOT use one general set — it falls back to per-facet sets
   named by that prefix (spells to school-<school>, monsters to type-<type>), each sized to its
   own load. Those buckets need it: a spell's school and a monster's type are real, meaningful
   axes, whereas a feat that matches no theme has nothing left to sort it by. */
window.PF_THEME_FALLBACK = { feats: "feat-scene", items: "item-scene", spells: "school-*", monsters: "monster-scene" };

/* BODY MOTIFS — matched against the FULL entry body, not the index snippet.
 *
 * WHY THIS IS SEPARATE
 * The snippet in data/index.js is truncated to ~200 characters, which for most spells is just the
 * stat block. "Blush of Youth" is a page of prose about a blood ritual performed by a circle of
 * secondary casters, and none of that reaches the snippet — from the index alone it is only
 * "necromancy". The full bodies live in data/cat/<bucket>.js and average 1,458 characters.
 *
 * WHY IT IS PRECOMPUTED
 * Bodies are lazy-loaded: applyArt runs when the entry renders, before loadCat returns. Matching
 * at runtime would either block the render or swap the picture out from under the reader. So
 * tools/derive-body-themes.mjs runs these offline and emits data/bodythemes.js, a small id -> key
 * map the app reads directly.
 *
 * WHY IT RANKS BELOW THE STAT BLOCK
 * Subschool and descriptors are AUTHORED categories — Paizo decided a spell is (compulsion).
 * Prose motifs are inferred, and a spell that mentions blood once is not necessarily about blood.
 * So the order is: name -> stat block -> body motif -> school. Inference goes last.
 *
 * Motifs must be VISUAL — things an illustrator can draw. "skill checks" is a mechanic;
 * "a circle of robed casters around a sacrifice" is a picture.
 */
window.PF_BODY_THEMES = {
  spells: [
    ["ritual-circle",  /\bsecondary casters?\b|\bbacklash\b|\bprimary caster\b|\bskill checks?\b[^.]*\bsuccess(es)?\b/i, 5],
    ["life-drain",     /\bsiphon|\bdrains?\b[^.]*\b(life|blood|energy|levels?)\b|\bnegative levels?\b|\bblood\b[^.]*\b(victim|caster)\b|\bsacrific/i, 1],
    ["binding-summon", /\bbound\b[^.]*\bservice\b|\bbind(s|ing)?\b[^.]*\b(creature|outsider|spirit)\b|\bsummoned creature\b|\bcalled creature\b/i, 1],
    ["transformation", /\bassumes? the form\b|\btransforms?\b|\bbecomes? an? \w+ (creature|beast|animal)\b/i, 2],
    ["mind-invasion",  /\bmemor(y|ies)\b|\bthoughts?\b|\bdreams?\b|\bmind of\b/i, 1],
    ["ward-protect",   /\bward(s|ed|ing)?\b|\bbarrier\b|\brepel/i, 2],
    ["curse-mark",     /\bcurse[ds]?\b|\bafflict|\bwither/i, 1],
    ["divine-boon",    /\bdeity\b|\bdivine\b|\bpray(er|s)?\b|\bblessing\b/i, 2],
    ["nature-growth",  /\bplants?\b|\bvines?\b|\btrees?\b|\bsoil\b|\bharvest/i, 2],
    ["weather-sky",    /\bsky\b|\bclouds?\b|\bstorms?\b|\brain\b|\bwinds?\b/i, 1],
    ["craft-forge",    /\bcraft(s|ed|ing)?\b|\bforge[ds]?\b|\bcreates? an? (item|object|weapon)\b/i, 1],
    ["travel-path",    /\btravels?\b|\bjourney\b|\bmiles?\b|\bdestination\b/i, 1],
    ["battle-buff",    /\battack rolls?\b|\bweapon damage\b|\bwield/i, 3],
    ["skill-mastery",  /\bcompetence bonus\b|\bKnowledge \(/i, 1],
    ["senses-sight",   /\bdarkvision\b|\bblind(ed|ness)?\b|\bsee\b[^.]*\binvisible\b/i, 1]
  ],

  /* FEATS. Thinner than spells — 725 stragglers whose name and type said nothing — but a feat's
     Benefit line does describe what it DOES. The Combat Stamina block appended to combat feats is
     stripped before matching; it appears verbatim in 320 of them and drowns out everything else. */
  feats: [
    ["mythic-power",    /\bmythic power\b|\bmythic tier\b/i, 1],
    ["wild-shape",      /\bwild shape\b|\bchange shape\b|\bshapechang/i, 1],
    ["natural-weapon",  /\bnatural (attack|weapon)s?\b|\bbite attack\b|\bclaw attacks?\b/i, 1],
    ["animal-bond",     /\banimal companion\b|\bfamiliar\b|\bbonded creature\b/i, 1],
    ["spell-like",      /\bspell-?like abilit|\bspell slot\b|\bspell list\b/i, 2],
    ["magic-item-use",  /\bmagic items?\b|\buse magic device\b|\bcommand word\b|\bcharges?\b/i, 1],
    ["energy-damage",   /\b(fire|cold|acid|electricity|sonic) damage\b|\benergy (type|damage)\b/i, 1],
    ["healing-recovery",/\bfast healing\b|\bheals? .{0,20}hit points\b|\brecover/i, 1],
    ["awareness",       /\bperception check\b|\bsurprise round\b|\bnotice\b/i, 1],
    ["speed-movement",  /\bbase speed\b|\bmovement speed\b|\bdifficult terrain\b/i, 1],
    ["social-skill",    /\bbluff\b|\bdiplomacy\b|\bsense motive\b|\bperform check\b/i, 2],
    ["ally-support",    /\ballies within\b|\byour allies\b|\badjacent all(y|ies)\b/i, 1],
    ["saves-resilience",/\bsaving throws?\b|\bwill saves?\b|\breflex saves?\b|\bfortitude saves?\b/i, 4]
  ],

  /* ITEMS. Bodies carry a "Category" label finer than the rawCat facet — 735 stragglers have one,
     and it is AUTHORED rather than inferred, so those rules come first.
     Deliberately NOT included: motifs matching "the wearer" (517 entries) and "the wielder" (341).
     Both are accurate and both are useless — they say an item is worn, or is a weapon, which is
     exactly what item-wondrous and item-weapon already say. A motif must be MORE specific than the
     fallback it displaces, or it is pure churn. */
  items: [
    ["cat-mounts",      /Category\s+Mounts\/Pets/i, 9],
    ["cat-advgear",     /Category\s+Adventuring Gear/i, 8],
    ["cat-alchtools",   /Category\s+Alchemical Tools/i, 9],
    ["cat-tools",       /Category\s+Tools\b/i, 6],
    ["cat-remedies",    /Category\s+(Alchemical Remedies|Tincture|Concoctions)/i, 4],
    ["cat-clothing",    /Category\s+Clothing/i, 3],
    ["cat-alchweapons", /Category\s+Alchemical Weapons/i, 4],
    ["cat-fooddrink",   /Category\s+Food\/Drink/i, 3],
    ["cat-blackmarket", /Category\s+(Black Market|Torture Implements)/i, 2],
    ["cat-animalgear",  /Category\s+Animal Gear/i, 2],
    ["cat-kits",        /Category\s+Kits/i, 1],
    ["cat-entertain",   /Category\s+(Entertainment|Lodging\/Services)/i, 1],
    ["command-word",    /\bcommand word\b|\bspeak(s|ing)? the .{0,15}word\b/i, 7],
    ["consumable",      /\bwhen (drunk|consumed|eaten|applied)\b|\bsingle dose\b|\bdoses?\b/i, 7],
    ["summon-item",     /\bsummons?\b.{0,30}\b(creature|monster|ally|allies|swarm|elemental|beast|instrument)\b|\bconjures?\b.{0,25}\b(creature|monster|wings|weapon)\b|\bcalls? forth\b/i, 2],
    ["healing-item",    /\bheals? .{0,20}hit points\b|\bcure \w+ wounds\b|\bcure\/inflict\b|\brestoration\b/i, 2],
    ["splash-thrown",   /\bsplash weapon\b|\bdirect hit\b/i, 2],
    ["poison-toxin",    /\bpoison\b|\btoxin\b|\bvenom\b/i, 3],
    ["light-source",    /\bsheds? .{0,15}light\b|\billuminat|\bbright light\b/i, 3],
    ["transport-item",  /\bteleport|\bfly speed\b|\bmount(s)? .{0,10}speed\b/i, 2]
  ],

  /* MONSTERS. Not creature portraits — those resolve by name, subtype or type long before this.
     These are the 1,319 that reach a broad type-* set or the bestiary stragglers, and the signal
     is the ENVIRONMENT line: authored, and the single most visual fact about a beast. Habitat also
     matches how the art actually reads on a page — a swamp thing and a desert thing look different
     even when both are "aberration".

     ⚠ These are deliberately NOT case-insensitive. "Environment" is capitalised in the stat block
     and its values are lowercase, so [^A-Z] is an exact "stay inside this field" bound. Adding /i
     makes the class exclude BOTH cases, matching nothing — it silently scored 5% instead of 56%. */
  monsters: [
    ["habitat-underground", /Environment[^A-Z]{0,40}underground/, 9],
    ["habitat-aquatic",     /Environment[^A-Z]{0,40}(ocean|water|aquatic|sea|coast|river|lake)/, 4],
    ["habitat-desert",      /Environment[^A-Z]{0,40}desert/, 4],
    ["habitat-arctic",      /Environment[^A-Z]{0,40}(cold|arctic|glacier|tundra)/, 3],
    ["habitat-swamp",       /Environment[^A-Z]{0,40}(swamp|marsh|bog)/, 3],
    ["habitat-mountain",    /Environment[^A-Z]{0,40}(mountain|hill)/, 6],
    ["habitat-forest",      /Environment[^A-Z]{0,40}(forest|jungle|wood)/, 10],
    ["habitat-plains",      /Environment[^A-Z]{0,40}(plain|savanna|steppe)/, 2],
    ["habitat-urban",       /Environment[^A-Z]{0,40}(urban|city|ruin)/, 3],
    ["habitat-planar",      /Environment[^A-Z]{0,40}(vacuum|plane|abyss|heaven|hell|astral|ethereal)/, 2],
    ["group-swarm",         /Organization[^A-Z]{0,40}(swarm|colony|nest|hive|flock|cluster)/, 2],
    ["group-pack",          /Organization[^A-Z]{0,40}(pack|herd|gang|tribe|band|troop|flight)/, 3]
  ],

  /* TRAITS. A trait's body is short (471 characters) and almost entirely backstory — which is
     exactly what makes it useful here, because the category facet says only "Social" or "Region".
     Race and Religion traits are excluded upstream: they already reuse the actual race and deity
     art, which beats any motif. */
  traits: [
    ["heritage-blood",  /\b(blood|bloodline|ancestor|ancestry|forebear|born to|were born|birth)\b/i, 18],
    ["loss-vengeance",  /\b(died|death of|killed|slain|murdered|orphan|revenge|vengeance|lost your)\b/i, 3],
    ["mentor-training", /\b(trained|mentor|master taught|apprentice|studied under|have learned|tutor)\b/i, 6],
    ["faith-devotion",  /\b(deity|god|goddess|temple|prayer|priest|faith|worship|blessed)\b/i, 11],
    ["wealth-trade",    /\b(gold|coin|wealth|merchant|trade|purse|rich|poverty|poor)\b/i, 4],
    ["wilderness",      /\b(wilderness|forest|mountain|desert|swamp|survival check|terrain|wild)\b/i, 4],
    ["city-streets",    /\b(city|street|urban|alley|slum|market|guild|thieves)\b/i, 3],
    ["battle-veteran",  /\b(battle|war|soldier|army|militia|veteran|campaign against|combat)\b/i, 10],
    ["arcane-study",    /\b(arcane|spellbook|wizard|magic|spell|caster level|sorcerer)\b/i, 14],
    ["social-tongue",   /\b(diplomacy|bluff|intimidate|sense motive|perform|charm|persuad)\b/i, 15],
    ["saves-willpower", /\b(saving throws?|will save|fear effect|resist)\b/i, 6],
    ["skill-knack",     /\b(skill check|knowledge \(|craft check|profession|trained in)\b/i, 4]
  ],

  /* CLASS OPTIONS. Kineticist wild talents carry an ELEMENT field and every talent a TYPE — both
     authored stat-block data, both far better than the rawCat these were sorted by (opt-wild-talents
     alone held 278). Four of the elements already have art: creature-fire, creature-water,
     creature-air and creature-earth are elemental creatures, which is exactly the right picture for
     an elemental talent. A 4th field on a row means "use this existing key instead of new art".

     ⚠ The Element/Type rules are NOT case-insensitive. The labels are capitalised and their values
     lowercase, so [^A-Z] is an exact in-field bound; /i would make the class exclude both cases. */
  options: [
    ["element-fire",    /Element[^A-Z]{0,16}fire/, 1, "creature-fire"],
    ["element-water",   /Element[^A-Z]{0,16}water/, 1, "creature-water"],
    ["element-air",     /Element[^A-Z]{0,16}air/, 1, "creature-air"],
    ["element-earth",   /Element[^A-Z]{0,16}earth/, 1, "creature-earth"],
    ["element-aether",  /Element[^A-Z]{0,16}aether/, 2],
    ["element-void",    /Element[^A-Z]{0,16}void/, 2],
    ["element-wood",    /Element[^A-Z]{0,16}wood/, 2],
    ["infusion",        /Type[^A-Z]{0,20}(substance infusion|form infusion)/, 2],
    ["utility-talent",  /Type[^A-Z]{0,20}utility/, 1],
    ["bloodline-power", /\bbloodline powers?\b/i, 5],
    ["arcane-reservoir",/\barcane reservoir\b/i, 5],
    ["domain-power",    /\bdomain (power|spell)s?\b/i, 3],
    ["revelation",      /\brevelations?\b/i, 2]
  ],

  /* HAZARDS. The delivery TYPE is the entire visual difference between one poison and another —
     a blade with a bead on the edge, a cup with residue in it, a gas filling a corridor, a coated
     handle. Sorting 152 poisons by rawCat could never express that. 95% of the bucket resolves. */
  hazards: [
    ["haz-injury",    /Type[^A-Z]{0,24}injury/, 5],
    ["haz-ingested",  /Type[^A-Z]{0,24}ingested/, 5],
    ["haz-inhaled",   /Type[^A-Z]{0,24}inhaled/, 3],
    ["haz-contact",   /Type[^A-Z]{0,24}contact/, 3],
    ["haz-curse",     /Type[^A-Z]{0,24}(curse|regional curse)/, 2],
    ["haz-madness",   /Type[^A-Z]{0,24}(lesser madness|greater madness|madness)/, 1],
    ["haz-proximity", /Trigger[^A-Z]{0,24}proximity/, 3],
    ["haz-disease",   /\bdisease\b/i, 1]
  ]
};


/* NPC ROLES — name to an EXISTING art key, wherever one genuinely fits.
 *
 * NPCs were the last bucket still on a pure hash: npc-1..N, assigned at random, which is exactly
 * what it looked like. But an NPC's name states its job — "Aldori Swordlord", "Accomplished
 * Angler", "Besmaran Priest" — and its stat block names a class ("Halfling commoner 4"). Between
 * the two, 405 of 487 resolve to art the Codex ALREADY OWNS. Only six roles needed anything new.
 *
 * Resolution order for an NPC is:
 *   1. the class in the stat block, when it is a real PC class with art  (331) — precomputed into
 *      data/bodythemes.js as PF_BODY_CLASS, because bodies are lazy-loaded
 *   2. the role in the NAME, mapped here                                  (~110)
 *   3. the npc-N variety set, for whatever is left
 *
 * Step 1 deliberately ignores the NPC classes — commoner, expert, aristocrat, warrior, adept.
 * CLASS_INHERIT maps commoner to rogue, which would hand an Accomplished Angler a rogue portrait.
 * Those fall to step 2, where the name says "angler" and gets a tradesman instead.
 *
 * Entries are [regex, artKey]. Most point at class art; the npc-role-* keys are the new six.
 */
window.PF_NPC_ROLES = [
  [/\bsorcer/i,                                                    "class-sorcerer"],
  [/\bwizard|\bmage\b|\bmagus\b|\barcanist|\bconjurer|\bdemonolog|\bnecromancer|\bevoker|\billusionist|\benchanter|\bdiviner|\btransmuter|\babjurer/i, "class-wizard"],
  [/\bwitch\b|\bhag\b/i,                                          "class-witch"],
  [/\bpriest|\bcleric|\bacolyte|\bheretic|\bprophet|\bseer\b|\bzealot|\bcultist|\bmissionary|\bloremaster|\bconfessor|\bchaplain|\bdevotee/i, "class-cleric"],
  [/\bpaladin|\bcrusader|\bholy\b|\bchampion|\btemplar|\bsmiter|\bavenger/i, "class-paladin"],
  [/\bknight|\bnoble\b|\blord\b|\blady\b|\bcavalier|\baristocrat|\bpolitician|\bdiplomat|\bcourtier|\benvoy|\bmagistrate|\bcouncil/i, "class-cavalier"],
  [/\bdruid|\bhermit|\bshaman|\bwarden\b|\bgroveke|\bnaturalist/i, "class-druid"],
  [/\branger|\barcher|\bhuntsman|\bscout\b|\btracker|\bsniper|\bbounty hunter|\bpathfinder|\bwoodsman|\btrapper|\bmarksman/i, "class-ranger"],
  [/\bhunter\b|\bfalconer|\bbeastmaster/i,                        "class-ranger"],
  [/\bmonk\b|\bmaster\b|\binitiate|\bascetic|\bdisciple/i,      "class-monk"],
  [/\bbard\b|\bskald|\bentertainer|\bminstrel|\bdancer|\bsinger|\bperformer|\bstoryteller|\bherald\b/i, "class-bard"],
  [/\bbarbarian|\bberserk|\braider|\bwarchief|\bsavage|\bbrute\b|\breaver|\bmarauder/i, "class-barbarian"],
  [/\brogue\b|\bthief|\bbrigand|\bbandit|\bcriminal|\bkiller|\bassassin|\bstalker|\bspy\b|\bburglar|\bcutpurse|\bsmuggler|\brake\b|\bpoisoner|\bcutthroat|\bfence\b|\binfiltrat|\bsaboteur/i, "class-rogue"],
  [/\bfighter|\bwarrior|\bguard\b|\bcaptain|\bofficer|\bmercenary|\bsoldier|\bgladiator|\bdefender|\bwarlord|\bcommander|\bveteran|\bblade\b|\baxe\b|\bswordl|\bconstable|\bmarshal|\bsentinel|\bbodyguard|\bmilitia|\bspearman|\bprotector|\bwarder\b/i, "class-fighter"],
  [/\balchemist|\bchymist|\bapothecar/i,                          "class-alchemist"],
  [/\bgunslinger|\bpistol|\bmusketeer/i,                          "class-gunslinger"],
  [/\binquisitor|\bwitchfinder/i,                                   "class-inquisitor"],
  [/\bsummoner|\bbinder\b/i,                                       "class-summoner"],
  [/\boracle\b|\bmystic\b/i,                                      "class-oracle"],
  [/\bswashbuckl|\bduelist|\bfencer/i,                            "class-swashbuckler"],
  [/\bninja\b|\bshinobi/i,                                         "class-ninja"],
  [/\bsamurai|\bronin/i,                                            "class-samurai"],
  [/\bantipaladin|\bblackguard|\btyrant\b/i,                      "class-antipaladin"],
  [/\bmonk\b/i,                                                     "class-monk"],
  // These six have no class image that fits, so they are the only new NPC art in the batch.
  [/\bpirate|\bsailor|\bcorsair|\bbuccaneer|\bcastaway|\bmariner|\bdeckhand|\bnavigator/i, "npc-role-sailor"],
  [/\bmerchant|\btrader|\bpeddler|\bshopkeep|\bconsortium|\bagent\b|\bbroker|\bbanker/i, "npc-role-merchant"],
  [/\bbeggar|\burchin|\bvagrant|\bslave\b|\bpeasant|\bcommoner|\blabou?rer|\bdrifter|\brefugee/i, "npc-role-commoner"],
  [/\bbarmaid|\btavern|\binnkeep|\bcook\b|\bservant|\bsteward|\bhost\b/i, "npc-role-tavern"],
  [/\bscholar|\bsage\b|\blibrarian|\bscribe|\bstudent|\bteacher|\barchivist|\blawyer|\bjeweler|\bjeweller/i, "npc-role-scholar"],
  [/\bsmith\b|\bblacksmith|\bartisan|\bcrafts|\bmason|\bcarpenter|\bfarmer|\bangler|\bfisher|\bminer|\bherder|\btanner|\bbrewer|\bbaker|\bweaver|\bapprentice/i, "npc-role-tradesman"]
];
