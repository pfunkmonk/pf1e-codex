/* Print the borderline verdicts so a human (me, now; you, later) can judge them. */
import fs from "node:fs";
const SNAP = "D:/CODEX/d20-pilot";
const m = JSON.parse(fs.readFileSync(`${SNAP}/matches.json`, "utf8"));
const f = (x) => (x == null ? "  -  " : x.toFixed(2));
const line = (r) => {
  const t = r.third === true ? "3P" : r.third === false ? "  " : "??";
  const n = r.near || {};
  const mt = r.match;
  const tgt = mt ? `${mt.name} [${mt.bucket}]` : (n.name ? `(near) ${n.name} [${n.bucket}]` : "—");
  return `  ${t} ${r.bucket.padEnd(10)} ${r.title.slice(0, 34).padEnd(34)} -> ${tgt.slice(0, 40).padEnd(40)} name ${f(mt ? mt.nameSim : n.nameSim)} cos ${f(mt ? mt.cos : n.cos)} num ${f(mt ? mt.numJ : n.numJ)}`;
};
const pick = process.argv[2];
if (pick === "case") {                                   // specific titles
  for (const t of process.argv.slice(3)) for (const r of m.filter((x) => x.title === t)) console.log(`${r.verdict.padEnd(9)}`, line(r));
} else {
  const rows = m.filter((r) => r.verdict === pick);
  console.log(`=== ${pick}: ${rows.length} ===`);
  const limit = Number(process.argv[3] || 40);
  for (const r of rows.slice(0, limit)) console.log(line(r));
}
