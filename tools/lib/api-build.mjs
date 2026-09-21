/* Builds the read-only JSON API from the Codex data files. Pure: returns a Map of
 * relative path -> file text and touches nothing on disk.
 *
 * WHY A SHARED MODULE. tools/gen-api.mjs writes what this returns and tools/check-api.mjs
 * re-derives it and compares against disk. If each kept its own copy of the logic, "generated ==
 * committed" would be a comparison of two guesses, and this repo already knows what that costs
 * (the art resolution chain, written out five times, has drifted every time).
 *
 * THE API IS STATIC. The Codex is a no-backend, no-build site published straight from the repo
 * root, so the API is pre-generated JSON served by the same Netlify site. No functions, no
 * database, nothing to keep running. That also means it is PUBLIC and READ-ONLY by construction —
 * the same data the site already serves, just addressable.
 *
 * OUTPUT (all under api/v1/):
 *   index.json           manifest: version, totals, per-bucket + per-category counts, endpoints
 *   <bucket>.json        every entry in a bucket, lightweight (no body), one entry per line
 *   names.json           [id, name, bucket] for every entry — one small file for cross-bucket lookup
 *   entries/<id>.json    one entry in full: body text plus any tables
 * and api/index.html, a human-readable page whose numbers and example come from the same data.
 *
 * DETERMINISM. Nothing here may depend on the clock, the locale or object insertion order that
 * differs between runs. Sorting uses plain code-unit comparison (never localeCompare, which varies
 * by machine) and there is no timestamp, so a re-run over unchanged data is byte-identical and
 * git sees nothing. `dataVersion` (the cache token) says which data release a file came from.
 */
import fs from "node:fs";
import path from "node:path";

export const SITE = "https://codex.pipsprojects.com";
export const API_ROOT = "api/v1";

// The notice the site already prints in its footer, carried on every response so a single
// entry copied out of context still travels with its licence.
export const NOTICE =
  "PF1e Codex is an unofficial, noncommercial fan reference and is not published, endorsed, or " +
  "specifically approved by Paizo Inc. Pathfinder and associated marks are owned by Paizo Inc. " +
  "Rules content is used under the Open Game License 1.0a.";
export const LICENSE = "OGL 1.0a";

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const byNameThenId = (a, b) => cmp(a.name.toLowerCase(), b.name.toLowerCase()) || cmp(a.id, b.id);

/* ---------- read the data ------------------------------------------------------------------ */
export function loadCodex(root) {
  globalThis.window = {};
  const ev = (f) => (0, eval)(fs.readFileSync(path.join(root, f), "utf8"));
  ev("data/index.js"); ev("data/meta.js"); ev("data/tables.js");
  const IDX = globalThis.window.PF_INDEX;
  const META = globalThis.window.PF_META;
  const TABLES = globalThis.window.PF_TABLES;

  const buckets = [...new Set(IDX.map((r) => r[2]))].sort(cmp);
  const BODIES = {};
  globalThis.window.PF_REG = (slug, map) => { BODIES[slug] = map; };
  for (const b of buckets) ev(`data/cat/${b}.js`);

  const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

  // The app hides a handful of scraped index pages ("1st Level" ... "9th Level") from browse and
  // search. The API must expose exactly what the app does, so the predicate is lifted out of
  // app.js rather than re-typed. If someone reshapes that function this fails loudly instead of
  // quietly leaking junk pages into a public API.
  const jm = /function isJunkEntry\(r\)\{([^}]*)\}/.exec(app);
  if (!jm) throw new Error("isJunkEntry() not found in app.js — the API filter cannot be derived");
  const junkFn = new Function("r", "I_SLUG", "I_NAME", jm[1]);
  const isJunk = (r) => !!junkFn(r, 2, 1);

  const vm = /var DATA_V\s*=\s*"([^"]+)"/.exec(app);
  if (!vm) throw new Error("DATA_V not found in app.js");

  const labels = {};
  for (const g of META.groups || []) for (const c of g.cats) labels[c.slug] = c.label;

  return { IDX, META, TABLES, BODIES, buckets, isJunk, labels, dataVersion: vm[1] };
}

/* ---------- serialisation helpers ---------------------------------------------------------- */
const pretty = (o) => JSON.stringify(o, null, 2) + "\n";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** One entry per line inside a small wrapper, so git diffs of a 3 MB list stay readable. */
function lineList(head, key, rows) {
  const h = JSON.stringify(head);
  return h.slice(0, -1) + `,"${key}":[\n` + rows.map((r) => JSON.stringify(r)).join(",\n") + "\n]}\n";
}

/** PF_TABLES stores {r: rows, hdr: bool}. Kept faithful — the header row stays in `rows` — so
 *  nothing is lost and the row count can be checked against the source exactly. */
const tablesOf = (T) => (T || []).map((t) => ({ headerRow: !!t.hdr, rows: t.r }));

/* ---------- build -------------------------------------------------------------------------- */
export function buildApi(root) {
  const d = loadCodex(root);
  const files = new Map();
  const put = (rel, text) => files.set(rel, text);

  const rows = d.IDX.filter((r) => !d.isJunk(r));
  const hidden = d.IDX.length - rows.length;

  const shape = (r) => {
    const facets = r[6] || {};
    return {
      id: r[0], name: r[1], bucket: r[2], category: r[3], source: r[4],
      book: facets.bk || "", facets,
    };
  };

  const perBucket = {};
  for (const r of rows) (perBucket[r[2]] ||= []).push(r);

  const manifestBuckets = [];
  const names = [];
  let tableCount = 0, tableRows = 0;
  const bodyLayout = { nameFirst: 0, sourceFirst: 0, other: 0 };
  const stem = (x) => String(x).toLowerCase().replace(/\s*\((?:su|ex|sp)[^)]*\)\s*$/i, "").replace(/[^a-z0-9]+/g, " ").trim();

  for (const b of d.buckets) {
    const list = (perBucket[b] || []).map((r) => ({ ...shape(r), snippet: r[5] || "" }));
    list.sort(byNameThenId);

    const cats = {};
    for (const e of list) cats[e.category] = (cats[e.category] || 0) + 1;
    const catSorted = Object.fromEntries(Object.entries(cats).sort((a, c) => cmp(a[0], c[0])));

    manifestBuckets.push({ slug: b, label: d.labels[b] || b, count: list.length,
                           list: `${b}.json`, categories: catSorted });

    put(`${API_ROOT}/${b}.json`, lineList(
      { bucket: b, label: d.labels[b] || b, count: list.length, dataVersion: d.dataVersion,
        license: LICENSE, notice: NOTICE },
      "entries", list.map(({ bucket, ...rest }) => rest)));           // bucket is in the header

    for (const e of list) {
      const body = d.BODIES[b] && d.BODIES[b][e.id];
      if (typeof body !== "string" || !body.trim())
        throw new Error(`entry ${e.id} (${b}/${e.name}) is in the index but has no body`);

      const firstLine = body.split("\n")[0].trim();
      if (stem(firstLine) === stem(e.name)) bodyLayout.nameFirst++;
      else if (/^Source\s/i.test(firstLine)) bodyLayout.sourceFirst++;
      else bodyLayout.other++;

      const tabs = tablesOf(d.TABLES[e.id]);
      if (tabs.length) { tableCount += tabs.length; tableRows += tabs.reduce((n, t) => n + t.rows.length, 0); }

      // The snippet is a list-view teaser; the full entry has the whole body, so drop it here.
      const { snippet, ...head } = e;
      const entry = { ...head };
      entry.body = body;
      if (tabs.length) entry.tables = tabs;
      entry.links = { api: `${SITE}/${API_ROOT}/entries/${e.id}.json`, web: `${SITE}/#/e/${e.id}` };
      entry.license = LICENSE;
      put(`${API_ROOT}/entries/${e.id}.json`, pretty(entry));

      names.push([e.id, e.name, b]);
    }
  }

  names.sort((a, c) => cmp(a[1].toLowerCase(), c[1].toLowerCase()) || cmp(a[0], c[0]));
  put(`${API_ROOT}/names.json`,
      `{"count":${names.length},"dataVersion":${JSON.stringify(d.dataVersion)},"fields":["id","name","bucket"],"rows":[\n` +
      names.map((n) => JSON.stringify(n)).join(",\n") + "\n]}\n");

  const manifest = {
    name: "PF1e Codex API",
    apiVersion: 1,
    dataVersion: d.dataVersion,
    site: SITE,
    base: `${SITE}/${API_ROOT}`,
    docs: `${SITE}/api/`,
    license: LICENSE,
    notice: NOTICE,
    totals: { entries: rows.length, buckets: manifestBuckets.length, tables: tableCount, bodyLayout },
    endpoints: {
      manifest: "/api/v1/index.json",
      list: "/api/v1/{bucket}.json",
      names: "/api/v1/names.json",
      entry: "/api/v1/entries/{id}.json",
      web: "/#/e/{id}",
    },
    notes: [
      "Read-only static JSON; there is no query string. Filter lists client-side.",
      "Entry ids are opaque and stable for as long as the underlying data is not rebuilt; dataVersion changes with every data release.",
      "body is the entry text exactly as the Codex stores it, and its layout is NOT uniform: some begin with the entry name, many with a Source line, and many with something carried over from the original page (a breadcrumb such as 'Rules Index | GM Screen', a subtitle, or intro prose). totals.bodyLayout gives the measured split. Read the structured fields — name, source, book, facets — rather than parsing the first lines of body.",
      "The API exposes exactly what the site's browse and search expose; scraped index pages the site hides are omitted here too.",
    ],
    buckets: manifestBuckets,
  };
  put(`${API_ROOT}/index.json`, pretty(manifest));

  put("api/index.html", docsPage({ manifest, rows, d, hidden, tableRows }));

  return { files, manifest, stats: { entries: rows.length, hidden, tableCount, tableRows,
                                      dataVersion: d.dataVersion } };
}

/* ---------- human-readable docs ------------------------------------------------------------ */
function docsPage({ manifest, rows, d }) {
  const example = rows.find((r) => r[2] === "spells" && r[1] === "Fireball") ||
                  rows.find((r) => r[2] === "spells");
  const eBody = d.BODIES[example[2]][example[0]];
  const sample = {
    id: example[0], name: example[1], bucket: example[2], category: example[3],
    source: example[4], book: (example[6] || {}).bk || "", facets: example[6] || {},
    body: eBody.length > 170 ? eBody.slice(0, 170) + "…" : eBody,
    links: { api: `${SITE}/${API_ROOT}/entries/${example[0]}.json`, web: `${SITE}/#/e/${example[0]}` },
    license: LICENSE,
  };
  const base = manifest.base;
  const rowsHtml = manifest.buckets.map((b) =>
    `<tr><td><code>${esc(b.slug)}</code></td><td>${esc(b.label)}</td><td class="n">${b.count.toLocaleString("en-US")}</td>` +
    `<td><a href="/api/v1/${esc(b.list)}">${esc(b.list)}</a></td></tr>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PF1e Codex API</title>
<style>
:root{--bg:#fbf8f2;--fg:#231f1a;--mut:#6b6358;--card:#fff;--line:#ddd3c2;--acc:#8a5a10;--code:#f1ebdf}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15130f;--fg:#ece5d8;--mut:#a39a8a;--card:#1e1b16;--line:#3a352b;--acc:#e0a94f;--code:#26221b}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:860px;margin:0 auto;padding:2rem 1.25rem 4rem}
h1{font-size:1.9rem;margin:.2rem 0}h2{margin-top:2.2rem;border-bottom:1px solid var(--line);padding-bottom:.3rem}
a{color:var(--acc)}code,pre{background:var(--code);border-radius:6px;font:14px/1.5 ui-monospace,Consolas,monospace}
code{padding:.1rem .35rem}pre{padding:.9rem 1rem;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:.95rem}th,td{text-align:left;padding:.4rem .6rem;border-bottom:1px solid var(--line)}
td.n{text-align:right;font-variant-numeric:tabular-nums}.mut{color:var(--mut)}
.wrap{overflow-x:auto}.box{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:1rem 1.2rem}
</style>
</head>
<body>
<main>
<p class="mut"><a href="/">&larr; PF1e Codex</a></p>
<h1>PF1e Codex API</h1>
<p>Read-only JSON for all <strong>${manifest.totals.entries.toLocaleString("en-US")}</strong> entries in the Codex &mdash;
classes, spells, feats, monsters, items, rules and more. No key, no sign-up, and CORS is open, so it works
from a browser as well as a script.</p>
<p class="mut">Data release <code>${esc(manifest.dataVersion)}</code> &middot; base URL <code>${esc(base)}</code></p>

<h2>Endpoints</h2>
<div class="wrap"><table>
<tr><th>Path</th><th>Returns</th></tr>
<tr><td><a href="/api/v1/index.json"><code>/api/v1/index.json</code></a></td><td>Manifest: totals, every bucket and its categories with counts.</td></tr>
<tr><td><code>/api/v1/{bucket}.json</code></td><td>Every entry in a bucket &mdash; id, name, category, source, facets and a short snippet. No body.</td></tr>
<tr><td><a href="/api/v1/names.json"><code>/api/v1/names.json</code></a></td><td>Just <code>[id, name, bucket]</code> for all entries &mdash; one small file for looking a name up across buckets.</td></tr>
<tr><td><code>/api/v1/entries/{id}.json</code></td><td>One entry in full: the body text, plus any tables.</td></tr>
</table></div>

<h2>Buckets</h2>
<div class="wrap"><table>
<tr><th>bucket</th><th>What</th><th class="n">Entries</th><th>List</th></tr>
${rowsHtml}
</table></div>

<h2>Examples</h2>
<pre>curl ${esc(base)}/index.json

# find an entry by name, then fetch it
curl -s ${esc(base)}/names.json | jq '.rows[] | select(.[1]=="${esc(example[1])}")'
curl -s ${esc(base)}/entries/${esc(example[0])}.json</pre>
<pre>const list = await (await fetch("${esc(base)}/spells.json")).json();
const hit  = list.entries.find(e =&gt; e.name === "${esc(example[1])}");
const full = await (await fetch("${esc(base)}/entries/" + hit.id + ".json")).json();
console.log(full.body);</pre>

<h2>An entry</h2>
<pre>${esc(JSON.stringify(sample, null, 2))}</pre>
<p><code>body</code> is the entry text exactly as the Codex stores it. <strong>Its layout is not uniform</strong> &mdash;
some bodies begin with the entry&rsquo;s name, many with a <code>Source</code> line, and many with something carried over
from the original page (a breadcrumb like <code>Rules Index | GM Screen</code>, a subtitle, or intro prose); the manifest&rsquo;s
<code>totals.bodyLayout</code> has the measured split. Use the structured fields
(<code>name</code>, <code>source</code>, <code>book</code>, <code>facets</code>) rather than parsing the first lines of the body.
<code>facets</code> varies by bucket
(spells carry <code>sch</code> school, <code>lv</code> level per class and so on; most carry <code>bk</code>, the book).
Entries with tables &mdash; the Summon Monster spells, class progressions &mdash; also have a <code>tables</code> array of
<code>{ headerRow, rows }</code>; when <code>headerRow</code> is true the first row is the header.
<code>links.web</code> opens the same entry in the app.</p>

<h2>Things to know</h2>
<ul>
<li><strong>IDs are opaque.</strong> They stay put as long as the underlying data is not rebuilt. Store the id together with the name, and re-resolve through <code>names.json</code> if a lookup ever misses.</li>
<li><strong>Versioning.</strong> <code>dataVersion</code> changes with every data release. Responses may be cached for a few minutes.</li>
<li><strong>Same view as the site.</strong> A few scraped index pages the site hides from browse and search are hidden here too.</li>
<li><strong>Be kind.</strong> It is static files on a CDN, so there is no rate limit &mdash; but bulk-pulling every entry is ~${(rows.length / 1000).toFixed(0)}k requests; fetch the bucket lists and only the entries you need.</li>
</ul>

<h2>Licence</h2>
<p class="mut">${esc(NOTICE)}</p>
</main>
</body>
</html>
`;
}
