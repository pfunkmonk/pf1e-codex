/* Merge item judgments (one JSON object per line, written by reading each item) into tools/treasure/judgments.json.
 *
 * The judgments are the one place the treasure tags are NOT a pure function of the Codex data: for each item someone read the entry and decided its themes, ethos, role,
 * whether a traveller would carry it, and (rarely) a corrected class or "this is not an item". tools/lib/treasure-tags.mjs applies them over its keyword rules.
 *
 * Usage:  node tools/treasure/merge-judgments.mjs <chunkDir> <outDir> [--write]
 *   chunkDir : the chunk-NN.jsonl INPUT files that were handed out (every id in them must come back exactly once)
 *   outDir   : the out-NN.jsonl files that came back
 * Without --write it only reports. It never discards a judgment already in judgments.json unless the new file covers that id.
 */
import fs from "node:fs";
import path from "node:path";
import { THEMES, ETHOS, ITEM_CLASSES } from "../lib/treasure-tags.mjs";

const [chunkDir, outDir] = process.argv.slice(2);
const WRITE = process.argv.includes("--write");
if (!chunkDir || !outDir) { console.error("usage: merge-judgments.mjs <chunkDir> <outDir> [--write]"); process.exit(2); }
const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const FILE = path.join(HERE, "judgments.json");
const ROLE = new Set(["combat", "caster", "both", "utility"]);

const input = new Map();   // id -> input line (the suggestion the reader saw)
for (const f of fs.readdirSync(chunkDir).filter((x) => /^chunk-\d+\.jsonl$/.test(x)).sort())
  for (const l of fs.readFileSync(path.join(chunkDir, f), "utf8").split("\n").filter(Boolean)) { const o = JSON.parse(l); input.set(o.id, o); }

const got = new Map(), dup = [], unknown = [], parseErr = [];
for (const f of fs.readdirSync(outDir).filter((x) => /^out-\d+\.jsonl$/.test(x)).sort()) {
  for (const l of fs.readFileSync(path.join(outDir, f), "utf8").split("\n").filter((x) => x.trim())) {
    let o; try { o = JSON.parse(l); } catch { parseErr.push(f + ": " + l.slice(0, 80)); continue; }
    if (!input.has(o.id)) { unknown.push(o.id); continue; }
    if (got.has(o.id)) dup.push(o.id);
    got.set(o.id, o);
  }
}
const missing = [...input.keys()].filter((id) => !got.has(id));

const stats = { judged: 0, skip: 0, kitFlip: 0, clsChange: 0, roleChange: 0, themeAgree: 0, themeDiffer: 0, droppedThemes: 0, droppedEthos: 0, cappedThemes: 0, badCls: 0, badRole: 0 };
const cur = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, "utf8")) : { items: {} };
const items = { ...cur.items };
for (const [id, o] of got) {
  const src = input.get(id);
  const themes = (Array.isArray(o.themes) ? o.themes : []).filter((t) => { const ok = !!THEMES[t]; if (!ok) stats.droppedThemes++; return ok; });
  const uniqThemes = [...new Set(themes)];
  if (uniqThemes.length > 3) stats.cappedThemes++;
  const ethos = (Array.isArray(o.ethos) ? o.ethos : []).filter((e) => { const ok = !!ETHOS[e]; if (!ok) stats.droppedEthos++; return ok; });
  const j = { n: src.name, themes: uniqThemes.slice(0, 3), ethos: [...new Set(ethos)] };
  if (o.skip === true) { j.skip = true; stats.skip++; }
  if (typeof o.kit === "boolean" && o.kit !== src.kit) { j.kit = o.kit; stats.kitFlip++; }
  if (o.cls) { if (ITEM_CLASSES.includes(o.cls)) { if (o.cls !== src.cls) { j.cls = o.cls; stats.clsChange++; } } else stats.badCls++; }
  if (o.role) { if (ROLE.has(o.role)) { if (o.role !== src.role) { j.role = o.role; stats.roleChange++; } } else stats.badRole++; }
  const a = [...src.guess].sort().join(","), b = [...j.themes].sort().join(",");
  a === b ? stats.themeAgree++ : stats.themeDiffer++;
  items[id] = j; stats.judged++;
}

console.log(`input ${input.size} | returned ${got.size} | missing ${missing.length} | duplicate ${dup.length} | unknown ids ${unknown.length} | unparseable ${parseErr.length}`);
console.log(JSON.stringify(stats));
if (missing.length) console.log("missing e.g.", missing.slice(0, 5).map((id) => input.get(id).name).join(" ; "));
if (parseErr.length) console.log("unparseable e.g.", parseErr.slice(0, 3).join(" || "));
if (missing.length || unknown.length || parseErr.length) { console.log("NOT writing: fix the above first."); process.exit(1); }
if (WRITE) {
  const sorted = Object.keys(items).sort();
  const text = '{"about":"Item judgments for the treasure tags: themes (max 3), ethos, and optional role/kit/cls/skip overrides, decided by reading each entry. See tools/treasure/README.md.","items":{\n' +
    sorted.map((id) => JSON.stringify(id) + ":" + JSON.stringify(items[id])).join(",\n") + "\n}}\n";
  fs.writeFileSync(FILE, text);
  console.log(`wrote ${sorted.length} judgments to ${FILE}`);
}
