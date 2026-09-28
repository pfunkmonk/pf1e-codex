/* PF1e Codex "Ask" — an AI FAQ over the Codex's own rules text (RAG: lexical retrieval + Claude).
 *
 * The Codex is otherwise a static, no-backend, no-API-key site by design (see HANDOFF.md /
 * memory pf1e-codex). This is the one deliberate exception: an LLM key can never live in the
 * browser, so it lives here, in a Netlify Function, read from the CODEX_ASK_API_KEY environment
 * variable (Site settings → Environment variables in the Netlify dashboard — encrypted at rest,
 * injected only into this server-side function, never shipped to a client bundle).
 *
 * RETRIEVAL. Loads data/ask-index.json (built by tools/gen-ask-index.mjs) once per warm function
 * instance and keeps it in module scope. Scoring is BM25, OR-style across query terms (any term
 * can contribute; IDF makes a common word contribute almost nothing on its own) plus an exact
 * entry-name match boost, so a direct "what does X do" question always surfaces X even if X's
 * own body text is short. See the header comment in gen-ask-index.mjs for why this beats an
 * embeddings/vector approach for this corpus, and the tth-ask-rules-lookup memory for the AND-vs-OR
 * bug this design exists to avoid.
 *
 * GROUNDING. The model only ever sees the retrieved entries' actual body text (fetched fresh from
 * this site's own public api/v1/entries/<id>.json — the same data every reader sees) and is told
 * to say so, not invent, when the retrieved text doesn't answer the question. The client always
 * gets back the exact list of entries used, so an answer is never uncheckable.
 *
 * COST / ABUSE GUARDS (see HANDOFF.md for the full writeup):
 *   - Netlify's own platform rate limit (the `rateLimit` field in `config` below) — edge-enforced,
 *     real protection against a distributed bot, unlike the in-function rateLimited() further down.
 *   - honeypot + minimum time-on-page, checked below (paired with the hidden field in app.js's
 *     viewAsk) — stops a scripted browser filling the actual form, not a direct POST to this URL.
 *   - question length capped, max_tokens capped on the Claude call, same-origin Origin check.
 *   - NONE of the above caps total dollars — only Anthropic's own (monthly-only) spend limit does
 *     that, console.anthropic.com → Settings → Plans & Billing → Spending Limits. Manual, owner-only.
 */

const MODEL = "claude-sonnet-5";
const MAX_ANSWER_TOKENS = 500;
const TOP_K = 8;
const MIN_TERM_LEN = 2;
const RATE_LIMIT = { windowMs: 5 * 60 * 1000, max: 8 };   // per IP, per warm instance

// Bundling data/ask-index.json directly into this function (netlify.toml `included_files`) was
// tried and reverted: it made Netlify's local bundler crash on this machine (Windows-specific
// EBUSY copying the 66 MB file) and, since the same bundling step runs at deploy time too, an
// equivalent failure there would break EVERY future deploy of the whole site, not just Ask — too
// large a risk for a latency win. Fetching over HTTP instead is proven working end to end (only
// a cold start pays the cost; a warm instance reuses this cached promise). If cold-start latency
// turns out to matter in production, retry the bundling approach on Netlify's own (Linux) build
// first, never assume it will behave the same as this Windows checkout.
let indexPromise = null;
async function loadIndex(origin) {
  if (!indexPromise) {
    indexPromise = fetch(`${origin}/data/ask-index.json`)
      .then((r) => { if (!r.ok) throw new Error(`ask-index fetch ${r.status}`); return r.json(); })
      .catch((e) => { indexPromise = null; throw e; });   // don't cache a failure forever
  }
  return indexPromise;
}

// Must match tools/gen-ask-index.mjs's tokenizer exactly, or query terms never hit the postings
// built at index time. Kept in sync by hand (see that file's header for why it isn't a shared
// import) — if you change one, change both and rebuild the index.
function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length >= MIN_TERM_LEN);
}

function bm25(index, queryTerms) {
  const { N, avgLen, postings, docs } = index;
  const k1 = 1.5, b = 0.75;
  const scores = new Map();
  for (const t of new Set(queryTerms)) {
    const plist = postings[t];
    if (!plist) continue;
    const df = plist.length;
    const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    for (const [docIdx, tf] of plist) {
      const len = docs[docIdx][4];
      const denom = tf + k1 * (1 - b + b * (len / avgLen));
      scores.set(docIdx, (scores.get(docIdx) || 0) + idf * ((tf * (k1 + 1)) / denom));
    }
  }
  return scores;
}

function idfOf(index, term) {
  const p = index.postings[term]; const df = p ? p.length : 0;
  return Math.log(1 + (index.N - df + 0.5) / (df + 0.5));
}
// Does `needle` (an array of tokens) appear as a contiguous run inside `hay`?
function containsContiguous(hay, needle) {
  if (!needle.length) return false;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}
const NAME_BOOST_SCALE = 4;
function retrieve(index, question) {
  const qTokens = tokenize(question);
  const scores = bm25(index, qTokens);

  // Exact-name boost: a direct "what does <name> do" question must surface <name> even if its
  // body is short and loses on raw term frequency to a longer, loosely-related entry. Matched by
  // TOKEN, not character-substring — a raw q.includes(name) check let "King" match inside
  // "flanking" and "Heir" match inside "their" (found by testing against real questions before
  // shipping this). Scaled by the SUM of the name's own tokens' idf (same rarity measure as
  // bm25(), not a flat bonus), so a name that also happens to be a generic word ("Rules", "Attack")
  // barely gets boosted while a specific one (Flanking, Grapple, a multi-word name) gets a real one.
  for (let i = 0; i < index.docs.length; i++) {
    const nameTokens = tokenize(index.docs[i][1]);
    if (!nameTokens.length) continue;
    if (containsContiguous(qTokens, nameTokens)) {
      const sumIdf = nameTokens.reduce((s, t) => s + idfOf(index, t), 0);
      scores.set(i, (scores.get(i) || 0) + NAME_BOOST_SCALE * sumIdf);
    }
  }

  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_K).map(([i]) => index.docs[i]);
}

const rateLimitState = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const e = rateLimitState.get(ip);
  if (!e || now - e.windowStart > RATE_LIMIT.windowMs) { rateLimitState.set(ip, { windowStart: now, count: 1 }); return false; }
  e.count++;
  return e.count > RATE_LIMIT.max;
}

const SYSTEM_PROMPT = `You answer Pathfinder 1st-edition rules questions using ONLY the rules passages provided below — never your own memory of the rules, which may not match this specific ruleset or house-ruled content mixed into it.

Rules for the answer:
- Lead with the rule itself and its exact numbers. Don't restate the question or add a preamble.
- If the question is about a set of things (light levels, size categories, degrees of cover, etc.), list every member you were given and say how many there are.
- Always state the rule's limits — uses per round/day, the action it costs, range, conditions required. A limit is part of the rule; omitting it makes the answer wrong at the table.
- If the provided passages don't state a limit (or don't answer the question at all), say so plainly instead of inventing one. Never fabricate a rule, number, or exception that isn't in the text you were given.
- Keep it under 150 words. Depth belongs in a follow-up question, not this answer.
- Refer to entries by name so the reader can match your answer to the citations shown alongside it.`;

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const origin = new URL(req.url).origin;
  const reqOrigin = req.headers.get("origin");
  if (reqOrigin && new URL(reqOrigin).host !== new URL(origin).host) return json({ error: "cross-origin request rejected" }, 403);

  const ip = context.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  if (rateLimited(ip)) return json({ error: "Too many questions in a short time — wait a few minutes and try again." }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: "expected JSON body" }, 400); }
  // Honeypot + minimum time-on-page: a browser that filled the hidden field, or submitted before a
  // person could plausibly have read the prompt and typed a question, is a bot. Rejected quietly
  // (a plain 400, no distinguishing message) rather than run retrieval or spend an API call on it.
  if (String(body?.hp || "")) return json({ error: "rejected" }, 400);
  if (typeof body?.ms === "number" && body.ms < 1200) return json({ error: "rejected" }, 400);
  const question = String(body?.question || "").trim();
  if (question.length < 4) return json({ error: "ask a real question" }, 400);
  if (question.length > 300) return json({ error: "question too long (300 characters max)" }, 400);
  if (!process.env.CODEX_ASK_API_KEY) return json({ error: "Ask isn't configured yet (no API key set)." }, 503);

  let index;
  try { index = await loadIndex(origin); } catch (e) { return json({ error: "retrieval index unavailable: " + e.message }, 500); }

  const hits = retrieve(index, question);
  if (!hits.length) return json({ answer: "Nothing in the Codex matches that — try different words, or use the search bar for a name.", citations: [] });

  let entries;
  try {
    entries = await Promise.all(hits.map(async ([id]) => {
      const r = await fetch(`${origin}/api/v1/entries/${id}.json`);
      if (!r.ok) return null;
      return r.json();
    }));
  } catch (e) { return json({ error: "couldn't load the matched entries: " + e.message }, 500); }
  entries = entries.filter(Boolean);
  if (!entries.length) return json({ error: "matched entries failed to load" }, 500);

  const context_block = entries.map((e) => `### ${e.name} [${e.bucket}] (${e.source})\n${e.body}`).join("\n\n");

  let answer;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.CODEX_ASK_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_ANSWER_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: `Question: ${question}\n\nRules passages:\n${context_block}` }],
      }),
    });
    if (!r.ok) { const t = await r.text(); return json({ error: `Claude API error ${r.status}: ${t.slice(0, 300)}` }, 502); }
    const data = await r.json();
    answer = (data.content || []).map((c) => c.text || "").join("").trim();
  } catch (e) { return json({ error: "Claude API call failed: " + e.message }, 502); }

  return json({
    answer: answer || "No answer came back — try rephrasing the question.",
    citations: entries.map((e) => ({ id: e.id, name: e.name, bucket: e.bucket, source: e.source })),
  });
};

// Deliberately NOT under /api/* — that path already carries a public, CORS-open,
// cached-for-everyone header block (netlify.toml) meant for the static read-only JSON API. This
// endpoint is same-origin-only, per-request dynamic, and must never be cached.
//
// rateLimit is Netlify's own platform feature (docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting),
// enforced at the edge before a request even reaches this function's code — real protection against
// a distributed bot, unlike the in-function rateLimited() above, which only holds state per warm
// container and a caller spread across cold starts can exceed. 6 requests/60s per IP is generous
// for a person asking a follow-up and blocks sustained hammering. windowSize's platform max is 180s,
// which is why this can't ALSO be a daily cap — see HANDOFF.md for the actual daily/dollar backstop.
export const config = {
  path: "/ask",
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ["ip"], action: "block" },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
