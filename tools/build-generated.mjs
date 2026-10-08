/* Builds the GENERATED files that are no longer committed: api/ (the public JSON API) and data/ask-index.json (the Ask retrieval index).
 *
 * WHY: both are pure functions of data/index.js + data/cat/*.js. Committing them put ~260 MB of the repo's 953 MB history (and ~10-15 MB per release) into git, and
 * data/ask-index.json (87 MB) was heading for GitHub's 100 MiB per-file limit. Netlify now runs this as the build command (netlify.toml [build] command); locally run
 *   node tools/build-generated.mjs
 * before opening the site or running tools/check-ask.mjs / tools/check-api.mjs. See SIZE-PLAN.md.
 *
 * It FAILS LOUDLY (non-zero exit -> Netlify keeps the previous deploy live) if either output is missing or implausibly small. */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(process.argv[2] || ".");
const run = (script) => { console.log(`\n> node ${script} .`); execFileSync(process.execPath, ["--max-old-space-size=3072", path.join(ROOT, "tools", script), ROOT], { stdio: "inherit", cwd: ROOT }); };
const t0 = Date.now();
run("gen-api.mjs");
run("gen-ask-index.mjs");
run("gen-cat-shards.mjs");
run("check-shards.mjs");        // the shards must be exactly the whole-category files, split — a mismatch fails the build and the previous deploy stays live

const fail = (m) => { console.error("\nBUILD-GENERATED FAILED: " + m); process.exit(1); };
const idx = path.join(ROOT, "data", "ask-index.json");
if (!fs.existsSync(idx)) fail("data/ask-index.json was not written");
const askSize = fs.statSync(idx).size;
if (askSize < 2e6) fail(`data/ask-index.json is only ${(askSize / 1e6).toFixed(1)} MB (expected ~10 MB)`);
const binPath = path.join(ROOT, "data", "ask-postings.bin.gz");
if (!fs.existsSync(binPath)) fail("data/ask-postings.bin.gz was not written");
const binSize = fs.statSync(binPath).size;
if (binSize < 3e6) fail(`data/ask-postings.bin.gz is only ${(binSize / 1e6).toFixed(1)} MB (expected ~8 MB)`);
const head = JSON.parse(fs.readFileSync(idx, "utf8").slice(0, 400).replace(/,"docs":.*$/s, "}"));
const rawBin = zlib.gunzipSync(fs.readFileSync(binPath));
if (head.postingsBytes !== rawBin.length) fail(`ask-postings.bin.gz holds ${rawBin.length} bytes but the index expects ${head.postingsBytes}`);
if (!(head.N > 40000)) fail(`ask-index covers only ${head.N} documents`);
const apiIndex = path.join(ROOT, "api", "v1", "index.json");
if (!fs.existsSync(apiIndex)) fail("api/v1/index.json was not written");
const nEntries = fs.readdirSync(path.join(ROOT, "api", "v1", "entries")).length;
if (nEntries < 40000) fail(`api/v1/entries has only ${nEntries} files`);
console.log(`\nbuild-generated OK in ${((Date.now() - t0) / 1000).toFixed(0)}s: ask-index ${(askSize / 1e6).toFixed(1)} MB + postings ${(binSize / 1e6).toFixed(1)} MB (${head.N} docs), api ${nEntries} entry files`);
