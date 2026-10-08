/* Deploys the local art/ folder to the art Netlify site (pf1e-codex-art). The main site proxies /art/* to it (netlify.toml), so app code and the
 * Compendium's hot-linked URLs (https://codex.pipsprojects.com/art/<key>.webp) never change.
 *
 *   node tools/deploy-art.mjs            # prod deploy; Netlify uploads only files whose content changed
 *   node tools/deploy-art.mjs --draft    # deploy a preview URL instead
 *
 * art/ is NOT in git (SIZE-PLAN.md): it is the source of truth on this machine, and the art site holds the published copy. On a fresh clone run
 * node tools/sync-art.mjs first. Uses the already-authenticated Netlify CLI (no token to set up). */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const ART = path.join(ROOT, "art");
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "art-site.json"), "utf8"));
if (!fs.existsSync(ART)) { console.error("no art/ folder here — run tools/sync-art.mjs"); process.exit(1); }
// the public manifest the app uses must name only images that exist, and every image should be in the manifest
const manifest = fs.readFileSync(path.join(ROOT, "data", "art.js"), "utf8");
const keys = new Set([...manifest.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
const files = fs.readdirSync(ART).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5));
const missing = [...keys].filter((k) => !files.includes(k)), extra = files.filter((f) => !keys.has(f));
console.log(`art/: ${files.length} images | manifest names ${keys.size} | named but missing here: ${missing.length} | here but not in the manifest: ${extra.length}`);
if (missing.length) console.log("  (first missing: " + missing.slice(0, 5).join(", ") + ")");
fs.writeFileSync(path.join(ART, "_headers"), "/*\n  Cache-Control: public, max-age=604800\n  Access-Control-Allow-Origin: *\n");
const args = ["deploy", "--dir", ART, "--site", SITE.siteId, "--message", "art deploy " + new Date().toISOString().slice(0, 10)];
if (!process.argv.includes("--draft")) args.push("--prod");
execFileSync(process.platform === "win32" ? "netlify.cmd" : "netlify", args, { stdio: "inherit", shell: process.platform === "win32" });
