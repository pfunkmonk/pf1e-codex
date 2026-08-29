/* Is every art file on disk actually SHOWN to somebody?
 *
 * check-reachable answers "could the resolver ever ask for this key?" — a structural question.
 * This answers the practical one: walking all 25,926 entries through the real chain, which files
 * does at least one page actually land on? A key can be perfectly reachable and still never win,
 * because an earlier candidate always beats it, or because no entry hashes to that variant.
 *
 * ⚠ This mirrors entryArtKey() in app.js. See HANDOFF "Known debt" — that chain is written out in
 * several places and drift is silent. Cross-check a sample against the live app before trusting a
 * surprising result.
 *
 * Usage: node tools/check-used.mjs [repoRoot]
 */
import fs from "node:fs";
const ROOT = process.argv[2] || ".";
globalThis.window = {};
for (const f of ["data/index.js", "data/art.js", "data/themes.js", "data/bodythemes.js"])
  (0, eval)(fs.readFileSync(`${ROOT}/${f}`, "utf8"));
const IDX = globalThis.window.PF_INDEX;
const ART = new Set(globalThis.window.PF_ART);
const THEMES = globalThis.window.PF_THEMES || {}, BODY = globalThis.window.PF_BODY_THEMES || {};
const VARIETY = globalThis.window.PF_VARIETY || {}, FALLBACK = globalThis.window.PF_THEME_FALLBACK || {};
const BODY_MAP = globalThis.window.PF_BODY_THEME || {}, BODY_CLASS = globalThis.window.PF_BODY_CLASS || {};
const NPC_ROLES = globalThis.window.PF_NPC_ROLES || [];

const ak = s => String(s).toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489909); h ^= h >>> 16;
  return h >>> 0;
}
const have = k => (k && ART.has(k) ? k : null);
function avail(name) { let n = 0; while (ART.has(`${name}-${n + 1}`)) n++; return n; }
function vk(name, id) {
  const n = VARIETY[name] || 1, k = `${name}-${hash32(id) % n + 1}`;
  if (ART.has(k)) return k;
  const a = avail(name);
  return a ? `${name}-${hash32(id) % a + 1}` : null;
}
function themeArt(bucket, r) {
  const t = THEMES[bucket]; if (!t) return null;
  const n = r[1] || "", x = r[5] || "";
  const key = row => `theme-${bucket}-${row[0]}-${(row[3] || 1) > 1 ? hash32(r[0]) % (row[3] || 1) + 1 : 1}`;
  for (const row of t) if (row[1] && row[1].test(n)) return key(row);
  for (const row of t) if (row[2] && row[2].test(x)) return key(row);
  return null;
}
function bodyThemeArt(bucket, r) {
  const k = BODY_MAP[r[0]]; if (!k) return null;
  const t = BODY[bucket]; if (!t) return null;
  const row = t.find(x => x[0] === k); if (!row) return null;
  if (row[3]) return VARIETY[row[3]] ? vk(row[3], r[0]) : row[3];
  const n = row[2] || 1;
  return `theme-${bucket}-${k}-${n > 1 ? hash32(r[0]) % n + 1 : 1}`;
}

// Lifted straight out of app.js so the maps cannot drift independently of it.
const app = fs.readFileSync(`${ROOT}/app.js`, "utf8");
function grab(decl) {
  // Brace-count from the opening { so the shape of the closing line does not matter.
  const i = app.indexOf(decl); if (i < 0) throw new Error("missing " + decl);
  let j = app.indexOf("{", i), depth = 0, end = -1;
  for (let k = j; k < app.length; k++) {
    if (app[k] === "{") depth++;
    else if (app[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
  }
  return (0, eval)("(" + app.slice(j, end + 1) + ")");
}
const CLASS_INHERIT = grab("var CLASS_INHERIT={", "\n  };");
const SLOT_ART = grab("var SLOT_ART=");
const ITEM_CAT_ART = grab("var ITEM_CAT_ART=");
const OPTION_ART = grab("var OPTION_ART=");
const CAT = { classes: "cat-classes", options: "cat-classoptions", races: "cat-races", archetypes: "cat-archetypes",
  feats: "cat-feats", traits: "cat-traits", spells: "cat-spells", monsters: "cat-monsters", npcs: "cat-npcs",
  items: "cat-items", rules: "cat-rules", hazards: "cat-hazards", deities: "deities-pantheon" };

function inherited(n) {
  n = String(n || "");
  if (/^Order of\b/i.test(n)) return have("class-cavalier");
  if (/^Oath\b/i.test(n)) return have("class-paladin");
  const un = n.match(/^(.*?)\s*\(Unchained\)$/i);
  if (un) return have("class-" + ak(un[1])) || (CLASS_INHERIT[un[1]] ? have("class-" + CLASS_INHERIT[un[1]]) : null);
  return CLASS_INHERIT[n] ? have("class-" + CLASS_INHERIT[n]) : null;
}
function archClassFromName(n) {
  const w = String(n || "").split(/\s+/);
  for (let k = Math.min(3, w.length - 1); k >= 1; k--) {
    const p = w.slice(0, k).join(" ");
    if (have("class-" + ak(p)) || inherited(p)) return p;
  }
  return null;
}
function traitReq(r) {
  const m = String(r[5] || "").match(/Requirement\(s\)\s+(.+?)(?:\s*\[|\s+(?:You|Your|A|An|The|Whenever|Once|As)\b|$)/);
  return m ? m[1].trim() : null;
}
function npcRole(r) {
  for (const [re, key] of NPC_ROLES) if (re.test(r[1] || "")) return VARIETY[key] ? vk(key, r[0]) : key;
  return null;
}

function chain(r) {
  const b = r[2], fac = r[6] || {}, nm = ak(r[1]), id = r[0], out = [];
  const P = k => { if (k) out.push(k); };
  if (b === "classes") { P("class-" + nm); P(inherited(r[1])); }
  else if (b === "races") P("race-" + nm);
  else if (b === "deities") { P(have("deity-" + nm)); P("deities-pantheon"); }
  else if (b === "archetypes") {
    const c = [].concat(fac.cls || [])[0] || archClassFromName(r[1]);
    if (c) { P(have(vk("arch-" + ak(c), id))); P(have("class-" + ak(c))); P(inherited(c)); }
  } else if (b === "traits") {
    const q = traitReq(r);
    if (q) { if (fac.cat === "Race") P(have("race-" + ak(q))); if (fac.cat === "Religion") P(have("deity-" + ak(q))); }
    P(have(bodyThemeArt("traits", r)));
    if (fac.cat) { const tk = "trait-" + ak(fac.cat); P(have(vk(tk, id))); P(tk); }
  } else if (b === "feats") {
    P(have("feat-" + nm)); P(have(themeArt("feats", r))); P(have(bodyThemeArt("feats", r)));
    P(have(vk(FALLBACK.feats, id))); if (fac.t) P("feat-" + ak(fac.t));
  } else if (b === "items") {
    const raw = r[3] || "", slot = String(fac.slot || "").toLowerCase();
    P(have("item-" + nm)); P(have(themeArt("items", r))); P(have(bodyThemeArt("items", r)));
    if (raw === "Weapons") { P(have(vk("item-weapon", id))); P("item-weapon-" + (hash32(id) % 6 + 1)); }
    else if (raw === "Armor") { P(have(vk("item-armorset", id))); P("item-armorset-" + (hash32(id) % 6 + 1)); }
    else if (raw === "Artifacts") P(have(vk("item-artifact", id)));
    if (ITEM_CAT_ART[raw]) P("item-" + ITEM_CAT_ART[raw]);
    if (SLOT_ART[slot]) { const sk = "item-" + SLOT_ART[slot]; if (VARIETY[sk]) P(have(vk(sk, id))); P(sk); }
    if (raw === "Wondrous Items") P(have(vk("item-wondrous", id)));
    P(have(vk("item-scene", id)));
    P(raw === "Wondrous Items" ? "item-wondrous" : "item-generalstore");
  } else if (b === "options") {
    P(have(bodyThemeArt("options", r)));
    const oa = OPTION_ART[r[3]]; if (oa) { P(have(vk("opt-" + oa, id))); P("opt-" + oa); }
  } else if (b === "hazards") {
    P(have(bodyThemeArt("hazards", r)));
    const hz = "hazard-" + ak(r[3] || ""); P(have(vk(hz, id))); P(hz);
  } else if (b === "rules") {
    P(have(themeArt("feats", r))); P(have(vk("rules", id)));
  } else if (b === "npcs") {
    const nc = BODY_CLASS[id];
    if (nc) { P(have(vk("arch-" + nc, id))); P(have("class-" + nc)); }
    P(have(npcRole(r))); P(have(vk("npc", id)));
  } else if (b === "spells") {
    P(have("spell-" + nm)); P(have(themeArt("spells", r))); P(have(bodyThemeArt("spells", r)));
    if (fac.sch && fac.sch !== "universal") { const sk = "school-" + fac.sch; P(have(vk(sk, id))); P(have(sk)); }
  } else if (b === "monsters") {
    P(have("monster-" + nm)); P(have("race-" + nm)); P(have("creature-" + nm)); P(have("type-" + nm));
    P(have(themeArt("monsters", r)));
    if (fac.st) { const s2 = "creature-" + ak(fac.st); P(have(vk(s2, id))); P(s2); }
    const t = ak(fac.t || ""), al = String(fac.al || "");
    if (t === "dragon") P(/E$/.test(al) ? "type-dragon-chromatic" : (/G$/.test(al) ? "type-dragon-metallic" : "type-dragon"));
    else if (t === "outsider") P(/G$/.test(al) ? "type-celestial" : (/E$/.test(al) ? "type-fiend" : "type-elemental"));
    if (t === "humanoid" && /giant/i.test(r[1])) P("type-giant");
    P(have(bodyThemeArt("monsters", r)));   // habitat, read off the Environment line
    if (t) { P(have(vk("type-" + t, id))); P(have("type-" + t)); }
    P(have(vk("monster-scene", id)));
  }
  P(CAT[b]);
  return out;
}

// --predict prints id -> resolved key as JSON for a stratified sample, so the tool-side chain
// can be diffed against what the LIVE app actually paints. The header warns that this chain is
// mirrored in several files and that drift is silent; this makes checking it a command rather
// than a manual spot-check. Usage: node tools/check-used.mjs . --predict [perBucket]
if (process.argv.includes("--predict")) {
  const n = Number(process.argv[process.argv.indexOf("--predict") + 1]) || 20;
  const byBucket = new Map();
  for (const r of IDX) {
    if (!byBucket.has(r[2])) byBucket.set(r[2], []);
    byBucket.get(r[2]).push(r);
  }
  const out = {};
  for (const rows of byBucket.values()) {
    const step = Math.max(1, Math.floor(rows.length / n));
    for (let i = 0; i < rows.length && Object.keys(out).length < 1e5; i += step) {
      const r = rows[i];
      out[r[0]] = chain(r).find(k => ART.has(k)) || null;
    }
  }
  console.log(JSON.stringify(out));
  process.exit(0);
}

const used = new Map();
let bare = 0;
for (const r of IDX) {
  const hit = chain(r).find(k => ART.has(k));
  if (!hit) { bare++; continue; }
  used.set(hit, (used.get(hit) || 0) + 1);
}
const unused = [...ART].filter(k => !used.has(k)).sort();
console.log(`entries                          : ${IDX.length}`);
console.log(`art files on disk                : ${ART.size}`);
console.log(`files SHOWN on at least one page : ${used.size}  (${(used.size / ART.size * 100).toFixed(1)}%)`);
console.log(`files never shown                : ${unused.length}`);
console.log(`entries with NO art at all       : ${bare}`);
if (unused.length) {
  const byShape = {};
  for (const k of unused) { const s = k.replace(/-\d+$/, ""); byShape[s] = (byShape[s] || 0) + 1; }
  console.log("\nnever shown, by key family:");
  for (const [k, n] of Object.entries(byShape).sort((a, b) => b[1] - a[1]).slice(0, 25))
    console.log(`  ${String(n).padStart(4)}  ${k}`);
}
const top = [...used.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log("\nbusiest images: " + top.map(([k, n]) => `${k}:${n}`).join("  "));
process.exit(bare ? 1 : 0);
