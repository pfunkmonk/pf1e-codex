/* Show the head and tail of one sampled page per section, chrome included. Scratch aid. */
import fs from "node:fs";
const OUT = "D:/CODEX/d20-pilot";
const sample = JSON.parse(fs.readFileSync(`${OUT}/sample.json`, "utf8"));
const want = process.argv.slice(2).map((s) => "/" + s);
for (const sec of want) {
  const p = sample.filter((s) => s.section === sec && s.chars > 1500 && s.chars < 6000)[3] ||
            sample.find((s) => s.section === sec);
  if (!p) { console.log(`\n### ${sec}: none`); continue; }
  const lines = fs.readFileSync(`${OUT}/pages/${p.file}`, "utf8").split("\n");
  const nz = lines.map((l, i) => [i, l]).filter(([, l]) => l.trim());
  console.log(`\n################ ${sec}  —  ${p.title}   ${p.url.replace("https://www.d20pfsrd.com", "")}`);
  console.log("--- first 14 non-empty lines ---");
  for (const [i, l] of nz.slice(4, 18)) console.log(`${String(i).padStart(4)}| ${l.slice(0, 130)}`);
  if (process.env.TAIL) { console.log("--- last 16 non-empty lines ---");
  for (const [i, l] of nz.slice(-16)) console.log(`${String(i).padStart(4)}| ${l.slice(0, 110)}`); }
}
