/* ============================================================================
 * FeatWeb — Obsidian-style force-directed graph of feat prerequisites.
 * Renders a local neighborhood web around a focused feat on <canvas>.
 * Self-contained; app.js supplies the graph, an id->info resolver, and callbacks.
 *   var web = FeatWeb.mount(containerEl, {
 *     graph: PF_FEATTREE,               // { id:{req:[ids], unlocks:[ids]} }
 *     rootId: "<featId>",
 *     resolve: id => ({name, type}),    // feat display info
 *     onOpen: id => {...},              // "open this feat's page"
 *     onFocusChange: (id,info) => {...},// fired when the centered feat changes
 *     theme: {text,accent,edge,focus,bg,muted},
 *     depth: 2, height: 460
 *   });
 *   web.setDepth(n); web.fit(); web.setTheme(t); web.reheat(); web.destroy();
 * ==========================================================================*/
(function (root) {
"use strict";

var TYPE_COLORS = {
  "Combat":"#d9534f", "General":"#8a93a6", "Metamagic":"#8b6df0", "Item Creation":"#3fa66a",
  "Teamwork":"#e0a24a", "Critical":"#e06c9f", "Style":"#48b0c4", "Grit":"#c98b3a",
  "Panache":"#48b0c4", "Mythic":"#c9a227", "Story":"#a07bd8", "Performance":"#d98cc0",
  "Achievement":"#9a9a5c", "Racial":"#5c9a8a", "Monster":"#a0603a"
};
function colorFor(type) {
  if (TYPE_COLORS[type]) return TYPE_COLORS[type];
  var h = 0, t = String(type || "General"); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
  return "hsl(" + (h % 360) + ",42%,58%)";
}

function mount(container, opts) {
  var graph = opts.graph || {}, resolve = opts.resolve || function (id) { return { name: id, type: "General" }; };
  var onOpen = opts.onOpen || function () {}, onFocusChange = opts.onFocusChange || function () {};
  var depth = opts.depth || 2, MAXN = opts.maxNodes || 95;
  var theme = opts.theme || { text: "#e8e6e1", accent: "#d9a441", edge: "#2c313c", focus: "#d9a441", bg: "#181b22", muted: "#9aa0ac" };
  var rootId = opts.rootId;

  var canvas = document.createElement("canvas"); canvas.className = "fw-canvas"; canvas.style.display = "block"; canvas.style.touchAction = "none";
  container.appendChild(canvas);
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var cam = { x: 0, y: 0, s: 1 };
  var nodes = [], edges = [], nodeById = {}, adj = {};
  var hoverId = null, dragNode = null, dragMoved = false, panning = false, panStart = null, downXY = null;
  var alpha = 1, running = false, raf = null, destroyed = false, tip = { show: false };

  function resize() {
    var r = container.getBoundingClientRect();
    W = Math.max(220, r.width | 0); H = Math.max(240, (opts.height || (r.height | 0) || 460));
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    canvas.width = (W * DPR) | 0; canvas.height = (H * DPR) | 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function buildNeighborhood(centerId, keepPositions) {
    var old = {}; if (keepPositions) nodes.forEach(function (n) { old[n.id] = { x: n.x, y: n.y }; });
    var seen = {}, order = [], frontier = [centerId];
    seen[centerId] = 0; order.push(centerId);
    while (frontier.length && order.length < MAXN) {
      var next = [];
      for (var i = 0; i < frontier.length; i++) {
        var id = frontier[i], g = graph[id]; if (!g) continue;
        var nbrs = (g.req || []).concat(g.unlocks || []);
        for (var j = 0; j < nbrs.length; j++) {
          var nb = nbrs[j];
          if (seen[nb] == null) { seen[nb] = seen[id] + 1; if (seen[nb] <= depth) { order.push(nb); next.push(nb); if (order.length >= MAXN) break; } }
        }
        if (order.length >= MAXN) break;
      }
      frontier = next;
    }
    nodes = []; nodeById = {}; adj = {};
    var cx = W / 2, cy = H / 2;
    order.forEach(function (id, i) {
      var info = resolve(id) || { name: id, type: "General" };
      var g = graph[id] || {}, deg = (g.unlocks || []).length;
      var n = { id: id, name: info.name, type: info.type, deg: deg, hop: seen[id], vx: 0, vy: 0, fixed: false, r: 0 };
      n.r = 6 + Math.min(15, Math.sqrt(deg) * 3.1); if (id === centerId) n.r = Math.max(n.r, 11);
      if (old[id]) { n.x = old[id].x; n.y = old[id].y; }
      else if (id === centerId) { n.x = cx; n.y = cy; }
      else { var a = (i / Math.max(1, order.length)) * Math.PI * 2, rad = 55 + (seen[id] || 1) * 78 + (i % 7) * 6; n.x = cx + Math.cos(a) * rad; n.y = cy + Math.sin(a) * rad; }
      nodes.push(n); nodeById[id] = n; adj[id] = {};
    });
    edges = [];
    nodes.forEach(function (n) {
      var g = graph[n.id] || {};
      (g.unlocks || []).forEach(function (t) { if (nodeById[t]) { edges.push({ from: n.id, to: t }); adj[n.id][t] = 1; adj[t][n.id] = 1; } });
    });
    rootId = centerId; alpha = 1; reheat();
    onFocusChange(centerId, resolve(centerId), { nodes: nodes.length, unlocks: (graph[centerId] && graph[centerId].unlocks || []).length, reqs: (graph[centerId] && graph[centerId].req || []).length });
  }

  // ---- physics ----
  function tick() {
    var i, j, n, m, dx, dy, d2, d, f, ux, uy;
    var REP = 2600, SPR = 0.021, LEN = 78, CENTER = 0.009, damp = 0.82;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        m = nodes[j]; dx = n.x - m.x; dy = n.y - m.y; d2 = dx * dx + dy * dy + 0.01; d = Math.sqrt(d2);
        f = REP / d2; ux = dx / d; uy = dy / d; n.vx += ux * f; n.vy += uy * f; m.vx -= ux * f; m.vy -= uy * f;
      }
    }
    for (i = 0; i < edges.length; i++) {
      var e = edges[i]; n = nodeById[e.from]; m = nodeById[e.to]; if (!n || !m) continue;
      dx = m.x - n.x; dy = m.y - n.y; d = Math.sqrt(dx * dx + dy * dy) + 0.01; f = (d - LEN) * SPR; ux = dx / d; uy = dy / d;
      n.vx += ux * f; n.vy += uy * f; m.vx -= ux * f; m.vy -= uy * f;
    }
    var cx = W / 2, cy = H / 2;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.vx += (cx - n.x) * CENTER; n.vy += (cy - n.y) * CENTER;
      if (n.fixed) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= damp; n.vy *= damp; n.x += n.vx * alpha; n.y += n.vy * alpha;
    }
    alpha *= 0.986;
  }

  function reheat() { if (destroyed) return; alpha = Math.max(alpha, 0.7); if (!running) { running = true; loop(); } }
  function loop() {
    if (destroyed) return;
    tick(); render();
    if (alpha > 0.03 || dragNode || panning) raf = requestAnimationFrame(loop);
    else { running = false; render(); }
  }

  // ---- rendering ----
  function edgeColor(e) {
    if (e.to === rootId) return "req";        // prereq of the focused feat
    if (e.from === rootId) return "unlock";   // feat unlocked by the focused feat
    return "neutral";
  }
  // full upstream (prereqs) + downstream (unlocks) reachable set of a node, within displayed nodes
  var _reach = null, _reachFor;
  function reachOf(id) {
    if (_reachFor === id) return _reach;
    _reachFor = id; if (!id) { _reach = null; return null; }
    var set = {}; set[id] = 1;
    var st = [id], x, g, arr, i;
    while (st.length) { x = st.pop(); g = graph[x] || {}; arr = g.unlocks || []; for (i = 0; i < arr.length; i++) if (nodeById[arr[i]] && !set[arr[i]]) { set[arr[i]] = 1; st.push(arr[i]); } }
    st = [id];
    while (st.length) { x = st.pop(); g = graph[x] || {}; arr = g.req || []; for (i = 0; i < arr.length; i++) if (nodeById[arr[i]] && !set[arr[i]]) { set[arr[i]] = 1; st.push(arr[i]); } }
    _reach = set; return set;
  }
  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(cam.x, cam.y); ctx.scale(cam.s, cam.s);
    var hi = hoverId, R = hi ? reachOf(hi) : null, i, n;
    // edges
    for (i = 0; i < edges.length; i++) {
      var e = edges[i], a = nodeById[e.from], b = nodeById[e.to]; if (!a || !b) continue;
      var conn = R && R[e.from] && R[e.to];   // edge lies on the hovered feat's up/down chain
      var kind = edgeColor(e);
      ctx.globalAlpha = hi ? (conn ? 0.95 : 0.06) : (kind === "neutral" ? 0.28 : 0.6);
      ctx.strokeStyle = conn ? theme.accent : (kind === "req" ? "#e0a24a" : kind === "unlock" ? "#48b0c4" : theme.edge);
      ctx.lineWidth = (conn ? 1.8 : 1) / cam.s;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // nodes
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var dim = R && !R[n.id];
      ctx.globalAlpha = dim ? 0.14 : 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.2832); ctx.fillStyle = colorFor(n.type); ctx.fill();
      if (n.id === rootId) { ctx.lineWidth = 3 / cam.s; ctx.strokeStyle = theme.focus; ctx.stroke(); }
      else if (n.id === hi) { ctx.lineWidth = 2 / cam.s; ctx.strokeStyle = theme.accent; ctx.stroke(); }
      var showLabel = (!dim && (cam.s > 1.2 || n.r > 12.5 || n.id === rootId)) || n.id === hi;
      if (showLabel) {
        ctx.globalAlpha = dim ? 0.18 : 0.92; ctx.fillStyle = theme.text;
        ctx.font = (n.id === rootId ? "700 " : "") + (12 / cam.s) + "px -apple-system,Segoe UI,Roboto,sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "bottom";
        var label = n.name.length > 26 ? n.name.slice(0, 25) + "…" : n.name;
        ctx.fillText(label, n.x, n.y - n.r - 3 / cam.s);
      }
    }
    ctx.restore();
    // hover tooltip (screen space)
    if (tip.show && hoverId && nodeById[hoverId]) {
      var hn = nodeById[hoverId], g = graph[hoverId] || {};
      var sx = hn.x * cam.s + cam.x, sy = hn.y * cam.s + cam.y;
      var lines = [hn.name, hn.type + " feat", "requires " + ((g.req || []).length) + " · unlocks " + ((g.unlocks || []).length)];
      ctx.font = "12px -apple-system,Segoe UI,Roboto,sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      var w = 0; lines.forEach(function (l, k) { ctx.font = (k === 0 ? "700 13px" : "12px") + " -apple-system,Segoe UI,Roboto,sans-serif"; w = Math.max(w, ctx.measureText(l).width); });
      var bx = Math.min(Math.max(sx + 12, 6), W - w - 20), by = Math.min(Math.max(sy - 8, 6), H - 60);
      ctx.globalAlpha = 0.97; ctx.fillStyle = theme.bg; ctx.strokeStyle = theme.edge; ctx.lineWidth = 1;
      roundRect(bx - 8, by - 6, w + 16, 54, 7); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
      lines.forEach(function (l, k) {
        ctx.font = (k === 0 ? "700 13px" : "12px") + " -apple-system,Segoe UI,Roboto,sans-serif";
        ctx.fillStyle = k === 0 ? theme.text : theme.muted; ctx.fillText(l, bx, by + k * 16);
      });
    }
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // ---- interaction ----
  function toWorld(clientX, clientY) { var r = canvas.getBoundingClientRect(); return { x: (clientX - r.left - cam.x) / cam.s, y: (clientY - r.top - cam.y) / cam.s }; }
  function nodeAt(wx, wy) { for (var i = nodes.length - 1; i >= 0; i--) { var n = nodes[i], dx = n.x - wx, dy = n.y - wy; if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) return n; } return null; }

  function onDown(e) {
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    var w = toWorld(e.clientX, e.clientY); downXY = { x: e.clientX, y: e.clientY };
    var n = nodeAt(w.x, w.y);
    if (n) { dragNode = n; n.fixed = true; dragMoved = false; reheat(); }
    else { panning = true; panStart = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; }
  }
  function onMove(e) {
    if (dragNode) { var w = toWorld(e.clientX, e.clientY); dragNode.x = w.x; dragNode.y = w.y; dragMoved = true; reheat(); }
    else if (panning) { cam.x = panStart.cx + (e.clientX - panStart.x); cam.y = panStart.cy + (e.clientY - panStart.y); render(); }
    else {
      var w2 = toWorld(e.clientX, e.clientY), n = nodeAt(w2.x, w2.y), id = n ? n.id : null;
      if (id !== hoverId) { hoverId = id; tip.show = !!id; canvas.style.cursor = id ? "pointer" : "grab"; if (!running) render(); }
    }
  }
  function onUp(e) {
    if (dragNode) { dragNode.fixed = false; if (!dragMoved) { buildNeighborhood(dragNode.id, true); } dragNode = null; reheat(); }
    panning = false;
  }
  function onDbl(e) { var w = toWorld(e.clientX, e.clientY), n = nodeAt(w.x, w.y); if (n) onOpen(n.id); }
  function onCtx(e) { var w = toWorld(e.clientX, e.clientY), n = nodeAt(w.x, w.y); if (n) { e.preventDefault(); onOpen(n.id); } }
  function onWheel(e) {
    e.preventDefault();
    var r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    var wx = (mx - cam.x) / cam.s, wy = (my - cam.y) / cam.s;
    var factor = e.deltaY < 0 ? 1.12 : 0.89; cam.s = Math.min(3.5, Math.max(0.25, cam.s * factor));
    cam.x = mx - wx * cam.s; cam.y = my - wy * cam.s; render();
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  canvas.addEventListener("dblclick", onDbl);
  canvas.addEventListener("contextmenu", onCtx);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerleave", function () { if (!dragNode && !panning) { hoverId = null; tip.show = false; render(); } });
  var onResize = function () { resize(); render(); };
  window.addEventListener("resize", onResize);

  function fit() {
    if (!nodes.length) return;
    var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    nodes.forEach(function (n) { minx = Math.min(minx, n.x - n.r); miny = Math.min(miny, n.y - n.r); maxx = Math.max(maxx, n.x + n.r); maxy = Math.max(maxy, n.y + n.r); });
    var bw = maxx - minx, bh = maxy - miny, pad = 40;
    cam.s = Math.min(3, Math.max(0.3, Math.min((W - pad) / bw, (H - pad) / bh)));
    cam.x = W / 2 - ((minx + maxx) / 2) * cam.s; cam.y = H / 2 - ((miny + maxy) / 2) * cam.s;
    render();
  }

  // init
  resize();
  buildNeighborhood(rootId, false);
  setTimeout(fit, 350); setTimeout(fit, 900);

  return {
    setDepth: function (d) { depth = Math.max(1, Math.min(4, d)); buildNeighborhood(rootId, true); },
    getDepth: function () { return depth; },
    setRoot: function (id) { if (graph[id]) buildNeighborhood(id, true); },
    getFocus: function () { return rootId; },
    setTheme: function (t) { theme = t; render(); },
    fit: fit, reheat: reheat,
    destroy: function () {
      destroyed = true; if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp); canvas.removeEventListener("dblclick", onDbl);
      canvas.removeEventListener("contextmenu", onCtx);
      canvas.removeEventListener("wheel", onWheel); window.removeEventListener("resize", onResize);
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    }
  };
}

root.FeatWeb = { mount: mount, colorFor: colorFor, TYPE_COLORS: TYPE_COLORS };
})(typeof self !== "undefined" ? self : this);
