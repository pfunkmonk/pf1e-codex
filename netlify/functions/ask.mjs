/* PF1e Codex "Ask" — an AI FAQ over the Codex's own rules text (RAG: lexical retrieval + Claude).
 *
 * The Codex is otherwise a static, no-backend, no-API-key site by design (see HANDOFF.md /
 * memory pf1e-codex). This is the one deliberate exception: an LLM key can never live in the
 * browser, so it lives here, in a Netlify Function, read from the CODEX_ASK_API_KEY environment
 * variable (Site settings → Environment variables in the Netlify dashboard — encrypted at rest,
 * injected only into this server-side function, never shipped to a client bundle).
 *
 * RETRIEVAL. Loads data/ask-index.json (built by tools/gen-ask-index.mjs, FULL bodies, no per-doc
 * character cap) once per warm function instance and keeps it in module scope. Scoring is BM25,
 * OR-style across query terms (any term can contribute; IDF down-weights common words, plus a SHORT
 * question-scaffolding stoplist, QUERY_STOP — idf alone left "how/what/happen" as strong as the
 * content words) plus an exact entry-name match boost and a section-heading boost, so a direct "what does X do" question
 * always surfaces X even if X's own body text is short. See the header comment in gen-ask-index.mjs
 * for why this beats an embeddings/vector approach for this corpus, and the tth-ask-rules-lookup
 * memory for the AND-vs-OR bug this design exists to avoid.
 *
 * 2026-10-03 (retrieval review, tools/check-ask.mjs): a live test missed the core immediate-action rule
 * because "immediate action" never matched the entry "Immediate Actions" — no plural folding. Fixed
 * with stemming (index + query), a section-heading boost (a rule that lives as "Stunned:" inside
 * Conditions was ranked 205th), a query stoplist, and by SKIPPING an oversized entry instead of
 * stopping the whole pick at it. Measured on 77 source-verified questions: 68/77 -> 77/77 retrieved.
 *
 * 2026-09-28: retrieval used to stop at a flat top-8. Measured against a real miss (a question
 * about a rule that scored 26th, not because it was irrelevant but because a fixed count of 8 is
 * an arbitrary line), it's now a CHARACTER BUDGET (CONTEXT_CHAR_BUDGET) instead of a result count —
 * every candidate is added, highest-scored first, until the budget is spent, so a broad question
 * can pull in dozens of entries and a narrow one doesn't waste the budget padding with noise. This
 * is deliberately NOT "the entire 131 MB corpus in one prompt" — that's larger than any model's
 * context window and would cost accordingly on every single question — but it is no longer a small
 * hand-picked-feeling list either.
 *
 * GROUNDING. The model only ever sees the retrieved entries' actual, untruncated body text (fetched
 * fresh from this site's own public api/v1/entries/<id>.json — the same data every reader sees) and
 * is told to say so, not invent, when the retrieved text doesn't answer the question. The client
 * always gets back the exact list of entries used, so an answer is never uncheckable.
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
const MAX_ANSWER_TOKENS = 3000;   // a thorough answer, not a clipped one — see SYSTEM_PROMPT
const CONTEXT_CHAR_BUDGET = 200000;   // ~50k tokens of retrieved passages; see header comment
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
function stem(t) {
  if (t.length > 3 && t.endsWith("'s")) t = t.slice(0, -2);
  else if (t.endsWith("'")) t = t.slice(0, -1);
  if (t.length < 4) return t;
  if (t.endsWith("ies") && t.length > 4) return t.slice(0, -3) + "y";
  if (/(ss|us|is)$/.test(t)) return t;
  if (/(sses|ches|shes|xes|zes)$/.test(t)) return t.slice(0, -2);
  if (t.endsWith("s")) return t.slice(0, -1);
  return t;
}
function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[^a-z0-9']+/)
    .filter((t) => t.length >= MIN_TERM_LEN)
    .map(stem);
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
const SECTION_BOOST_SCALE = 1;   // 1, not higher: a bigger boost lifts whole chapters that then eat the context budget
// Question scaffolding and function words, removed from the QUERY's BM25 terms only (the index is
// untouched, and title/section matching still sees every token). idf alone does not neutralise
// them: measured on "How long can a character hold their breath, and what happens after that time
// runs out?", "happen" had idf 4.2 and "how"/"what" 2.6 each — as much as the content words "breath"
// (3.0) and "hold" (2.6) — so GM-advice pages full of "how/what/happens" outranked the Drowning rule
// 58th-deep. Words that can carry rules meaning ("use", "make", "action", "long", "time") are NOT here.
const QUERY_STOP = new Set(("how what when where which who whom whose why can could should would do does did is are was were be been am will shall may might must have has had " +
  "i me my you your we our they their them it its he she his her the a an of to in on at for with by from as that this these those if then than and or not no but so any some there here " +
  "happen work rule mean tell explain").split(" "));
function retrieve(index, question) {
  const qTokens = tokenize(question);
  const bmTerms = qTokens.filter((t) => !QUERY_STOP.has(t));
  const scores = bm25(index, bmTerms.length ? bmTerms : qTokens);

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

  // Section-term boost: the same idea one level down. A rule that lives as a section INSIDE a big
  // entry ("Stunned:" in Conditions, "Standard Actions" in Actions in Combat, "Disabled (0 Hit
  // Points)" in Injury and Death) was invisible to the title boost above, so those entries ranked
  // 60th–300th for the exact question they answer. tools/gen-ask-index.mjs records each entry's
  // section terms (rare ones only); a query containing one boosts that entry, scaled by rarity.
  for (let i = 0; i < index.docs.length; i++) {
    const terms = index.docs[i][6];
    if (!terms) continue;
    let best = 0;
    for (const term of terms) {
      const tt = term.split(" ");
      if (containsContiguous(qTokens, tt)) best = Math.max(best, tt.reduce((s, t) => s + idfOf(index, t), 0));
    }
    if (best) scores.set(i, (scores.get(i) || 0) + SECTION_BOOST_SCALE * best);
  }

  // Take candidates highest-scored first until CONTEXT_CHAR_BUDGET is spent, not a fixed count —
  // docs[i][5] is the doc's real body length, known from the index without fetching it first, so
  // this budgets accurately before a single api/v1/entries/ fetch happens. Always include at least
  // the top match even if it alone exceeds the budget (a single very long chapter entry).
  //
  // Deliberately NO relative-score cutoff here. A "drop anything below X% of the top score" filter
  // was tried and measured against six real questions before shipping: it didn't behave predictably
  // — for some questions it left ~94 candidates untouched even at a stricter threshold (no real
  // score cliff to find; broad-vocabulary questions decay smoothly, not sharply), for others it
  // correctly cut a clean list down to 4, and for a THIRD kind it would have re-introduced the exact
  // miss this whole change exists to fix. A lexical score alone can't reliably tell "loosely related"
  // from "irrelevant" across question shapes as well as the model reading the actual text can — so
  // that job is the system prompt's ("ignore passages that don't address the question"), not this
  // heuristic's. The budget is the one real ceiling, and it's generous.
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const picked = [];
  let spent = 0;
  for (const [i] of ranked) {
    const chars = index.docs[i][5] || 0;
    // SKIP an entry that no longer fits and keep going, don't stop: this used to `break`, so one
    // large high-ranked chapter (Combat is 168k characters) ended the list after 3–4 entries and
    // dropped every smaller, relevant one ranked below it.
    if (picked.length && spent + chars > CONTEXT_CHAR_BUDGET) { if (spent >= CONTEXT_CHAR_BUDGET - 500) break; continue; }
    picked.push(index.docs[i]);
    spent += chars;
  }
  return picked;
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

You were given a broad, unfiltered set of passages — a plain keyword search, not a hand-picked list. Many of them may only loosely relate to the question, or not address it at all; some may be genuinely on-topic follow-ups the asker didn't think to ask about yet. Use your own judgment to tell the difference: build the answer only from passages that actually bear on the question, and silently set the rest aside. Don't mention which passages you discarded or why.

Rules for the answer:
- Lead with the rule itself and its exact numbers. Don't restate the question or add a preamble.
- Be THOROUGH. This is a full answer, not a quick lookup — if the passages contain relevant exceptions, special cases, interacting rules, or related options, include them rather than trimming for brevity. Don't pad with irrelevant material, but don't cut relevant material short either.
- If the question is about a set of things (light levels, size categories, degrees of cover, etc.), list every member you were given and say how many there are.
- Always state every limit that applies — uses per round/day, the action it costs, range, conditions required. A limit is part of the rule; omitting it makes the answer wrong at the table.
- If the provided passages don't state a limit (or don't answer the question at all, or only partially answer it), say so plainly instead of inventing one. Never fabricate a rule, number, or exception that isn't in the text you were given.
- Use headers, short paragraphs, or a list when the answer covers more than one distinct point — make a long answer easy to scan, not a wall of text.
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

  // `entries` is already highest-scored first (retrieve()'s order, preserved through Promise.all).
  // The MODEL sees all of them — this cap is display-only. A broad question can retrieve 70-90
  // entries; the answer is built from whichever of those actually address the question (per the
  // system prompt), but showing 70+ citation chips is unreadable and defeats the point of citations
  // being something a reader can actually check. Shown highest-scored first, with an honest count of
  // what else was in context, rather than silently truncating and pretending that was everything.
  const CITATION_DISPLAY_CAP = 24;
  return json({
    answer: answer || "No answer came back — try rephrasing the question.",
    citations: entries.slice(0, CITATION_DISPLAY_CAP).map((e) => ({ id: e.id, name: e.name, bucket: e.bucket, source: e.source })),
    citationsOmitted: Math.max(0, entries.length - CITATION_DISPLAY_CAP),
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
// memory: found necessary in production, not guessed. Netlify Functions default to 1024 MB; the
// 86 MB raw ask-index.json balloons well past that once JSON.parse turns tens of millions of
// [docIndex, tf] postings into real JS arrays (V8 per-element overhead adds up fast at that count).
// Live evidence: every request after the full-corpus index shipped came back "An unknown error has
// occurred" at ~14s with no warm reuse between calls — consistent with the function's OWN process
// getting killed for memory each time, never surviving to serve a second request from a warm
// container. 4096 (the platform max) directly costs more per invocation; that's accepted here
// because this function does exactly what Netlify's own docs name as the reason to raise it
// ("large JSON... processing"), not a workaround for something that should be smaller instead.
export const config = {
  path: "/ask",
  memory: 4096,
  rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ["ip"], action: "block" },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
