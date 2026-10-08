/* Retrieval regression check for "Ask the Codex" (netlify/functions/ask.mjs).
 *
 * For each natural-language question, runs the REAL retrieve() from ask.mjs (extracted, not copied)
 * against data/ask-index.json and asks: does a RETRIEVED entry's body contain the sentence that
 * answers it? Every answer sentence was read out of the Codex / d20pfsrd source text, never written
 * from memory (a memory-written "10% stabilize chance" was 3.5, not this ruleset). A needle that
 * matches no entry is reported and skipped, not counted.
 *
 *   node tools/check-ask.mjs .          # exit 1 if recall or top-10 drops below the floor
 *   node tools/check-ask.mjs . --v      # every question with its rank
 *
 * Run it after ANY change to ask.mjs, gen-ask-index.mjs, or the data (then regenerate the index first:
 * node tools/gen-ask-index.mjs .). It needs ~2 GB of heap for the bodies: use --max-old-space-size=6144.
 * Born from a live miss (2026-10-03, "immediate action" vs the entry "Immediate Actions"): see ask.mjs.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".";
const verbose = process.argv.includes("--v");
const FLOOR_FOUND = 0.97, FLOOR_TOP10 = 0.88;

const src = fs.readFileSync(path.join(ROOT, "netlify/functions/ask.mjs"), "utf8");
const consts = src.slice(src.indexOf("const CONTEXT_CHAR_BUDGET"), src.indexOf("const RATE_LIMIT"));
const retrieve = new Function(consts + "\n" + src.slice(src.indexOf("function stem"), src.indexOf("const rateLimitState")) + "\nreturn retrieve;")();
const index = JSON.parse(fs.readFileSync(path.join(ROOT, "data/ask-index.json"), "utf8"));
index.bin = new Uint8Array(fs.readFileSync(path.join(ROOT, "data", index.postingsFile)));   // binary postings (SIZE-PLAN.md step 3)

const BUCKETS = ["archetypes", "classes", "deities", "feats", "hazards", "items", "monsters", "npcs", "options", "races", "rules", "spells", "traits"];
const g = { window: {} };
g.window.PF_REG = (b, m) => { g.window[b] = m; };
for (const b of BUCKETS) new Function("window", fs.readFileSync(path.join(ROOT, "data/cat", b + ".js"), "utf8"))(g.window);
const body = (d) => String((g.window[d[2]] || {})[d[0]] || "");
const D = "[–—−-]"; // dash variants

const Q = [
// ---- core combat / conditions / actions ----
  ["Can I use an immediate action when it is not my turn, and are there any restrictions?", /cannot use an immediate action if you are flat-footed/i],
  ["Can a flat-footed character use an immediate action?", /cannot use an immediate action if you are flat-footed/i],
  ["How many swift actions can a character take per turn?", /only a single swift action per turn|one swift action per turn/i],
  ["How many free actions can I take in a round?", /Free actions don.t take any time at all, though there may be limits to the number of free actions/i],
  ["What can I do with a move action?", /The simplest move action is moving your speed/i],
  ["What can I do with a standard action?", /A standard action allows you to do something, most commonly to make an attack or cast a spell/i],
  ["What can I do with a full-round action?", /A full-round action requires an entire round to complete/i],
  ["How does a 5-foot step work?", /You can move 5 feet in any round when you don.t perform any other kind of movement/i],
  ["What does the sickened condition do?", new RegExp("sickened[\\s\\S]{0,80}" + D + "2 penalty on all attack rolls, weapon damage rolls, saving throws, skill checks, and ability checks", "i")],
  ["What are the rules for fighting defensively?", new RegExp("fighting defensively[\\s\\S]{0,260}" + D + "4 penalty", "i")],
  ["How does massive damage work?", /Massive Damage \(Optional Rule\)[\s\S]{0,200}DC 15 Fortitude save/i],
  ["What are the effects of negative levels?", new RegExp("Each negative level[\\s\\S]{0,120}" + D + "1 penalty", "i")],
  ["What is the penalty for being prone?", new RegExp("prone[\\s\\S]{0,160}" + D + "4 penalty on melee attack rolls", "i")],
  ["How does the dazzled condition work?", /dazzled[\s\S]{0,200}overstimulation of the eyes/i],
  ["What happens when a creature is entangled?", new RegExp("entangled[\\s\\S]{0,160}" + D + "2 penalty on attack rolls and a " + D + "4 penalty to Dexterity", "i")],
  ["What are the rules for being blinded?", new RegExp("blinded[\\s\\S]{0,260}" + D + "2 penalty to Armor Class", "i")],
  ["What is the DC to stabilize when I'm dying?", /DC 10 Constitution check to become stable/i],
  ["What do I need to roll to confirm a critical hit?", /another attack roll with all the same modifiers/i],
  ["How does casting a spell with a touch range work?", /hold the charge/i],
  ["How do I use Take 10 or Take 20 on a skill check?", /20 times as long/i],
  ["What are the rules for ability damage and ability drain?", /This damage does not actually reduce an ability, but it does apply a penalty/i],
  ["How do I two-hand a weapon and what is the damage bonus?", /(two hands|two-handed)[\s\S]{0,250}(1-1\/2|1 1\/2|one and a half) times/i],
  ["How many attacks of opportunity can I make each round?", /most characters can only make one per round/i],
  ["What are the rules for concealment and miss chance?", /Concealment[\s\S]{0,300}20% miss chance/i],
  ["How does flanking work and what bonus do I get?", /flank[\s\S]{0,300}\+2 (flanking )?bonus/i],
  ["How does a charge work and what are the penalties?", /move up to twice your speed and attack during the action/i],
  ["How do I make a concentration check when casting defensively?", /15 \+ (double|twice) the spell.s level|DC 15 \+ double the spell level|casting defensively/i],
  ["How does overrun work?", /overrun[\s\S]{0,300}(move through|move over)/i],
  ["How much weight can a character carry?", /(light|medium|heavy) load[\s\S]{0,100}(Str|Strength)/i],
  ["How does spell resistance work?", /caster level check[\s\S]{0,120}(spell resistance|SR)/i],
  ["What does the shaken condition do?", new RegExp("shaken[\\s\\S]{0,120}" + D + "2 penalty on attack rolls, saving throws, skill checks, and ability checks", "i")],
  ["What are the effects of the fatigued condition?", /A fatigued character can neither run nor charge/i],
  ["How do I grapple and what happens when I'm pinned?", /pinned[\s\S]{0,300}(Dexterity bonus|flat-footed|AC)/i],
  ["How do I use the aid another action?", /aid another[\s\S]{0,300}(DC 10|\+2 bonus)|DC 10 attack roll/i],
  ["How does a surprise round work?", /surprise round[\s\S]{0,200}(only a standard action|aware)/i],
  ["What are the rules for readying an action?", /ready[\s\S]{0,200}(standard action)[\s\S]{0,200}(trigger|specify)/i],
  ["How far can a character jump with Acrobatics?", /(long jump|running jump|high jump)[\s\S]{0,200}DC/i],
  ["How does the Bluff skill feint work?", /feint[\s\S]{0,300}(Sense Motive|10 \+ (your )?base attack bonus)/i],
  ["How do I identify a spell being cast using Spellcraft?", /(DC 15 \+ spell level|15 \+ spell level)/i],
  ["How do hit points work and what happens at 0 hit points?", /When your current hit point total drops to exactly 0, you are disabled/i],
  ["How long does it take to heal naturally with a night of rest?", /(1 hit point per (character )?level|hit points? per level)[\s\S]{0,200}(rest|night)|rest[\s\S]{0,200}1 hit point per/i],
  ["What are the rules for a character who is stunned?", /A stunned creature drops everything held/i],
  ["How do I use Intimidate to demoralize?", /demoralize[\s\S]{0,300}shaken/i],
  ["What is the DC for Perception to hear a conversation through a door?", /(Perception|Listen)[\s\S]{0,400}(door)[\s\S]{0,200}\+5/i],
  ["What is a standard action versus a swift action versus a move action?", /swift action[\s\S]{0,200}free action/i],
  ["How does damage reduction work?", /damage reduction[\s\S]{0,200}(subtract|bypassed)/i],
// ---- other areas + the 10 questions from the 2026-10-03 live test ----
  // the 10 live-test questions (answers verified against the d20pfsrd source earlier)
  ["What is the DC to identify a monster with a Knowledge check, and does it change for common or rare monsters?", /the DC of this check equals 5 \+ the monster.s CR/i],
  ["How long can a character hold their breath, and what happens after that time runs out?", /number of rounds equal to twice her Constitution score/i],
  ["How long can a character go without water before they start taking damage, and what are the checks?", /go without water for 1 day plus a number of hours equal to his Constitution score/i],
  ["How much damage do you take when falling into deep water?", /the first 20 feet of falling do no damage/i],
  ["What saving throw do I need in very hot weather and what are the penalties?", /very hot conditions \(above 90° F\) must make a Fortitude saving throw each hour/i],
  ["What is the Fly skill DC to hover?", /Hover\s+15/i],
  ["What is the DC to demoralize an opponent with Intimidate?", /10 \+ the target.s Hit Dice \+ the target.s Wisdom modifier/i],
  ["What is the Escape Artist DC to escape from ropes or bindings, and how long does it take?", /binder.s combat maneuver bonus \+20|Binder.s CMB \+20/i],
  ["How many swift actions can a character take per turn?", /only a single swift action per turn|one swift action per turn/i],
  ["Can I use an immediate action when it is not my turn, and are there any restrictions?", /cannot use an immediate action if you are flat-footed/i],
  // held-out: other areas
  ["What are the prerequisites for the Vital Strike feat?", /Vital Strike[\s\S]{0,200}Prerequisites?: Base attack bonus \+6/i],
  ["When does a rogue gain extra sneak attack dice?", /sneak attack[\s\S]{0,200}every two (rogue )?levels/i],
  ["What does the grab universal monster rule do?", /grab[\s\S]{0,300}(start a grapple|free action)/i],
  ["How much does a masterwork weapon cost extra?", /A masterwork weapon is a finely crafted version of a normal weapon/i],
  ["How does Lay on Hands work for a paladin?", /lay on hands[\s\S]{0,300}(standard action|1d6 hit points)/i],
  ["How much does it cost to be raised from the dead with a raise dead spell?", /raise dead[\s\S]{0,400}5,000 gp|diamond[\s\S]{0,40}5,000 gp/i],
  ["How many hit dice of creatures does the sleep spell affect?", /A sleep spell causes a magical slumber to come upon 4 HD of creatures/i],
  ["What are the Climb skill DCs for different surfaces?", /(rough surface|smooth surface|DC 25)[\s\S]{0,200}DC/i],
  ["What does the alchemist's bomb ability do and how much damage?", /bomb[\s\S]{0,300}1d6 points of fire damage/i],
  ["How do I craft a magic item and how long does it take?", /magic item crafting and the downtime rules both use days as time increments/i],
  ["What is the rule for two-weapon fighting penalties?", new RegExp("two-weapon fighting[\\s\\S]{0,300}" + D + "6 penalty", "i")],
  ["How does the monk's flurry of blows work?", /flurry of blows[\s\S]{0,300}(extra attack|additional attack)/i],
  ["What is the grapple DC and the CMD formula?", /A creature.s CMD is determined using the following formula/i],
  ["How many skill ranks does a character get per level and what are class skills?", /class skill[\s\S]{0,200}\+3 (bonus|class skill)/i],
  ["What happens if I fall unconscious from nonlethal damage?", /nonlethal damage[\s\S]{0,200}(unconscious|equal to (your|his|her) current hit points)/i],
  ["How do I use the Disable Device skill to open a lock?", /(open lock|lock)[\s\S]{0,300}(DC 20|DC 25|DC 30)/i],
  ["What is the cost and effect of a potion of cure light wounds?", /cure light wounds[\s\S]{0,200}50 gp/i],
  ["How does a ranger's favored enemy bonus work?", /favored enemy[\s\S]{0,300}\+2 bonus on Bluff, Knowledge, Perception, Sense Motive, and Survival/i],
  ["What does the staggered condition do?", /staggered[\s\S]{0,200}(single move action or standard action|only take a single)/i],
  ["How does a gnome's racial trait for illusions work?", /gnome[\s\S]{0,400}(illusion|spell-like)/i],
  ["How much does heavy armor slow movement?", /(medium or heavy armor|heavy armor)[\s\S]{0,300}(speed|30 feet[\s\S]{0,40}20 feet)/i],
  ["What is the Spellcraft DC to learn a spell from a scroll?", /(learn|copy|scribe)[\s\S]{0,200}Spellcraft[\s\S]{0,100}DC/i],
  ["What are the effects of the nauseated condition?", /nauseated[\s\S]{0,200}(only a single move action|unable to attack)/i],
  ["What is the DC to track a creature with Survival?", /track[\s\S]{0,300}(DC 10|firm ground|soft ground)/i],
// ---- live-test round 2 (environment / movement). Every sentence below was read out of the d20pfsrd source pages. ----
  ["How much damage does lava deal per round, and what if a character is completely immersed in it?", /Lava or magma deals 2d6 points of fire damage per round of exposure/i],
  ["How much damage does acid deal, and what counts as a round of exposure?", /An attack with acid, such as from a hurled vial or a monster.s spittle, counts as a round of exposure/i],
  ["How much damage does a falling object deal to a creature it lands on, and can the creature avoid it?", /if an object falls less than 30 feet, it deals half the listed damage/i],
  ["Can a Large creature squeeze through a narrow gap, and what are the penalties?", /you can squeeze through or into a space that is at least half as wide as your normal space/i],
  ["What are the Swim DCs for calm, rough, and stormy water?", /Calm water\s+10\s+Rough water\s+15\s+Stormy water\s+20/i],
  ["What happens to a character in extreme cold below minus 20 degrees Fahrenheit?", /Extreme cold \(below .20° F\) deals 1d6 points of lethal damage per minute/i],
  ["What happens to movement and Acrobatics checks when walking on ice?", /spend 2 squares of movement to enter a square covered by ice/i],
  ["How much weight can a character lift over their head, and how much can they push or drag?", /push or drag along the ground as much as five times his maximum load/i],
  ["What are the rules for dense smoke, and how many saves can a character fail?", /may fail this save a number of times equal to her Constitution modifier/i],
  ["What are the rules for extreme heat above 140 degrees Fahrenheit?", /air temperature over 140° F, fire, boiling water, lava\) deals lethal damage/i],
// ---- live-test round 4 (magic items, poisons, a disease, a spell, skills, carrying capacity) ----
  ["How much can a handy haversack hold, and how fast can you retrieve an item from it?", /each is like a bag of holding and can actually hold material of as much as 2 cubic feet in volume or 20 pounds in weight/i],
  ["What are the weight and volume limits for the different types of bag of holding?", /15 lbs\.\s+250 lbs\.\s+30 cubic ft\./i],
  ["What are the save DC, onset, frequency and effect of filth fever?", /Fortitude Save DC 12\s+Onset 1d3 days; Frequency 1\/day/i],
  ["What are the save DC, frequency and damage of black adder venom?", /Fortitude DC 11; Frequency 1\/round for 6 rounds/i],
  ["What does blue whinnis poison do, and what is its save DC?", /Fortitude DC 14; Frequency 1\/round for 2 rounds/i],
  ["What modifiers apply to a Disguise check for disguising as a different gender, race, age category or size?", /Disguised as different gender[\s\S]{0,40}Disguised as different race/i],
  ["How does sniping work with the Stealth skill, and what penalty applies?", /You take a .20 penalty on your Stealth check to maintain your obscured location/i],
  ["How fast can a creature fly under the fly spell, and what happens when the spell expires while it is still aloft?", /fly at a speed of 60 feet \(or 40 feet if it wears medium or heavy armor/i],
  ["How much does a cloak of resistance cost at each bonus level?", /1,000 gp \(\s*\+1\), 4,000 gp \(\s*\+2\), 9,000 gp \(\s*\+3\)/i],
  ["What are the light, medium and heavy load limits for a character with Strength 10?", /33 lbs\. or less\s+34.66 lbs\./i],
];

let found = 0, t10 = 0, tot = 0; const miss = [];
for (const [q, re] of Q) {
  let exists = false;
  for (const d of index.docs) if (re.test(body(d))) { exists = true; break; }
  if (!exists) { console.log("  skipped (answer text not in the corpus):", q.slice(0, 80)); continue; }
  tot++;
  const picked = retrieve(index, q);
  let rank = 0;
  for (let i = 0; i < picked.length; i++) if (re.test(body(picked[i]))) { rank = i + 1; break; }
  if (verbose) console.log(String(rank || "MISS").padStart(4), String(picked.length).padStart(3), q.slice(0, 84), rank ? "| " + picked[rank - 1][1] : "");
  if (rank) { found++; if (rank <= 10) t10++; } else miss.push(q);
}
console.log(`ask retrieval: answer text retrieved ${found}/${tot}   in top 10: ${t10}/${tot}`);
if (miss.length) console.log("MISSED:\n  " + miss.join("\n  "));
const ok = found / tot >= FLOOR_FOUND && t10 / tot >= FLOOR_TOP10;
if (!ok) { console.error(`FAIL: below the floor (retrieved >= ${FLOOR_FOUND * 100}%, top10 >= ${FLOOR_TOP10 * 100}%)`); process.exit(1); }
console.log("OK");
