/* PF1e Codex service worker — network-first with offline cache fallback.
   The site is served locally, so network is instant when the launcher is
   running (always fresh); when it isn't, we fall back to the cache so the
   installed app still works fully offline. */
var CACHE = "pf1e-codex-v66";
// ?v= MUST match index.html and DATA_V in app.js — the cache is keyed by full URL, so a
// mismatch precaches files the page never requests (and leaves the real ones uncached offline).
var V = "66";
var PRECACHE = [
  "./",
  "./index.html",
  "./styles.css?v=" + V,
  "./app.js?v=" + V,
  "./featweb.js?v=" + V,
  "./manifest.webmanifest",
  "./data/meta.js?v=" + V,
  "./data/quickref.js?v=" + V,
  "./data/nameforge.bundle.js?v=" + V,
  "./data/index.js?v=" + V,
  "./data/art.js?v=" + V,
  "./data/themes.js?v=" + V,
  "./data/bodythemes.js?v=" + V,
  "./data/tables.js?v=" + V,
  "./data/feattree.js?v=" + V,
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // Precache individually so one 404 can't abort the whole install.
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // let cross-origin pass through

  // Force-fresh for code/markup (bypass the browser HTTP cache) so updates show
  // without a hard refresh; big data files can use the normal cache.
  var p = url.pathname;
  var freshCode = req.mode === "navigate" || /\.(html|css|webmanifest)$/.test(p) || /(?:^|\/)(app|featweb)\.js$/.test(p) || /(?:^|\/)data\/(meta|quickref)\.js$/.test(p);
  var netReq = freshCode ? new Request(req, { cache: "no-store" }) : req;

  e.respondWith(
    fetch(netReq).then(function (res) {
      // Cache successful responses for offline use.
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      // Offline: serve from cache; for navigations fall back to the shell.
      return caches.match(req).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("./index.html") : Promise.reject("offline"));
      });
    })
  );
});
