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
    ["grapple",           /\bgrappl|\bpin\b|\bconstrict|\bchokehold|\bstrangl/i, /\bgrapple[ds]?\b/i, 3],
    ["bull-rush",         /\bbull rush|\bshove\b|\bknockback/i,           /\bbull rush\b/i, 1],
    ["overrun",           /\boverrun|\btrample|\bstampede/i,              /\boverrun\b/i, 1],
    ["dirty-trick",       /\bdirty trick/i,                                /\bdirty trick\b/i, 1],
    ["steal-maneuver",    /\bsteal\b|\bpilfer|\bsnatch/i,                 /\bsteal combat maneuver\b/i, 1],
    ["reposition-drag",   /\breposition|\bdrag\b/i,                       /\breposition\b/i, 1],
    ["feint",             /\bfeint|\bmisdirect/i,                         /\bfeint\b/i, 2],
    ["maneuver-general",  /\bmaneuver|\bagile maneuvers\b/i,              /\bcombat maneuver (bonus|defense)\b/i, 1],
    // --- attack styles ---
    ["power-attack",      /\bpower attack|\bfurious|\bcleave|\bsmash|\bcrush|\bmighty\b/i, /\bpower attack\b/i, 3],
    ["vital-strike",      /\bvital strike|\bdevastat|\bstrike$/i,         /\bvital strike\b/i, 4],
    ["two-weapon",        /\btwo-weapon|\bdouble\b|\bambidext|\bdual\b/i, /\btwo-weapon fighting\b/i, 2],
    ["finesse-duelist",   /\bfinesse|\bgrace\b|\bfencing|\bduel|\bswashbuck|\bpanache|\briposte|\bparry/i, /\bweapon finesse\b|\bpanache\b/i, 2],
    ["archery",           /\bshot\b|\barcher|\bbow\b|\bmanyshot|\bdeadly aim|\bvolley|\barrow|\bfletch/i, /\bpoint.blank shot\b/i, 4],
    ["thrown",            /\bthrow(n|ing)?\b|\bjuggl|\bhurl|\bsling\b/i,  /\bthrown weapon\b/i, 2],
    ["firearms",          /\bfirearm|\bgun\b|\bpistol|\bmusket|\bgrit\b|\bammo|\bartillery|\bcartridge/i, /\bfirearm|\bgrit\b/i, 2],
    ["charge",            /\bcharge\b|\bspirited|\blance\b/i,             /\bwhen you charge\b/i, 2],
    ["mounted",           /\bmounted|\bride\b|\briding|\bcavalry|\bhorse|\bsaddle|\bsteed/i, /\bmounted\b/i, 2],
    ["critical-hit",      /\bcritical\b|\bstagger|\bstunning|\bbleeding|\bmaiming/i, /\bcritical hit\b/i, 3],
    ["attacks-of-opp",    /\bopportun|\bcombat patrol|\bcombat reflexes|\bstep up|\bspellbreaker|\bdisruptive/i, /\battacks? of opportunity\b/i, 2],
    ["combat-expertise",  /\bcombat expertise|\bexpertise\b|\bdefensive\b/i, /\bcombat expertise\b/i, 3],
    ["dodge-mobility",    /\bdodge|\bmobility|\bstance\b|\bnimble|\bevasi|\belusive/i, /\bdodge bonus\b/i, 2],
    ["reach-polearm",     /\breach\b|\blunge|\bpolearm|\bphalanx|\bspear/i, /\breach weapon\b/i, 2],
    // --- defence ---
    ["shield",            /\bshield|\bbash\b|\bbuckler|\bbulwark/i,       /\bshield bonus\b/i, 3],
    ["armor",             /\barmor|\bplate\b|\bmail\b|\bharness/i,        /\barmor check penalty\b/i, 2],
    ["toughness-saves",   /\btoughness|\bendur|\bdiehard|\bfortitude|\biron will|\breflexes|\bresilien|\bstalwart|\bhardy/i, /\bhit points\b/i, 3],
    // --- unarmed / monk ---
    ["monk-style",        /\bstyle\b/i,                                    /\bstyle feat\b/i, 9],
    ["unarmed",           /\bunarmed|\bpunch|\bkick\b|\bfist\b|\bbrawl|\bmartial arts|\bblow\b|\bgrab\b/i, /\bunarmed strike\b/i, 4],
    ["ki-meditation",     /\bki\b|\bqinggong|\bmeditat|\bascetic|\bmonastic/i, /\bki pool\b/i, 2],
    // --- magic ---
    ["metamagic",         /\bspell$|\bmetamagic|\bquicken|\bempower|\bmaximize|\bwiden|\bstill spell|\bsilent spell|\bextend|\benlarge|\bheighten|\bpersistent/i, /\bmetamagic\b/i, 7],
    ["spell-focus",       /\bspell focus|\bspell specialization|\bspell penetration|\bspell perfection|\bfocus$/i, /\bspell focus\b|\bspell penetration\b/i, 3],
    ["counterspell",      /\bcounterspell|\bdispel|\bnullif|\bantimagic/i, /\bcounterspell\b/i, 1],
    ["summoning",         /\bsummon|\bconjur|\bgate\b/i,                   /\bsummon monster\b/i, 2],
    ["familiar",          /\bfamiliar|\btumor\b/i,                         /\bfamiliar\b/i, 2],
    ["animal-companion",  /\bcompanion|\bboon companion|\bpack\b/i,        /\banimal companion\b/i, 2],
    ["bloodline",         /\bbloodline|\bheritage|\bdraconic|\babyssal\b/i, /\bbloodline\b/i, 2],
    ["channel-energy",    /\bchannel|\bturn undead|\bcommand undead/i,     /\bchannel energy\b/i, 4],
    ["hex-witch",         /\bhex\b|\bwitch|\bcackle|\bcauldron|\bcoven/i,  /\bhex\b/i, 2],
    ["rage-barbarian",    /\brag(e|ing)\b|\bbarbarian|\bfury|\bberserk|\bferocious|\bsavage/i, /\brage powers?\b/i, 3],
    ["bardic",            /\bbard\b|\bperform|\bsong\b|\bmasterpiece|\blingering|\bmelod|\bharmon|\bdirge/i, /\bbardic performance\b/i, 2],
    ["smite-paladin",     /\bsmite|\bpaladin|\blay on hands|\bmercy\b|\blitany|\bcrusad|\bchampion/i, /\bsmite evil\b|\blay on hands\b/i, 2],
    ["judgment-teamwork", /\bjudgment|\binquisit|\bbane\b|\bteamwork|\bcoordinat|\bpaired\b|\bgang\b/i, /\bteamwork feat\b|\bjudgment\b/i, 2],
    ["arcane",            /\barcane|\beldritch|\bmage\b|\bwizard|\bsorcer|\barcanist/i, /\barcane strike\b/i, 2],
    ["mesmerist-stare",   /\bstare\b|\bmesmer|\bhypnot|\bgaze\b/i,         /\bpainful stare\b/i, 2],
    ["psychic-occult",    /\bpsychic|\boccult|\bphrenic|\bmind\b|\btelepath|\bthought|\bmental|\bmindscape|\balien\b/i, /\bpsychic magic\b/i, 2],
    ["spirit-medium",     /\bspirit|\bmedium\b|\bshaman|\bseance|\bhaunt|\bwander/i, /\bspirit\b/i, 3],
    ["necromancy",        /\bundead|\bnecro|\bcorpse|\bghoul|\bzombie|\bskeleton|\bbone\b|\bgrave\b|\bdeath\b/i, /\bundead\b/i, 2],
    ["shadow",            /\bshadow|\bdark|\bnight\b|\bumbral|\bgloom/i,   /\bshadow\b/i, 3],
    ["planar",            /\bplanar|\bextraplanar|\bdemon|\bdevil|\bangel|\bcelestial|\bfiend|\bdamn|\bdimension|\binfernal|\babyss|\basura/i, /\bextraplanar\b/i, 3],
    // --- elemental ---
    ["fire",              /\bfire|\bflame|\bburn|\bblaz|\bcinder|\bpyro|\bash\b|\bsmoke/i, /\bfire damage\b/i, 2],
    ["cold",              /\bcold|\bfrost|\bice\b|\bfrozen|\bwinter|\brime\b|\barctic/i, /\bcold damage\b/i, 1],
    ["lightning",         /\blightning|\belectric|\bthunder|\bstorm|\bshock/i, /\belectricity damage\b/i, 1],
    ["acid-poison",       /\bacid|\bcorros|\bvenom|\bpoison|\btoxic|\bsting/i, /\bacid damage\b|\bpoison\b/i, 2],
    ["earth-stone",       /\bstone|\bearth|\bmountain|\bgranite|\bboulder|\bcrystal|\bmetal\b|\biron\b|\bsteel/i, /\bstone\b/i, 3],
    ["air-flight",        /\bwind\b|\bair\b|\bsky\b|\bcloud|\bflight|\bfly\b|\bwing|\baerial|\bsoar|\baltitude/i, /\bfly speed\b/i, 2],
    ["water",             /\bwater|\baqua|\bswim|\bsea\b|\bocean|\btide\b|\bwave\b|\bmarine|\bnaut/i, /\bswim speed\b/i, 2],
    // --- skills & social ---
    ["stealth",           /\bstealth|\bhide\b|\bsneak|\bcamouflage|\bvanish|\bsilent\b|\bambush|\bassassin/i, /\bstealth check\b|\bsneak attack\b/i, 2],
    ["intimidate",        /\bintimidat|\bdemoral|\bfear\b|\bterrif|\bdread|\bcornugon|\bmenac|\bfright|\bhorror/i, /\bintimidate check\b|\bdemoralize\b/i, 2],
    ["diplomacy",         /\bdiplomac|\bpersuas|\bnegotiat|\bcharm|\bcourt|\bnoble|\betiquette|\bfriend/i, /\bdiplomacy check\b/i, 2],
    ["bluff-disguise",    /\bbluff|\bdecei|\bdisguise|\blie\b|\bmask\b|\bimperson|\bswindl/i, /\bbluff check\b/i, 2],
    ["perception",        /\bpercept|\bsense\b|\balert|\bkeen\b|\bsharp|\bwatch|\bscout|\bwarning|\bsight\b/i, /\bperception check\b/i, 2],
    ["knowledge",         /\bknowledge|\blore\b|\bscholar|\bstud(y|ent|ied)|\bresearch|\bsavant|\bgraduate|\bacadem|\bsage\b|\bastrolog/i, /\bknowledge \(/i, 6],
    ["athletics",         /\bclimb|\bscal(e|ing)|\bathlet|\bjump|\bleap|\btumbl|\brun\b|\bsprint|\bacrobat|\bascen/i, /\bclimb speed\b|\bacrobatics check\b/i, 2],
    ["heal-medicine",     /\bheal|\bmedic|\bsurgeon|\bchirurg|\bacupunct|\banatom|\bremed/i, /\bheal check\b/i, 1],
    ["survival",          /\bsurvival|\btrack|\bforag|\bwilder|\bhunt|\btrapper|\bnomad|\bexplor|\badaptation/i, /\bsurvival check\b/i, 2],
    ["traps-thievery",    /\btrap|\bdisable|\block\b|\bthief|\bpick\b|\bburgl/i, /\bdisable device\b/i, 1],
    ["leadership",        /\bleader|\bcommand|\bcaptain|\btactic|\brally|\binspir|\ballied|\bassociate|\bpartner|\bteam\b/i, /\bleadership\b|\bcohort\b/i, 3],
    ["linguistics",       /\blinguist|\blanguage|\bscript|\bcipher|\btongue|\bglyph/i, /\blinguistics\b/i, 1],
    // --- crafting ---
    ["item-creation",     /\bcraft|\bforge\b|\bscribe|\bbrew|\bconstruct|\bcreate|\bartis|\bsmith/i, /\bitem creation\b/i, 2],
    ["alchemy",           /\balchem|\bbomb|\bmutagen|\bextract|\bdiscover|\belixir|\bpotion|\bdrug/i, /\balchemist\b|\bbombs?\b/i, 2],
    ["item-mastery",      /\bitem mastery/i,                               /\bitem mastery\b/i, 1],
    // --- creature / racial ---
    ["natural-attacks",   /\bbite\b|\bclaw|\bgore\b|\bnatural\b|\btail\b|\bhoof|\btalon|\brend\b|\bmaul|\bfang/i, /\bnatural attacks?\b/i, 2],
    ["dragon-breath",     /\bbreath\b|\bdragon/i,                          /\bbreath weapon\b/i, 2],
    ["race-dwarf",        /\bdwar/i,                                       /\bdwarf\b/i, 1],
    ["race-elf",          /\belf\b|\belven|\bdrow\b/i,                     /\belves\b/i, 1],
    ["race-gnome",        /\bgnome/i,                                      /\bgnome\b/i, 1],
    ["race-halfling",     /\bhalfling/i,                                   /\bhalfling\b/i, 1],
    ["race-orc-gnoll",    /\borc\b|\bgnoll/i,                              /\bhalf-orc\b/i, 1],
    ["race-goblinoid",    /\bgoblin|\bhobgoblin|\bbugbear|\bkobold/i,      /\bkobold\b/i, 1],
    ["race-planetouched", /\btiefling|\baasimar|\bifrit|\boread|\bsylph|\bundine|\bsuli\b/i, /\btiefling\b|\baasimar\b/i, 1],
    ["race-beastfolk",    /\bcatfolk|\bratfolk|\btengu|\bkitsune|\bvishkanya|\bnagaji|\bwayang|\bgrippli|\bshifter|\blizardfolk/i, /\btengu\b/i, 2],
    ["race-giant",        /\bgiant|\bogre\b|\btroll/i,                     /\bgiant\b/i, 1],
    // --- misc ---
    ["initiative-speed",  /\binitiative|\bquick\b|\bfast\b|\bswift\b|\bspeed\b|\bfleet\b|\bsudden|\bhast/i, /\binitiative check\b/i, 2],
    ["extra-resource",    /\bextra\b|\badditional\b|\bexpanded|\babundant/i, /\badditional uses\b/i, 3],
    ["story-destiny",     /\bstory\b|\bdestiny|\bfate\b|\bvengeance|\bredempt|\bascend|\blegacy|\bheir\b|\bbirthright|\bapotheosis/i, /\bstory feat\b/i, 2],
    ["faith-obedience",   /\bobedience|\bboon\b|\bevangel|\bexalted|\bsentinel|\bdeific|\bfaith|\bpray|\bholy|\bsacred|\bbless|\bpious|\bpilgrim|\breligio|\bdivine|\btemple|\bsaint|\bpurity/i, /\bdeific obedience\b|\bdeity\b/i, 3],
    ["performance-combat",/\bperformance|\bshowman|\bcrowd|\bgladiat|\barena|\bspectacl/i, /\bperformance combat\b/i, 1],
    ["siege-vehicle",     /\bsiege|\bvehicle|\bcatapult|\bballista|\bcannon|\bship\b|\bsail|\bcrew\b/i, /\bsiege engine\b/i, 1],
    ["curse-disease",     /\bcurse|\bdisease|\bplague|\bblight|\brot\b|\binfect/i, /\bcursed?\b|\bdisease\b/i, 2],
    ["light-radiance",    /\blight\b|\bradian|\bsun\b|\bdawn\b|\bbright|\bglow|\blumin/i, /\bbright light\b/i, 2],
    ["blood-sacrifice",   /\bblood|\bsacrific|\bwound|\bscar\b|\bpain\b|\bmartyr/i, /\bhit point damage\b/i, 3],
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
  "item-wrists": 2,
  "item-shoulders": 2,
  "item-head": 2,
  "item-eyes": 2,
  "item-body": 2,
  "item-neck": 4,
  "rules": 40,          // rules pages have no category to sort them by
  "npc": 12,
  "feat-scene": 57,     // feats matching no theme (725 of them)
  "item-scene": 88,     // mundane goods: Miscellaneous, Equipment, Magic Equipment
  "item-wondrous": 46,  // wondrous items no theme or slot caught
  "item-weapon": 51,    // Weapons rawCat — largely abstract magic qualities (Keen, Bane, Vorpal)
  "item-armorset": 23,  // Armor rawCat, same
  "item-artifact": 10
};

/* Which variety set catches a bucket's unthemed entries, after every other candidate has missed.
   tools/check-themes.mjs fails the build if a set is too small for the stragglers it must absorb. */
window.PF_THEME_FALLBACK = { feats: "feat-scene", items: "item-scene" };
