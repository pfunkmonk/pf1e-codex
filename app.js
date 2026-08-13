/* ===== PF1e Codex — offline reference app ===== */
(function () {
  "use strict";
  var META = window.PF_META || { groups: [], total: 0 };
  var IDX = window.PF_INDEX || [];          // [id,name,slug,rawCat,source,snippet]
  var I_ID=0,I_NAME=1,I_SLUG=2,I_RAW=3,I_SRC=4,I_SNIP=5,I_FAC=6;
  var FACETS=(META.facets)||{};
  function fc(b,k){ return function(){ return (FACETS[b]&&FACETS[b][k])||[]; }; }
  // filter dropdowns per bucket: [stateKey, placeholder, optionsFn]
  var FILTER_UI={
    spells:[["cls","Any class",fc("spells","classes")],["lvl","Any level",function(){return (FACETS.spells.levels||[]).map(String);}],["sch","Any school",fc("spells","schools")],["desc","Any descriptor",fc("spells","descriptors")],["save","Any save",fc("spells","saves")],["bk","Any book",fc("spells","books")]],
    feats:[["t","Any type",fc("feats","types")],["bk","Any book",fc("feats","books")]],
    monsters:[["t","Any type",fc("monsters","types")],["sz","Any size",fc("monsters","sizes")],["al","Any alignment",fc("monsters","alignments")],["bk","Any book",fc("monsters","books")]],
    items:[["slot","Any slot",fc("items","slots")],["bk","Any book",fc("items","books")]],
    traits:[["cat","Any category",fc("traits","cats")],["bk","Any book",fc("traits","books")]],
    archetypes:[["cls","Any class",fc("archetypes","classes")],["bk","Any book",fc("archetypes","books")]],
    rules:[["bk","Any book",fc("rules","books")]], options:[["bk","Any book",fc("options","books")]],
    deities:[["bk","Any book",fc("deities","books")]], hazards:[["bk","Any book",fc("hazards","books")]],
    npcs:[["bk","Any book",fc("npcs","books")]], races:[["bk","Any book",fc("races","books")]]
  };
  var SORT_UI={ spells:[["","Sort: Name"],["lvl","Sort: Level"]], monsters:[["","Sort: Name"],["cr","Sort: CR"]], items:[["","Sort: Name"],["price","Sort: Price ↓"]] };
  function facetMatch(slug, f, st){
    if(st.bk && !(f&&f.bk===st.bk)) return false;            // source/book (any bucket)
    if(slug==="spells"){
      if(st.cls||st.lvl){ if(!f||!f.lv) return false;
        if(st.cls&&st.lvl){ if(f.lv[st.cls]!==+st.lvl) return false; }
        else if(st.cls){ if(!(st.cls in f.lv)) return false; }
        else { var ok=false,k; for(k in f.lv) if(f.lv[k]===+st.lvl) ok=true; if(!ok) return false; } }
      if(st.sch && (!f||f.sch!==st.sch)) return false;
      if(st.desc && !(f&&f.desc&&f.desc.indexOf(st.desc)>=0)) return false;
      if(st.save && !(f&&f.save===st.save)) return false;
      return true;
    }
    if(slug==="feats") return !st.t || (f&&f.t===st.t);
    if(slug==="monsters"){ if(st.t&&(!f||f.t!==st.t))return false; if(st.sz&&(!f||f.sz!==st.sz))return false; if(st.al&&(!f||f.al!==st.al))return false; return true; }
    if(slug==="items") return !st.slot || (f&&f.slot===st.slot);
    if(slug==="traits") return !st.cat || (f&&f.cat===st.cat);
    if(slug==="archetypes") return !st.cls || (f&&f.cls===st.cls);
    return true;
  }
  function minLvl(f){ if(!f||!f.lv) return 99; var m=99,k; for(k in f.lv) if(f.lv[k]<m) m=f.lv[k]; return m; }
  function facetSort(slug, rows, key){
    if(!key) return rows;
    var r=rows.slice();
    if(slug==="spells"&&key==="lvl") r.sort(function(a,b){return minLvl(a[I_FAC])-minLvl(b[I_FAC]) || a[I_NAME].localeCompare(b[I_NAME]);});
    else if(slug==="monsters"&&key==="cr") r.sort(function(a,b){var x=(a[I_FAC]&&a[I_FAC].cr!=null)?a[I_FAC].cr:1e9,y=(b[I_FAC]&&b[I_FAC].cr!=null)?b[I_FAC].cr:1e9;return x-y||a[I_NAME].localeCompare(b[I_NAME]);});
    else if(slug==="items"&&key==="price") r.sort(function(a,b){var x=(a[I_FAC]&&a[I_FAC].pr!=null)?a[I_FAC].pr:-1,y=(b[I_FAC]&&b[I_FAC].pr!=null)?b[I_FAC].pr:-1;return y-x||a[I_NAME].localeCompare(b[I_NAME]);});
    return r;
  }

  // ---- lazy per-category body loading (works from file:// via <script>) ----
  var BODIES = {};                 // slug -> {id: body}
  var pending = {};                // slug -> [cb]
  window.PF_REG = function (slug, map) {
    BODIES[slug] = map; (pending[slug] || []).forEach(function (cb) { cb(); }); pending[slug] = [];
  };
  // Cache token for every lazily-loaded data file. MUST match ?v= in index.html and CACHE in sw.js
  // — bump all three together on any data change, or clients mix fresh and stale payloads.
  var DATA_V = "51";
  function loadCat(slug, cb) {
    if (BODIES[slug]) return cb();
    (pending[slug] = pending[slug] || []).push(cb);
    if (pending[slug].length > 1) return;
    var s = document.createElement("script"); s.src = "data/cat/" + slug + ".js?v=" + DATA_V;
    s.onerror = function () { BODIES[slug] = {}; (pending[slug]||[]).forEach(function(c){c();}); pending[slug]=[]; };
    document.body.appendChild(s);
  }
  // ---- lazy-load non-critical data (kept off the cold-start path) ----
  var _scr = {};
  function loadScriptOnce(src, cb) {
    if (_scr[src] === "done") return cb && cb();
    if (_scr[src]) { if (cb) _scr[src].push(cb); return; }
    _scr[src] = cb ? [cb] : [];
    var s = document.createElement("script"); s.src = src;
    var fin = function () { var cbs = _scr[src]; _scr[src] = "done"; (cbs||[]).forEach(function (c) { c && c(); }); };
    s.onload = fin; s.onerror = fin; document.head.appendChild(s);
  }
  function ensureTables(cb) { if (window.PF_TABLES) return cb && cb(); loadScriptOnce("data/tables.js?v=" + DATA_V, cb); }
  function ensureFeattree(cb) { if (window.PF_FEATTREE) return cb && cb(); loadScriptOnce("data/feattree.js?v=" + DATA_V, cb); }
  function ensureNameForge(cb) { if (window.NameForge) return cb && cb(); loadScriptOnce("data/nameforge.bundle.js?v=" + DATA_V, cb); }
  function ensureFeatWeb(cb) { ensureFeattree(function () { if (window.FeatWeb) return cb && cb(); loadScriptOnce("featweb.js?v=" + DATA_V, cb); }); }
  // shared helpers for the FeatWeb graph views
  var _activeWeb = null;
  function featResolve(id) { var r = idById()[id]; if (!r) return { name: id, type: "General" }; return { name: r[I_NAME], type: (r[I_FAC] && r[I_FAC].t) || "General" }; }
  function cssTheme() { var s = getComputedStyle(document.documentElement); function v(k, d) { return (s.getPropertyValue(k) || "").trim() || d; } return { text: v("--ink", "#e8e6e1"), accent: v("--accent", "#d9a441"), edge: v("--line", "#2c313c"), focus: v("--accent", "#d9a441"), bg: v("--panel", "#181b22"), muted: v("--ink-soft", "#9aa0ac") }; }
  function killWeb() { if (_activeWeb) { try { _activeWeb.destroy(); } catch (e) {} _activeWeb = null; } }

  // ---- category colors + labels ----
  var COLOR = { rules:"#4c6b8a", spells:"#5a3f8f", feats:"#2f7d54", traits:"#8a5a1f", archetypes:"#7c1d6b",
    races:"#1f7a86", classes:"#9a6b1f", monsters:"#8a2b2b", npcs:"#a2542b", items:"#3f6d3f",
    hazards:"#6b6b1f", deities:"#5a5a7a" };
  var LABEL = {}; (META.groups||[]).forEach(function(g){ g.cats.forEach(function(c){ LABEL[c.slug]=c.label; }); });
  LABEL.rules="Rules";  // Skills gets its own page (rules/Skills); drop the "& Skills" label
  // junk index pages scraped as rules entries ("2nd Level", "Cantrips", …) — hide from browse/search
  function isJunkEntry(r){ return r[I_SLUG]==="rules" && /^(\d+(?:st|nd|rd|th)\s+Level|Cantrips?|Orisons?)$/i.test(r[I_NAME]); }

  // ---- entry paging ----------------------------------------------------------
  // Whatever list you were last looking at (a category with its filters/sort applied,
  // or a search result set) becomes the sequence Prev/Next walk, so paging matches what
  // you actually saw. Arrive by deep link or 🎲 instead and it falls back to the whole
  // bucket A-Z. Stores the FULL list, not the ~80 rendered, so you can page past the fold.
  var NAV = { ids: [], label: "" };
  function navSet(label, rows){ NAV = { ids: rows.map(function(r){ return r[I_ID]; }), label: label || "" }; }
  var _bucketIds = {};
  function bucketIds(slug){
    if(_bucketIds[slug]) return _bucketIds[slug];
    var rows = IDX.filter(function(r){ return r[I_SLUG]===slug && !isJunkEntry(r); });
    rows.sort(function(a,b){ return a[I_NAME].localeCompare(b[I_NAME]); });
    return (_bucketIds[slug] = rows.map(function(r){ return r[I_ID]; }));
  }
  var PAGER = { prev:null, next:null };
  // ---- artwork gallery -------------------------------------------------------
  // Every shipped image in one place: a browsable page, and in practice the fastest
  // way to spot a backdrop that reads badly or got wired to the wrong thing.
  var ART_GROUPS=[
    ["Classes","class-","Class entry bands — prestige classes, orders, oaths and bloodlines inherit these"],
    ["Races","race-","Race entry bands (also used for same-named monsters)"],
    ["Creature types","type-","Monster bands, chosen by creature type and alignment"],
    ["Creature subtypes","creature-","Monster bands by subtype — these beat the creature-type image"],
    ["Schools of magic","school-","Spell entry bands, by school"],
    ["Spells","spell-","Individual spell bands — everything else falls back to its school"],
    ["Trait categories","trait-","One per trait category, covering every trait page"],
    ["Feat types","feat-","One per feat type"],
    ["Items","item-","Wondrous by slot, plus weapon and armour variants assigned by entry id"],
    ["Category splashes","cat-","Category landing pages"],
    ["Tools & pages","tool-","Tool and utility page headers"],
    ["Site","page-","Page backdrops and textures"],
    ["Other","","Everything else"]
  ];
  function viewArtGallery(){
    setActiveNav(null);
    // Iterate the PLAN, not what is on disk, so work still to do is visible. Presence comes
    // from the generated manifest — NOT from image load failures, which never fire for the
    // lazy-loaded images below the fold and made this page report 100% when it was at 57%.
    var keys=Object.keys(ART_PLANNED).sort();
    var present=keys.filter(function(k){ return ART[k]; }).length;
    var used={};
    var wrap=h("div");
    var head=h("div",{class:"list-head"});
    head.innerHTML='<h2>🖼 Artwork</h2><span class="meta">'+keys.length+' backdrops planned · anything not yet generated shows outlined in red</span>';
    wrap.appendChild(head);
    wrap.appendChild(h("div",{class:"codex-note"},
      present.toLocaleString()+" of "+keys.length.toLocaleString()+" generated · "+
      (keys.length-present).toLocaleString()+" still to come"));
    ART_GROUPS.forEach(function(g){
      var prefix=g[1];
      var mine=keys.filter(function(k){
        if(used[k]) return false;
        if(prefix && k.indexOf(prefix)!==0) return false;
        used[k]=1; return true;
      });
      if(!mine.length) return;
      var got=mine.filter(function(k){ return ART[k]; }).length;
      wrap.appendChild(h("h3",{class:"section-h"},g[0]+" ("+got+" of "+mine.length+")"));
      wrap.appendChild(h("div",{class:"codex-note"},g[2]));
      var grid=h("div",{class:"artgrid"});
      mine.forEach(function(k){
        var fig=h("figure",{class:"artcell"});
        if(ART[k]){
          var img=h("img",{loading:"lazy",alt:k,src:"art/"+k+".jpg"});
          img.onerror=function(){ fig.classList.add("missing"); };   // belt and braces
          fig.appendChild(img);
        }else{
          fig.classList.add("missing");        // known-absent: don't request it at all
          fig.appendChild(h("div",{class:"artmissing"},"not generated"));
        }
        fig.appendChild(h("figcaption",null,k));
        grid.appendChild(fig);
      });
      wrap.appendChild(grid);
    });
    swap(wrap); window.scrollTo(0,0);
  }

  function entryPager(id, row){
    var box = h("div",{class:"pager"});
    PAGER = { prev:null, next:null };
    var ids = NAV.ids, i = ids.indexOf(id), label = NAV.label;
    if(i < 0){ ids = bucketIds(row[I_SLUG]); i = ids.indexOf(id); label = LABEL[row[I_SLUG]] || row[I_SLUG]; }
    if(i < 0 || ids.length < 2) return box;
    var prev = i>0 ? ids[i-1] : null, next = i<ids.length-1 ? ids[i+1] : null;
    PAGER = { prev:prev, next:next };
    function nameOf(x){ var r = idById()[x]; return r ? r[I_NAME] : ""; }
    function step(target){ return function(){ if(target) location.hash = "#/e/" + encodeURIComponent(target); }; }
    var pb = h("button",{class:"pgbtn"},"‹ Prev");
    if(prev){ pb.title = "Previous: " + nameOf(prev) + "  (←)"; pb.onclick = step(prev); } else pb.disabled = true;
    var nb = h("button",{class:"pgbtn"},"Next ›");
    if(next){ nb.title = "Next: " + nameOf(next) + "  (→)"; nb.onclick = step(next); } else nb.disabled = true;
    box.appendChild(pb);
    box.appendChild(h("span",{class:"pgpos"}, (i+1).toLocaleString()+" / "+ids.length.toLocaleString()+(label?" · "+label:"")));
    box.appendChild(nb);
    return box;
  }
  function color(slug){ return COLOR[slug] || "var(--accent)"; }

  // ===== Original SVG art + identity color system (hand-drawn line glyphs, inherit currentColor) =====
  function svgi(inner, cls){ return '<svg class="ico'+(cls?" "+cls:"")+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>'; }
  // 8 schools of magic (+ universal), D&D-Beyond-convention colors
  var SCHOOL_C = { abjuration:"#4A82C3", conjuration:"#C9A227", divination:"#8A94A6", enchantment:"#D97CB5",
    evocation:"#D14A3A", illusion:"#8E5BC9", necromancy:"#4E9E5F", transmutation:"#E08A3C", universal:"#9a8f7a" };
  var SCHOOL_ICON = {
    abjuration:'<path d="M12 3l7 2.5v5.5c0 4-3 6.8-7 8.5-4-1.7-7-4.5-7-8.5V5.5z"/>',
    conjuration:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>',
    divination:'<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.6"/>',
    enchantment:'<path d="M12 20.5C6 15.5 3.2 11.8 3.2 8.3 3.2 5.9 5.1 4 7.5 4c1.8 0 3.3 1 4.5 2.6C13.2 5 14.7 4 16.5 4 18.9 4 20.8 5.9 20.8 8.3c0 3.5-2.8 7.2-8.8 12.2z"/>',
    evocation:'<path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5M5.3 5.3l3.5 3.5M15.2 15.2l3.5 3.5M18.7 5.3l-3.5 3.5M8.8 15.2l-3.5 3.5"/>',
    illusion:'<path d="M3.5 8.5c3.5-1.5 5.5-1 8.5 1 3-2 5-2.5 8.5-1 0 5-3.5 7-6.5 5.7-1-.5-1.6-1.5-2-2.2-.4.7-1 1.7-2 2.2-3 1.3-6.5-.7-6.5-5.7z"/>',
    necromancy:'<path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.3 1 4 2.5 5.2V19h10v-3.3c1.5-1.2 2.5-2.9 2.5-5.2A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="11" r="1.4" fill="currentColor" stroke="none"/>',
    transmutation:'<path d="M5 9a8 8 0 0 1 12.5-2.6M19 15A8 8 0 0 1 6.5 17.6"/><path d="M17.5 3v3.6H14M6.5 21v-3.6H10"/>',
    universal:'<path d="M12 2.5l2.4 5.8 6.1.5-4.7 4 1.5 6-5.3-3.3-5.3 3.3 1.5-6-4.7-4 6.1-.5z"/>'
  };
  // creature-type glyphs (line art; a neutral star falls through for the rest)
  var TYPE_ICON = {
    dragon:'<path d="M3 6c4 0 7 2 9 6 2-4 5-6 9-6-1 3-2 5-4 6 2 0 3 1 4 3-4 0-7-1-9-4-2 3-5 4-9 4 1-2 2-3 4-3-2-1-3-3-4-6z"/>',
    undead:SCHOOL_ICON.necromancy,
    fey:'<path d="M12 4c-3 2-3 6 0 8 3-2 3-6 0-8zM12 12c-2-3-6-3-8 0 2 3 6 3 8 0zM12 12c2-3 6-3 8 0-2 3-6 3-8 0zM12 12v8"/>',
    "magical beast":'<path d="M7 14a3 3 0 1 0 0-.01M12 8l2 3M12 8l-2 3M12 8V5"/><circle cx="9" cy="14" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="14" r="1.1" fill="currentColor" stroke="none"/>',
    animal:'<path d="M6 10c-2 0-3 3-1 5s5 2 7 2 5 0 7-2 1-5-1-5"/><path d="M6 10c0-2 1-4 2-4M18 10c0-2-1-4-2-4"/>',
    construct:'<path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="4"/>',
    outsider:'<path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/>',
    plant:'<path d="M12 21v-9M12 12c0-4 3-7 7-7 0 4-3 7-7 7zM12 14c0-3-2.5-6-6-6 0 3.5 2.5 6 6 6z"/>',
    aberration:'<path d="M12 3a5 5 0 0 0-5 5c0 3 5 6 5 6s5-3 5-6a5 5 0 0 0-5-5z"/><circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none"/><path d="M8 15l-2 5M12 15v6M16 15l2 5"/>',
    vermin:'<path d="M12 5v14M12 8h5M12 8H7M12 13h6M12 13H6M12 17h4M12 17H8"/><circle cx="12" cy="5" r="2"/>',
    ooze:'<path d="M6 13c0-4 3-7 6-7s6 3 6 7c0 2-1 4-3 4-1 0-1-1-2-1s-1 2-2 2-1-2-2-2-1 1-2 1c-1 0-1-2-1-4z"/>',
    humanoid:'<circle cx="12" cy="7" r="3"/><path d="M6 21c0-4 2.5-7 6-7s6 3 6 7"/>',
    "monstrous humanoid":'<circle cx="12" cy="9" r="3"/><path d="M9 7L6 4M15 7l3-3M6 21c0-4 2.5-7 6-7s6 3 6 7"/>'
  };
  function typeIcon(t){ return TYPE_ICON[t] || SCHOOL_ICON.universal; }
  // Challenge-Rating heat ramp (trivial→deadly), mirrors loot-rarity intuition
  function crColor(cr){ if(cr==null) return null; cr=+cr; if(isNaN(cr)) return null;
    if(cr<=4) return "#4E9E5F"; if(cr<=9) return "#C9A227"; if(cr<=15) return "#E08A3C"; if(cr<=23) return "#D14A3A"; return "#8E5BC9"; }
  // the best accent color for any entry: spell→school, monster→CR heat, else category
  function identityColor(r){ var s=r[I_SLUG], f=r[I_FAC]||{};
    if(s==="spells" && f.sch && SCHOOL_C[f.sch]) return SCHOOL_C[f.sch];
    if(s==="monsters" && f.cr!=null){ var c=crColor(f.cr); if(c) return c; }
    return color(s); }
  function schoolPip(r){ var f=r[I_FAC]; if(r[I_SLUG]==="spells" && f && f.sch && SCHOOL_ICON[f.sch]) return '<span class="rpip" style="color:'+SCHOOL_C[f.sch]+'">'+svgi(SCHOOL_ICON[f.sch])+'</span>'; return ""; }
  // brand crest (replaces the ⚔ emoji) and a faceted die (roll animation)
  var CREST_SVG = svgi('<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/><path d="M12 6.5v10M8.5 10h7"/>', "crest");
  var DIE_SVG = svgi('<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><path d="M12 2v20M3.5 7l8.5 5 8.5-5"/><circle cx="12" cy="14" r="1.3" fill="currentColor" stroke="none"/>', "die");

  // ===== Big decorative art: manuscript scrollwork + per-category splash scenes =====
  var ORN='<svg class="orn" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M5 26 V11 a6 6 0 0 1 6-6 H26"/><path d="M5 26 C18 26 26 18 26 5"/><path d="M5 17 C12 17 17 12 17 5"/><circle cx="6" cy="6" r="1.8" fill="currentColor" stroke="none"/></svg>';
  function ornCorners(){ return '<span class="orn-c orn-tl">'+ORN+'</span><span class="orn-c orn-tr">'+ORN+'</span><span class="orn-c orn-bl">'+ORN+'</span><span class="orn-c orn-br">'+ORN+'</span>'; }
  // emblematic silhouette scenes (cut-outs use var(--panel) to read as holes on the banner)
  var SCENE={
    spells:'<path d="M64 16l6.5 21 21 6.5-21 6.5L64 71l-6.5-21-21-6.5 21-6.5z"/><circle cx="33" cy="30" r="3.2"/><circle cx="99" cy="26" r="2.6"/><circle cx="38" cy="70" r="2.2"/><path d="M104 66a13 13 0 1 1-7-11 10 10 0 1 0 7 11z"/>',
    monsters:'<path d="M18 42q26 4 46 32q20-28 46-32q-9 17-24 23q11 2 17 13q-24 2-40-15q-16 17-40 15q6-11 17-13q-15-6-24-23z"/><circle cx="52" cy="52" r="2.5" fill="var(--panel)"/><circle cx="76" cy="52" r="2.5" fill="var(--panel)"/>',
    feats:'<g stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M34 28 L94 82"/><path d="M94 28 L34 82"/></g><path d="M28 24h14v7H28z"/><path d="M86 24h14v7H86z"/><path d="M60 82h8v8h-8z"/>',
    classes:'<path d="M64 18l27 9v20c0 21-15 32-27 38-12-6-27-17-27-38V27z"/><path d="M64 32v34M50 44h28" fill="none" stroke="var(--panel)" stroke-width="5"/>',
    "class options":'<path d="M64 18l27 9v20c0 21-15 32-27 38-12-6-27-17-27-38V27z"/><path d="M64 32v34M50 44h28" fill="none" stroke="var(--panel)" stroke-width="5"/>',
    skills:'<path d="M46 48h34a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H46a4 4 0 0 1-4-4V52a4 4 0 0 1 4-4z"/><path d="M50 48v-9a13 13 0 0 1 26 0v9" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="63" cy="62" r="4.5" fill="var(--panel)"/><rect x="61" y="64" width="4" height="11" fill="var(--panel)"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M86 58l20-8"/><path d="M86 66l16 3"/></g>',
    races:'<circle cx="40" cy="34" r="8.5"/><path d="M31 49h18v30H31z"/><circle cx="65" cy="41" r="7.5"/><path d="M57 54h16v25H57z"/><circle cx="90" cy="49" r="6.5"/><path d="M83 60h14v19H83z"/>',
    rules:'<path d="M64 32q-15-9-32-6v42q17-3 32 6q15-9 32-6V26q-17-3-32 6z"/><path d="M64 32v48" fill="none" stroke="var(--panel)" stroke-width="3.5"/><path d="M40 40q10-1 18 3M40 52q10-1 18 3M70 43q10-4 18-3M70 55q10-4 18-3" fill="none" stroke="var(--panel)" stroke-width="2"/>',
    deities:'<circle cx="64" cy="50" r="15"/><g stroke="currentColor" stroke-width="4.5" stroke-linecap="round"><path d="M64 22v-9M64 87v-9M35 50h-9M102 50h-9M45 31l-6-6M83 31l6-6M45 69l-6 6M83 69l6 6"/></g><circle cx="64" cy="50" r="5.5" fill="var(--panel)"/>',
    traits:'<path d="M44 42h40l13 15-33 32-33-32z"/><path d="M44 42l20 47 20-47M30 57h68" fill="none" stroke="var(--panel)" stroke-width="2.5"/>',
    archetypes:'<path d="M43 32q21-7 42 0q5 21-4 38q-17 13-34 0q-9-17-4-38z"/><circle cx="55" cy="50" r="3.2" fill="var(--panel)"/><circle cx="73" cy="50" r="3.2" fill="var(--panel)"/><path d="M56 65q8 6 16 0" fill="none" stroke="var(--panel)" stroke-width="3"/>',
    hazards:'<g stroke="currentColor" stroke-width="4.5" fill="none"><circle cx="64" cy="58" r="11"/><path d="M53 58l-17-7M53 58l-17 7M75 58l17-7M75 58l17 7"/></g><path d="M42 58l-9-4 4 9zM86 58l9-4-4 9z"/>',
    npcs:'<path d="M46 44h30v36H46z"/><path d="M76 51h9a7 7 0 0 1 0 20h-9" fill="none" stroke="currentColor" stroke-width="4.5"/><path d="M46 44q15-9 30 0z" fill="var(--panel)"/><circle cx="52" cy="40" r="3"/><circle cx="61" cy="37" r="3.2"/><circle cx="70" cy="40" r="3"/>',
    items:'<path d="M38 54h52v24H38z"/><path d="M38 54q0-11 26-11t26 11" /><rect x="60" y="59" width="8" height="11" fill="var(--panel)"/><circle cx="32" cy="82" r="4.5"/><circle cx="41" cy="84" r="4.5"/><circle cx="95" cy="82" r="4.5"/>',
    "default":'<path d="M64 16l6.5 21 21 6.5-21 6.5L64 71l-6.5-21-21-6.5 21-6.5z"/>'
  };
  function categoryScene(slug){ return '<svg class="cat-scene" viewBox="0 0 128 96" fill="currentColor" aria-hidden="true">'+(SCENE[slug]||SCENE["default"])+'</svg>'; }
  // class-entry splash scenes, chosen by martial/caster/etc. archetype
  var ARCH_SCENE={
    warrior:'<path d="M36 28L92 78" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M92 28L36 78" stroke="currentColor" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M64 40l18 6v11c0 12-9 18-18 22-9-4-18-10-18-22V46z"/><path d="M64 52v22M54 61h20" fill="none" stroke="var(--panel)" stroke-width="4"/>',
    caster:'<path d="M61 22h6v54h-6z"/><circle cx="64" cy="20" r="11"/><circle cx="64" cy="20" r="4" fill="var(--panel)"/><path d="M40 44l3.6 9 9 3.6-9 3.6-3.6 9-3.6-9-9-3.6 9-3.6z"/><circle cx="92" cy="58" r="3"/>',
    divine:SCENE.deities,
    rogue:'<path d="M59 22h10l-3 30h-4z"/><path d="M40 66q24-8 48 0 4 12-4 20-16 9-20-2-4 11-20 2-8-8-4-20z"/><circle cx="55" cy="74" r="3" fill="var(--panel)"/><circle cx="73" cy="74" r="3" fill="var(--panel)"/>',
    nature:'<path d="M62 82V48h4v34z"/><path d="M64 52c0-16 12-28 30-28 0 16-12 28-30 28z"/><path d="M64 60c0-13-11-23-26-23 0 13 11 23 26 23z"/>',
    monk:'<path d="M45 52h30a5 5 0 0 1 5 5v13a11 11 0 0 1-11 11H51a11 11 0 0 1-11-11V57a5 5 0 0 1 5-5z"/><path d="M50 52v-6a4 4 0 0 1 8 0v6M58 52v-9a4 4 0 0 1 8 0v9M66 52v-7a4 4 0 0 1 8 0v7" fill="none" stroke="var(--panel)" stroke-width="2.5"/>',
    alchemist:'<path d="M58 24h12v15l14 26a6 6 0 0 1-5 9H49a6 6 0 0 1-5-9l14-26z"/><path d="M55 28h18" stroke="var(--panel)" stroke-width="4"/><circle cx="60" cy="62" r="3" fill="var(--panel)"/><circle cx="69" cy="68" r="2.5" fill="var(--panel)"/>',
    psychic:'<path d="M32 52s14-18 32-18 32 18 32 18-14 18-32 18-32-18-32-18z"/><circle cx="64" cy="52" r="9" fill="var(--panel)"/><circle cx="64" cy="52" r="4"/>'
  };
  var CLASS_ARCH={fighter:"warrior",barbarian:"warrior",brawler:"warrior",cavalier:"warrior",gunslinger:"warrior",samurai:"warrior",slayer:"warrior",swashbuckler:"warrior",vigilante:"warrior",
    ranger:"nature",hunter:"nature",druid:"nature",
    cleric:"divine",paladin:"divine",warpriest:"divine",inquisitor:"divine",oracle:"divine",antipaladin:"divine",shaman:"divine",
    wizard:"caster",sorcerer:"caster",magus:"caster",arcanist:"caster",witch:"caster",bard:"caster",summoner:"caster",bloodrager:"caster",skald:"caster",
    rogue:"rogue",investigator:"rogue",ninja:"rogue",
    monk:"monk",alchemist:"alchemist",
    medium:"psychic",mesmerist:"psychic",occultist:"psychic",psychic:"psychic",spiritualist:"psychic"};
  function classArchScene(name){ var a=CLASS_ARCH[(""+name).toLowerCase()], inner=(a&&ARCH_SCENE[a])?ARCH_SCENE[a]:SCENE.classes; return '<svg class="cat-scene" viewBox="0 0 128 96" fill="currentColor" aria-hidden="true">'+inner+'</svg>'; }
  // painted backdrops (art/<key>.jpg): preload; only apply if the image actually exists (future-proof)
  var CAT_ART={classes:"cat-classes",options:"cat-classoptions",races:"cat-races",archetypes:"cat-archetypes",feats:"cat-feats",traits:"cat-traits",spells:"cat-spells",monsters:"cat-monsters",npcs:"cat-npcs",items:"cat-items",rules:"cat-rules",hazards:"cat-hazards",deities:"deities-pantheon"};
  // Apostrophes are DROPPED, not turned into separators: "Bull's Strength" -> bulls-strength.
  // The prompt packs slug filenames the same way, and when these two rules disagreed the art
  // for that spell existed but was unreachable — the app looked for bull-s-strength forever.
  // Any change here must match tools/ and the prompt packs.
  function artKey(s){ return (""+s).toLowerCase().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); }
  // Two different questions, two different lists — conflating them is what made the gallery
  // claim every backdrop existed when a third of them had not been drawn yet:
  //   ART_PLANNED — every key we INTEND to have. Hand-maintained; the roadmap. Drives the gallery.
  //   ART         — every key that is actually ON DISK RIGHT NOW. Generated into data/art.js by
  //                 tools/gen-art-manifest.mjs at ingest time, so it can never drift from reality.
  // Resolution gates on ART, so a planned-but-undrawn image is never requested and never 404s.
  var ART_PLANNED={};
  ("cat-archetypes,cat-classes,cat-classoptions,cat-feats,cat-hazards,cat-items,cat-monsters,cat-npcs,cat-races,"+
   "cat-rules,cat-skills,cat-spells,cat-traits,class-alchemist,class-antipaladin,class-arcanist,class-barbarian,"+
   "class-bard,class-bloodrager,class-brawler,class-cavalier,class-cleric,class-druid,class-fighter,class-gunslinger,"+
   "class-hunter,class-inquisitor,class-investigator,class-kineticist,class-magus,class-medium,class-mesmerist,"+
   "class-monk,class-ninja,class-occultist,class-oracle,class-paladin,class-psychic,class-ranger,class-rogue,"+
   "class-samurai,class-shaman,class-skald,class-slayer,class-sorcerer,class-spiritualist,class-summoner,"+
   "class-swashbuckler,class-vigilante,class-warpriest,class-witch,class-wizard,deities-pantheon,home-hero,"+
   "home-parchment,misc-dice,page-glossary,page-mycharacters,page-starthere,page-texture,race-aasimar,race-catfolk,"+
   "race-drow,race-dwarf,race-elf,race-gnome,race-goblin,race-half-elf,race-half-orc,race-halfling,race-human,"+
   "race-kobold,race-lizardfolk,race-orc,race-oread,race-ratfolk,race-tengu,race-tiefling,school-abjuration,"+
   "school-conjuration,school-divination,school-enchantment,school-evocation,school-illusion,school-necromancy,"+
   "school-transmutation,tool-combat,tool-critfumble,tool-encounter,tool-featweb,tool-gmscreen,tool-initiative,"+
   "tool-names,tool-npc,tool-randomencounter,tool-shop,tool-spellprice,tool-trap,tool-treasure,tool-weather,"+
   "type-aberration,type-animal,type-celestial,type-construct,type-dragon,type-dragon-chromatic,type-dragon-metallic,"+
   "type-elemental,type-fey,type-fiend,type-giant,type-humanoid,type-monstrous-humanoid,type-ooze,type-plant,"+
   "type-undead,type-vermin,"+
   "class-shifter,creature-aeon,creature-agathion,creature-air,creature-angel,creature-aquatic,creature-archon,,"+
   "creature-asura,creature-augmented,creature-augmented-humanoid,creature-azata,creature-boggard,,"+
   "creature-chaotic,creature-clockwork,creature-cold,creature-daemon,creature-dark-folk,creature-demon,,"+
   "creature-derro,creature-devil,creature-div,creature-dwarf,creature-earth,creature-elemental,creature-elf,,"+
   "creature-evil,creature-extraplanar,creature-fire,creature-giant,creature-gnoll,creature-goblinoid,,"+
   "creature-good,creature-great-old-one,creature-herald,creature-human,creature-incorporeal,,"+
   "creature-inevitable,creature-kami,creature-kyton,creature-lawful,creature-leshy,creature-mythic,,"+
   "creature-native,creature-oni,creature-orc,creature-planar,creature-protean,creature-psychopomp,,"+
   "creature-qlippoth,creature-rakshasa,creature-ratfolk,creature-reptilian,creature-robot,creature-sahkil,,"+
   "creature-shapechanger,creature-swarm,creature-troop,creature-water,feat-achievement,feat-blood-hex,,"+
   "feat-combat,feat-critical,feat-damnation,feat-esoteric,feat-familiar,feat-grit,feat-item-creation,,"+
   "feat-item-mastery,feat-meditation,feat-metamagic,feat-panache,feat-stare,feat-story,feat-teamwork,,"+
   "feat-weapon-mastery,item-armor,item-armorset-1,item-armorset-2,item-armorset-3,item-armorset-4,,"+
   "item-armorset-5,item-armorset-6,item-artifact,item-belt,item-body,item-chest,item-cursed,item-eyes,,"+
   "item-feet,item-generalstore,item-hands,item-head,item-headband,item-held,item-intelligent,item-neck,,"+
   "item-potion,item-ring,item-rod,item-shield,item-shoulders,item-staff,item-technology,item-weapon-1,,"+
   "item-weapon-2,item-weapon-3,item-weapon-4,item-weapon-5,item-weapon-6,item-wondrous,item-wrists,race-adaro,,"+
   "race-android,race-aphorite,race-aquatic-elf,race-astomoi,race-being-of-ib,race-boggard,race-caligni,,"+
   "race-cecaelia,race-changeling,race-deep-one-hybrid,race-dhampir,race-drow-noble,race-duergar,,"+
   "race-duskwalker,race-fetchling,race-ganzi,race-gathlain,race-ghoran,race-gillman,race-green-martian,,"+
   "race-grindylow,race-grippli,race-hobgoblin,race-ifrit,race-kasatha,race-kitsune,race-kuru,race-lashunta,,"+
   "race-locathah,race-merfolk,race-monkey-goblin,race-munavri,race-nagaji,race-naiad,race-orang-pendak,,"+
   "race-primitive-human,race-reborn-samsaran,race-reptoid,race-rougarou,race-sahuagin,race-samsaran,,"+
   "race-shabti,race-skinwalker,race-strix,race-suli,race-svirfneblin,race-sylph,race-syrinx,race-triaxian,,"+
   "race-triton,race-trox,race-undine,race-vanara,race-vine-leshy,race-vishkanya,race-wayang,race-wyrwood,,"+
   "race-wyvaran,race-yaddithian,spell-aid,spell-air-walk,spell-antilife-shell,spell-antimagic-field,,"+
   "spell-astral-projection,spell-baleful-polymorph,spell-banishment,spell-barkskin,spell-black-tentacles,,"+
   "spell-blade-barrier,spell-bless,spell-blessing-of-fervor,spell-blur,spell-breath-of-life,,"+
   "spell-bulls-strength,spell-call-lightning,spell-chain-lightning,spell-charm-monster,spell-charm-person,,"+
   "spell-cloudkill,spell-color-spray,spell-commune,spell-cone-of-cold,spell-confusion,spell-contingency,,"+
   "spell-control-weather,spell-create-greater-undead,spell-create-water,spell-cure-light-wounds,,"+
   "spell-cure-serious-wounds,spell-daylight,spell-death-ward,spell-delay-poison,spell-destruction,,"+
   "spell-detect-magic,spell-detect-poison,spell-dimension-door,spell-discern-location,spell-disintegrate,,"+
   "spell-dispel-magic,spell-dispel-magic-greater,spell-displacement,spell-divine-favor,spell-divine-power,,"+
   "spell-dominate-monster,spell-dominate-person,spell-earthquake,spell-energy-drain,spell-enervation,,"+
   "spell-enlarge-person,spell-entangle,spell-ethereal-jaunt,spell-euphoric-tranquility,spell-feeblemind,,"+
   "spell-find-the-path,spell-finger-of-death,spell-fire-storm,spell-fireball,spell-flame-strike,,"+
   "spell-flesh-to-stone,spell-fly,spell-freedom-of-movement,spell-gate,spell-glitterdust,spell-grease,,"+
   "spell-guidance,spell-harm,spell-haste,spell-heal,spell-heal-mass,spell-heroes-feast,spell-hold-person,,"+
   "spell-holy-aura,spell-holy-smite,spell-holy-word,spell-horrid-wilting,spell-implosion,spell-invisibility,,"+
   "spell-invisibility-greater,spell-invisibility-purge,spell-irresistible-dance,spell-light,,"+
   "spell-lightning-bolt,spell-limited-wish,spell-mage-armor,spell-mage-hand,spell-magic-missile,,"+
   "spell-magic-vestment,spell-maze,spell-meteor-swarm,spell-mind-blank,spell-miracle,spell-mirror-image,,"+
   "spell-mislead,spell-moment-of-prescience,spell-obscuring-mist,spell-overland-flight,spell-plane-shift,,"+
   "spell-polar-ray,spell-prayer,spell-prestidigitation,spell-prismatic-sphere,spell-prismatic-spray,,"+
   "spell-purify-food-and-drink,spell-raise-dead,spell-read-magic,spell-regenerate,spell-remove-disease,,"+
   "spell-remove-fear,spell-repulsion,spell-restoration,spell-restoration-greater,spell-reverse-gravity,,"+
   "spell-righteous-might,spell-rope-trick,spell-sanctuary,spell-scorching-ray,spell-searing-light,,"+
   "spell-see-invisibility,spell-shapechange,spell-shield,spell-shield-of-faith,spell-silence,spell-slay-living,,"+
   "spell-sleep,spell-slow,spell-soul-bind,spell-sound-burst,spell-spell-immunity,spell-spell-turning,,"+
   "spell-spiritual-weapon,spell-stabilize,spell-stinking-cloud,spell-stoneskin,spell-storm-of-vengeance,,"+
   "spell-symbol-of-death,spell-teleport,spell-temporal-stasis,spell-time-stop,spell-true-resurrection,,"+
   "spell-true-seeing,spell-vampiric-touch,spell-wall-of-fire,spell-wall-of-force,spell-wall-of-stone,spell-web,,"+
   "spell-weird,spell-wish,spell-word-of-recall,trait-campaign,trait-combat,trait-cosmic,trait-drawback,,"+
   "trait-equipment,trait-exemplar,trait-faction,trait-faith,trait-family,trait-magic,trait-mount,trait-race,,"+
   "trait-region,trait-religion,trait-social").split(",").forEach(function(k){ k=k.trim(); if(k) ART_PLANNED[k]=1; });
  // What is genuinely on disk. Falls back to the plan if the manifest is missing, so a stale
  // deploy degrades to the old behaviour rather than losing every backdrop at once.
  var ART={};
  (window.PF_ART && window.PF_ART.length ? window.PF_ART : Object.keys(ART_PLANNED))
    .forEach(function(k){ ART[k]=1; });
  function have(k){ return k && ART[k] ? k : null; }
  var PRESTIGE="Prestige Classes";
  // Class entries that have no art of their own but clearly belong to one that does.
  // Prestige classes are mapped to the base class they read as; orders/oaths/bloodlines and
  // the Unchained variants are handled by pattern below. Costs no images at all.
  var CLASS_INHERIT={
    // --- prestige classes -> the base class each reads as ---
    "Agent of the Grave":"wizard","Aldori Swordlord":"fighter","Arcane Archer":"ranger",
    "Arcane Trickster":"rogue","Arclord of Nex":"wizard","Argent Dramaturge":"bard","Asavir":"cavalier",
    "Ashavic Dancer":"bard","Aspis Agent":"rogue","Assassin":"rogue","Balanced Scale of Abadar":"cleric",
    "Battle Herald":"cavalier","Bellflower Tiller":"rogue","Blackfire Adept":"sorcerer","Bloatmage":"wizard",
    "Brewkeeper":"cleric","Brightness Seeker":"monk","Brother of the Seal":"monk","Champion of Irori":"monk",
    "Chernasardo Warden":"ranger","Chevalier":"cavalier","Crimson Templar":"inquisitor","Cyphermage":"wizard",
    "Daggermark Poisoner":"alchemist","Daivrat":"summoner","Darechaser":"swashbuckler",
    "Dawnflower Anchorite":"monk","Dawnflower Dissident":"cleric","Death Slayer":"inquisitor",
    "Demoniac":"antipaladin","Devoted Muse":"bard","Diabolist":"wizard","Divine Scion":"cleric",
    "Dragon Disciple":"sorcerer","Duelist":"swashbuckler","Eldritch Knight":"magus",
    "Enchanting Courtesan":"bard","Envoy of Balance":"cleric","Esoteric Knight":"magus","Evangelist":"cleric",
    "Exalted":"cleric","Feysworn":"druid","Genie Binder":"summoner","Golden Legionnaire":"paladin",
    "Gray Corsair":"fighter","Gray Gardener":"inquisitor","Green Faith Acolyte":"druid",
    "Halfling Opportunist":"rogue","Harrower":"oracle","Hellknight":"fighter","Hellknight Signifer":"wizard",
    "Heritor Knight":"cavalier","Hinterlander":"ranger","Holy Vindicator":"cleric","Horizon Walker":"ranger",
    "Inheritor's Crusader":"paladin","Inner Sea Pirate":"swashbuckler","Justicar":"inquisitor",
    "Knight of Ozem":"paladin","Lantern Bearer":"ranger","Liberator":"paladin","Lion Blade":"rogue",
    "Living Monolith":"fighter","Loremaster":"wizard","Low Templar":"fighter","Magaambyan Arcanist":"wizard",
    "Mammoth Rider":"barbarian","Master Chymist":"alchemist","Master Spy":"rogue","Mortal Usher":"cleric",
    "Mystery Cultist":"oracle","Mystic Theurge":"cleric","Nature Warden":"druid","Noble Scion":"cavalier",
    "Pain Taster":"cleric","Pathfinder Chronicler":"bard","Pathfinder Delver":"rogue",
    "Pathfinder Field Agent":"rogue","Pathfinder Savant":"wizard","Pit Fighter":"brawler","Proctor":"cleric",
    "Prophet of Kalistrade":"cleric","Pure Legion Enforcer":"inquisitor","Rage Prophet":"barbarian",
    "Razmiran Priest":"sorcerer","Red Mantis Assassin":"rogue","Riftwarden":"wizard","Ritualist":"occultist",
    "Rivethun Emissary":"shaman","Rose Warden":"cavalier","Runeguard":"fighter","Sacred Sentinel":"cleric",
    "Sanguine Angel":"paladin","Scar Seeker":"inquisitor","Sentinel":"cleric","Shackles Pirate":"swashbuckler",
    "Shadowdancer":"rogue","Shieldmarshal":"gunslinger","Skyseeker":"fighter","Sleepless Detective":"investigator",
    "Soul Warden":"cleric","Souldrinker":"antipaladin","Sphere Singer":"bard","Spherewalker":"cleric",
    "Stalwart Defender":"fighter","Stargazer":"wizard","Steel Falcon":"paladin","Storm Kindler":"druid",
    "Student of Perfection":"monk","Student of War":"fighter","Tattooed Mystic":"wizard","Technomancer":"wizard",
    "Thuvian Alchemist":"alchemist","Twilight Talon":"ranger","Ulfen Guard":"fighter",
    "Umbral Court Agent":"rogue","Veiled Illusionist":"wizard","Westcrown Devil":"rogue","Winter Witch":"witch",
    // --- companions, NPC classes and odds and ends ---
    "Ronin":"samurai","Companion":"druid","Drake":"hunter","Eidolon":"summoner","Familiar":"wizard",
    "Phantom":"spiritualist","Adept":"cleric","Aristocrat":"cavalier","Commoner":"rogue","Expert":"investigator",
    "Warrior":"fighter","Telekinetic Invisibility":"psychic",
    // --- bloodrager bloodlines (they sit in the class bucket under their bare name) ---
    "Aerial":"bloodrager","Anarchic":"bloodrager","Bedrock":"bloodrager","Brutal":"bloodrager",
    "Dark Fey":"bloodrager","Empyreal":"bloodrager","Envenomed":"bloodrager","Groveborn":"bloodrager",
    "Karmic":"bloodrager","Lifewater":"bloodrager","Linnorm":"bloodrager","Pit-Touched":"bloodrager",
    "Primal":"bloodrager","Retribution":"bloodrager","Rime-Blooded":"bloodrager","Sage":"bloodrager",
    "Sanguine":"bloodrager","Seaborn":"bloodrager","Shahzada":"bloodrager","Sylvan":"bloodrager",
    "Umbral":"bloodrager","Visionary":"bloodrager","Void-Touched":"bloodrager","Warped":"bloodrager"
  };
  function inheritedClassArt(name){
    var n=String(name||"");
    if(/^Order of\b/i.test(n)) return have("class-cavalier");            // 37 cavalier/samurai orders
    if(/^Oath\b/i.test(n))     return have("class-paladin");             // 15 paladin oaths
    // Rogue (Unchained) -> rogue. Fall through to the map when the base has no art of its
    // own either, so Eidolon (Unchained) still reaches summoner via Eidolon.
    var un=n.match(/^(.*?)\s*\(Unchained\)$/i);
    if(un) return have("class-"+artKey(un[1])) || (CLASS_INHERIT[un[1]] ? have("class-"+CLASS_INHERIT[un[1]]) : null);
    var m=CLASS_INHERIT[n];
    return m ? have("class-"+m) : null;
  }
  // The category backdrop every entry falls back to, so no page is ever bare — the same map
  // the category landing pages use. Deliberately NOT a second copy: they must never diverge.
  var CAT_FALLBACK=CAT_ART;
  // FNV-1a. Used to give each weapon/armour entry a stable variant — the data does not
  // record damage type for 83% of weapons or armour class for 84% of armour, so the choice
  // is arbitrary but must be the SAME arbitrary choice on every visit.
  function hash32(s){ var h=2166136261; for(var i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0; } return h; }
  var SLOT_ART={armor:"armor",weapon:"weapon",shield:"shield",head:"head",helmet:"head",face:"head",mask:"head",
    ears:"head",headband:"headband",brain:"headband",eyes:"eyes",eye:"eyes",goggles:"eyes",neck:"neck",amulet:"neck",
    necklace:"neck",shoulders:"shoulders",shoulder:"shoulders",cloak:"shoulders",mantle:"shoulders",back:"shoulders",
    chest:"chest",body:"body",torso:"body",belt:"belt",waist:"belt",wrist:"wrists",wrists:"wrists",arm:"wrists",
    arms:"wrists",hand:"hands",hands:"hands",gloves:"hands",gauntlet:"hands",feet:"feet",boots:"feet",legs:"feet",
    ring:"ring",held:"held",rod:"held"};
  var ITEM_CAT_ART={"Rings":"ring","Rods":"rod","Staves":"staff","Artifacts":"artifact","Cursed Items":"cursed",
    "Intelligent Items":"intelligent","Potions & Oils":"potion","Pharmaceuticals":"potion","Technology":"technology",
    "Cybertech":"technology","Psi-Tech":"technology"};
  function itemArt(row, push){
    var raw=row[I_RAW]||"", slot=String((row[I_FAC]||{}).slot||"").toLowerCase();
    if(raw==="Weapons") return push("item-weapon-"+(hash32(row[I_ID])%6+1));
    if(raw==="Armor")   return push("item-armorset-"+(hash32(row[I_ID])%6+1));
    if(ITEM_CAT_ART[raw]) push("item-"+ITEM_CAT_ART[raw]);
    if(SLOT_ART[slot])    push("item-"+SLOT_ART[slot]);
    if(raw==="Wondrous Items") push("item-wondrous");
    push("item-generalstore");
  }
  // Candidates, most specific first. applyArt walks the list and uses the first that loads,
  // so art that has not been generated yet simply falls through to the next choice.
  // Keys drawn from a SMALL closed vocabulary (trait/feat/creature/item) are offered
  // unconditionally and light up the moment their file lands. Keys drawn per-entry across
  // thousands of rows (spell-<name>, a monster matching a race) are gated on ART so we don't
  // fire thousands of 404s for art that will never exist.
  function entryArtKey(row){
    var b=row[I_SLUG], fac=row[I_FAC]||{}, nm=artKey(row[I_NAME]), out=[];
    function push(k){ if(k) out.push(k); }
    if(b==="classes"){ push("class-"+nm); push(inheritedClassArt(row[I_NAME])); }
    else if(b==="races") push("race-"+nm);
    else if(b==="deities") push("deities-pantheon");
    else if(b==="archetypes"){ var c=[].concat(fac.cls||[])[0]; if(c) push(have("class-"+artKey(c))); }
    else if(b==="traits"){ if(fac.cat) push("trait-"+artKey(fac.cat)); }
    else if(b==="feats"){ if(fac.t) push("feat-"+artKey(fac.t)); }
    else if(b==="items") itemArt(row, push);
    else if(b==="spells"){
      push(have("spell-"+nm));
      if(fac.sch && fac.sch!=="universal") push(have("school-"+fac.sch));
    }
    else if(b==="monsters"){
      push(have("race-"+nm));                                   // Goblin, Orc, Kobold, Drow…
      if(fac.st) push("creature-"+artKey(fac.st));              // demon, devil, psychopomp…
      var t=artKey(fac.t||""), al=String(fac.al||"");
      // Chromatic/metallic dragons and the celestial/fiend/elemental outsider families read off alignment.
      if(t==="dragon")        push(/E$/.test(al)?"type-dragon-chromatic":(/G$/.test(al)?"type-dragon-metallic":"type-dragon"));
      else if(t==="outsider") push(/G$/.test(al)?"type-celestial":(/E$/.test(al)?"type-fiend":"type-elemental"));
      // Real giants are humanoid(giant). Name alone is NOT enough: AON inverts names, so
      // "Ant, Giant" and "Beetle, Giant" also end in "giant" — they're vermin.
      if(t==="humanoid" && /giant/i.test(row[I_NAME])) push("type-giant");
      push(have("type-"+t));
    }
    push(CAT_FALLBACK[b]);
    return out;
  }
  // Every tool/utility view builds the same `.list-head` header, so their backdrops are wired
  // once here off the route rather than editing 16 view functions.
  var ROUTE_ART={"/ref":"tool-combat","/combat":"tool-combat","/gm":"tool-gmscreen","/names":"tool-names",
    "/featweb":"tool-featweb","/init":"tool-initiative","/treasure":"tool-treasure","/npc":"tool-npc",
    "/encounter":"tool-encounter","/shop":"tool-shop","/randenc":"tool-randomencounter","/trap":"tool-trap",
    "/critfumble":"tool-critfumble","/spellprice":"tool-spellprice","/weather":"tool-weather",
    "/fav":"page-mycharacters","/cheat":"page-glossary","/stacking":"misc-dice","/thing":"tool-names",
    "/cards":"home-parchment","/compare":"cat-classoptions","/recent":"cat-rules","/timeline":"tool-gmscreen"};
  function applyRouteArt(hash){ var k=ROUTE_ART[hash]; if(k) applyArt(document.querySelector("#main .list-head"), k); }
  // Takes one key or a most-specific-first list. Tries each in turn and uses the first that
  // actually loads, so a key whose file has not been generated yet degrades to the next
  // candidate instead of leaving the page bare. A key that 404s is remembered for the rest
  // of the session, so a missing image costs at most one request.
  var ART_MISS={};
  function applyArt(el, keys){
    if(!el||!keys) return;
    var list=[].concat(keys).filter(Boolean);
    (function next(){
      while(list.length && ART_MISS[list[0]]) list.shift();
      var key=list.shift(); if(!key) return;
      try{
        var im=new Image();
        im.onload=function(){ el.style.setProperty("--art",'url("art/'+key+'.jpg")'); el.classList.add("has-art"); };
        im.onerror=function(){ ART_MISS[key]=1; next(); };
        im.src="art/"+key+".jpg";
      }catch(e){}
    })();
  }
  var HERO_EMBLEM='<svg class="hero-emblem" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M48 8l30 10v21c0 24-17 38-30 45-13-7-30-21-30-45V18z"/><path d="M48 28v38M35 42h26"/><circle cx="48" cy="23" r="3.2" fill="currentColor" stroke="none"/></svg>';
  function homeHero(){
    var b=h("div",{class:"home-hero"});
    var frieze=["spells","monsters","feats","classes","items","deities","traits"].map(function(s){ return '<a class="frieze-i" href="#/c/'+s+'" title="'+esc(LABEL[s]||cap(s))+'" style="color:'+color(s)+'">'+categoryScene(s)+'</a>'; }).join("");
    b.innerHTML=ornCorners()+HERO_EMBLEM
      +'<h1>The PF1e Codex</h1>'
      +'<p>Your offline <span class="total">'+META.total.toLocaleString()+'</span> Pathfinder 1st Edition rules — search, browse, no internet required.</p>'
      +'<div class="home-frieze">'+frieze+'</div>';
    applyArt(b, "home-hero");
    return b;
  }
  function catSplash(slug, title, meta, intro){
    var b=h("div",{class:"cat-splash"}); b.style.setProperty("--c", color(slug));
    var artKey = SCENE[(""+title).toLowerCase()] ? (""+title).toLowerCase() : slug; // e.g. "Skills" sub of rules → lockpick scene
    b.innerHTML = ornCorners()
      + '<div class="cat-splash-body"><h2>'+esc(title)+'</h2><div class="cat-splash-meta">'+esc(meta)+'</div>'
      + (intro?'<div class="cat-splash-intro">'+esc(intro)+'</div>':'') + '</div>'
      + '<div class="cat-splash-art">'+categoryScene(artKey)+'</div>';
    var imgKey = ((""+title).toLowerCase()==="skills") ? "cat-skills" : CAT_ART[slug];
    applyArt(b, imgKey);
    return b;
  }

  // Plain-language "what is this?" intros, by bucket slug and by sub-type name.
  var INTRO={
    classes:"What your character does in play. Pick one class as the heart of your build.",
    options:"Extra choices that customize a class — bloodlines, talents, domains, and more.",
    races:"Your character's ancestry, granting a few ability bonuses and special traits.",
    archetypes:"Alternate versions of a class that swap some features for a themed set.",
    feats:"Special tricks and abilities you choose as your character gains levels.",
    traits:"Small starting bonuses that reflect your character's background.",
    spells:"Magic your spellcasters can cast, from minor cantrips to reality-bending effects.",
    monsters:"Creatures and foes with full stats for the GM to run.",
    npcs:"Pre-built characters and stat blocks (setting flavor).",
    items:"Weapons, armor, gear, and magic items to use or find.",
    rules:"How the game actually works — combat, skills, conditions, and the core mechanics.",
    hazards:"Dangers like poisons, diseases, curses, and haunts.",
    deities:"The gods of the setting — their domains, weapons, and portfolios (setting flavor).",
    "Bloodlines":"The source of a sorcerer's or bloodrager's power — grants bonus spells and abilities.",
    "Mysteries":"An oracle's divine theme — grants revelations and bonus spells.",
    "Domains":"A cleric's spheres of divine power — grant bonus spells and granted powers.",
    "Wild Talents":"The elemental powers a kineticist learns.",
    "Exploits":"Special tricks an arcanist can learn.",
    "Base Classes":"The core classes — the heart of any character.",
    "Prestige Classes":"Advanced classes you qualify for after meeting prerequisites.",
    "Definitions":"Plain definitions of common game terms — your glossary."
  };
  function introFor(slug,sub){ return (sub&&INTRO[sub]) || INTRO[slug] || ""; }

  // Jargon tooltips: wrap common abbreviations so hovering explains them.
  var GLOSS={AC:"Armor Class — how hard you are to hit",BAB:"Base Attack Bonus — your baseline attack skill",
    CMB:"Combat Maneuver Bonus — skill at trips, grapples, and the like",CMD:"Combat Maneuver Defense — how hard you are to trip or grapple",
    DR:"Damage Reduction — ignores some damage unless bypassed",SR:"Spell Resistance — a chance to shrug off a spell",
    DC:"Difficulty Class — the number you must meet or beat on a roll",HP:"Hit Points — how much damage you can take",
    CR:"Challenge Rating — a monster's difficulty",XP:"Experience Points",CL:"Caster Level",
    AoO:"Attack of Opportunity — a free attack when a foe drops their guard",Sp:"Spell-Like Ability",
    Su:"Supernatural Ability",Ex:"Extraordinary Ability",Fort:"Fortitude save — resists poison, disease, physical effects",
    Ref:"Reflex save — dodges area effects",Will:"Will save — resists mind-affecting and magical effects"};
  var GLOSS_RE=new RegExp("\\b("+Object.keys(GLOSS).join("|")+")\\b","g");
  function glossify(s){ return s.replace(GLOSS_RE,function(m){ return '<abbr class="gl" title="'+GLOSS[m].replace(/"/g,"&quot;")+'">'+m+'</abbr>'; }); }
  function idById(){ if(!idById._m){ idById._m={}; for(var i=0;i<IDX.length;i++) idById._m[IDX[i][I_ID]]=IDX[i]; } return idById._m; }

  // ---- helpers ----
  var $ = function (s, r) { return (r||document).querySelector(s); };
  function esc(t){ return (t||"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function cap(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
  function h(tag, attrs, html){ var e=document.createElement(tag); if(attrs) for(var k in attrs){ if(k==="class")e.className=attrs[k]; else if(k==="html")e.innerHTML=attrs[k]; else e.setAttribute(k,attrs[k]); } if(html!=null)e.innerHTML=html; return e; }
  var main = $("#main");

  // ---- body -> pretty stat-block html ----
  var FIELDS = ["Source","School","Level","Casting Time","Casting","Components","Range","Area","Targets","Target",
    "Effect","Duration","Saving Throw","Spell Resistance","Description","Prerequisites","Prerequisite","Benefit",
    "Normal","Special","CR","XP","Init","Senses","Aura","AC","hp","HP","Fort","Ref","Will","Defensive Abilities",
    "DR","Immune","Resist","SR","Weaknesses","Speed","Melee","Ranged","Space","Reach","Str","Dex","Con","Int",
    "Wis","Cha","Base Atk","CMB","CMD","Feats","Skills","Languages","SQ","Ecology","Environment","Organization",
    "Treasure","Price","Cost","Weight","Slot","Trigger","Requirement","Requirements","Statistics","Offense","Defense"];
  var FIELD_RE = new RegExp("(^|;\\s+|\\.\\s+)(" + FIELDS.map(function(f){return f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}).join("|") + ")\\b", "g");

  // ---- cross-links: turn references to other entries into links ----
  function norm(s){ return s.toLowerCase().replace(/[’]/g,"'").replace(/[\s\-]+/g," ").trim(); }
  var FIELD_STOP={}; FIELDS.forEach(function(f){ if(f.indexOf(" ")>=0) FIELD_STOP[norm(f)]=1; });
  ["base attack bonus","hit dice","caster level","will save","fort save","reflex save"].forEach(function(x){FIELD_STOP[x]=1;});
  var _lmap=null;
  function linkMap(){
    if(_lmap) return _lmap;
    var m={}, amb={};
    for(var i=0;i<IDX.length;i++){
      var nm=IDX[i][I_NAME];
      if(nm.indexOf(" ")<0 || nm.length<6) continue;   // multi-word, distinctive names only
      var k=norm(nm); if(FIELD_STOP[k]) continue;
      if(m[k]!==undefined) amb[k]=1; else m[k]=IDX[i][I_ID];
    }
    for(var k in amb) m[k]="?";                          // ambiguous -> link to a search
    _lmap=m; return m;
  }
  function boldGloss(str){ return glossify(esc(str).replace(FIELD_RE, function(m,pre,lab){ return pre+"<strong>"+lab+"</strong>"; })); }
  function linkifyLine(ln, curId){
    var map=linkMap(), re=/[A-Za-z][A-Za-z'’]*/g, toks=[], m;
    while((m=re.exec(ln))) toks.push([m.index, re.lastIndex]);
    var out="", pos=0, i=0;
    while(i<toks.length){
      var matched=false, maxLen=Math.min(6, toks.length-i);
      for(var len=maxLen; len>=2; len--){
        var ok=true;
        for(var k=i;k<i+len-1;k++){ if(!/^[ \-]?$/.test(ln.slice(toks[k][1], toks[k+1][0]))){ ok=false; break; } }
        if(!ok) continue;
        var phrase=ln.slice(toks[i][0], toks[i+len-1][1]);
        var id=map[norm(phrase)];
        if(id!==undefined && id!==curId){
          out += boldGloss(ln.slice(pos, toks[i][0]));
          var href = id==="?" ? "#/s/"+encodeURIComponent(phrase) : "#/e/"+encodeURIComponent(id);
          out += '<a class="xref" href="'+href+'">'+esc(phrase)+'</a>';
          pos=toks[i+len-1][1]; i+=len; matched=true; break;
        }
      }
      if(!matched) i++;
    }
    out += boldGloss(ln.slice(pos));
    return out;
  }
  // Real HTML rules tables (data/tables.js -> window.PF_TABLES[id]).
  function normLine(s){ return (s||"").toLowerCase().replace(/\s+/g," ").trim(); }
  function renderStructTable(t){
    var rows=t.r||[]; if(!rows.length) return "";
    var html='<div class="tablewrap"><table class="rt">', start=0;
    if(t.hdr){ html+='<thead><tr>'+rows[0].map(function(c){return '<th>'+glossify(esc(c))+'</th>';}).join("")+'</tr></thead>'; start=1; }
    html+='<tbody>';
    for(var i=start;i<rows.length;i++){ html+='<tr>'+rows[i].map(function(c){return '<td>'+glossify(esc(c))+'</td>';}).join("")+'</tr>'; }
    return html+'</tbody></table></div>';
  }
  // PF stat-block section headers (whole-line, case-insensitive) → tapered-rule dividers
  var SB_HEADS={defense:1,offense:1,statistics:1,ecology:1,tactics:1,"special abilities":1,description:1,casting:1,effect:1,construction:1,destruction:1,requirements:1};
  function fmtBody(body, source, curId){
    var lines = body.split("\n");
    var tabs=(window.PF_TABLES && window.PF_TABLES[curId]) || [];
    // locate each fetched table's flattened rows in the body (rows are one-per-line)
    var mark={}, used={}, matched=tabs.map(function(){return false;});
    tabs.forEach(function(t,ti){
      var rows=t.r||[]; if(rows.length<2) return;
      var k0=normLine(rows[0].join(" ")), k1=normLine(rows[1].join(" "));
      for(var i=0;i<lines.length;i++){
        if(used[i] || normLine(lines[i])!==k0) continue;
        if(lines[i+1]!==undefined && normLine(lines[i+1])!==k1) continue;
        mark[i]={t:t, span:rows.length}; matched[ti]=true;
        for(var j=0;j<rows.length && i+j<lines.length;j++) used[i+j]=1;
        break;
      }
    });
    var out=[], blank=0, i=0;
    while(i<lines.length){
      if(mark[i]){ out.push(renderStructTable(mark[i].t)); i+=mark[i].span; blank=0; continue; }
      var ln=lines[i].replace(/\s+$/,""); i++;
      if(!ln.trim()){ if(blank++<1) out.push('<div class="gap"></div>'); continue; }
      blank=0;
      // classic stat-block section headers get the tapered-rule treatment (the signature "official" look)
      if(SB_HEADS[ln.trim().toLowerCase()]) out.push('<div class="sb-head">'+esc(ln.trim())+'</div>');
      else out.push('<div class="ln">'+linkifyLine(ln, curId)+'</div>');
    }
    tabs.forEach(function(t,ti){ if(!matched[ti]) out.push(renderStructTable(t)); }); // unmatched -> append
    var html = out.join("");
    if(source) html += '<div class="src">📖 Source: '+esc(source)+'</div>';
    html += '<div class="codex-note">Rules content used under the Open Game License 1.0a.</div>';
    return html;
  }

  // ---- views ----
  function setActiveNav(slug){ document.querySelectorAll(".nav-cat").forEach(function(b){ b.classList.toggle("active", b.dataset.slug===slug); }); }

  function renderStartHere(){
    var g=META.guide; var box=h("section",{class:"start"});
    if(!g) return box;
    applyArt(box, "page-starthere");
    box.appendChild(h("div",{class:"start-intro"},esc(g.intro)));
    box.appendChild(h("h3",{class:"start-h"},"Build a character — 7 steps"));
    var steps=h("div",{class:"steps"});
    (g.steps||[]).forEach(function(s){ var a=h("a",{class:"step",href:s.href});
      a.innerHTML='<span class="step-n">'+s.n+'</span><span class="step-b"><b>'+esc(s.label)+'</b><span>'+esc(s.desc)+'</span></span>'; steps.appendChild(a); });
    box.appendChild(steps);
    if(g.concepts&&g.concepts.length){
      box.appendChild(h("h3",{class:"start-h"},"Core rules to know"));
      var cc=h("div",{class:"chips"}); g.concepts.forEach(function(c){ cc.appendChild(h("a",{class:"chip lg",href:c.href},esc(c.label))); }); box.appendChild(cc);
    }
    return box;
  }
  function viewHome(){
    setActiveNav(null);
    var wrap = h("div");
    wrap.appendChild(homeHero());
    wrap.appendChild(renderStartHere());
    // recently viewed
    try{
      var rec=JSON.parse(localStorage.getItem("pf_recent")||"[]").map(function(id){return idById()[id];}).filter(Boolean);
      if(rec.length){ wrap.appendChild(h("h2",{class:"section-h"},"Recently viewed"));
        var rc=h("div",{class:"cards"}); rec.slice(0,6).forEach(function(row){ rc.appendChild(rowCard(row)); }); wrap.appendChild(rc); }
    }catch(e){}
    // group cards
    wrap.appendChild(h("h2",{class:"section-h"},"Browse everything"));
    (META.groups||[]).forEach(function(g){
      wrap.appendChild(h("h2",{class:"section-h sub"},g.name));
      var cards = h("div",{class:"cards"});
      g.cats.forEach(function(c){
        var a = h("a",{class:"card", href:"#/c/"+c.slug});
        a.style.setProperty("--c", color(c.slug));
        a.innerHTML = '<h3>'+esc(c.label)+'</h3><div class="sub">'+c.count.toLocaleString()+' entries</div>';
        cards.appendChild(a);
      });
      wrap.appendChild(cards);
    });
    // random featured
    wrap.appendChild(h("h2",{class:"section-h"},"Roll the dice"));
    var feat = h("div",{class:"cards"});
    randomN(6).forEach(function(row){ feat.appendChild(rowCard(row)); });
    var rb = h("button",{class:"more-btn"},"🎲  Show me something else");
    rb.onclick=function(){ render(); };
    wrap.appendChild(feat); wrap.appendChild(rb);
    swap(wrap);
  }
  function rowCard(row){
    var a=h("a",{class:"card",href:"#/e/"+encodeURIComponent(row[I_ID])});
    a.style.setProperty("--c",color(row[I_SLUG]));
    a.innerHTML='<h3>'+esc(row[I_NAME])+'</h3><div class="sub">'+esc(LABEL[row[I_SLUG]]||row[I_RAW])+'</div>';
    return a;
  }
  function randomN(n){ var out=[],seen={}; var lim=Math.min(n,IDX.length); while(out.length<lim){ var r=IDX[(Math.random()*IDX.length)|0]; if(!seen[r[I_ID]]){seen[r[I_ID]]=1;out.push(r);} } return out; }

  var LIST_STEP = 80;
  function subtypesOf(slug){
    var m={}, tot=0;
    for(var i=0;i<IDX.length;i++){ if(IDX[i][I_SLUG]===slug && !isJunkEntry(IDX[i])){ var s=IDX[i][I_RAW]; m[s]=(m[s]||0)+1; tot++; } }
    var arr=Object.keys(m).map(function(k){return [k,m[k]];}).sort(function(a,b){return b[1]-a[1];});
    arr.total=tot; return arr;
  }
  function letterOf(name){ var L=(name.charAt(0)||"#").toUpperCase(); return /[A-Z]/.test(L)?L:"#"; }

  function classCards(list){
    var g=h("div",{class:"cards"});
    list.forEach(function(c){ var a=h("a",{class:"card cls",href:"#/e/"+encodeURIComponent(c.id)}); a.style.setProperty("--c",color("classes"));
      a.innerHTML='<h3>'+esc(c.name)+(c.first?' <span class="tag-new">New-friendly</span>':'')+'</h3><div class="role">'+esc(c.role)+' · '+esc(c.cx)+'</div><div class="sub">'+esc(c.blurb)+'</div>'; g.appendChild(a); });
    return g;
  }
  function viewClassHub(){
    setActiveNav("classes");
    var cls=META.classes||[];
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>Classes</h2><span class="meta">'+cls.length+' classes · your character’s core</span>'; wrap.appendChild(head);
    wrap.appendChild(h("div",{class:"intro"},esc(INTRO.classes)));
    var fr=cls.filter(function(c){return c.first;});
    if(fr.length){ wrap.appendChild(h("h3",{class:"section-h"},"Good for first-timers")); wrap.appendChild(classCards(fr)); }
    wrap.appendChild(h("h3",{class:"section-h"},"All classes (A–Z)"));
    wrap.appendChild(classCards(cls.slice().sort(function(a,b){return a.name.localeCompare(b.name);})));
    var more=h("div",{class:"chips"});
    more.appendChild(h("a",{class:"chip lg",href:"#/c/classes/"+encodeURIComponent(PRESTIGE)},"⚔ Prestige Classes — "+((subtypesOf("classes").filter(function(x){return x[0]===PRESTIGE;})[0]||["",0])[1])+" advanced paths"));
    more.appendChild(h("a",{class:"chip",href:"#/c/classes/_all"},"Browse every class page A–Z (features, orders, bloodlines…)"));
    wrap.appendChild(more);
    swap(wrap); window.scrollTo(0,0);
  }
  function viewCategory(slug, sub, query){
    setActiveNav(slug); query=query||{};
    if(slug==="classes" && !sub && (META.classes||[]).length) return viewClassHub();
    var subs=subtypesOf(slug);
    var heterogeneous = subs.length>=5 && (subs[0][1]/subs.total) < 0.85;
    // --- sub-type landing: drill in by type instead of dumping thousands ---
    if(!sub && heterogeneous){
      var wrap=h("div");
      wrap.appendChild(catSplash(slug, LABEL[slug]||slug, subs.total.toLocaleString()+" entries · choose a type", introFor(slug,null)));
      var cards=h("div",{class:"cards"});
      var allc=h("a",{class:"card",href:"#/c/"+slug+"/_all"}); allc.style.setProperty("--c",color(slug));
      allc.innerHTML='<h3>All (A–Z)</h3><div class="sub">every entry, alphabetical</div>'; cards.appendChild(allc);
      subs.forEach(function(x){ var a=h("a",{class:"card",href:"#/c/"+slug+"/"+encodeURIComponent(x[0])}); a.style.setProperty("--c",color(slug));
        a.innerHTML='<h3>'+esc(x[0])+'</h3><div class="sub">'+x[1].toLocaleString()+' entries</div>'; cards.appendChild(a); });
      wrap.appendChild(cards); swap(wrap); window.scrollTo(0,0); return;
    }
    // --- list view (a sub selected, _all, or a simple bucket) ---
    var rows=IDX.filter(function(r){ return r[I_SLUG]===slug && !isJunkEntry(r) && (!sub || sub==="_all" || r[I_RAW]===sub); });
    rows.sort(function(a,b){ return a[I_NAME].localeCompare(b[I_NAME]); });
    var wrap=h("div");
    if(heterogeneous){ var bk=h("div",{class:"back"},"‹ All "+esc(LABEL[slug]||slug)+" types"); bk.onclick=function(){ location.hash="#/c/"+slug; }; wrap.appendChild(bk); }
    var title=(sub&&sub!=="_all")? sub : (LABEL[slug]||slug);
    wrap.appendChild(catSplash(slug, title, rows.length.toLocaleString()+" entries", introFor(slug,sub&&sub!=="_all"?sub:null)));
    var state={sub:null, letter:null, shown:LIST_STEP, filt:{}, sort:"", q:""};
    ["cls","lvl","sch","desc","save","bk","t","sz","al","slot","cat"].forEach(function(k){ if(query[k]) state.filt[k]=query[k]; });
    if(query.sort) state.sort=query.sort; if(query.letter) state.letter=query.letter; if(query.sub) state.sub=query.sub; if(query.q) state.q=query.q;
    function syncHash(){
      var parts=[]; for(var k in state.filt){ if(state.filt[k]) parts.push(k+"="+encodeURIComponent(state.filt[k])); }
      if(state.sort) parts.push("sort="+state.sort); if(state.letter) parts.push("letter="+state.letter); if(state.sub) parts.push("sub="+encodeURIComponent(state.sub)); if(state.q) parts.push("q="+encodeURIComponent(state.q));
      var nh="#/c/"+slug+(sub?"/"+encodeURIComponent(sub):"")+(parts.length?"?"+parts.join("&"):"");
      if(("#"+location.hash.replace(/^#/,""))!==("#"+nh.slice(1))) try{ history.replaceState(null,"",nh); }catch(e){}
    }
    // sub-type chips when a simple bucket has a few types (and we're not already sub-filtered)
    if(!sub && subs.length>1 && subs.length<=6){
      var chips=h("div",{class:"chips"});
      var all=h("button",{class:"chip"+(state.sub?"":" active")},"All"); all.onclick=function(){ state.sub=null; state.shown=LIST_STEP; selc(all,chips); paint(); }; chips.appendChild(all);
      subs.forEach(function(x){ var c=h("button",{class:"chip"+(state.sub===x[0]?" active":"")},esc(x[0])+" · "+x[1]); c.onclick=function(){ state.sub=x[0]; state.shown=LIST_STEP; selc(c,chips); paint(); }; chips.appendChild(c); });
      wrap.appendChild(chips);
    }
    // A–Z jump bar for long lists
    var present={}; rows.forEach(function(r){ present[letterOf(r[I_NAME])]=1; });
    if(rows.length>60){
      var az=h("div",{class:"chips az"});
      var la=h("button",{class:"chip"+(state.letter?"":" active")},"All"); la.onclick=function(){ state.letter=null; state.shown=LIST_STEP; selc(la,az); paint(); }; az.appendChild(la);
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("").forEach(function(L){ if(present[L]){ var c=h("button",{class:"chip"+(state.letter===L?" active":"")},L); c.onclick=function(){ state.letter=L; state.shown=LIST_STEP; selc(c,az); paint(); }; az.appendChild(c); } });
      wrap.appendChild(az);
    }
    function selc(btn,bar){ bar.querySelectorAll(".chip").forEach(function(x){x.classList.toggle("active",x===btn);}); }
    // universal search + filter + sort bar (every bucket)
    var fbar=h("div",{class:"filterbar"});
    var qin=h("input",{type:"search",class:"catsearch",placeholder:"Filter "+esc((LABEL[slug]||slug).toLowerCase())+" by name…",autocomplete:"off",spellcheck:"false"});
    qin.value=state.q||""; var _qt;
    qin.oninput=function(){ clearTimeout(_qt); _qt=setTimeout(function(){ state.q=qin.value; state.shown=LIST_STEP; paint(); },110); };
    fbar.appendChild(qin);
    var hasBk=false;
    if(FILTER_UI[slug]) FILTER_UI[slug].forEach(function(spec){
      if(spec[0]==="bk") hasBk=true;
      var sel=h("select"); sel.appendChild(new Option(spec[1],""));
      (spec[2]()||[]).forEach(function(o){ var lab=(spec[0]==="lvl")?("Level "+o):cap(String(o)); sel.appendChild(new Option(lab,o)); });
      sel.value=state.filt[spec[0]]||"";
      sel.onchange=function(){ state.filt[spec[0]]=sel.value; state.shown=LIST_STEP; paint(); };
      fbar.appendChild(sel);
    });
    if(!hasBk){ var books={}; rows.forEach(function(r){ var b=r[I_FAC]&&r[I_FAC].bk; if(b) books[b]=1; }); var bk=Object.keys(books).sort();
      if(bk.length>1){ var bsel=h("select"); bsel.appendChild(new Option("Any source","")); bk.forEach(function(b){ bsel.appendChild(new Option(b,b)); }); bsel.value=state.filt.bk||""; bsel.onchange=function(){ state.filt.bk=bsel.value; state.shown=LIST_STEP; paint(); }; fbar.appendChild(bsel); } }
    var ssel=h("select",{class:"sortsel"});
    ssel.appendChild(new Option("Sort: A → Z","az")); ssel.appendChild(new Option("Sort: Z → A","za")); ssel.appendChild(new Option("Sort: by source","src"));
    if(SORT_UI[slug]) SORT_UI[slug].forEach(function(o){ if(o[0]) ssel.appendChild(new Option(o[1],o[0])); });
    ssel.value=state.sort||"az"; ssel.onchange=function(){ state.sort=ssel.value; state.shown=LIST_STEP; paint(); };
    fbar.appendChild(ssel);
    var clr=h("button",{class:"chip clearf"},"Clear"); clr.onclick=function(){ state.q=""; qin.value=""; state.filt={}; state.sort="az"; fbar.querySelectorAll("select").forEach(function(s){s.selectedIndex=0;}); ssel.value="az"; state.shown=LIST_STEP; paint(); };
    fbar.appendChild(clr); wrap.appendChild(fbar);
    var listEl=h("div"); wrap.appendChild(listEl);
    function srcOf(r){ return String((r[I_FAC]&&r[I_FAC].bk)||(r[I_SRC]||"").split(",")[0]||""); }
    function paint(){
      var q=(state.q||"").trim().toLowerCase();
      var f=rows.filter(function(r){ return (!state.sub || r[I_RAW]===state.sub) && (!state.letter || letterOf(r[I_NAME])===state.letter)
        && (!q || r[I_NAME].toLowerCase().indexOf(q)>=0 || (r[I_SNIP]||"").toLowerCase().indexOf(q)>=0)
        && facetMatch(slug, r[I_FAC], state.filt); });
      if(state.sort==="za") f.sort(function(a,b){ return b[I_NAME].localeCompare(a[I_NAME]); });
      else if(state.sort==="src") f.sort(function(a,b){ return srcOf(a).localeCompare(srcOf(b)) || a[I_NAME].localeCompare(b[I_NAME]); });
      else if(state.sort && state.sort!=="az" && SORT_UI[slug]) f=facetSort(slug, f, state.sort);
      else f.sort(function(a,b){ return a[I_NAME].localeCompare(b[I_NAME]); });
      navSet(title, f);   // Prev/Next on an entry walks this exact filtered+sorted list
      listEl.innerHTML="";
      f.slice(0,state.shown).forEach(function(r){ listEl.appendChild(rowItem(r)); });
      if(f.length>state.shown){ var mb=h("button",{class:"more-btn"},"Load more ("+(f.length-state.shown)+" left)"); mb.onclick=function(){ state.shown+=LIST_STEP*4; paint(); }; listEl.appendChild(mb); }
      if(!f.length) listEl.appendChild(h("div",{class:"empty"},"Nothing here."));
      var mEl=wrap.querySelector(".cat-splash-meta");
      if(mEl){ var filtered=(f.length!==rows.length); mEl.textContent=(filtered? (f.length.toLocaleString()+" of "+rows.length.toLocaleString()+" entries") : (rows.length.toLocaleString()+" entries")); }
      syncHash();
    }
    paint(); swap(wrap); window.scrollTo(0,0);
  }
  function rowItem(r){
    var ic=identityColor(r);
    var a=h("a",{class:"row",href:"#/e/"+encodeURIComponent(r[I_ID])});
    a.style.setProperty("--ident", ic);
    a.innerHTML='<div class="rname">'+schoolPip(r)+esc(r[I_NAME])+'<span class="rtag" style="--c:'+ic+'">'+esc(r[I_RAW])+'</span></div>'+(r[I_SNIP]?'<div class="rsnip">'+esc(r[I_SNIP])+'</div>':'');
    return a;
  }

  // Boolean query: space = AND, "quoted phrase", leading - = exclude.
  function parseQuery(q){
    var lower=(q||"").toLowerCase(), phrases=[];
    lower=lower.replace(/"([^"]+)"/g,function(_,p){var t=p.trim();if(t)phrases.push(t);return " ";});
    var terms=[],excludes=[];
    lower.split(/\s+/).forEach(function(t){t=t.trim();if(!t)return;if(t.charAt(0)==="-"&&t.length>1)excludes.push(t.slice(1));else if(t)terms.push(t);});
    return {terms:terms,phrases:phrases,excludes:excludes,all:terms.concat(phrases)};
  }
  var DEEP=false; // full-text mode (needs all category bodies loaded)
  function loadAll(onProgress,done){
    var slugs=[]; (META.groups||[]).forEach(function(g){g.cats.forEach(function(c){slugs.push(c.slug);});});
    var total=slugs.length,left=total; if(!left)return done();
    slugs.forEach(function(s){ loadCat(s,function(){ left--; onProgress&&onProgress(total-left,total); if(left===0)done(); }); });
  }
  function runSearch(p){
    var res=[];
    for(var i=0;i<IDX.length;i++){
      var r=IDX[i]; if(isJunkEntry(r)) continue; var name=r[I_NAME].toLowerCase();
      var hay=name+" "+r[I_RAW].toLowerCase()+" "+(r[I_SNIP]||"").toLowerCase();
      if(DEEP){ var b=(BODIES[r[I_SLUG]]||{})[r[I_ID]]; if(b) hay+=" "+b.toLowerCase(); }
      var ok=true,j;
      for(j=0;j<p.terms.length;j++){ if(hay.indexOf(p.terms[j])<0){ok=false;break;} }
      if(ok) for(j=0;j<p.phrases.length;j++){ if(hay.indexOf(p.phrases[j])<0){ok=false;break;} }
      if(ok) for(j=0;j<p.excludes.length;j++){ if(hay.indexOf(p.excludes[j])>=0){ok=false;break;} }
      if(!ok) continue;
      var s=0; for(j=0;j<p.all.length;j++){ var pos=name.indexOf(p.all[j]); if(pos===0)s+=12; else if(pos>0)s+=8; }
      if(name===p.all.join(" "))s+=40;
      res.push([s,r]);
    }
    res.sort(function(a,b){ return b[0]-a[0] || a[1][I_NAME].length-b[1][I_NAME].length; });
    return res;
  }
  function viewSearch(q){
    setActiveNav(null);
    var p=parseQuery(q);
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); wrap.appendChild(head);
    var scopeBar=h("div"); wrap.appendChild(scopeBar);
    var listEl=h("div"); wrap.appendChild(listEl);
    var deepBar=h("div"); wrap.appendChild(deepBar);
    var allResults=[], results=[], shown=80, scope=null;
    function applyScope(){ results = scope ? allResults.filter(function(x){return x[1][I_SLUG]===scope;}) : allResults; }
    function renderScope(){
      scopeBar.innerHTML=""; if(allResults.length<2) return;
      var c={}; allResults.forEach(function(x){ c[x[1][I_SLUG]]=(c[x[1][I_SLUG]]||0)+1; });
      var keys=Object.keys(c); if(keys.length<2) return;
      var chips=h("div",{class:"chips"});
      var all=h("button",{class:"chip"+(scope?"":" active")},"All · "+allResults.length); all.onclick=function(){ scope=null; shown=80; applyScope(); renderScope(); repaint(); }; chips.appendChild(all);
      keys.sort(function(a,b){return c[b]-c[a];}).forEach(function(b){ var ch=h("button",{class:"chip"+(scope===b?" active":"")},(LABEL[b]||b)+" · "+c[b]); ch.onclick=function(){ scope=b; shown=80; applyScope(); renderScope(); repaint(); }; chips.appendChild(ch); });
      scopeBar.appendChild(chips);
    }
    function repaint(){
      head.innerHTML='<h2>Search</h2><span class="meta">'+results.length.toLocaleString()+' result'+(results.length===1?"":"s")+' for &ldquo;'+esc(q)+'&rdquo;'+(scope?' in '+esc(LABEL[scope]||scope):'')+(DEEP?' · full text':'')+'</span>';
      navSet("Search: “"+q+"”", results.map(function(x){ return x[1]; }));  // page through results too
      listEl.innerHTML="";
      if(!results.length){ listEl.appendChild(h("div",{class:"empty"},'No matches. Words are AND-ed; use "quotes" for an exact phrase, -word to exclude.')); }
      results.slice(0,shown).forEach(function(x){ listEl.appendChild(rowItem(x[1])); });
      if(results.length>shown){ var mb=h("button",{class:"more-btn"},"Load more ("+(results.length-shown)+" left)"); mb.onclick=function(){shown+=200;repaint();}; listEl.appendChild(mb); }
    }
    function renderDeep(){
      deepBar.innerHTML="";
      if(!DEEP && (p.terms.length||p.phrases.length)){
        var db=h("button",{class:"more-btn"},"🔍  Search full text of every entry  (loads once, then instant)");
        db.onclick=function(){ db.textContent="Loading full text…"; loadAll(function(d,t){ db.textContent="Loading full text… "+d+"/"+t+" categories"; }, function(){ DEEP=true; go(); }); };
        deepBar.appendChild(db);
      }
    }
    function go(){ allResults=(p.terms.length||p.phrases.length)?runSearch(p):[]; scope=null; applyScope(); shown=80; renderScope(); repaint(); renderDeep(); }
    go(); swap(wrap);
  }

  // Hover tooltip for feat-tree nodes (1.5s dwell -> summary popout).
  var _ftTipEl=null, _ftTipTimer=null;
  function ftTipEl(){ if(!_ftTipEl){ _ftTipEl=h("div",{class:"ft-tip"}); _ftTipEl.style.display="none"; document.body.appendChild(_ftTipEl); } return _ftTipEl; }
  function ftHideTip(){ if(_ftTipTimer){clearTimeout(_ftTipTimer);_ftTipTimer=null;} if(_ftTipEl)_ftTipEl.style.display="none"; }
  function ftShowTip(node,id){
    var r=idById()[id]; if(!r) return;
    var body=(BODIES.feats||{})[id]||"", bm=body.match(/Benefit:\s*(.+)/);
    var summary=(bm?bm[1]:(r[I_SNIP]||"")).slice(0,300);
    var reqs=(window.PF_FEATTREE&&PF_FEATTREE[id]&&PF_FEATTREE[id].req)||[], byId=idById();
    var reqh=reqs.length?'<div class="ft-tip-req">Requires: '+reqs.map(function(x){return esc(byId[x]?byId[x][I_NAME]:"");}).filter(Boolean).join(", ")+'</div>':'';
    var t=ftTipEl();
    t.innerHTML='<div class="ft-tip-name">'+esc(r[I_NAME])+'</div>'+(summary?'<div class="ft-tip-snip">'+esc(summary)+'</div>':'')+reqh+(r[I_SRC]?'<div class="ft-tip-src">📖 '+esc(r[I_SRC])+'</div>':'');
    t.style.display="block";
    var b=node.getBoundingClientRect(), tw=t.offsetWidth, th=t.offsetHeight;
    var x=b.right+10; if(x+tw>innerWidth-8) x=b.left-tw-10; if(x<8) x=8;
    var y=b.top-6; if(y+th>innerHeight-8) y=innerHeight-th-8; if(y<8) y=8;
    t.style.left=x+"px"; t.style.top=y+"px";
  }
  // ---- non-feat prerequisites (ability scores, BAB, skills, caster level…) as tags ----
  var _featNames=null;
  function featNameSet(){ if(_featNames) return _featNames; _featNames={}; for(var i=0;i<IDX.length;i++){ if(IDX[i][I_SLUG]==="feats") _featNames[IDX[i][I_NAME].toLowerCase()]=1; } return _featNames; }
  function parseNonFeatPrereqs(id){
    var body=(BODIES.feats||{})[id]; if(!body) return [];
    var m=body.match(/Prerequisites?\b[:]?\s*([^\n]+)/i); if(!m) return [];
    var line=m[1].replace(/\.\s*$/,""), parts=line.split(/\s*[,;]\s*/), feats=featNameSet(), seen={}, out=[];
    parts.forEach(function(raw){
      var t=raw.trim().replace(/\s*\([^)]*\)\s*$/,"").replace(/\.$/,"").trim(); if(!t) return;
      if(feats[t.toLowerCase()]) return;                 // it's a feat — already shown in the tree
      var label=null, type="other", mm;
      if(mm=t.match(/^(Str|Dex|Con|Int|Wis|Cha)\s+(\d+)$/i)){ label=mm[1].charAt(0).toUpperCase()+mm[1].slice(1).toLowerCase()+" "+mm[2]; type="ability"; }
      else if(mm=t.match(/base attack bonus\s*\+?\s*(\d+)/i)){ label="BAB +"+mm[1]; type="combat"; }
      else if(mm=t.match(/base\s+(Fort|Ref|Will)\w*\s+saving throw bonus\s*\+?\s*(\d+)/i)){ label=mm[1]+" save +"+mm[2]; type="combat"; }
      else if(mm=t.match(/^(.+?)\s+(\d+)\s+ranks?$/i)){ label=mm[1]+" "+mm[2]+" rank"+(mm[2]==="1"?"":"s"); type="skill"; }
      else if(mm=t.match(/caster level\s*(\d+)\s*(st|nd|rd|th)?/i)){ label="Caster level "+mm[1]+(mm[2]||"th"); type="magic"; }
      else if(/ability to cast|able to cast|cast [a-z].* spell|arcane spell|divine spell|spellcaster|channel energy/i.test(t)){ label=t.length>32?t.slice(0,30)+"…":t; type="magic"; }
      else if(/class feature|class ability/i.test(t)){ label=t.replace(/\s+class (feature|ability).*$/i,"").trim(); if(label.length>26) label=label.slice(0,24)+"…"; type="class"; }
      else { if(t.length>38) return; label=t; type="other"; }  // race/alignment/short condition; skip long prose
      var key=label.toLowerCase(); if(label && !seen[key]){ seen[key]=1; out.push({label:label,type:type}); }
    });
    return out.slice(0,12);
  }
  function reqTagsRow(tags){
    var tr=h("div",{class:"ft-reqtags"}); tr.appendChild(h("span",{class:"ft-reqlab"},"Also requires"));
    tags.forEach(function(tg){ tr.appendChild(h("span",{class:"ft-reqtag t-"+tg.type},esc(tg.label))); });
    return tr;
  }

  // Civ-style feat tech-tree: prerequisites branch LEFT, what this unlocks branches RIGHT,
  // with the focused feat in the middle. Grows in both directions, recursively.
  function buildFeatTree(rootId){
    var G=window.PF_FEATTREE||{}, byId=idById(), node0=G[rootId];
    var hasReq=node0 && (node0.req||[]).length, hasUnlock=node0 && (node0.unlocks||[]).length;
    var pretags=parseNonFeatPrereqs(rootId);
    if(!hasReq && !hasUnlock && !pretags.length) return null;   // truly isolated feat
    if(!hasReq && !hasUnlock){                                  // only non-feat prereqs → just show the tags
      var s0=h("div",{class:"tree-sec"}); s0.appendChild(h("h3",{class:"section-h"},"Feat requirements"));
      s0.appendChild(reqTagsRow(pretags));
      s0.appendChild(h("div",{class:"muted"},"This feat isn’t built from, or a prerequisite for, other feats."));
      return s0;
    }
    var MAXR=5, MAXL=4, MAXN=80, CHILD=8, depth={}, order=[rootId], extra={}; depth[rootId]=0;
    // rightward: what builds on this (unlocks), positive depth
    var q=[rootId];
    while(q.length){ var id=q.shift(); if(depth[id]>=MAXR) continue;
      var u=(G[id]&&G[id].unlocks)||[], shown=0;
      for(var ui=0; ui<u.length; ui++){ var c=u[ui];
        if(depth[c]!==undefined || !byId[c]) continue;
        if(shown>=CHILD || order.length>=MAXN){ extra[id]=(extra[id]||0)+1; continue; }
        depth[c]=depth[id]+1; order.push(c); q.push(c); shown++; }
    }
    // leftward: prerequisites (req), negative depth
    var ql=[rootId];
    while(ql.length){ var id2=ql.shift(); if(depth[id2]<=-MAXL) continue;
      var rq=(G[id2]&&G[id2].req)||[], shownL=0;
      for(var ri=0; ri<rq.length; ri++){ var p=rq[ri];
        if(depth[p]!==undefined || !byId[p]) continue;
        if(shownL>=CHILD || order.length>=MAXN){ extra[id2]=(extra[id2]||0)+1; continue; }
        depth[p]=depth[id2]-1; order.push(p); ql.push(p); shownL++; }
    }
    var cols={}; order.forEach(function(id){ (cols[depth[id]]=cols[depth[id]]||[]).push(id); });
    var ds=Object.keys(cols).map(Number), minCol=Math.min.apply(null,ds), maxCol=Math.max.apply(null,ds);
    var sec=h("div",{class:"tree-sec"});
    sec.appendChild(h("h3",{class:"section-h"},"Feat tree"));
    var legend="";
    if(minCol<0) legend+="‹ prerequisites";
    if(minCol<0 && maxCol>0) legend+="   ·   ";
    if(maxCol>0) legend+="what builds on this ›";
    if(legend) sec.appendChild(h("div",{class:"ft-legend"},legend));
    if(pretags.length) sec.appendChild(reqTagsRow(pretags));
    var wrap=h("div",{class:"feattree-wrap"});
    var svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("class","ft-edges");
    var grid=h("div",{class:"feattree"});
    for(var d=minCol; d<=maxCol; d++){ var col=h("div",{class:"ft-col"});
      (cols[d]||[]).forEach(function(id){ var r=byId[id];
        var n=h("a",{class:"ft-node"+(id===rootId?" root":"")}); n.href="#/e/"+encodeURIComponent(id); n.setAttribute("data-id",id); n.textContent=r?r[I_NAME]:id;
        if(extra[id]) n.appendChild(h("span",{class:"ft-more"}," +"+extra[id]));
        n.addEventListener("mouseenter",function(){ ftHideTip(); _ftTipTimer=setTimeout(function(){ ftShowTip(n,id); },1500); });
        n.addEventListener("mouseleave",ftHideTip);
        col.appendChild(n); });
      grid.appendChild(col); }
    wrap.appendChild(svg); wrap.appendChild(grid); sec.appendChild(wrap);
    if(order.length>=MAXN) sec.appendChild(h("div",{class:"codex-note"},"Big tree — showing "+MAXN+" feats. Click any one to re-center on it."));
    var NS="http://www.w3.org/2000/svg";
    function draw(){
      var wr=wrap.getBoundingClientRect(), pos={};
      grid.querySelectorAll(".ft-node").forEach(function(n){ var b=n.getBoundingClientRect(); pos[n.getAttribute("data-id")]={x:b.left-wr.left+wrap.scrollLeft,y:b.top-wr.top,w:b.width,h:b.height}; });
      while(svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute("width",grid.scrollWidth); svg.setAttribute("height",grid.scrollHeight);
      var made=0;
      // draw prereq → dependent for every req edge whose endpoints are both shown (covers both sides, no dupes)
      order.forEach(function(cid){ ((G[cid]&&G[cid].req)||[]).forEach(function(pid){ var a=pos[pid],b=pos[cid]; if(!a||!b)return;
        var x1=a.x+a.w,y1=a.y+a.h/2,x2=b.x,y2=b.y+b.h/2,mx=(x1+x2)/2;
        var p=document.createElementNS(NS,"path");
        p.setAttribute("d","M"+x1+" "+y1+" C"+mx+" "+y1+" "+mx+" "+y2+" "+x2+" "+y2);
        svg.appendChild(p); made++; }); });
      if(!made && grid.querySelector(".ft-node") && (order.length>1)) requestAnimationFrame(draw);   // layout not ready yet
    }
    function centerRoot(){ var rn=grid.querySelector(".ft-node.root"); if(rn){ var rb=rn.getBoundingClientRect(), wb=wrap.getBoundingClientRect(); wrap.scrollLeft += (rb.left-wb.left) - wrap.clientWidth/2 + rb.width/2; } }
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ draw(); if(minCol<0) centerRoot(); }); });
    setTimeout(draw,80); setTimeout(draw,320);
    window.addEventListener("resize", draw);
    wrap.addEventListener("scroll", ftHideTip);
    return sec;
  }
  // On a class page: list its archetypes (uses the parsed archetype→class facet).
  function classArchetypes(row){
    var cls=row[I_NAME];
    var arch=IDX.filter(function(r){ return r[I_SLUG]==="archetypes" && r[I_FAC] && r[I_FAC].cls===cls; });
    if(!arch.length) return null;
    arch.sort(function(a,b){ return a[I_NAME].localeCompare(b[I_NAME]); });
    var sec=h("div",{class:"tree-sec"});
    sec.appendChild(h("h3",{class:"section-h"},"Archetypes for "+esc(cls)+" ("+arch.length+")"));
    var cards=h("div",{class:"cards"});
    arch.slice(0,48).forEach(function(r){ var a=h("a",{class:"card",href:"#/e/"+encodeURIComponent(r[0])});
      a.style.setProperty("--c",color("archetypes"));
      a.innerHTML='<h3>'+esc(r[I_NAME].indexOf(cls+" ")===0 ? r[I_NAME].slice(cls.length+1) : r[I_NAME])+'</h3>'; cards.appendChild(a); });
    sec.appendChild(cards);
    if(arch.length>48) sec.appendChild(h("div",{class:"codex-note"},"+"+(arch.length-48)+" more — open Archetypes and filter by class."));
    return sec;
  }
  // Scannable "quick block" of the vital stats, pinned above the prose.
  function fmtCR(cr){ if(cr>=1) return String(cr); var m={0.5:"1/2",0.333:"1/3",0.25:"1/4",0.167:"1/6",0.125:"1/8"}; return m[cr]||String(cr); }
  function quickStats(row){
    var f=row[I_FAC]; if(!f||typeof f!=="object") return "";
    var s=row[I_SLUG], p=[]; function pill(t){ p.push('<span class="qstat">'+esc(t)+'</span>'); }
    function cpill(t,c,icon){ p.push('<span class="qstat qstat-color" style="--c:'+c+'">'+(icon||"")+esc(t)+'</span>'); }
    if(s==="spells"){ if(f.sch){ if(SCHOOL_C[f.sch]) cpill(cap(f.sch), SCHOOL_C[f.sch], svgi(SCHOOL_ICON[f.sch]||"")); else pill(cap(f.sch)); } if(f.desc&&f.desc.length) pill(f.desc.join(", ")); if(f.save) pill("Save "+f.save); if(f.sr) pill("SR "+f.sr);
      if(f.lv){ var lv=Object.keys(f.lv).map(function(k){return cap(k)+" "+f.lv[k];}); pill(lv.slice(0,4).join(", ")+(lv.length>4?" …":"")); } }
    else if(s==="monsters"){ if(f.cr!=null){ var cc=crColor(f.cr); if(cc) cpill("CR "+fmtCR(f.cr), cc); else pill("CR "+fmtCR(f.cr)); } if(f.sz) pill(f.sz); if(f.t) cpill(cap(f.t), color("monsters"), svgi(typeIcon(f.t))); if(f.al) pill(f.al); }
    else if(s==="items"){ if(f.slot) pill("Slot: "+cap(f.slot)); if(f.pr!=null) pill(f.pr.toLocaleString()+" gp"); }
    else if(s==="feats"&&f.t) pill(f.t+" feat");
    else if(s==="traits"&&f.cat) pill(f.cat+" trait");
    if(f.bk) pill("📖 "+f.bk);
    return p.length? '<div class="quickstats">'+p.join("")+'</div>' : "";
  }
  function viewEntry(id){
    var row=idById()[id];
    if(!row){ swap(h("div",{class:"empty"},"Entry not found.")); return; }
    setActiveNav(row[I_SLUG]);
    var wrap=h("div");
    var back=h("div",{class:"back"},"‹ Back"); back.onclick=function(){ if(history.length>1) history.back(); else location.hash="#/c/"+row[I_SLUG]; };
    var favb=h("button",{class:"favbtn"}); function updFav(){ var cn=activeChar().name; favb.innerHTML=isFav(id)?("★ Saved"):("☆ Save"); favb.title=(isFav(id)?"Saved to “"+cn+"” — click to remove":"Save to “"+cn+"”"); favb.classList.toggle("on",isFav(id)); } updFav();
    favb.onclick=function(){ toggleFav(id); updFav(); };
    var cmpb=h("button",{class:"favbtn cmpbtn"}); function updCmp(){ cmpb.innerHTML=inCmp(id)?"⇄ In Compare":"⇄ Compare"; cmpb.classList.toggle("on",inCmp(id)); } updCmp();
    cmpb.onclick=function(){ var res=toggleCmp(id); if(res==="full"){ cmpb.innerHTML="Max 4 pinned"; setTimeout(updCmp,1100); return; } updCmp(); };
    var top=h("div",{class:"entry-top"}); top.appendChild(back); top.appendChild(entryPager(id,row)); top.appendChild(favb); top.appendChild(cmpb); wrap.appendChild(top);
    var ic=identityColor(row);
    var card=h("div",{class:"entry"}); card.style.setProperty("--c",ic);
    var label=LABEL[row[I_SLUG]]||row[I_SLUG];
    var rawBadge=(row[I_RAW] && row[I_RAW]!==label)?'<span class="badge">'+esc(row[I_RAW])+'</span>':'';
    var titleIcon=schoolPip(row); // school glyph for spells; monsters show their type as a colored badge below
    var entryArt = (row[I_SLUG]==="classes") ? '<div class="entry-scene">'+classArchScene(row[I_NAME])+'</div>'
                 : (row[I_SLUG]==="monsters" && row[I_FAC] && SCENE.monsters) ? '<div class="entry-scene"><svg class="cat-scene" viewBox="0 0 128 96" fill="currentColor" aria-hidden="true">'+SCENE.monsters+'</svg></div>'
                 : '';
    applyArt(card, entryArtKey(row));
    card.innerHTML=ornCorners()+entryArt+'<h1>'+titleIcon+esc(row[I_NAME])+'</h1><div class="badges"><span class="badge cat" style="--c:'+color(row[I_SLUG])+'">'+esc(label)+'</span>'+rawBadge+'</div>'+quickStats(row)+'<div class="sb-rule"></div><div class="body">Loading…</div>';
    wrap.appendChild(card);
    if(row[I_SLUG]==="feats") wrap.appendChild(featVizSection(id));
    if(row[I_SLUG]==="classes"){ var _a=classArchetypes(row); if(_a) wrap.appendChild(_a); }
    swap(wrap);
    loadCat(row[I_SLUG], function(){
      var body=(BODIES[row[I_SLUG]]||{})[id];
      function paintBody(){ var be=$(".body",card); if(be) be.innerHTML = body? fmtBody(body,row[I_SRC],id) : '<em>Entry text unavailable.</em>'; }
      paintBody(); recordRecent(row);
      // upgrade with real tables once tables.js arrives (loaded lazily, off cold start)
      if(body && !window.PF_TABLES) ensureTables(function(){ if($(".body",card)) paintBody(); });
    });
    window.scrollTo(0,0);
  }

  // ---- recently viewed ----
  function recordRecent(row){ try{ var k="pf_recent", a=JSON.parse(localStorage.getItem(k)||"[]"); a=a.filter(function(x){return x!==row[I_ID];}); a.unshift(row[I_ID]); localStorage.setItem(k,JSON.stringify(a.slice(0,12))); }catch(e){} }

  // ---- characters / My Picks (named bundles of saved entries) ----
  function uid(){ return "c"+Math.random().toString(36).slice(2,8); }
  function chars(){
    var a; try{ a=JSON.parse(localStorage.getItem("pf_chars")||"null"); }catch(e){ a=null; }
    // keep only well-formed entries so corrupt storage can't leak undefined ids downstream
    if(Array.isArray(a)) a=a.filter(function(c){ return c && typeof c.id==="string" && c.id; })
      .map(function(c){ return {id:c.id, name:typeof c.name==="string"&&c.name?c.name:"Character", ids:Array.isArray(c.ids)?c.ids.filter(function(x){return typeof x==="string";}):[]}; });
    else a=null;
    if(!a || !a.length){
      var seed=[]; try{ var s=JSON.parse(localStorage.getItem("pf_fav")||"[]"); if(Array.isArray(s)) seed=s.filter(function(x){return typeof x==="string";}); }catch(e){}
      a=[{id:uid(), name:"My Picks", ids:seed}]; saveChars(a);
    }
    return a;
  }
  function saveChars(a){ try{ localStorage.setItem("pf_chars", JSON.stringify(a)); }catch(e){} }
  function activeCharId(){ var id=localStorage.getItem("pf_char_active"), cs=chars(); if(!id || !cs.some(function(c){return c.id===id;})){ id=cs[0].id; try{localStorage.setItem("pf_char_active",id);}catch(e){} } return id; }
  function setActiveChar(id){ try{localStorage.setItem("pf_char_active",id);}catch(e){} }
  function activeChar(){ var id=activeCharId(); var cs=chars(); return cs.filter(function(c){return c.id===id;})[0] || cs[0]; }
  // favorite = membership in the ACTIVE character's bundle
  function favSet(){ return (activeChar().ids)||[]; }
  function isFav(id){ return favSet().indexOf(id)>=0; }
  function toggleFav(id){ var cs=chars(), aid=activeCharId(), c=cs.filter(function(x){return x.id===aid;})[0]||cs[0]; c.ids=c.ids||[]; var i=c.ids.indexOf(id); if(i>=0)c.ids.splice(i,1); else c.ids.unshift(id); c.ids=c.ids.slice(0,500); saveChars(cs); return i<0; }

  function viewFavorites(){
    setActiveNav(null);
    var cs=chars(), active=activeChar();
    var wrap=h("div");
    var head=h("div",{class:"list-head"});
    head.innerHTML='<h2>★ My Characters</h2><span class="meta">Saved picks, one bundle per character</span>';
    wrap.appendChild(head);

    // character switcher + actions
    var bar=h("div",{class:"char-bar"});
    var sel=h("select",{class:"char-sel"});
    cs.forEach(function(c){ var o=new Option(c.name+"  ("+((c.ids||[]).length)+")", c.id); sel.appendChild(o); });
    sel.value=active.id;
    sel.onchange=function(){ setActiveChar(sel.value); viewFavorites(); };
    bar.appendChild(sel);
    function act(label,title,fn){ var b=h("button",{class:"char-act",title:title},label); b.onclick=fn; bar.appendChild(b); }
    act("+ New","Create a new character bundle",function(){
      var name=(prompt("Name this character (e.g. “Thorin, Dwarf Fighter”):")||"").trim(); if(!name) return;
      var a=chars(); var nc={id:uid(), name:name, ids:[]}; a.push(nc); saveChars(a); setActiveChar(nc.id); viewFavorites();
    });
    act("Rename","Rename this character",function(){
      var a=chars(), c=a.filter(function(x){return x.id===active.id;})[0]; if(!c) return;
      var name=(prompt("Rename character:", c.name)||"").trim(); if(!name) return; c.name=name; saveChars(a); viewFavorites();
    });
    act("Delete","Delete this character",function(){
      var a=chars(); if(a.length<=1){ alert("Keep at least one character. Rename it or create another first."); return; }
      if(!confirm("Delete “"+active.name+"” and its "+((active.ids||[]).length)+" saved entries? This can’t be undone.")) return;
      a=a.filter(function(x){return x.id!==active.id;}); saveChars(a); setActiveChar(a[0].id); viewFavorites();
    });
    if((active.ids||[]).length) act("🖨 Cards","Print cut-out reference cards",function(){ location.hash="#/cards"; });
    wrap.appendChild(bar);

    var rows=(active.ids||[]).map(function(id){return idById()[id];}).filter(Boolean);
    if(!rows.length){ wrap.appendChild(h("div",{class:"empty"},"“"+active.name+"” has nothing saved yet. Open any entry and tap ☆ Save — it goes into the character selected above.")); swap(wrap); return; }
    var meta2=h("div",{class:"char-count muted"}, rows.length+" saved to “"+active.name+"”"); wrap.appendChild(meta2);
    var byB={}; rows.forEach(function(r){ (byB[r[I_SLUG]]=byB[r[I_SLUG]]||[]).push(r); });
    Object.keys(byB).sort().forEach(function(b){ wrap.appendChild(h("h3",{class:"section-h"},LABEL[b]||b)); byB[b].forEach(function(r){ wrap.appendChild(rowItem(r)); }); });
    swap(wrap);
  }

  // ---- Combat & Conditions quick-ref ----
  function viewCombat(query){
    setActiveNav(null);
    var QR=window.PF_QUICKREF;
    var wrap=h("div",{class:"qref"});
    var head=h("div",{class:"list-head"});
    head.innerHTML='<h2>⚔ Combat &amp; Conditions</h2><span class="meta">Fast at-the-table lookup · the rules you reach for mid-fight</span>';
    wrap.appendChild(head);
    if(!QR){ wrap.appendChild(h("div",{class:"empty"},"Quick-reference data is still loading — try again in a moment.")); swap(wrap); return; }
    // unified item list: {group, n, t}
    var items=[];
    (QR.conditions||[]).forEach(function(c){ items.push({group:"Conditions", n:c.n, t:c.t}); });
    (QR.combat||[]).forEach(function(gr){ (gr.items||[]).forEach(function(it){ items.push({group:gr.g, n:it.n, t:it.t}); }); });
    var groups=["All","Conditions"]; (QR.combat||[]).forEach(function(gr){ groups.push(gr.g); });
    var state={group:(query&&query.g)||"All", q:(query&&query.q)||""};

    // sticky control bar: filter box + group chips
    var bar=h("div",{class:"qref-bar"});
    var fin=h("input",{type:"search",class:"qref-filter",placeholder:"Filter conditions & combat rules…",autocomplete:"off",spellcheck:"false"});
    fin.value=state.q;
    bar.appendChild(fin);
    var chips=h("div",{class:"chips qref-chips"});
    groups.forEach(function(g){ var c=h("button",{class:"chip"+(state.group===g?" active":"")}, g==="Conditions"?("Conditions ("+(QR.conditions||[]).length+")"):g); c.onclick=function(){ state.group=g; chips.querySelectorAll(".chip").forEach(function(x){x.classList.remove("active");}); c.classList.add("active"); paint(); }; chips.appendChild(c); });
    bar.appendChild(chips);
    wrap.appendChild(bar);

    // link to full Conditions rules page
    if(QR.condSourceId){ var srcLine=h("div",{class:"qref-src"}); srcLine.innerHTML='Full text & edge cases: <a href="#/e/'+esc(QR.condSourceId)+'">Conditions (Core Rulebook)</a>'; wrap.appendChild(srcLine); }

    var grid=h("div",{class:"qref-grid"}); wrap.appendChild(grid);
    var count=h("div",{class:"qref-count muted"}); wrap.appendChild(count);

    function hl(text,q){ if(!q) return esc(text); var i=text.toLowerCase().indexOf(q); if(i<0) return esc(text); return esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+q.length))+'</mark>'+esc(text.slice(i+q.length)); }
    function paint(){
      var q=state.q.trim().toLowerCase();
      var f=items.filter(function(it){
        if(state.group!=="All" && it.group!==state.group) return false;
        if(q && (it.n.toLowerCase().indexOf(q)<0 && it.t.toLowerCase().indexOf(q)<0)) return false;
        return true;
      });
      grid.innerHTML="";
      var lastG=null;
      f.forEach(function(it){
        if(state.group==="All" && it.group!==lastG){ lastG=it.group; grid.appendChild(h("h3",{class:"qref-gh"},it.group)); }
        var card=h("div",{class:"qref-card"});
        card.innerHTML='<div class="qref-name">'+hl(it.n,q)+'</div><div class="qref-text">'+hl(it.t,q)+'</div>';
        grid.appendChild(card);
      });
      if(!f.length) grid.appendChild(h("div",{class:"empty"},"No matches. Try another word."));
      count.textContent=f.length+" of "+items.length+" entries";
      var nh="#/ref"+(state.group!=="All"||state.q?("?"+[state.group!=="All"?"g="+encodeURIComponent(state.group):"",state.q?"q="+encodeURIComponent(state.q):""].filter(Boolean).join("&")):"");
      if(("#"+location.hash.replace(/^#/,""))!==("#"+nh.slice(1))) try{ history.replaceState(null,"",nh); }catch(e){}
    }
    var ft; fin.oninput=function(){ clearTimeout(ft); ft=setTimeout(function(){ state.q=fin.value; paint(); },120); };
    paint(); swap(wrap); window.scrollTo(0,0);
  }

  // ---- Compare (pin 2–4 entries side by side) ----
  var CMP_MAX=4;
  function cmpSet(){ try{ return JSON.parse(localStorage.getItem("pf_cmp")||"[]"); }catch(e){ return []; } }
  function inCmp(id){ return cmpSet().indexOf(id)>=0; }
  function toggleCmp(id){ var a=cmpSet(),i=a.indexOf(id); if(i>=0)a.splice(i,1); else { if(a.length>=CMP_MAX) return "full"; a.push(id); } try{localStorage.setItem("pf_cmp",JSON.stringify(a));}catch(e){} afterCmpChange(); return i<0; }
  function clearCmp(){ try{localStorage.setItem("pf_cmp","[]");}catch(e){} afterCmpChange(); }
  function afterCmpChange(){ updateCmpTray(); if((location.hash||"").indexOf("/compare")>=0) render(); }
  var _tray;
  function updateCmpTray(){
    if(!_tray){ _tray=h("div",{class:"cmp-tray"}); document.body.appendChild(_tray); }
    var ids=cmpSet(), byId=idById();
    document.body.classList.toggle("has-tray", ids.length>0);
    if(!ids.length){ _tray.style.display="none"; return; }
    _tray.style.display="flex"; _tray.innerHTML="";
    _tray.appendChild(h("span",{class:"cmp-lab"},"⇄ Compare"));
    var chips=h("div",{class:"cmp-chips"});
    ids.forEach(function(id){ var r=byId[id]; var c=h("button",{class:"cmp-chip",title:"Remove"}); c.innerHTML=esc(r?r[I_NAME]:id)+' <b>×</b>'; c.onclick=function(){ toggleCmp(id); }; chips.appendChild(c); });
    _tray.appendChild(chips);
    if(ids.length>=2) _tray.appendChild(h("a",{class:"cmp-go",href:"#/compare"},"View "+ids.length+" side by side →"));
    else _tray.appendChild(h("span",{class:"cmp-hint muted"},"Pin one more to compare"));
    var clr=h("button",{class:"cmp-clear"},"Clear"); clr.onclick=clearCmp; _tray.appendChild(clr);
  }
  function viewCompare(){
    setActiveNav(null);
    var ids=cmpSet(), byId=idById();
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>⇄ Compare</h2><span class="meta">'+ids.length+' pinned · pin 2–4 entries to compare side by side</span>'; wrap.appendChild(head);
    if(ids.length<1){ wrap.appendChild(h("div",{class:"empty"},"Nothing pinned yet. Open any entry and tap “⇄ Compare” to add it here (up to 4), then come back.")); swap(wrap); return; }
    var cols=h("div",{class:"cmp-cols cols"+ids.length}); wrap.appendChild(cols);
    ids.forEach(function(id){
      var r=byId[id]; if(!r) return;
      var label=LABEL[r[I_SLUG]]||r[I_SLUG];
      var col=h("div",{class:"cmp-col"}); col.style.setProperty("--c",color(r[I_SLUG]));
      var rm=h("button",{class:"cmp-col-x",title:"Remove from compare"},"×"); rm.onclick=function(){ toggleCmp(id); };
      col.appendChild(rm);
      var inner=h("div",{class:"entry cmp-entry"});
      inner.innerHTML='<a class="cmp-col-name" href="#/e/'+esc(id)+'">'+esc(r[I_NAME])+'</a><div class="badges"><span class="badge cat" style="--c:'+color(r[I_SLUG])+'">'+esc(label)+'</span></div>'+quickStats(r)+'<div class="body cmp-body">Loading…</div>';
      col.appendChild(inner); cols.appendChild(col);
      loadCat(r[I_SLUG], function(){ var body=(BODIES[r[I_SLUG]]||{})[id]; var be=$(".cmp-body",inner); if(be) be.innerHTML=body?fmtBody(body,r[I_SRC],id):'<em>Entry text unavailable.</em>'; });
    });
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- GM Screen (curated one-page reference + print) ----
  function viewGM(){
    setActiveNav(null);
    var QR=window.PF_QUICKREF;
    var wrap=h("div",{class:"gm"});
    var head=h("div",{class:"list-head gm-head"});
    head.innerHTML='<div><h2>🛡 GM Screen</h2><span class="meta">One-page reference for running the table · print it or keep it open</span></div>';
    var pbtn=h("button",{class:"char-act gm-print"},"🖨 Print"); pbtn.onclick=function(){ window.print(); };
    head.appendChild(pbtn); wrap.appendChild(head);
    if(!QR){ wrap.appendChild(h("div",{class:"empty"},"Reference data is still loading — try again in a moment.")); swap(wrap); return; }
    var grid=h("div",{class:"gm-grid"}); wrap.appendChild(grid);
    function panel(title){ var p=h("section",{class:"gm-panel"}); p.appendChild(h("h3",{class:"gm-ph"},esc(title))); grid.appendChild(p); return p; }
    function tableEl(rows){
      var t=h("table",{class:"gm-table"});
      var thead=h("thead"), htr=h("tr"); rows[0].forEach(function(c){ htr.appendChild(h("th",null,esc(c))); }); thead.appendChild(htr); t.appendChild(thead);
      var tb=h("tbody"); rows.slice(1).forEach(function(r){ var tr=h("tr"); r.forEach(function(c,ci){ tr.appendChild(h(ci===0?"th":"td",ci===0?{class:"rowh"}:null,esc(c))); }); tb.appendChild(tr); }); t.appendChild(tb);
      return t;
    }
    function itemsInto(p,items){ items.forEach(function(it){ p.appendChild(h("div",{class:"gm-item"},"<b>"+esc(it.n)+"</b> "+esc(it.t))); }); }
    (QR.gm||[]).forEach(function(gr){ var p=panel(gr.g); if(gr.table){ var tw=h("div",{class:"tablewrap"}); tw.appendChild(tableEl(gr.table)); p.appendChild(tw); } else itemsInto(p,gr.items||[]); });
    // combat maneuvers (GMs adjudicate these constantly)
    var cm=(QR.combat||[]).filter(function(g){return g.g==="Combat Maneuvers";})[0];
    if(cm){ itemsInto(panel("Combat Maneuvers"), cm.items); }
    // compact conditions reference
    var pc=panel("Conditions ("+(QR.conditions||[]).length+")");
    (QR.conditions||[]).forEach(function(c){ var one=c.t.split(". ")[0]; if(one.length>130) one=one.slice(0,127)+"…"; if(!/[.!?…]$/.test(one)) one+="."; pc.appendChild(h("div",{class:"gm-cond"},"<b>"+esc(c.n)+":</b> "+esc(one))); });
    wrap.appendChild(h("div",{class:"qref-src"},'See the full detail in <a href="#/ref">Combat &amp; Conditions</a>.'));
    wrap.appendChild(h("div",{class:"codex-note"},"Rules content used under the Open Game License 1.0a."));
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Name Generator (embeds the standalone NameForge engine) ----
  function viewNames(){
    setActiveNav(null);
    var wrap=h("div");
    var head=h("div",{class:"list-head"});
    head.innerHTML='<h2>🎲 Name Generator</h2><span class="meta">Race-aware fantasy names for PCs &amp; NPCs · procedurally generated, safe to reuse anywhere</span>';
    wrap.appendChild(head);
    var mount=h("div",{class:"nf"}); mount.appendChild(h("div",{class:"empty"},"Loading generator…")); wrap.appendChild(mount);
    swap(wrap);
    ensureNameForge(function(){
      if(location.hash.replace(/^#/,"").indexOf("/names")!==0) return; // navigated away
      if(!window.NameForge){ mount.innerHTML=""; mount.appendChild(h("div",{class:"empty"},"Generator failed to load.")); return; }
      buildNameUI(mount);
    });
  }
  function buildNameUI(mount){
    var NF=window.NameForge;
    mount.innerHTML="";
    var state={ race:"human", gender:"any", culture:null, count:12, surname:true, epithet:false, mode:"mixed", seed:"" };
    var last=[];

    var panel=h("div",{class:"nf-panel"});
    // race select (grouped by kind)
    var groups={core:"Core races",common:"Common (monster / NPC)",planetouched:"Planetouched",extended:"Extended roster",other:"Other"};
    var byKind={}; NF.races().forEach(function(r){ (byKind[r.kind]=byKind[r.kind]||[]).push(r); });
    var raceSel=h("select",{class:"char-sel"});
    Object.keys(groups).forEach(function(k){ if(!byKind[k])return; var og=document.createElement("optgroup"); og.label=groups[k];
      byKind[k].sort(function(a,b){return a.label.localeCompare(b.label);}).forEach(function(r){ og.appendChild(new Option(r.label,r.key)); }); raceSel.appendChild(og); });
    raceSel.value=state.race;
    // culture select (human only)
    var cultSel=h("select",{class:"char-sel"}); NF.humanCultures().forEach(function(c){ cultSel.appendChild(new Option(c.label,c.key)); });
    var cultField=field("Human culture",cultSel);
    function syncCult(){ cultField.style.display = (raceSel.value==="human")?"":"none"; }
    // gender segmented
    var genderSeg=h("div",{class:"nf-seg"});
    [["any","Any"],["male","Male"],["female","Female"],["neutral","Neutral"]].forEach(function(g){
      var b=h("button",{class:(g[0]===state.gender?"on":"")},g[1]); b.onclick=function(){ state.gender=g[0]; genderSeg.querySelectorAll("button").forEach(function(x){x.classList.remove("on");}); b.classList.add("on"); gen(); }; genderSeg.appendChild(b);
    });
    var countIn=h("input",{type:"number",min:"1",max:"50",value:String(state.count),class:"nf-num"});
    // toggles
    var surCh=h("input",{type:"checkbox"}); surCh.checked=state.surname;
    var epiCh=h("input",{type:"checkbox"}); epiCh.checked=state.epithet;
    var surLab=h("label",{class:"nf-chk"}); surLab.appendChild(surCh); surLab.appendChild(document.createTextNode(" Surname / clan"));
    var epiLab=h("label",{class:"nf-chk"}); epiLab.appendChild(epiCh); epiLab.appendChild(document.createTextNode(" Epithet / title"));
    // advanced
    var modeSel=h("select",{class:"char-sel"}); [["mixed","Mixed (curated + invented)"],["curated","Curated only"],["procedural","Procedural only"]].forEach(function(o){ modeSel.appendChild(new Option(o[1],o[0])); });
    var seedIn=h("input",{type:"text",placeholder:"e.g. goblin-camp-7",class:"nf-seed"});
    var adv=h("details",{class:"nf-adv"}); var sum=h("summary",null,"Advanced"); adv.appendChild(sum);
    var advRow=h("div",{class:"nf-row"}); advRow.appendChild(field("Style",modeSel)); advRow.appendChild(field("Seed (optional — reproducible)",seedIn)); adv.appendChild(advRow);

    var row=h("div",{class:"nf-row"});
    row.appendChild(field("Race / Ancestry",raceSel));
    row.appendChild(cultField);
    row.appendChild(field("Gender",genderSeg));
    row.appendChild(field("How many",countIn));
    panel.appendChild(row);
    var tog=h("div",{class:"nf-toggles"}); tog.appendChild(surLab); tog.appendChild(epiLab); panel.appendChild(tog);
    panel.appendChild(adv);
    var acts=h("div",{class:"nf-actions"});
    var genBtn=h("button",{class:"char-act nf-primary"},"⚔ Generate");
    var reBtn=h("button",{class:"char-act"},"↻ Reroll");
    var copyBtn=h("button",{class:"char-act nf-copyall"},"⧉ Copy all");
    acts.appendChild(genBtn); acts.appendChild(reBtn); acts.appendChild(copyBtn); panel.appendChild(acts);
    mount.appendChild(panel);

    var rhead=h("div",{class:"nf-rhead"}); mount.appendChild(rhead);
    var grid=h("div",{class:"nf-grid gen-out"}); mount.appendChild(grid);

    function field(label,ctrl){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,esc(label))); f.appendChild(ctrl); return f; }
    function opts(){ return { race:raceSel.value, gender:state.gender, culture:raceSel.value==="human"?cultSel.value:null,
      count:Math.max(1,Math.min(50,parseInt(countIn.value,10)||12)), surname:surCh.checked, epithet:epiCh.checked, mode:modeSel.value, seed:(seedIn.value.trim()||null) }; }
    function gen(){ var o=opts(); try{ last=NF.generate(o); }catch(e){ grid.innerHTML=""; grid.appendChild(h("div",{class:"empty"},"Error: "+esc(e.message))); return; } paint(o); lset("pf_names",{o:o,names:last}); }
    function paint(o){
      grid.innerHTML="";
      var rl=(last[0]&&last[0].raceLabel)||o.race;
      rhead.textContent=rl+(o.culture&&o.race==="human"?" · "+((last[0]&&last[0].cultureLabel)||o.culture):"")+" — "+last.length+" names";
      last.forEach(function(n){
        var card=h("div",{class:"nf-card"});
        var meta=[n.gender==="m"?"male":n.gender==="f"?"female":"neutral"]; if(n.cultureLabel) meta.push(n.cultureLabel);
        card.innerHTML='<div class="nf-name"></div><div class="nf-meta">'+esc(meta.join(" · "))+'</div><span class="nf-cp">⧉</span>';
        card.querySelector(".nf-name").textContent=n.full; card.title="Click to copy";
        card.onclick=function(){ nfCopy(n.full, "Copied “"+n.full+"”"); };
        grid.appendChild(card);
      });
    }
    // wire events
    raceSel.onchange=function(){ syncCult(); gen(); };
    cultSel.onchange=gen; countIn.onchange=gen; surCh.onchange=gen; epiCh.onchange=gen; modeSel.onchange=gen;
    seedIn.onkeydown=function(e){ if(e.key==="Enter") gen(); };
    genBtn.onclick=gen;
    reBtn.onclick=function(){ if(seedIn.value.trim()){ seedIn.value=seedIn.value.replace(/-\d+$/,"")+"-"+((Math.random()*9999)|0); } gen(); };
    copyBtn.onclick=function(){ if(last.length) nfCopy(last.map(function(n){return n.full;}).join("\n"), "Copied "+last.length+" names"); };
    var _sv=lget("pf_names");
    if(_sv && _sv.names && _sv.o){ var o=_sv.o;
      raceSel.value=o.race||"human"; if(o.culture) cultSel.value=o.culture;
      state.gender=o.gender||"any"; var gl={any:"Any",male:"Male",female:"Female",neutral:"Neutral"}[state.gender]||"Any"; genderSeg.querySelectorAll("button").forEach(function(x){ x.classList.toggle("on",x.textContent===gl); });
      countIn.value=o.count||12; surCh.checked=!!o.surname; epiCh.checked=!!o.epithet; modeSel.value=o.mode||"mixed"; seedIn.value=o.seed||"";
      last=_sv.names; syncCult(); paint(o);
    } else { syncCult(); gen(); }
  }
  var _nfToast, _nfTt;
  function nfCopy(text,msg){
    function done(){ if(!_nfToast){ _nfToast=h("div",{class:"nf-toast"}); document.body.appendChild(_nfToast); } _nfToast.textContent=msg; _nfToast.classList.add("show"); clearTimeout(_nfTt); _nfTt=setTimeout(function(){ _nfToast.classList.remove("show"); },1400); }
    if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done,done); }
    else { var ta=h("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy");}catch(e){} ta.remove(); done(); }
  }

  // ---- Initiative Tracker (at-table combat order + HP; saved locally) ----
  function initState(){ try{ return JSON.parse(localStorage.getItem("pf_init")||"null") || {round:1,turn:0,list:[]}; }catch(e){ return {round:1,turn:0,list:[]}; } }
  function saveInit(s){ try{ localStorage.setItem("pf_init",JSON.stringify(s)); }catch(e){} }
  function viewInit(){
    setActiveNav(null);
    var s=initState();
    function sortList(){ s.list.forEach(function(c,i){ if(c.o==null)c.o=i; }); s.list.sort(function(a,b){ return (b.init-a.init) || (a.o-b.o); }); }
    sortList();
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>⚡ Initiative Tracker</h2><span class="meta">Turn order, round count &amp; HP at the table — saved on this device.</span>'; wrap.appendChild(head);
    var addbar=h("div",{class:"init-add"});
    var nName=h("input",{type:"text",placeholder:"Name",class:"init-in init-name"});
    var nInit=h("input",{type:"number",placeholder:"Init",class:"init-in init-num"});
    var nHp=h("input",{type:"number",placeholder:"HP (opt)",class:"init-in init-num"});
    var addBtn=h("button",{class:"char-act nf-primary"},"+ Add");
    function add(){ var nm=nName.value.trim(); if(!nm) return; var hp=nHp.value.trim()!==""?parseInt(nHp.value,10):null; s.list.push({id:uid(),name:nm,init:parseInt(nInit.value,10)||0,hp:hp,maxhp:hp,o:s.list.length}); sortList(); saveInit(s); nName.value="";nInit.value="";nHp.value=""; nName.focus(); render(); }
    addBtn.onclick=add; [nName,nInit,nHp].forEach(function(el){ el.onkeydown=function(e){ if(e.key==="Enter") add(); }; });
    addbar.appendChild(nName); addbar.appendChild(nInit); addbar.appendChild(nHp); addbar.appendChild(addBtn);
    wrap.appendChild(addbar);
    var ctrl=h("div",{class:"init-ctrl"});
    var prev=h("button",{class:"char-act"},"◀ Prev"), next=h("button",{class:"char-act nf-primary"},"▶ Next turn");
    var roundLbl=h("span",{class:"init-round"},"Round "+s.round), clr=h("button",{class:"char-act init-clr"},"↺ Reset");
    prev.onclick=function(){ if(!s.list.length)return; s.turn--; if(s.turn<0){ s.turn=s.list.length-1; s.round=Math.max(1,s.round-1);} saveInit(s); render(); };
    next.onclick=function(){ if(!s.list.length)return; s.turn++; if(s.turn>=s.list.length){ s.turn=0; s.round++; } saveInit(s); render(); };
    clr.onclick=function(){ if(!confirm("Clear the tracker?"))return; s.round=1;s.turn=0;s.list=[]; saveInit(s); render(); };
    ctrl.appendChild(prev); ctrl.appendChild(next); ctrl.appendChild(roundLbl); ctrl.appendChild(clr);
    wrap.appendChild(ctrl);
    var list=h("div",{class:"init-list"}); wrap.appendChild(list);
    function render(){
      roundLbl.textContent="Round "+s.round; list.innerHTML="";
      if(!s.list.length){ list.appendChild(h("div",{class:"empty"},"Add combatants above (name + initiative) to start.")); return; }
      if(s.turn>=s.list.length) s.turn=0;
      s.list.forEach(function(c,i){
        var row=h("div",{class:"init-row"+(i===s.turn?" active":"")});
        row.appendChild(h("span",{class:"init-i"},String(c.init)));
        row.appendChild(h("span",{class:"init-nm"},esc(c.name)));
        var hpw=h("span",{class:"init-hp"});
        if(c.hp!=null){
          var minus=h("button",{class:"init-hpbtn"},"−"), val=h("span",{class:"init-hpval"+(c.hp<=0?" dead":"")}, c.hp+(c.maxhp!=null?" / "+c.maxhp:"")), plus=h("button",{class:"init-hpbtn"},"+");
          minus.onclick=function(){ var d=prompt("Damage to "+c.name+":","5"); if(d==null)return; c.hp-=(parseInt(d,10)||0); saveInit(s); render(); };
          plus.onclick=function(){ var hh=prompt("Heal "+c.name+":","5"); if(hh==null)return; c.hp+=(parseInt(hh,10)||0); if(c.maxhp!=null)c.hp=Math.min(c.hp,c.maxhp); saveInit(s); render(); };
          hpw.appendChild(minus); hpw.appendChild(val); hpw.appendChild(plus);
        } else { var ah=h("button",{class:"init-hpbtn init-addhp"},"+ HP"); ah.onclick=function(){ var hh=prompt("HP for "+c.name+":","10"); if(hh==null)return; c.hp=parseInt(hh,10)||0; c.maxhp=c.hp; saveInit(s); render(); }; hpw.appendChild(ah); }
        row.appendChild(hpw);
        var rm=h("button",{class:"init-rm",title:"Remove"},"✕"); rm.onclick=function(){ s.list.splice(i,1); if(s.turn>=s.list.length)s.turn=0; saveInit(s); render(); }; row.appendChild(rm);
        list.appendChild(row);
      });
    }
    render(); swap(wrap); window.scrollTo(0,0);
  }

  // ---- Magic Shop / Settlement inventory (rolls stock from priced items) ----
  var SETTLEMENTS=[
    {k:"Thorp",base:50,limit:500,minor:"1d4"},
    {k:"Hamlet",base:200,limit:1000,minor:"1d6"},
    {k:"Village",base:500,limit:2500,minor:"2d4"},
    {k:"Small Town",base:1000,limit:5000,minor:"3d4",medium:"1d6"},
    {k:"Large Town",base:2000,limit:10000,minor:"3d4",medium:"2d4",major:"1d4"},
    {k:"Small City",base:4000,limit:25000,minor:"4d4",medium:"3d4",major:"1d6"},
    {k:"Large City",base:8000,limit:50000,minor:"4d4",medium:"3d4",major:"2d4"},
    {k:"Metropolis",base:16000,limit:100000,minor:"4d4",medium:"4d4",major:"3d4"}
  ];
  function rollDice(spec){ var m=/(\d+)d(\d+)/.exec(spec||""); if(!m) return 0; var n=+m[1],d=+m[2],t=0; for(var i=0;i<n;i++) t+=1+((Math.random()*d)|0); return t; }
  function viewShop(){
    setActiveNav(null);
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🪄 Magic Shop</h2><span class="meta">Roll a settlement’s available magic items by size (base value, purchase limit &amp; a stocked list).</span>'; wrap.appendChild(head);
    var bar=h("div",{class:"trs-bar"});
    function field(lab,ctrl){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,lab)); f.appendChild(ctrl); return f; }
    var sizeSel=h("select",{class:"char-sel"}); SETTLEMENTS.forEach(function(s,i){ sizeSel.appendChild(new Option(s.k+" (base "+s.base.toLocaleString()+" gp)",i)); }); sizeSel.value="4";
    var genBtn=h("button",{class:"char-act nf-primary"},"🪄 Generate stock"), reBtn=h("button",{class:"char-act"},"↻ Reroll");
    bar.appendChild(field("Settlement",sizeSel)); var bw=h("div",{class:"trs-btns"}); bw.appendChild(genBtn); bw.appendChild(reBtn); bar.appendChild(bw);
    wrap.appendChild(bar);
    var out=h("div",{class:"shop-out gen-out"}); wrap.appendChild(out);
    function bandItems(count,lo,hi){ if(count<=0) return []; var pool=pricedItems(), res=[], seen={}, tries=0; while(res.length<count && tries<count*80){ tries++; var it=pool[(Math.random()*pool.length)|0], p=it[I_FAC].pr; if(p<lo||p>=hi||seen[it[I_ID]]) continue; seen[it[I_ID]]=1; res.push(it[I_ID]); } return res; }
    function section(title,ids){ ids=(ids||[]).map(function(id){return idById()[id];}).filter(Boolean); if(!ids.length) return null; ids.sort(function(a,b){return b[I_FAC].pr-a[I_FAC].pr;}); var s=h("div"); s.appendChild(h("h3",{class:"section-h"},title+" ("+ids.length+")")); var g=h("div",{class:"trs-items"});
      ids.forEach(function(r){ var a=h("a",{class:"trs-item",href:"#/e/"+encodeURIComponent(r[I_ID])}); a.innerHTML='<span class="trs-item-nm">'+esc(r[I_NAME])+'</span><span class="trs-item-pr">'+r[I_FAC].pr.toLocaleString()+' gp</span>'; attachInfoTip(a,r[I_ID]); g.appendChild(a); }); s.appendChild(g); return s; }
    function draw(res){
      var st=SETTLEMENTS[res.sizeIdx];
      out.innerHTML="";
      out.appendChild(h("div",{class:"shop-stats"},"Base value ≈ "+st.base.toLocaleString()+" gp (any item at or below is available) · Purchase limit "+st.limit.toLocaleString()+" gp"));
      var any=false;
      [["Minor items",res.minor],["Medium items",res.medium],["Major items",res.major]].forEach(function(pair){ var sec=section(pair[0],pair[1]); if(sec){ out.appendChild(sec); any=true; } });
      if(!any) out.appendChild(h("div",{class:"muted"},"A quiet market — only common goods at or below the base value."));
    }
    function gen(){
      var si=parseInt(sizeSel.value,10), st=SETTLEMENTS[si];
      var res={sizeIdx:si, minor:bandItems(rollDice(st.minor),100,5000), medium:bandItems(rollDice(st.medium),5000,25000), major:bandItems(rollDice(st.major),25000,1e9)};
      lset("pf_shop",res); draw(res);
    }
    genBtn.onclick=gen; reBtn.onclick=gen; // persist: only the buttons regenerate
    var saved=lget("pf_shop");
    if(saved && saved.sizeIdx!=null){ sizeSel.value=saved.sizeIdx; draw(saved); } else gen();
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Encounter Builder (XP budget by APL; add monsters from the bestiary) ----
  var XP_BY_CR={"1/8":50,"1/6":65,"1/4":100,"1/3":135,"1/2":200,"1":400,"2":600,"3":800,"4":1200,"5":1600,"6":2400,"7":3200,"8":4800,"9":6400,"10":9600,"11":12800,"12":19200,"13":25600,"14":38400,"15":51200,"16":76800,"17":102400,"18":153600,"19":204800,"20":307200,"21":409600,"22":614400,"23":819200,"24":1228800,"25":1638400};
  function crKey(cr){ if(cr==null) return null; var k=String(cr).trim(); if(XP_BY_CR[k]!=null) return k; var n=parseFloat(k); if(!isNaN(n)&&XP_BY_CR[String(n)]!=null) return String(n); return null; }
  function crToXP(cr){ var k=crKey(cr); return k?XP_BY_CR[k]:0; }
  function encBudget(apl){ function x(cr){ return XP_BY_CR[String(cr)]||0; } return [["Easy",x(apl-1)||200],["Average",x(apl)],["Challenging",x(apl+1)],["Hard",x(apl+2)],["Epic",x(apl+3)]]; }
  // ---- shared hover info-tip: dwell over any entry link → preview popout, Shift to pin ----
  var _infoEl=null, _infoTimer=null, _infoPinned=false, _infoId=null;
  function infoEl(){ if(!_infoEl){ _infoEl=h("div",{class:"ft-tip info-tip"}); _infoEl.style.display="none"; document.body.appendChild(_infoEl);
    _infoEl.addEventListener("mouseenter",function(){ if(_infoTimer){clearTimeout(_infoTimer);_infoTimer=null;} });
    _infoEl.addEventListener("mouseleave",function(){ if(!_infoPinned) hideInfoTip(); });
  } return _infoEl; }
  function hideInfoTip(force){ if(_infoPinned && !force) return; if(_infoTimer){clearTimeout(_infoTimer);_infoTimer=null;} _infoPinned=false; _infoId=null; if(_infoEl){ _infoEl.style.display="none"; _infoEl.classList.remove("pinned"); } }
  function showInfoTip(anchor,id){ var r=idById()[id]; if(!r || _infoPinned) return; _infoId=id; var t=infoEl();
    var snip=(r[I_SNIP]||"").slice(0,220);
    t.innerHTML='<div class="ft-tip-name">'+esc(r[I_NAME])+'</div>'+quickStats(r)+(snip?'<div class="ft-tip-snip">'+esc(snip)+'</div>':'')+(r[I_SRC]?'<div class="ft-tip-src">📖 '+esc(r[I_SRC])+'</div>':'')+'<div class="ft-tip-hint">⇧ Shift to pin</div>';
    t.style.display="block"; t.classList.remove("pinned");
    var b=anchor.getBoundingClientRect(), tw=t.offsetWidth, th=t.offsetHeight;
    var x=b.right+10; if(x+tw>innerWidth-8) x=b.left-tw-10; if(x<8) x=8;
    var y=b.top-6; if(y+th>innerHeight-8) y=innerHeight-th-8; if(y<8) y=8;
    t.style.left=x+"px"; t.style.top=y+"px";
  }
  function pinInfoTip(){ if(_infoEl && _infoEl.style.display!=="none" && !_infoPinned){ _infoPinned=true; _infoEl.classList.add("pinned"); var hn=_infoEl.querySelector(".ft-tip-hint"); if(hn) hn.textContent="📌 Pinned · Esc to close"; } }
  function attachInfoTip(el,id){ /* previews are handled globally by delegation on #main; kept for call-site compatibility */ }
  // generator persistence: results stay put across refresh/nav until the user regenerates
  function lget(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch(e){ return null; } }
  function lset(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  // ---- export any generator's result as a plain-text file ----
  function exportTxt(filename, text){
    try{ var blob=new Blob([text],{type:"text/plain;charset=utf-8"}), url=URL.createObjectURL(blob);
      var a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click();
      setTimeout(function(){ if(a.parentNode)a.parentNode.removeChild(a); URL.revokeObjectURL(url); },120);
    }catch(e){}
  }
  function currentGenText(){
    var outs=document.querySelectorAll("#main .gen-out"); if(!outs.length) return null;
    var parts=[]; for(var i=0;i<outs.length;i++){ var t=(outs[i].innerText||"").replace(/\n{3,}/g,"\n\n").trim(); if(t) parts.push(t); }
    if(!parts.length) return null;
    var h2=document.querySelector("#main h2"), title=h2?h2.textContent.trim():"PF1e Codex";
    return title+"\n"+Array(Math.min(48,title.length)+1).join("=")+"\n\n"+parts.join("\n\n")+"\n\n— generated with The PF1e Codex\n";
  }
  function genFileName(){ var h2=document.querySelector("#main h2"), t=(h2?h2.textContent:"export").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase()||"export"; return "pf1e-"+t+".txt"; }

  var _envIndex=null;
  var ENV_LIST=[["","Any environment"],["forest","Forest / jungle"],["plains","Plains / grassland"],["hills","Hills"],["mountains","Mountains"],["desert","Desert"],["swamp","Swamp / marsh"],["underground","Underground"],["aquatic","Aquatic / coast"],["cold","Cold / arctic"],["urban","Urban / ruins"],["sky","Sky / aerial"]];
  var ENV_RE={forest:/forest|wood|jungle/,plains:/plain|grassland|savanna|steppe|field|prairie/,hills:/\bhill/,mountains:/mountain|peak|highland/,desert:/desert|dune|\bwaste/,swamp:/swamp|marsh|\bbog|\bfen\b|moor/,underground:/underground|cavern|\bcave|subterran|dungeon|darkland/,aquatic:/ocean|\bsea\b|water|coast|\briver|\blake|aquatic|marine|reef|shore|shoal/,cold:/\bcold|arctic|tundra|glacier|\bice\b|snow|frozen/,urban:/urban|\bcity\b|\btown|settlement|\bruin/,sky:/\bsky\b|\bair\b|aerial|\bcloud/};
  function buildEnvIndex(cb){ if(_envIndex) return cb&&cb(); loadCat("monsters",function(){ _envIndex={}; var B=BODIES.monsters||{}; for(var id in B){ var m=B[id].match(/Environment[:\s]+([^\n]+)/i); if(!m) continue; var txt=m[1].toLowerCase(), bk=[]; for(var k in ENV_RE){ if(ENV_RE[k].test(txt)) bk.push(k); } if(/\bany\b/.test(txt)) bk.push("__any"); _envIndex[id]=bk; } cb&&cb(); }); }
  function viewEncounter(){
    setActiveNav(null);
    var apl=6, added=[];
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>⚔️ Encounter Builder</h2><span class="meta">Set party level, then click a difficulty to auto-build a fight — or search a specific monster. Filters are optional.</span>'; wrap.appendChild(head);
    function field(lab,ctrl){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,lab)); f.appendChild(ctrl); return f; }
    var bar=h("div",{class:"trs-bar enc-controls"});
    var aplSel=h("select",{class:"char-sel"}); for(var i=1;i<=20;i++) aplSel.appendChild(new Option("APL "+i,i)); aplSel.value="6";
    var mf=(PF_META.facets&&PF_META.facets.monsters)||{};
    var envSel=h("select",{class:"char-sel"}); ENV_LIST.forEach(function(e){ envSel.appendChild(new Option(e[1],e[0])); });
    var typeSel=h("select",{class:"char-sel"}); typeSel.appendChild(new Option("Any type","")); (mf.types||[]).forEach(function(t){ typeSel.appendChild(new Option(cap(t),t)); });
    var sizeSel=h("select",{class:"char-sel"}); sizeSel.appendChild(new Option("Any size","")); (mf.sizes||[]).forEach(function(z){ sizeSel.appendChild(new Option(z,z)); });
    bar.appendChild(field("Avg party level",aplSel)); bar.appendChild(field("Environment",envSel)); bar.appendChild(field("Creature type",typeSel)); bar.appendChild(field("Size",sizeSel));
    wrap.appendChild(bar);
    var srow=h("div",{class:"enc-searchrow"});
    var swrap=h("div",{class:"fwx-swrap"}); var search=h("input",{type:"search",class:"fwx-search",placeholder:"🔍 …or add a specific monster by name",autocomplete:"off",spellcheck:"false"}); var sugg=h("div",{class:"fwx-sugg"}); sugg.style.display="none"; swrap.appendChild(search); swrap.appendChild(sugg); srow.appendChild(swrap);
    var envNote=h("span",{class:"muted enc-envnote"}); envNote.style.display="none"; srow.appendChild(envNote);
    wrap.appendChild(srow);
    var budgetBar=h("div",{class:"enc-budgets"}); wrap.appendChild(budgetBar);
    var verdict=h("div",{class:"enc-verdict"}); wrap.appendChild(verdict);
    var list=h("div",{class:"enc-list gen-out"}); wrap.appendChild(list);
    var _sav=lget("pf_encounter"); if(_sav){ if(_sav.apl)aplSel.value=_sav.apl; if(_sav.env)envSel.value=_sav.env; if(_sav.type)typeSel.value=_sav.type; if(_sav.size)sizeSel.value=_sav.size; added=(_sav.added||[]).slice(); }
    var monsters=IDX.filter(function(r){ return r[I_SLUG]==="monsters" && r[I_FAC] && r[I_FAC].cr!=null && crKey(r[I_FAC].cr); });
    function monsterOk(r){ var f=r[I_FAC];
      if(typeSel.value && f.t!==typeSel.value) return false;
      if(sizeSel.value && f.sz!==sizeSel.value) return false;
      if(envSel.value){ if(!_envIndex) return true; var b=_envIndex[r[I_ID]]; if(!b) return false; if(b.indexOf("__any")<0 && b.indexOf(envSel.value)<0) return false; }
      return true;
    }
    function filteredMonsters(){ return monsters.filter(monsterOk); }
    function pushMon(r){ var ex=added.filter(function(a){return a.id===r[I_ID];})[0]; if(ex) ex.qty++; else added.push({id:r[I_ID],name:r[I_NAME],cr:r[I_FAC].cr,xp:crToXP(r[I_FAC].cr),qty:1}); }
    function addMon(r){ pushMon(r); render(); }
    function autoBuild(target){
      added=[]; var pool=filteredMonsters();
      if(!pool.length){ render(); verdict.innerHTML='<span class="muted">No monsters match those filters — loosen them.</span>'; return; }
      var total=0, guard=0;
      while(total<target*0.85 && guard<250){ guard++;
        var remain=target-total;
        var cands=pool.filter(function(r){ var xp=crToXP(r[I_FAC].cr); return xp>0 && xp<=remain && xp>=remain*0.08; });
        if(!cands.length) cands=pool.filter(function(r){ var xp=crToXP(r[I_FAC].cr); return xp>0 && xp<=remain; });
        if(!cands.length) break;
        pushMon(cands[(Math.random()*cands.length)|0]); total=0; added.forEach(function(a){ total+=a.xp*a.qty; });
        if(added.reduce(function(a,b){return a+b.qty;},0)>=14) break;
      }
      render();
    }
    var selIdx=-1;
    function suggest(q){ q=q.trim().toLowerCase(); sugg.innerHTML=""; selIdx=-1; if(!q){sugg.style.display="none";return;} var pool=filteredMonsters(), outl=[]; for(var i=0;i<pool.length&&outl.length<10;i++){ if(pool[i][I_NAME].toLowerCase().indexOf(q)>=0) outl.push(pool[i]); } if(!outl.length){sugg.style.display="none";return;} outl.forEach(function(r){ var it=h("div",{class:"fwx-sug"}); it.innerHTML=esc(r[I_NAME])+' <span class="muted">CR '+esc(fmtCR(r[I_FAC].cr))+'</span>'; it.onclick=function(){ addMon(r); search.value=""; sugg.style.display="none"; search.focus(); }; sugg.appendChild(it); }); sugg.style.display=""; }
    search.oninput=function(){ suggest(search.value); };
    search.onkeydown=function(e){ var items=sugg.querySelectorAll(".fwx-sug"); if(e.key==="ArrowDown"){ e.preventDefault(); selIdx=Math.min(selIdx+1,items.length-1); } else if(e.key==="ArrowUp"){ e.preventDefault(); selIdx=Math.max(selIdx-1,0); } else if(e.key==="Enter"){ e.preventDefault(); var t=items[selIdx]||items[0]; if(t) t.click(); return; } else if(e.key==="Escape"){ sugg.style.display="none"; return; } else return; items.forEach(function(x,j){ x.classList.toggle("sel",j===selIdx); }); if(items[selIdx]) items[selIdx].scrollIntoView({block:"nearest"}); };
    function onFilter(){ if(envSel.value && !_envIndex){ envNote.style.display=""; envNote.textContent="Loading environment data…"; buildEnvIndex(function(){ envNote.style.display="none"; render(); }); } else render(); }
    aplSel.onchange=render; typeSel.onchange=onFilter; sizeSel.onchange=onFilter; envSel.onchange=onFilter;
    function render(){
      apl=parseInt(aplSel.value,10); var budgets=encBudget(apl);
      budgetBar.innerHTML="";
      budgets.forEach(function(b){ var e=h("button",{class:"enc-bg enc-bg-btn",title:"Auto-build a "+b[0]+" encounter"}); e.innerHTML='<span class="enc-bg-l">'+b[0]+'</span><span class="enc-bg-x">'+b[1].toLocaleString()+' XP</span>'; e.onclick=function(){ autoBuild(b[1]); }; budgetBar.appendChild(e); });
      var total=0; added.forEach(function(a){ total+=a.xp*a.qty; });
      var tier="Trivial"; budgets.forEach(function(b){ if(total>=b[1]) tier=b[0]; }); if(total>budgets[4][1]*1.15) tier="Deadly";
      verdict.innerHTML = added.length ? ('<b>Encounter total:</b> '+total.toLocaleString()+' XP → <span class="enc-tier tier-'+tier.toLowerCase()+'">'+tier+'</span> for an APL '+apl+' party') : '<span class="muted">Click a difficulty above to auto-build, or search a monster to add.</span>';
      list.innerHTML="";
      added.forEach(function(a,idx){ var row=h("div",{class:"enc-row"});
        var nm=h("a",{class:"enc-nm",href:"#/e/"+encodeURIComponent(a.id)},a.name); attachInfoTip(nm,a.id); row.appendChild(nm);
        row.appendChild(h("span",{class:"enc-cr"},"CR "+fmtCR(a.cr)));
        row.appendChild(h("span",{class:"enc-xp"},(a.xp*a.qty).toLocaleString()+" XP"));
        var qty=h("span",{class:"enc-qty"});
        var minus=h("button",{class:"init-hpbtn"},"−"), n=h("span",{class:"enc-qn"},"×"+a.qty), plus=h("button",{class:"init-hpbtn"},"+");
        minus.onclick=function(){ a.qty--; if(a.qty<=0) added.splice(idx,1); render(); }; plus.onclick=function(){ a.qty++; render(); };
        qty.appendChild(minus); qty.appendChild(n); qty.appendChild(plus); row.appendChild(qty);
        var rm=h("button",{class:"init-rm",title:"Remove"},"✕"); rm.onclick=function(){ added.splice(idx,1); render(); }; row.appendChild(rm);
        list.appendChild(row);
      });
      lset("pf_encounter",{apl:aplSel.value,env:envSel.value,type:typeSel.value,size:sizeSel.value,added:added});
    }
    swap(wrap); window.scrollTo(0,0);
    if(envSel.value && !_envIndex){ envNote.style.display=""; envNote.textContent="Loading environment data…"; buildEnvIndex(function(){ envNote.style.display="none"; render(); }); } else render();
  }

  // ---- NPC Spark (instant NPC: NameForge name + original flavor tables) ----
  var NPC_TAB={
    occ:["blacksmith","tavernkeeper","farmer","traveling merchant","town guard","scribe","hunter","fisher","hedge-priest","beggar","sellsword","alchemist","cobbler","miller","stablehand","herbalist","tax collector","fortune-teller","dockworker","messenger","gravedigger","jeweler","street musician","locksmith","cartographer","brewer","tanner","weaver","cooper","ratcatcher","bounty hunter","smuggler","noble's steward","caravan guard","fruit vendor","midwife","town crier","undertaker","falconer","retired adventurer"],
    look:["a jagged scar across one cheek","mismatched eyes","a gap-toothed grin","faded old tattoos","a nervous twitch","unusually tall and gaunt","short and barrel-chested","prematurely grey hair","a booming laugh","ink-stained fingers","a limp favoring one leg","piercing pale eyes","a sunburnt, weathered face","surprisingly delicate hands","a shaved head","a wild untamed beard","one arm far stronger than the other","a soft melodic voice","calloused hands, a crushing grip","a faint smell of woodsmoke"],
    quirk:["speaks almost in a whisper","laughs at the wrong moments","never makes eye contact","compulsively counts things","quotes proverbs constantly","deeply superstitious","relentlessly optimistic","suspicious of everyone","pockets small trinkets","refers to themselves by name","always chewing on something","terrified of the dark","fiercely loyal once you earn it","name-drops important people","haggles over everything","hums old tunes absently","stiffly formal and polite","blunt to the point of rude","hopelessly distracted","keeps a mental list of grudges"],
    tell:["taps fingers when thinking","rubs a lucky coin","cracks their knuckles","fidgets with a ring","adjusts their spectacles","paces while talking","gestures wildly","keeps glancing over a shoulder","avoids stepping on cracks","strokes their chin"],
    hook:["owe money to a dangerous lender","are minor nobility in hiding","know where a hidden cache lies","are being quietly blackmailed","spy for a rival faction","lost someone to the local threat","are desperate for an apprentice or heir","are hiding a fugitive","had a strange dream about the party","are not who they claim to be","want revenge on a former partner","guard an old family secret","are dying and hiding it","dabble in forbidden magic","saw something they weren’t meant to"],
    mood:["gruff","cheerful","weary","sly","earnest","anxious","aloof","warm","sardonic","timid","proud","harried"]
  };
  var NPC_RACES=["human","half-elf","elf","dwarf","gnome","halfling","half-orc","tiefling","aasimar"];
  function rpick(a){ return a[(Math.random()*a.length)|0]; }
  function viewNPC(){
    setActiveNav(null);
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🍺 NPC Spark</h2><span class="meta">Instant NPCs — a name, a look, a quirk, and a hook. Perfect for that person the party just walked up to.</span>'; wrap.appendChild(head);
    var bar=h("div",{class:"trs-bar"});
    function field(lab,ctrl){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,lab)); f.appendChild(ctrl); return f; }
    var raceSel=h("select",{class:"char-sel"}); raceSel.appendChild(new Option("Any race",""));
    bar.appendChild(field("Race",raceSel));
    var genBtn=h("button",{class:"char-act nf-primary"},"🎲 Spark an NPC");
    var btnw=h("div",{class:"trs-btns"}); btnw.appendChild(genBtn); bar.appendChild(btnw);
    wrap.appendChild(bar);
    var out=h("div",{class:"npc-out gen-out"}); out.appendChild(h("div",{class:"muted"},"Loading generator…")); wrap.appendChild(out);
    swap(wrap);
    ensureNameForge(function(){
      if(location.hash.replace(/^#/,"").indexOf("/npc")!==0) return;
      window.NameForge.races().forEach(function(r){ raceSel.appendChild(new Option(r.label,r.key)); });  // ALL races
      function line(lab,val){ var d=h("div",{class:"npc-line"}); d.innerHTML='<span class="npc-lab">'+lab+'</span> '+esc(val); return d; }
      function draw(npc){
        out.innerHTML="";
        var card=h("div",{class:"npc-card"});
        card.appendChild(h("div",{class:"npc-name"},esc(npc.full)));
        card.appendChild(h("div",{class:"npc-sub"},esc((npc.raceLabel||npc.race)+" · "+(npc.gender==="m"?"male":npc.gender==="f"?"female":"nonbinary")+" · "+npc.occ)));
        card.appendChild(line("Looks","They have "+npc.look+"."));
        card.appendChild(line("Manner",cap(npc.mood)+"; "+npc.tell+"."));
        card.appendChild(line("Quirk",cap(npc.quirk)+"."));
        card.appendChild(line("Hook","Secretly, they "+npc.hook+"."));
        out.appendChild(card);
      }
      function gen(){
        var allKeys=window.NameForge.races().map(function(r){return r.key;});
        var rk=raceSel.value||rpick(allKeys);
        var one=window.NameForge.one(rk,"any",{surname:true});
        var npc={race:rk,full:one.full,raceLabel:one.raceLabel,gender:one.gender,occ:rpick(NPC_TAB.occ),look:rpick(NPC_TAB.look),mood:rpick(NPC_TAB.mood),tell:rpick(NPC_TAB.tell),quirk:rpick(NPC_TAB.quirk),hook:rpick(NPC_TAB.hook)};
        lset("pf_npc",npc); draw(npc);
      }
      genBtn.onclick=gen;   // persist: only the button regenerates
      var saved=lget("pf_npc");
      if(saved&&saved.full){ raceSel.value=saved.race||""; draw(saved); } else gen();
    });
    window.scrollTo(0,0);
  }

  // ---- Treasure generator (encounter loot by CR, drawn from the item library) ----
  var TREASURE_CR={1:260,2:550,3:800,4:1150,5:1550,6:2000,7:2600,8:3350,9:4250,10:5450,11:7000,12:9000,13:11500,14:15000,15:19500,16:25000,17:32000,18:41000,19:53000,20:67000};
  function pricedItems(){ if(!pricedItems._c){ pricedItems._c=IDX.filter(function(r){ return r[I_SLUG]==="items" && r[I_FAC] && typeof r[I_FAC].pr==="number" && r[I_FAC].pr>0; }); } return pricedItems._c; }
  function coinString(gp){
    var out=[]; var g=Math.floor(gp); if(g>=1) out.push(g.toLocaleString()+" gp");
    var sp=Math.round((gp-g)*10); if(sp>0 && g<1000) out.push(sp+" sp");
    return out.length?out.join(", "):"—";
  }
  function viewTreasure(){
    setActiveNav(null);
    var wrap=h("div");
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>💰 Treasure Generator</h2><span class="meta">Roll encounter loot by CR — coins plus real items from the library. A starting point; swap freely.</span>'; wrap.appendChild(head);
    var bar=h("div",{class:"trs-bar"});
    function field(lab,ctrl){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,lab)); f.appendChild(ctrl); return f; }
    var crSel=h("select",{class:"char-sel"}); for(var i=1;i<=20;i++) crSel.appendChild(new Option("CR "+i,i)); crSel.value="4";
    var trackSel=h("select",{class:"char-sel"}); [["0.5","Slow (½)"],["1","Standard"],["1.5","Fast (1½×)"],["2","Double"]].forEach(function(o){ trackSel.appendChild(new Option(o[1],o[0])); }); trackSel.value="1";
    var genBtn=h("button",{class:"char-act nf-primary"},"💰 Generate");
    var reBtn=h("button",{class:"char-act"},"↻ Reroll");
    bar.appendChild(field("Encounter",crSel)); bar.appendChild(field("Track",trackSel));
    var btnwrap=h("div",{class:"trs-btns"}); btnwrap.appendChild(genBtn); btnwrap.appendChild(reBtn); bar.appendChild(btnwrap);
    wrap.appendChild(bar);
    var out=h("div",{class:"trs-out gen-out"}); wrap.appendChild(out);
    function draw(res){
      out.innerHTML="";
      out.appendChild(h("div",{class:"trs-budget"},"Treasure budget ≈ "+res.budget.toLocaleString()+" gp"));
      var coinRow=h("div",{class:"trs-coins"}); coinRow.innerHTML='<span class="trs-coin-ic">🪙</span> <b>'+coinString(res.coins)+'</b> in coins'; out.appendChild(coinRow);
      var picks=(res.ids||[]).map(function(id){return idById()[id];}).filter(Boolean);
      if(!picks.length){ out.appendChild(h("div",{class:"muted"},"No items this time — mostly coins.")); return; }
      var spent=picks.reduce(function(s,r){return s+(r[I_FAC].pr||0);},0);
      out.appendChild(h("h3",{class:"section-h"},"Items ("+picks.length+" · "+spent.toLocaleString()+" gp)"));
      var grid=h("div",{class:"trs-items"});
      picks.forEach(function(r){ var a=h("a",{class:"trs-item",href:"#/e/"+encodeURIComponent(r[I_ID])}); a.innerHTML='<span class="trs-item-nm">'+esc(r[I_NAME])+'</span><span class="trs-item-pr">'+r[I_FAC].pr.toLocaleString()+' gp</span>'; attachInfoTip(a,r[I_ID]); grid.appendChild(a); });
      out.appendChild(grid);
    }
    function gen(){
      var cr=parseInt(crSel.value,10), mult=parseFloat(trackSel.value);
      var budget=Math.round((TREASURE_CR[cr]||260)*mult*(0.85+Math.random()*0.3));
      var coins=Math.round(budget*(0.30+Math.random()*0.25)/10)*10;
      var itemBudget=budget-coins, pool=pricedItems(), picks=[], spent=0, tries=0, seen={};
      while(spent<itemBudget*0.8 && picks.length<10 && tries<900){ tries++;
        var remain=itemBudget-spent; if(remain<25) break;
        var it=pool[(Math.random()*pool.length)|0], pr=it[I_FAC].pr;
        if(seen[it[I_ID]]) continue;
        if(pr<=remain && pr>=Math.max(15, remain*0.06)){ picks.push(it); spent+=pr; seen[it[I_ID]]=1; }
      }
      picks.sort(function(a,b){ return b[I_FAC].pr-a[I_FAC].pr; });
      var res={cr:cr,mult:mult,budget:budget,coins:coins,ids:picks.map(function(r){return r[I_ID];})};
      lset("pf_treasure",res); draw(res);
    }
    genBtn.onclick=gen; reBtn.onclick=gen; // persist: only the buttons regenerate; CR/track apply on next Generate
    var saved=lget("pf_treasure");
    if(saved && saved.ids){ if(saved.cr)crSel.value=saved.cr; if(saved.mult!=null)trackSel.value=String(saved.mult); draw(saved); } else gen();
    swap(wrap); window.scrollTo(0,0);
  }

  function shuffle(a){ a=a.slice(); for(var i=a.length-1;i>0;i--){ var j=(Math.random()*(i+1))|0, t=a[i]; a[i]=a[j]; a[j]=t; } return a; }

  // ---- Name-a-Thing: taverns, shops, ships, guilds, deities ----
  var THING={
    tavern:{label:"🍺 Tavern / Inn", tpl:["The {adj} {noun}","The {noun} & {noun2}","{name}’s {place}","The {noun}’s {part}"],
      adj:["Salty","Rusty","Gilded","Broken","Prancing","Drunken","Laughing","Silver","Black","Golden","Crooked","Sleeping","Wandering","Roaring","Hidden","Weary","Merry","Thirsty","Jolly","Lonely"],
      noun:["Wyvern","Tankard","Dragon","Griffon","Anchor","Boar","Stag","Crown","Barrel","Lantern","Mermaid","Kraken","Rose","Hound","Goblet","Flagon","Minstrel","Unicorn","Raven","Fox","Serpent"],
      noun2:["Barrel","Blade","Bell","Crown","Anchor","Candle","Quill","Hammer","Rose","Cup"], place:["Rest","Retreat","Lodge","Alehouse","Cellar","Hearth","Haven","Roost"], part:["Rest","Head","Den","Nook","Perch","Folly"], name:["Old Bram","Halden","Mira","Greta","Tomas","Wallace","Nessa","Ordric"]},
    shop:{label:"🏪 Shop", tpl:["{name}’s {trade}","The {adj} {trade}","{noun} & {noun2}"], name:["Aldric","Mirella","Gethin","Sable","Corwin","Dunmore","Ysolde"], trade:["Emporium","Curiosities","Sundries","Apothecary","Armory","Bindery","Reliquary","Provisions","Trading Post","Oddments","Fineries"], adj:["Gilded","Dusty","Arcane","Wandering","Curious","Silver","Copper","Hidden"], noun:["Raven","Compass","Cauldron","Quill","Anvil","Prism","Lantern"], noun2:["Thimble","Coin","Key","Thread","Spark","Vial"]},
    ship:{label:"⛵ Ship", tpl:["The {adj} {noun}","{noun} of the {domain}","The {name} {noun}"], adj:["Swift","Black","Golden","Dawning","Silent","Restless","Crimson","Wayward","Iron","Storm-touched"], noun:["Gull","Tide","Fortune","Serpent","Maiden","Gale","Wave","Siren","Marlin","Trident","Voyager","Pearl","Albatross","Nautilus"], domain:["Deep","Dawn","North","Storm","Mist","Horizon"], name:["Captain’s","Widow’s","Sea-King’s"]},
    guild:{label:"⚜ Guild / Order", tpl:["The Order of the {noun}","The {adj} {org}","{domain} {org}","The {noun} {org}"], noun:["Silver Flame","Iron Rose","Black Hand","Golden Chain","Broken Blade","Silent Key","Azure Eye","Crimson Veil"], adj:["Ashen","Gilded","Hidden","Iron","Emerald","Obsidian"], org:["Guild","Company","Circle","Covenant","League","Consortium","Brotherhood","Syndicate"], domain:["Merchants’","Cartographers’","Mages’","Alchemists’","Cutlers’","Mariners’","Vintners’"]}
  };
  var DEITY_SYL={pre:["Ael","Mor","Thal","Vor","Zar","Kael","Nyx","Sol","Ur","Ish","Bael","Cor","Dur","Fen","Grael","Hesh"," Omn","Vael","Sar","Tyr"], suf:["ara","oth","une","is","or","ael","ynn","us","eth","a","ir","aan","ix","ondel"]};
  var DEITY_DOM=["War","Death","Life","Trickery","Knowledge","Nature","Storm","Forge","Light","Shadow","Luck","Travel","Harvest","Sea","Moon","Sun","Justice","Freedom","Secrets","Madness","Vengeance","Dreams"];
  var DEITY_SYM=["a broken chain","a silver flame","an open eye","a coiled serpent","a rising sun","a black rose","a pair of scales","a shattered crown","a raven in flight","a golden key","a crescent moon","a burning heart","a three-pointed star","an anvil and hammer","a weeping willow","a clenched fist"];
  function fillTpl(t,d){ return t.replace(/\{(\w+)\}/g,function(_,k){ return d[k]?rpick(d[k]):"{"+k+"}"; }); }
  function viewThing(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🏷 Name-a-Thing</h2><span class="meta">Instant names for the places &amp; groups the party stumbles into — taverns, shops, ships, guilds, gods.</span>'; wrap.appendChild(head);
    var bar=h("div",{class:"trs-bar"});
    function field(l,c){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,l)); f.appendChild(c); return f; }
    var tSel=h("select",{class:"char-sel"}); [["tavern","Tavern / Inn"],["shop","Shop"],["ship","Ship"],["guild","Guild / Order"],["deity","Deity"]].forEach(function(o){ tSel.appendChild(new Option(o[1],o[0])); });
    var gen=h("button",{class:"char-act nf-primary"},"🎲 Generate");
    bar.appendChild(field("Type",tSel)); var bw=h("div",{class:"trs-btns"}); bw.appendChild(gen); bar.appendChild(bw); wrap.appendChild(bar);
    var out=h("div",{class:"thing-out gen-out"}); wrap.appendChild(out);
    function draw(res){ out.innerHTML=""; var g=h("div",{class:"thing-grid"});
      res.items.forEach(function(it){ var c=h("div",{class:"thing-card"}); c.innerHTML='<div class="thing-name">'+esc(it.name)+'</div>'+(it.sub?'<div class="thing-sub">'+esc(it.sub)+'</div>':'')+(it.sym?'<div class="thing-sym">'+esc(it.sym)+'</div>':''); g.appendChild(c); });
      out.appendChild(g);
    }
    function roll(){ var t=tSel.value, items=[];
      if(t==="deity"){ for(var i=0;i<6;i++){ items.push({name:cap(rpick(DEITY_SYL.pre).trim())+rpick(DEITY_SYL.suf), sub:"God/dess of "+shuffle(DEITY_DOM).slice(0,3).join(", "), sym:"Holy symbol: "+rpick(DEITY_SYM)}); } }
      else { var d=THING[t], seen={}, tries=0; while(items.length<6 && tries<80){ tries++; var nm=fillTpl(rpick(d.tpl),d); if(!seen[nm]){ seen[nm]=1; items.push({name:nm}); } } }
      var res={type:t,items:items}; lset("pf_thing",res); draw(res);
    }
    gen.onclick=roll;
    var sv=lget("pf_thing"); if(sv&&sv.items){ tSel.value=sv.type||"tavern"; draw(sv); } else roll();
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Random Encounter (a monster/group by environment + party level) ----
  function viewRandEnc(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🎲 Random Encounter</h2><span class="meta">Roll a wandering monster suited to the party’s level and terrain.</span>'; wrap.appendChild(head);
    function field(l,c){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,l)); f.appendChild(c); return f; }
    var bar=h("div",{class:"trs-bar"});
    var aplSel=h("select",{class:"char-sel"}); for(var i=1;i<=20;i++) aplSel.appendChild(new Option("APL "+i,i)); aplSel.value="5";
    var envSel=h("select",{class:"char-sel"}); ENV_LIST.forEach(function(e){ envSel.appendChild(new Option(e[1],e[0])); });
    var gen=h("button",{class:"char-act nf-primary"},"🎲 Roll encounter");
    bar.appendChild(field("Avg party level",aplSel)); bar.appendChild(field("Terrain",envSel)); var bw=h("div",{class:"trs-btns"}); bw.appendChild(gen); bar.appendChild(bw); wrap.appendChild(bar);
    var envNote=h("div",{class:"muted enc-envnote"}); envNote.style.display="none"; wrap.appendChild(envNote);
    var out=h("div",{class:"trs-out gen-out"}); wrap.appendChild(out);
    var monsters=IDX.filter(function(r){ return r[I_SLUG]==="monsters" && r[I_FAC] && r[I_FAC].cr!=null && crKey(r[I_FAC].cr); });
    var HOOKS=["is hunting for food","is guarding its lair","is lost and far from home","ambushes from cover","is wounded and desperate","is drawn by the party’s noise","blocks the only path forward","is feeding on a fresh kill","stalks the party for a while first","emerges as night falls"];
    function envOk(r){ if(!envSel.value) return true; if(!_envIndex) return true; var b=_envIndex[r[I_ID]]; return b && (b.indexOf("__any")>=0 || b.indexOf(envSel.value)>=0); }
    function draw(res){ out.innerHTML="";
      out.appendChild(h("div",{class:"trs-budget"},"An APL "+res.apl+(res.env?" · "+res.env:"")+" encounter:"));
      if(!res.ids.length){ out.appendChild(h("div",{class:"muted"},"No matching monster found — try another terrain.")); return; }
      var g=h("div",{class:"trs-items"});
      res.ids.forEach(function(o){ var r=idById()[o.id]; if(!r) return; var a=h("a",{class:"trs-item",href:"#/e/"+encodeURIComponent(r[I_ID])}); a.innerHTML='<span class="trs-item-nm">'+(o.qty>1?o.qty+"× ":"")+esc(r[I_NAME])+'</span><span class="trs-item-pr">CR '+esc(fmtCR(r[I_FAC].cr))+'</span>'; attachInfoTip(a,r[I_ID]); g.appendChild(a); });
      out.appendChild(g); out.appendChild(h("div",{class:"npc-line",style:"margin-top:10px"},'<span class="npc-lab">Twist</span> The '+ (res.ids.length>1?"pack":"creature")+" "+res.hook+"."));
    }
    function roll(){ var apl=parseInt(aplSel.value,10);
      var pool=monsters.filter(envOk);
      // solo boss (CR≈APL+1) or a group of weaker (CR≈APL-2, xN)
      var solo=Math.random()<0.6, ids=[];
      if(solo){ var band=pool.filter(function(r){ var c=crToXP(r[I_FAC].cr); return c>=crToXP(apl)*0.7 && c<=crToXP(apl+2); }); if(!band.length) band=pool; if(band.length) ids=[{id:rpick(band)[I_ID],qty:1}]; }
      else { var band2=pool.filter(function(r){ var c=crToXP(r[I_FAC].cr); return c>=crToXP(Math.max(1,apl-4)) && c<=crToXP(apl-1); }); if(!band2.length) band2=pool.filter(function(r){return crToXP(r[I_FAC].cr)<=crToXP(apl);}); if(band2.length){ var m=rpick(band2); ids=[{id:m[I_ID],qty:2+((Math.random()*4)|0)}]; } }
      var res={apl:apl,env:envSel.value?(ENV_LIST.filter(function(e){return e[0]===envSel.value;})[0]||["",""])[1]:"",ids:ids,hook:rpick(HOOKS)};
      lset("pf_randenc",res); draw(res);
    }
    gen.onclick=function(){ if(envSel.value && !_envIndex){ envNote.style.display=""; envNote.textContent="Loading terrain data…"; buildEnvIndex(function(){ envNote.style.display="none"; roll(); }); } else roll(); };
    var sv=lget("pf_randenc"); if(sv&&sv.ids){ aplSel.value=sv.apl; draw(sv); } else roll();
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Trap Generator (CR-scaled, original flavor) ----
  var TRAP={trigger:["a pressure plate","a tripwire","a magical rune","a false floor tile","opening the wrong container","a proximity sensor","touching the treasure","a light beam","a sound-triggered ward","a hidden switch"],
    reset:["no reset (one-shot)","manual reset","automatic (resets each round)","repair required","magical (resets at dawn)"],
    mech:["a volley of darts","a swinging blade","a pit with spikes","a collapsing ceiling","a scything axe","a net and snare","a crossbow turret","a rolling boulder","a spring-loaded spear","a flooding chamber"],
    magic:["a gout of flame","a burst of frost","a cloud of acid","a lightning arc","a wave of negative energy","a paralyzing glyph","a summoning circle","a confusion hex","a teleport ward","a sonic blast"],
    dmg:["fire","cold","acid","electricity","piercing","bludgeoning","slashing","negative energy","sonic","force"]};
  function viewTrap(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🪤 Trap Generator</h2><span class="meta">A CR-scaled trap sketch — DCs, trigger, effect. A starting point; tune to taste.</span>'; wrap.appendChild(head);
    function field(l,c){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,l)); f.appendChild(c); return f; }
    var bar=h("div",{class:"trs-bar"});
    var crSel=h("select",{class:"char-sel"}); for(var i=1;i<=20;i++) crSel.appendChild(new Option("CR "+i,i)); crSel.value="4";
    var gen=h("button",{class:"char-act nf-primary"},"🎲 Generate trap"); var re=h("button",{class:"char-act"},"↻ Reroll");
    bar.appendChild(field("Trap CR",crSel)); var bw=h("div",{class:"trs-btns"}); bw.appendChild(gen); bw.appendChild(re); bar.appendChild(bw); wrap.appendChild(bar);
    var out=h("div",{class:"gen-out"}); wrap.appendChild(out);
    function draw(t){ out.innerHTML=""; var card=h("div",{class:"npc-card"});
      card.appendChild(h("div",{class:"npc-name"},t.name));
      card.appendChild(h("div",{class:"npc-sub"},"CR "+t.cr+" · "+t.kind+" trap"));
      function line(l,v){ var d=h("div",{class:"npc-line"}); d.innerHTML='<span class="npc-lab">'+l+'</span> '+esc(v); return d; }
      card.appendChild(line("Trigger",cap(t.trigger)+".")); card.appendChild(line("Reset",cap(t.reset)+"."));
      card.appendChild(line("Detect","Perception DC "+t.perc+" to spot · Disable Device DC "+t.dis+"."));
      card.appendChild(line("Effect",t.effect+" — "+(t.kind==="magic"?("DC "+t.save+" "+t.saveType+" save"):("+"+t.atk+" attack"))+" for "+t.dice+" "+t.type+" damage."));
      out.appendChild(card);
    }
    function roll(){ var cr=parseInt(crSel.value,10), magic=Math.random()<0.45;
      var t={cr:cr, kind:magic?"magic":"mechanical", trigger:rpick(TRAP.trigger), reset:rpick(TRAP.reset),
        perc:18+cr+((Math.random()*6)|0), dis:18+cr+((Math.random()*6)|0),
        atk:cr+4+((Math.random()*4)|0), save:12+Math.round(cr*0.7), saveType:rpick(["Reflex","Fortitude","Will"]),
        effect:magic?rpick(TRAP.magic):rpick(TRAP.mech), type:rpick(TRAP.dmg), dice:Math.max(1,Math.round(cr*0.75))+"d6"+(cr>6?"+"+cr:"") };
      t.name=cap(t.type)+" "+(magic?"Ward":"Trap")+" (CR "+cr+")"; lset("pf_trap",t); draw(t);
    }
    gen.onclick=roll; re.onclick=roll;
    var sv=lget("pf_trap"); if(sv&&sv.name){ crSel.value=sv.cr; draw(sv); } else roll();
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Crit / Fumble deck (original effect tables) ----
  // Original crit/fumble effects, keyed by attack type. Use or ignore freely.
  var CF_DECK={
    general:{ label:"🎲 Any / mixed", crit:["The blow strikes a nerve cluster — target is staggered 1 round (Fort negates).","A gout of blood blinds the foe — target is dazzled 1d4 rounds.","You shatter their guard — target drops one held item.","A brutal impact — target is knocked prone and pushed 5 ft.","You find the gap in their armor — deal +1d6 damage and ignore their armor bonus until their next turn.","The strike rattles their skull — target is confused for 1 round.","You drive them back — target is bull-rushed 10 ft. and can’t take a 5-ft step next turn.","A crippling hit — target’s speed is halved for 1d4 rounds."],
      fumble:["Your weapon slips — it flies 1d10 ft. in a random direction.","You overextend — you’re flat-footed until your next turn.","Bad footing — you fall prone.","Your grip fails — take a −4 penalty to attacks until you spend a move action to recover.","You wrench something — take 1d6 nonlethal damage.","You leave yourself open — the nearest foe gets an attack of opportunity.","You misjudge the distance — your movement this turn is wasted.","Your armor shifts — −2 AC until you spend a move action to adjust it."] },
    slashing:{ label:"⚔ Slashing", crit:["A deep gash opens a vessel — target takes 1d6 bleed (DC 15 Heal or any magical healing ends it).","The edge bites a limb — target takes −2 on attacks made with that arm until healed 5+ HP.","You lay open their brow — blood sheets into their eyes; dazzled 1d4 rounds.","A sweeping cut catches a strap — target drops one worn or held item (GM’s choice).","The blade shears armor — the target’s armor gains the broken condition.","You hamstring the foe — speed halved for 1 minute or until they’re healed.","A savage slash — deal +1d6 damage and the wound bleeds for 1."],
      fumble:["Your swing bites the dirt — you’re off-balance (flat-footed) until your next turn.","The edge catches your own guard — take 1d4 damage from your blade.","You over-commit to the cut — provoke an attack of opportunity from a foe in reach.","Your blade lodges in wood or armor — spend a move action next turn to free it.","A wild slash endangers an ally in reach — they make a DC 12 Reflex save or take 1 point."] },
    piercing:{ label:"🗡 Piercing", crit:["The point finds an organ — target is sickened 1d4 rounds (Fort DC 15 negates).","You pin cloth to flesh — target is entangled until they spend a move action to pull free.","A punctured lung — target is fatigued and can’t run or charge for 1 minute.","The thrust strikes a nerve — target takes −2 on Dex-based checks for 1d4 rounds.","Deep puncture — target takes 1d4 bleed and gains no natural healing for 1 hour.","You skewer a joint — target is staggered 1 round (Fort DC 15 negates)."],
      fumble:["Your point skips off armor and twists your wrist — −2 to attacks until your next turn.","You lunge too far — you fall prone.","The tip snags and sticks — spend a move action next turn to recover the weapon.","You misjudge the thrust — your attack is wasted and you’re flat-footed until your next turn.","Bad angle — you jab yourself for 1d4 damage."] },
    bludgeoning:{ label:"🔨 Bludgeoning", crit:["A ringing blow to the head — target is dazed 1 round (Fort DC 15 negates).","You crack ribs — target is sickened and takes −5 ft. speed for 1 minute.","The impact drives them back — target is pushed 10 ft. and knocked prone.","A crushing hit shatters gear — one shield or weapon the target holds gains the broken condition.","You rattle their skull — target is deafened 1d4 rounds and takes −2 Perception.","Bone-jarring strike — target drops to just before your turn in the initiative order next round."],
      fumble:["The heavy swing wrenches your shoulder — −2 to attacks until you spend a move action to shake it off.","Momentum spins you around — you’re flat-footed until your next turn.","You clip yourself on the backswing — take 1d6 nonlethal damage.","The weapon flies from your grip — it lands 1d10 ft. away in a random direction.","You lose your footing on the follow-through — fall prone."] },
    magic:{ label:"✨ Magic / ray", crit:["The energy overloads their senses — target is blinded or deafened (your choice) for 1 round.","Arcane feedback — the target takes an extra die of the spell’s damage.","The spell warps around them — target is staggered 1 round as raw magic courses through them.","A surge of power — target is knocked prone and takes −2 on its next saving throw.","The magic clings — target takes 1 point of the spell’s energy type at the start of its next turn.","Mana burn — target can’t take attacks of opportunity until the end of its next turn."],
      fumble:["The spell fizzles and is lost — you’re dazzled 1 round by the backfire.","Wild surge — the effect centers on the wrong square (GM’s choice, may catch an ally).","Somatic slip — you’re staggered 1 round as the energy recoils.","The magic gutters — you take 1d6 damage of the spell’s energy type.","Feedback headache — −2 on your next attack roll or caster level check."] },
    unarmed:{ label:"👊 Unarmed / natural", crit:["A stunning strike to the jaw — target is staggered 1 round (Fort DC 15 negates).","You grab and wrench — target is grappled (you may release as a free action).","A blow to the gut — target is winded: −10 ft. speed for 1d4 rounds.","You knock the wind out — target can’t use verbal components until the end of its next turn.","A precise nerve strike — target takes 1d4 nonlethal and is sickened 1 round.","You bowl them over — target is knocked prone and you may step 5 ft. into its space."],
      fumble:["You strike a hard surface — take 1d3 nonlethal and −2 to that limb’s attacks for 1 round.","You overreach and stumble — fall prone.","Your strike is caught — the foe gets a free attempt to grapple you.","You leave yourself wide open — the nearest foe gets an attack of opportunity.","You jam a finger — −2 to attacks until your next turn."] }
  };
  var CF_ORDER=["general","slashing","piercing","bludgeoning","magic","unarmed"];
  function viewCritFumble(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🎴 Crit &amp; Fumble Deck</h2><span class="meta">Pick what the attacker was using, then draw a critical-hit or fumble result. Original effects — use or ignore freely.</span>'; wrap.appendChild(head);
    var type=lget("pf_cf_type"); if(!CF_DECK[type]) type="general";
    var bar=h("div",{class:"trs-bar"});
    function field(l,c){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,l)); f.appendChild(c); return f; }
    var tsel=h("select",{class:"char-sel"}); CF_ORDER.forEach(function(k){ tsel.appendChild(new Option(CF_DECK[k].label, k)); }); tsel.value=type;
    bar.appendChild(field("Attack type", tsel));
    var cb=h("button",{class:"char-act nf-primary"},"⚔ Critical hit!"); var fb=h("button",{class:"char-act crit-fumble"},"💥 Fumble!");
    var bw=h("div",{class:"trs-btns"}); bw.appendChild(cb); bw.appendChild(fb); bar.appendChild(field("Draw", bw)); wrap.appendChild(bar);
    var out=h("div",{class:"gen-out"}); wrap.appendChild(out);
    function draw(d){ out.innerHTML=""; var lbl=(CF_DECK[d.type]||CF_DECK.general).label;
      var card=h("div",{class:"npc-card"+(d.kind==="fumble"?" cf-fumble":" cf-crit")});
      card.appendChild(h("div",{class:"npc-sub"},(d.kind==="fumble"?"💥 FUMBLE":"⚔ CRITICAL HIT")+" · "+lbl)); card.appendChild(h("div",{class:"cf-text"},d.text)); out.appendChild(card); }
    function drawCard(kind){ var t=tsel.value, deck=CF_DECK[t]||CF_DECK.general; var d={kind:kind, type:t, text:rpick(deck[kind])}; lset("pf_critfumble",d); draw(d); }
    tsel.onchange=function(){ type=tsel.value; lset("pf_cf_type",type); };
    cb.onclick=function(){ drawCard("crit"); }; fb.onclick=function(){ drawCard("fumble"); };
    var sv=lget("pf_critfumble"); if(sv&&sv.text){ draw(sv); } else out.appendChild(h("div",{class:"muted"},"Choose an attack type and draw a card above."));
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Spell-consumable pricer (scroll / wand / potion from spell level) ----
  function spellMinLevel(r){ var lv=r[I_FAC]&&r[I_FAC].lv; if(!lv) return null; var m=null; for(var k in lv){ if(m==null||lv[k]<m) m=lv[k]; } return m; }
  var SPELL_TRADITION={
    arcane:{alchemist:1,arcanist:1,bard:1,bloodrager:1,investigator:1,magus:1,skald:1,sorcerer:1,summoner:1,witch:1,wizard:1},
    divine:{adept:1,antipaladin:1,cleric:1,druid:1,hunter:1,inquisitor:1,oracle:1,paladin:1,ranger:1,shaman:1,warpriest:1},
    psychic:{medium:1,mesmerist:1,occultist:1,psychic:1,spiritualist:1}
  };
  function viewSpellPrice(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>📜 Spell-Consumable Pricer</h2><span class="meta">Pick a spell → market price of its scroll, wand &amp; potion at minimum caster level.</span>'; wrap.appendChild(head);
    var st={q:"", lvl:"", trad:"", sch:""};
    function field(l,c){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,l)); f.appendChild(c); return f; }
    function sel(opts){ var s=h("select",{class:"char-sel"}); opts.forEach(function(o){ s.appendChild(new Option(o[0],o[1])); }); return s; }
    var swrap=h("div",{class:"fwx-swrap enc-searchrow"}); var search=h("input",{type:"search",class:"fwx-search",placeholder:"🔍 Search a spell (or just use the filters)…",autocomplete:"off"}); var sugg=h("div",{class:"fwx-sugg"}); sugg.style.display="none"; swrap.appendChild(search); swrap.appendChild(sugg); wrap.appendChild(swrap);
    var bar=h("div",{class:"trs-bar"});
    var lvlSel=sel([["Any level",""]].concat([0,1,2,3,4,5,6,7,8,9].map(function(n){return ["Level "+n,String(n)];})));
    var tradSel=sel([["Any tradition",""],["Arcane","arcane"],["Divine","divine"],["Psychic","psychic"]]);
    var schSel=sel([["Any school",""]].concat((((META.facets||{}).spells||{}).schools||[]).map(function(s){return [cap(s),s];})));
    bar.appendChild(field("Spell level",lvlSel)); bar.appendChild(field("Tradition",tradSel)); bar.appendChild(field("School",schSel));
    wrap.appendChild(bar);
    var out=h("div",{class:"gen-out"}); wrap.appendChild(out);
    var spells=IDX.filter(function(r){ return r[I_SLUG]==="spells" && spellMinLevel(r)!=null; });
    function matches(r){ var f=r[I_FAC]||{};
      if(st.q && r[I_NAME].toLowerCase().indexOf(st.q)<0) return false;
      if(st.sch && f.sch!==st.sch) return false;
      if(st.lvl!==""){ var L=+st.lvl, ok=false; if(f.lv) for(var k in f.lv){ if(+f.lv[k]===L){ok=true;break;} } if(!ok) return false; }
      if(st.trad){ var set=SPELL_TRADITION[st.trad], ok2=false; if(f.lv) for(var k2 in f.lv){ if(set[k2]){ok2=true;break;} } if(!ok2) return false; }
      return true;
    }
    function draw(r){ out.innerHTML=""; var lvl=spellMinLevel(r), eff=lvl===0?0.5:lvl, cl=Math.max(1,2*lvl-1);
      var card=h("div",{class:"npc-card"});
      var nm=h("a",{class:"npc-name",href:"#/e/"+encodeURIComponent(r[I_ID]),style:"display:block"},r[I_NAME]); attachInfoTip(nm,r[I_ID]); card.appendChild(nm);
      card.appendChild(h("div",{class:"npc-sub"},"Spell level "+lvl+(r[I_FAC]&&r[I_FAC].sch?" · "+cap(r[I_FAC].sch):"")+" · min caster level "+cl));
      function line(l,v){ var d=h("div",{class:"npc-line"}); d.innerHTML='<span class="npc-lab">'+l+'</span> '+esc(v); return d; }
      card.appendChild(line("Scroll",(eff*cl*25).toLocaleString()+" gp"));
      card.appendChild(line("Wand",lvl<=4?(eff*cl*750).toLocaleString()+" gp (50 charges)":"— (wands only hold spells ≤ 4th level)"));
      card.appendChild(line("Potion",lvl<=3?(eff*cl*50).toLocaleString()+" gp":"— (potions only hold spells ≤ 3rd level)"));
      out.appendChild(card);
      lset("pf_spellprice",r[I_ID]);
    }
    function suggest(){ sugg.innerHTML=""; var o=[]; for(var i=0;i<spells.length&&o.length<16;i++){ if(matches(spells[i])) o.push(spells[i]); }
      if(!o.length){ sugg.innerHTML='<div class="fwx-sug muted">No spells match these filters.</div>'; sugg.style.display=""; return; }
      o.forEach(function(r){ var it=h("div",{class:"fwx-sug"}); it.innerHTML=esc(r[I_NAME])+' <span class="muted">L'+spellMinLevel(r)+(r[I_FAC].sch?" · "+cap(r[I_FAC].sch):"")+'</span>'; it.onclick=function(){ draw(r); sugg.style.display="none"; }; sugg.appendChild(it); });
      sugg.style.display=""; }
    search.oninput=function(){ st.q=search.value.trim().toLowerCase(); suggest(); };
    search.onfocus=function(){ suggest(); };
    search.onkeydown=function(e){ if(e.key==="Enter"){ var f=sugg.querySelector(".fwx-sug:not(.muted)"); if(f)f.click(); } else if(e.key==="Escape"){ sugg.style.display="none"; } };
    search.onblur=function(){ setTimeout(function(){ sugg.style.display="none"; },160); };
    lvlSel.onchange=function(){ st.lvl=lvlSel.value; suggest(); };
    tradSel.onchange=function(){ st.trad=tradSel.value; suggest(); };
    schSel.onchange=function(){ st.sch=schSel.value; suggest(); };
    var sv=lget("pf_spellprice"), r0=sv&&idById()[sv]; if(r0) draw(r0); else out.appendChild(h("div",{class:"muted"},"Search a spell above — or set a filter — to price its consumables."));
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Bonus-type stacking calculator ("does this stack?") ----
  var BONUS_TYPES=["untyped","alchemical","armor","circumstance","competence","deflection","dodge","enhancement","inherent","insight","luck","morale","natural armor","profane","resistance","sacred","shield","size","trait"];
  var STACKS={untyped:1,dodge:1,circumstance:1};
  function viewStacking(){
    setActiveNav(null);
    var rows=lget("pf_stack")||[{v:2,t:"dodge",note:""}];
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>➕ Bonus Stacking</h2><span class="meta">Add your bonuses &amp; penalties by type — it applies PF1e stacking rules and shows the net.</span>'; wrap.appendChild(head);
    var add=h("div",{class:"trs-btns"}); var addBtn=h("button",{class:"char-act nf-primary"},"+ Add modifier"); add.appendChild(addBtn); wrap.appendChild(add);
    var list=h("div",{class:"stack-list"}); wrap.appendChild(list);
    var res=h("div",{class:"enc-verdict"}); wrap.appendChild(res);
    function save(){ lset("pf_stack",rows); }
    function compute(){ var byType={}; rows.forEach(function(r){ (byType[r.t]=byType[r.t]||[]).push(Number(r.v)||0); });
      var total=0, breakdown=[];
      Object.keys(byType).forEach(function(t){ var vals=byType[t], sub;
        if(STACKS[t]){ sub=vals.reduce(function(a,b){return a+b;},0); }
        else { var pos=vals.filter(function(x){return x>0;}), neg=vals.filter(function(x){return x<0;}); sub=(pos.length?Math.max.apply(null,pos):0)+neg.reduce(function(a,b){return a+b;},0); }
        total+=sub; breakdown.push(cap(t)+": "+(sub>=0?"+":"")+sub); });
      return {total:total, breakdown:breakdown};
    }
    function render(){ list.innerHTML="";
      rows.forEach(function(r,idx){ var row=h("div",{class:"stack-row"});
        var vin=h("input",{type:"number",class:"init-num",value:String(r.v)}); vin.onchange=function(){ r.v=parseInt(vin.value,10)||0; save(); calc(); };
        var tsel=h("select",{class:"char-sel"}); BONUS_TYPES.forEach(function(t){ tsel.appendChild(new Option(cap(t)+(STACKS[t]?" (stacks)":""),t)); }); tsel.value=r.t; tsel.onchange=function(){ r.t=tsel.value; save(); calc(); };
        var rm=h("button",{class:"init-rm",title:"Remove"},"✕"); rm.onclick=function(){ rows.splice(idx,1); save(); render(); };
        row.appendChild(vin); row.appendChild(tsel); row.appendChild(rm); list.appendChild(row); });
      calc();
    }
    function calc(){ var c=compute(); res.innerHTML='<b>Net modifier: '+(c.total>=0?"+":"")+c.total+'</b>'+(c.breakdown.length?'  <span class="muted">('+esc(c.breakdown.join(" · "))+')</span>':''); }
    addBtn.onclick=function(){ rows.push({v:2,t:"untyped"}); save(); render(); };
    render(); swap(wrap); window.scrollTo(0,0);
  }

  // ---- Weather & Moon roller ----
  var WEATHER={
    sky:["clear skies","a few clouds","overcast","light rain","heavy rain","a thunderstorm","fog and mist","drizzle","gathering storm clouds"],
    cold:["clear and freezing","light snow","a howling blizzard","sleet and ice","overcast and bitter","fog and hard frost"],
    desert:["blazing sun","dry and windless","a dust storm brewing","clear and scorching","a rare cloudburst","hot with gusting winds"],
    wind:["still air","a light breeze","a steady wind","strong gusts","near-gale winds"],
    moon:["🌑 new moon","🌒 waxing crescent","🌓 first quarter","🌔 waxing gibbous","🌕 full moon","🌖 waning gibbous","🌗 last quarter","🌘 waning crescent"],
    event:["","","","","a beautiful sunset paints the sky","an unseasonal chill sets in","travelers report strange lights at night","a rainbow arcs over the hills","the air smells of coming rain","distant thunder rolls all day"]
  };
  function viewWeather(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🌦 Weather & Moon</h2><span class="meta">Roll a day’s weather by climate &amp; season, plus the moon phase.</span>'; wrap.appendChild(head);
    function field(l,c){ var f=h("div",{class:"nf-field"}); f.appendChild(h("label",null,l)); f.appendChild(c); return f; }
    var bar=h("div",{class:"trs-bar"});
    var climSel=h("select",{class:"char-sel"}); ["Temperate","Tropical","Cold / Arctic","Desert"].forEach(function(c){ climSel.appendChild(new Option(c,c)); });
    var seasSel=h("select",{class:"char-sel"}); ["Spring","Summer","Autumn","Winter"].forEach(function(s){ seasSel.appendChild(new Option(s,s)); });
    var gen=h("button",{class:"char-act nf-primary"},"🎲 Roll the day");
    bar.appendChild(field("Climate",climSel)); bar.appendChild(field("Season",seasSel)); var bw=h("div",{class:"trs-btns"}); bw.appendChild(gen); bar.appendChild(bw); wrap.appendChild(bar);
    var out=h("div",{class:"gen-out"}); wrap.appendChild(out);
    function draw(w){ out.innerHTML=""; var card=h("div",{class:"npc-card"});
      card.appendChild(h("div",{class:"npc-name"},w.moon.split(" ")[0]+" "+cap(w.sky)));
      card.appendChild(h("div",{class:"npc-sub"},w.clim+" · "+w.seas));
      function line(l,v){ var d=h("div",{class:"npc-line"}); d.innerHTML='<span class="npc-lab">'+l+'</span> '+esc(v); return d; }
      card.appendChild(line("Sky",cap(w.sky)+", "+w.wind+"."));
      card.appendChild(line("Moon",w.moon));
      if(w.event) card.appendChild(line("Note",cap(w.event)+"."));
      out.appendChild(card);
    }
    function roll(){ var clim=climSel.value, table=/Cold/.test(clim)?WEATHER.cold:/Desert/.test(clim)?WEATHER.desert:WEATHER.sky;
      var w={clim:clim, seas:seasSel.value, sky:rpick(table), wind:rpick(WEATHER.wind), moon:rpick(WEATHER.moon), event:rpick(WEATHER.event)};
      lset("pf_weather",w); draw(w);
    }
    gen.onclick=roll;
    var sv=lget("pf_weather"); if(sv&&sv.sky){ climSel.value=sv.clim; seasSel.value=sv.seas; draw(sv); } else roll();
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- "Rules I Always Forget" cheat page ----
  var CHEATS=[
    ["Flanking","You and an ally on opposite sides of a foe you both threaten each get +2 to melee attacks. Rogues can sneak attack a flanked foe. Reach/positioning still has to line up through the enemy’s center."],
    ["Attacks of Opportunity","Provoked by leaving a threatened square (not a 5-ft step or the first square of a withdraw) or acting distractingly in melee (cast, ranged attack, stand up, drink, most maneuvers). One AoO/round unless you have Combat Reflexes (+Dex mod more)."],
    ["Combat Maneuvers","Roll d20 + CMB (BAB + Str + special size mod) vs the target’s CMD (10 + BAB + Str + Dex + size). Attempting one provokes an AoO unless you have the matching Improved feat."],
    ["Grapple states","Grapple → both grappled (−4 Dex, can’t move, −2 to attacks). Maintain (standard) to move, damage, pin, or tie up. Pinned = helpless-ish (can’t take most actions). Escape with a CMB check or Escape Artist vs the grappler’s CMD."],
    ["Cover & Concealment","Cover = +4 AC, +2 Reflex. Concealment (dim light, fog) = 20% miss; total concealment (invisible/darkness) = 50% miss and no AoOs against it. Concealment is a miss chance, not an AC bonus — they don’t combine the same way."],
    ["Two-Weapon Fighting","Base −6 main / −10 off-hand, reduced to −4/−4 with the TWF feat, and −2/−2 if the off-hand weapon is light. You only get the extra off-hand attack as part of a full attack."],
    ["Bonus types don’t stack","Same-type bonuses don’t stack (take the highest) — EXCEPT dodge, circumstance (from different sources), and untyped, which do. Penalties always stack. (Use the Bonus Stacking tool.)"],
    ["Dying & stabilizing","0 hp = disabled (one action, then you drop). Negative but above −Con = dying: lose 1 hp/round, DC 10 Con check (+ your negative total) to stabilize. −Con or worse = dead. A Heal DC 15 or any cure spell stabilizes you."],
    ["Charge","Move up to 2× speed in a straight line to the nearest square you can attack from, then one melee attack at +2 (and −2 AC until your next turn). No difficult terrain, no turning."],
    ["Aid Another","In melee, make an attack roll vs AC 10; success gives an ally +2 to attack OR +2 AC against one foe until your next turn. Some skills can aid too."],
    ["Concentration","Cast defensively or while grappled/hurt? DC 15 + 2×spell level (defensive) or 10 + damage taken + spell level (if damaged mid-cast). Fail = spell lost."],
    ["Carrying capacity","Light/medium/heavy load thresholds come from Strength. Medium/heavy load = −3/−6 max Dex to AC, armor-check-style penalties, and reduced speed. Easy to forget when the party loots everything."],
    ["Difficult terrain","Each square costs 2 squares of movement; you can’t run or charge through it, and it cancels 5-ft steps."],
    ["Size modifiers","Bigger = worse AC/attack but better CMB/CMD (and worse Stealth). See the GM Screen for the full table."]
  ];
  function viewCheat(){
    setActiveNav(null);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🧠 Rules I Always Forget</h2><span class="meta">The fiddly PF1e rules that stall every table — at a glance. Full detail on the <a href="#/ref">Combat &amp; Conditions</a> and <a href="#/gm">GM Screen</a> pages.</span>'; wrap.appendChild(head);
    var grid=h("div",{class:"gm-grid"}); wrap.appendChild(grid);
    CHEATS.forEach(function(c){ var p=h("section",{class:"gm-panel"}); p.appendChild(h("h3",{class:"gm-ph"},esc(c[0]))); p.appendChild(h("div",{class:"gm-item"},esc(c[1]))); grid.appendChild(p); });
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Recently Viewed dashboard ----
  function viewRecent(){
    setActiveNav(null);
    var ids=[]; try{ ids=JSON.parse(localStorage.getItem("pf_recent")||"[]"); }catch(e){}
    var rows=ids.map(function(id){return idById()[id];}).filter(Boolean);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🕘 Recently Viewed</h2><span class="meta">The last entries you opened — jump back in.</span>'; wrap.appendChild(head);
    if(!rows.length){ wrap.appendChild(h("div",{class:"empty"},"Nothing yet — open a few entries and they’ll show up here.")); swap(wrap); return; }
    rows.forEach(function(r){ wrap.appendChild(rowItem(r)); });
    swap(wrap); window.scrollTo(0,0);
  }

  // ---- Class Progression timeline (parses the per-level class table) ----
  // Primary source: the class body text carries the full level table (BAB, saves, Special)
  // for EVERY class incl. casters — tables.js only captured martial classes' progression.
  function parseClassFromBody(id){
    var body=(BODIES.classes||{})[id]; if(!body) return null;
    var lines=body.split("\n"), out=[], seen={};
    var re=/^(\d+(?:st|nd|rd|th))\s+([+\-]\d+(?:\/[+\-]\d+)*)\s+([+\-]\d+)\s+([+\-]\d+)\s+([+\-]\d+)\s+(.*)$/;
    for(var i=0;i<lines.length;i++){
      var m=lines[i].trim().match(re); if(!m) continue;
      var n=parseInt(m[1],10); if(!(n>=1&&n<=20)) continue;
      if(seen[n]) break; seen[n]=1;                 // stop at the end of the first complete table
      var rest=m[6].trim().split(/\s+/);
      while(rest.length && /^(\d+|[-—–])$/.test(rest[rest.length-1])) rest.pop(); // drop trailing spell-slot columns
      var spec=rest.join(" ").trim(); if(/^[—–-]$/.test(spec)) spec="";
      out.push({ lvl:m[1], bab:m[2], fort:m[3], ref:m[4], will:m[5], spec:spec||"—" });
    }
    return out.length? out : null;
  }
  function parseClassProgression(id){ return parseClassFromBody(id) || parseClassTable(id); }
  function parseClassTable(id){
    var tabs=(window.PF_TABLES||{})[id]; if(!tabs) return null;
    var tbl=null;
    for(var i=0;i<tabs.length;i++){ var hdr=(tabs[i].r[0]||[]).map(function(c){return String(c).toLowerCase();});
      if(hdr.some(function(c){return c.indexOf("base attack")>=0||c==="bab";}) && hdr.some(function(c){return c.indexOf("special")>=0;})){ tbl=tabs[i]; break; } }
    if(!tbl) return null;
    var hdr=tbl.r[0].map(function(c){return String(c).toLowerCase();});
    function col(re){ for(var i=0;i<hdr.length;i++){ if(re.test(hdr[i])) return i; } return -1; }
    var ci={lvl:col(/level/),bab:col(/base attack|bab/),fort:col(/fort/),ref:col(/ref/),will:col(/will/),spec:col(/special/)};
    var out=[];
    for(var r=1;r<tbl.r.length;r++){ var row=tbl.r[r]; if(!row||row.length<2) continue; if(ci.lvl>=0 && !String(row[ci.lvl]||"").match(/\d/)) continue;
      out.push({ lvl:row[ci.lvl]||"", bab:ci.bab>=0?(row[ci.bab]||""):"", fort:ci.fort>=0?(row[ci.fort]||""):"", ref:ci.ref>=0?(row[ci.ref]||""):"", will:ci.will>=0?(row[ci.will]||""):"", spec:ci.spec>=0?(row[ci.spec]||""):"" }); }
    return out.length?out:null;
  }
  function viewTimeline(){
    setActiveNav(null);
    var selected=(lget("pf_timeline")||[]).slice(0,2);
    var wrap=h("div"); var head=h("div",{class:"list-head"}); head.innerHTML='<h2>📈 Class Progression</h2><span class="meta">Level-by-level BAB, saves &amp; class features. Add a second class to compare timing and spot dead levels.</span>'; wrap.appendChild(head);
    var swrap=h("div",{class:"fwx-swrap enc-searchrow"}); var search=h("input",{type:"search",class:"fwx-search",placeholder:"🔍 Add a class (up to 2)…",autocomplete:"off"}); var sugg=h("div",{class:"fwx-sugg"}); sugg.style.display="none"; swrap.appendChild(search); swrap.appendChild(sugg); wrap.appendChild(swrap);
    var cols=h("div",{class:"tl-cols"}); wrap.appendChild(cols);
    var classes=IDX.filter(function(r){ return r[I_SLUG]==="classes"; });
    function save(){ lset("pf_timeline",selected); }
    function suggest(q){ q=q.trim().toLowerCase(); sugg.innerHTML=""; if(!q){sugg.style.display="none";return;} var o=[]; for(var i=0;i<classes.length&&o.length<10;i++){ if(classes[i][I_NAME].toLowerCase().indexOf(q)>=0) o.push(classes[i]); } if(!o.length){sugg.style.display="none";return;} o.forEach(function(r){ var it=h("div",{class:"fwx-sug"},esc(r[I_NAME])); it.onclick=function(){ if(selected.indexOf(r[I_ID])<0){ if(selected.length>=2) selected.shift(); selected.push(r[I_ID]); save(); } search.value=""; sugg.style.display="none"; render(); }; sugg.appendChild(it); }); sugg.style.display=""; }
    search.oninput=function(){ suggest(search.value); };
    search.onkeydown=function(e){ if(e.key==="Enter"){ var f=sugg.querySelector(".fwx-sug"); if(f)f.click(); } };
    function classCol(id){
      var r=idById()[id]; var col=h("div",{class:"tl-col"});
      var hd=h("div",{class:"tl-head"}); var nm=h("a",{class:"tl-name",href:"#/e/"+encodeURIComponent(id)},r?r[I_NAME]:id); hd.appendChild(nm);
      var rm=h("button",{class:"init-rm",title:"Remove"},"✕"); rm.onclick=function(){ selected=selected.filter(function(x){return x!==id;}); save(); render(); }; hd.appendChild(rm);
      col.appendChild(hd);
      var rows=parseClassProgression(id);
      if(!rows){ col.appendChild(h("div",{class:"muted",style:"padding:10px"},"No level-by-level table for this class (prestige/NPC classes and some options don’t have one).")); return col; }
      var t=h("table",{class:"gm-table tl-table"});
      var thead=h("thead"); thead.innerHTML='<tr><th>Lvl</th><th>BAB</th><th>Fort</th><th>Ref</th><th>Will</th><th>Class features</th></tr>'; t.appendChild(thead);
      var tb=h("tbody");
      rows.forEach(function(row){ var dead=!row.spec || /^[—\-–]?$/.test(String(row.spec).trim());
        var tr=h("tr",{class:dead?"tl-dead":""});
        tr.innerHTML='<th class="rowh">'+esc(row.lvl)+'</th><td>'+esc(row.bab)+'</td><td>'+esc(row.fort)+'</td><td>'+esc(row.ref)+'</td><td>'+esc(row.will)+'</td><td class="tl-spec">'+esc(row.spec||"—")+'</td>';
        tb.appendChild(tr); });
      t.appendChild(tb); var tw=h("div",{class:"tablewrap"}); tw.appendChild(t); col.appendChild(tw);
      return col;
    }
    function render(){ cols.innerHTML=""; if(!selected.length){ cols.appendChild(h("div",{class:"empty"},"Search a class above to see its full level-1-to-20 progression.")); return; } selected.forEach(function(id){ cols.appendChild(classCol(id)); }); }
    function onTimeline(){ return location.hash.replace(/^#/,"").indexOf("/timeline")===0; }
    loadCat("classes", function(){ if(!onTimeline()) return; if(!selected.length){ var fr=IDX.filter(function(r){return r[I_SLUG]==="classes" && r[I_NAME]==="Fighter";})[0]; if(fr){ selected=[fr[I_ID]]; save(); } } render(); });
    ensureTables(function(){ if(onTimeline()) render(); }); // fallback source for any class the body parse misses
    render(); swap(wrap); window.scrollTo(0,0);
  }

  // ---- Printable cards (cut-out reference cards for a character's picks) ----
  function cardSummary(slug, body){
    if(!body) return "";
    if(slug==="feats"){ var m=body.match(/Benefit:\s*([^\n]+)/); if(m) return m[1].trim().slice(0,260); }
    var lines=body.split("\n").map(function(s){return s.trim();}).filter(Boolean);
    for(var i=0;i<lines.length;i++){ var l=lines[i];
      if(/^(Source|School|Level|Casting|Components|Range|Area|Target|Duration|Effect|Saving|Spell Resistance|Prerequisit|CR|XP|Price|Aura|Slot|[A-Za-z ]+ \| )/.test(l)) continue;
      if(l.length>=28) return l.slice(0,260);
    }
    return (lines[lines.length-1]||"").slice(0,260);
  }
  function viewCardSheet(){
    setActiveNav(null);
    var active=activeChar();
    var rows=(active.ids||[]).map(function(id){return idById()[id];}).filter(Boolean);
    var wrap=h("div",{class:"cards-sheet"});
    var head=h("div",{class:"list-head cards-head"});
    head.innerHTML='<div><h2>🖨 Cards — '+esc(active.name)+'</h2><span class="meta">Cut-out reference cards for this character’s saved picks · Print → Save as PDF</span></div>';
    var pbtn=h("button",{class:"char-act gm-print"},"🖨 Print"); pbtn.onclick=function(){ window.print(); }; head.appendChild(pbtn);
    wrap.appendChild(head);
    if(!rows.length){ wrap.appendChild(h("div",{class:"empty"},"“"+active.name+"” has nothing saved yet — save some feats/spells/items first.")); swap(wrap); return; }
    var grid=h("div",{class:"card-sheet-grid"}); wrap.appendChild(grid);
    var need={};
    rows.forEach(function(r){
      var card=h("div",{class:"print-card"});
      var label=LABEL[r[I_SLUG]]||r[I_SLUG];
      card.innerHTML='<div class="pc-head"><span class="pc-name">'+esc(r[I_NAME])+'</span><span class="pc-cat" style="--c:'+color(r[I_SLUG])+'">'+esc(label)+'</span></div>'+quickStats(r)+'<div class="pc-body" data-id="'+esc(r[I_ID])+'" data-slug="'+esc(r[I_SLUG])+'">…</div>';
      if(r[I_SRC]) card.appendChild(h("div",{class:"pc-src"},"📖 "+esc((r[I_SRC]||"").split(",")[0])));
      grid.appendChild(card); need[r[I_SLUG]]=1;
    });
    swap(wrap);
    Object.keys(need).forEach(function(slug){ loadCat(slug, function(){
      grid.querySelectorAll('.pc-body[data-slug="'+slug+'"]').forEach(function(el){ var id=el.getAttribute("data-id"); el.textContent=cardSummary(slug,(BODIES[slug]||{})[id]||""); });
    }); });
    window.scrollTo(0,0);
  }

  // ---- Feat graph views (Tree ⇄ Web toggle + standalone explorer) ----
  function isStillEntry(id){ return location.hash.indexOf(encodeURIComponent(id))>=0 || location.hash.indexOf(id)>=0; }
  function featVizSection(id){
    var sec=h("div",{class:"featviz"});
    var bar=h("div",{class:"fv-toggle"});
    bar.appendChild(h("span",{class:"fv-lab"},"Feat map"));
    var tTree=h("button",{class:"fv-tab active"},"⛭ Tree");
    var tWeb=h("button",{class:"fv-tab"},"🕸 Web");
    bar.appendChild(tTree); bar.appendChild(tWeb);
    bar.appendChild(h("a",{class:"fv-open",href:"#/featweb?f="+encodeURIComponent(id)},"Full explorer →"));
    sec.appendChild(bar);
    var slot=h("div",{class:"fv-slot"}); sec.appendChild(slot);
    var webCtl=null;
    function clearWeb(){ if(webCtl){ try{webCtl.destroy();}catch(e){} if(_activeWeb===webCtl)_activeWeb=null; webCtl=null; } }
    function showTree(){
      tTree.classList.add("active"); tWeb.classList.remove("active"); clearWeb();
      slot.innerHTML=""; slot.appendChild(h("div",{class:"muted fv-load"},"Loading…"));
      ensureFeattree(function(){ if(!isStillEntry(id)) return; loadCat("feats", function(){ if(!isStillEntry(id)) return; var _t=buildFeatTree(id); slot.innerHTML=""; if(_t) slot.appendChild(_t); else slot.appendChild(h("div",{class:"muted"},"This feat has no prerequisites and isn’t required by any other feat.")); }); });
    }
    function showWeb(){
      tWeb.classList.add("active"); tTree.classList.remove("active");
      slot.innerHTML=""; var host=h("div",{class:"fv-web"}); slot.appendChild(host);
      slot.appendChild(h("div",{class:"fv-hint"},"drag · hover to trace · click to re-center · right-click (or double-click) to open the feat · scroll to zoom"));
      ensureFeatWeb(function(){ if(!isStillEntry(id)) return; clearWeb();
        webCtl=FeatWeb.mount(host,{ graph:window.PF_FEATTREE||{}, rootId:id, depth:2, height:440, resolve:featResolve, theme:cssTheme(),
          onOpen:function(fid){ location.hash="#/e/"+encodeURIComponent(fid); }, onFocusChange:function(){} });
        _activeWeb=webCtl;
      });
    }
    tTree.onclick=showTree; tWeb.onclick=showWeb; showTree();
    return sec;
  }
  function viewFeatWeb(query){
    setActiveNav(null);
    var wrap=h("div",{class:"fwx"});
    var head=h("div",{class:"list-head"}); head.innerHTML='<h2>🕸 Feat Web</h2><span class="meta">Explore how feats connect — drag, hover to trace a chain, click a node to re-center, right-click (or double-click) to open its page</span>'; wrap.appendChild(head);
    var host=h("div"); host.appendChild(h("div",{class:"empty"},"Loading the feat web…")); wrap.appendChild(host);
    swap(wrap);
    ensureFeatWeb(function(){ if(location.hash.replace(/^#/,"").indexOf("/featweb")!==0) return; buildFeatWebUI(host,(query&&query.f)||null); });
  }
  function buildFeatWebUI(host, focusId){
    host.innerHTML="";
    var G=window.PF_FEATTREE||{};
    if(!focusId || !G[focusId]){ var best=null,bn=-1; for(var k in G){ var u=(G[k].unlocks||[]).length; if(u>bn){bn=u;best=k;} } focusId=best; }
    if(!focusId){ host.appendChild(h("div",{class:"empty"},"No feat graph available.")); return; }
    var bar=h("div",{class:"fwx-bar"});
    var swrap=h("div",{class:"fwx-swrap"});
    var search=h("input",{type:"search",class:"fwx-search",placeholder:"🔍 Focus a feat…",autocomplete:"off",spellcheck:"false"});
    var sugg=h("div",{class:"fwx-sugg"}); sugg.style.display="none";
    swrap.appendChild(search); swrap.appendChild(sugg); bar.appendChild(swrap);
    var depthLab=h("span",{class:"fwx-depth"},"Depth 2");
    var dMinus=h("button",{class:"char-act fwx-btn"},"−"), dPlus=h("button",{class:"char-act fwx-btn"},"+");
    var fitBtn=h("button",{class:"char-act"},"⤢ Fit"), reBtn=h("button",{class:"char-act",title:"Reheat layout"},"↻");
    var openBtn=h("a",{class:"char-act fwx-open"},"Open feat →");
    var grp=h("div",{class:"fwx-ctrls"}); [dMinus,depthLab,dPlus,fitBtn,reBtn,openBtn].forEach(function(x){grp.appendChild(x);});
    bar.appendChild(grp); host.appendChild(bar);
    var canvasHost=h("div",{class:"fwx-canvas"}); host.appendChild(canvasHost);
    host.appendChild(buildLegend(G));
    var ctl=FeatWeb.mount(canvasHost,{ graph:G, rootId:focusId, depth:2, height:Math.max(430,Math.round((window.innerHeight||800)*0.58)), resolve:featResolve, theme:cssTheme(),
      onOpen:function(id){ location.hash="#/e/"+encodeURIComponent(id); },
      onFocusChange:function(id){ var r=idById()[id]; openBtn.textContent="Open "+(r?r[I_NAME]:"feat")+" →"; openBtn.href="#/e/"+encodeURIComponent(id); try{ history.replaceState(null,"","#/featweb?f="+encodeURIComponent(id)); }catch(e){} } });
    _activeWeb=ctl;
    dMinus.onclick=function(){ ctl.setDepth(ctl.getDepth()-1); depthLab.textContent="Depth "+ctl.getDepth(); };
    dPlus.onclick=function(){ ctl.setDepth(ctl.getDepth()+1); depthLab.textContent="Depth "+ctl.getDepth(); };
    fitBtn.onclick=function(){ ctl.fit(); }; reBtn.onclick=function(){ ctl.reheat(); };
    var feats=IDX.filter(function(r){return r[I_SLUG]==="feats" && G[r[I_ID]];});
    function suggest(q){ q=q.trim().toLowerCase(); sugg.innerHTML=""; if(!q){sugg.style.display="none";return;} var out=[]; for(var i=0;i<feats.length&&out.length<8;i++){ if(feats[i][I_NAME].toLowerCase().indexOf(q)>=0) out.push(feats[i]); } if(!out.length){sugg.style.display="none";return;} out.forEach(function(r){ var it=h("div",{class:"fwx-sug"},esc(r[I_NAME])); it.onclick=function(){ ctl.setRoot(r[I_ID]); search.value=""; sugg.style.display="none"; }; sugg.appendChild(it); }); sugg.style.display=""; }
    search.oninput=function(){ suggest(search.value); };
    search.onkeydown=function(e){ if(e.key==="Enter"){ var f=sugg.querySelector(".fwx-sug"); if(f) f.click(); } else if(e.key==="Escape"){ sugg.style.display="none"; search.blur(); } };
    var r0=idById()[focusId]; openBtn.textContent="Open "+(r0?r0[I_NAME]:"feat")+" →"; openBtn.href="#/e/"+encodeURIComponent(focusId);
  }
  function buildLegend(G){
    var leg=h("div",{class:"fwx-legend"});
    leg.appendChild(h("span",{class:"fwx-le"},'<i class="fw-edge req"></i> prerequisite of focus'));
    leg.appendChild(h("span",{class:"fwx-le"},'<i class="fw-edge unlock"></i> unlocked by focus'));
    var types={}; for(var k in G){ var r=idById()[k]; var t=(r&&r[I_FAC]&&r[I_FAC].t)||"General"; types[t]=(types[t]||0)+1; }
    Object.keys(types).sort(function(a,b){return types[b]-types[a];}).slice(0,6).forEach(function(t){
      leg.appendChild(h("span",{class:"fwx-le"},'<i class="fw-dot" style="background:'+FeatWeb.colorFor(t)+'"></i>'+esc(t)));
    });
    leg.appendChild(h("span",{class:"fwx-le fwx-note"},"node size = feats it unlocks"));
    return leg;
  }

  // ---- sidebar ----
  function buildSidebar(){
    var nav=$("#sidebar"); nav.innerHTML="";
    var howTo=(META.guide&&META.guide.concepts&&META.guide.concepts[0])?META.guide.concepts[0].href:"#/c/rules";
    function navItem(label,href,cls){ var b=h("button",{class:"nav-cat gs"+(cls?" "+cls:"")}); b.textContent=label; b.onclick=function(){ location.hash=href; closeMenu(); }; return b; }
    // Getting Started
    var gs=h("div",{class:"nav-group"}); gs.appendChild(h("h4",null,"Getting Started"));
    [["✦ Start Here","#/"],["★ My Characters","#/fav"],["🕘 Recently Viewed","#/recent"],["▶ How to Play",howTo],["§ Glossary","#/c/rules/Definitions"]].forEach(function(x){ gs.appendChild(navItem(x[0],x[1])); });
    nav.appendChild(gs);
    // ✨ Cool Stuff — collapsible dropdown of tools
    var cool=h("div",{class:"nav-group nav-cool"});
    var toggle=h("button",{class:"nav-cool-toggle"}); toggle.innerHTML='<span>✨ Cool Stuff</span><span class="nav-caret"></span>';
    var body=h("div",{class:"nav-cool-body"});
    [
      ["At the table", [["⚔ Combat & Conditions","#/ref"],["🛡 GM Screen","#/gm"],["🧠 Rules I Forget","#/cheat"]]],
      ["Run the fight", [["⚔️ Encounter Builder","#/encounter"],["🎲 Random Encounter","#/randenc"],["⚡ Initiative Tracker","#/init"],["🪤 Trap Generator","#/trap"],["🎴 Crit & Fumble Deck","#/critfumble"]]],
      ["Loot & flavor", [["💰 Treasure Generator","#/treasure"],["🪄 Magic Shop","#/shop"],["🍺 NPC Spark","#/npc"],["🏷 Name-a-Thing","#/thing"],["🎲 Name Generator","#/names"],["🌦 Weather & Moon","#/weather"]]],
      ["Build & character", [["🕸 Feat Web","#/featweb"],["📈 Class Progression","#/timeline"],["📜 Spell Pricer","#/spellprice"],["➕ Bonus Stacking","#/stacking"]]],
      ["Browse", [["🖼 Artwork","#/art"]]]
    ].forEach(function(grp){ body.appendChild(h("div",{class:"nav-cool-sub"},grp[0])); grp[1].forEach(function(x){ body.appendChild(navItem(x[0],x[1],"cool-item")); }); });
    var open = (function(){ try{ return localStorage.getItem("pf_cool_open")!=="0"; }catch(e){ return true; } })();
    function setOpen(o){ cool.classList.toggle("collapsed",!o); toggle.querySelector(".nav-caret").textContent=o?"▾":"▸"; try{localStorage.setItem("pf_cool_open",o?"1":"0");}catch(e){} }
    toggle.onclick=function(){ setOpen(cool.classList.contains("collapsed")); };
    cool.appendChild(toggle); cool.appendChild(body); setOpen(open); nav.appendChild(cool);
    (META.groups||[]).forEach(function(g){
      var gd=h("div",{class:"nav-group"}); gd.appendChild(h("h4",null,g.name));
      g.cats.forEach(function(c){
        var b=h("button",{class:"nav-cat"}); b.dataset.slug=c.slug;
        b.innerHTML='<span class="dot" style="background:'+color(c.slug)+'"></span>'+esc(LABEL[c.slug]||c.label)+'<span class="cnt">'+c.count.toLocaleString()+'</span>';
        b.onclick=function(){ location.hash="#/c/"+c.slug; closeMenu(); };
        gd.appendChild(b);
        if(c.slug==="rules"){ var sk=h("button",{class:"nav-cat"}); sk.dataset.slug="rules";
          sk.innerHTML='<span class="dot" style="background:'+color("rules")+'"></span>Skills<span class="cnt">'+((subtypesOf("rules").filter(function(x){return x[0]==="Skills";})[0]||["",0])[1])+'</span>';
          sk.onclick=function(){ location.hash="#/c/rules/Skills"; closeMenu(); }; gd.appendChild(sk); }
        // Prestige classes are their own thing — 119 entries buried inside a 252-entry Classes
        // list nobody scrolls. rawCat already separates them, so this is just a second door.
        if(c.slug==="classes"){ var pc=h("button",{class:"nav-cat"}); pc.dataset.slug="classes";
          pc.innerHTML='<span class="dot" style="background:'+color("classes")+'"></span>Prestige Classes<span class="cnt">'+((subtypesOf("classes").filter(function(x){return x[0]===PRESTIGE;})[0]||["",0])[1])+'</span>';
          pc.onclick=function(){ location.hash="#/c/classes/"+encodeURIComponent(PRESTIGE); closeMenu(); }; gd.appendChild(pc); }
      });
      nav.appendChild(gd);
    });
  }

  // ---- router ----
  function swap(node){ main.innerHTML=""; main.appendChild(node); }
  // decodeURIComponent throws URIError on malformed input (e.g. a hand-typed "#/e/%zz");
  // degrade to the raw string so a bad URL never reaches the crash card.
  function safeDec(s){ try{ return decodeURIComponent(s); }catch(e){ return String(s); } }
  // ---- error recovery: wipe only the app's own state, never the rules DB ----
  function resetAppData(){
    if(!confirm("Reset saved characters, Compare picks, recent items, and settings?\n\nYour library of rules is NOT touched. This can’t be undone.")) return;
    try{ Object.keys(localStorage).filter(function(k){return k.indexOf("pf_")===0;}).forEach(function(k){ localStorage.removeItem(k); }); }catch(e){}
    location.hash="#/"; location.reload();
  }
  function showRouteError(err){
    try{ if(window.console&&console.error) console.error("Codex view error:", err); }catch(e){}
    var box=h("div",{class:"crash-card"});
    box.appendChild(h("h2",null,"⚠ This page hit a snag"));
    box.appendChild(h("p",null,"Something went wrong drawing this view. The rest of the Codex still works — use the menu, or try one of these."));
    var row=h("div",{class:"crash-actions"});
    var home=h("button",{class:"char-act nf-primary"},"Go home"); home.onclick=function(){ location.hash="#/"; };
    var reload=h("button",{class:"char-act"},"Reload"); reload.onclick=function(){ location.reload(); };
    var reset=h("button",{class:"char-act crash-reset"},"Reset app data"); reset.onclick=resetAppData;
    row.appendChild(home); row.appendChild(reload); row.appendChild(reset);
    box.appendChild(row);
    if(err&&err.message) box.appendChild(h("div",{class:"crash-detail muted"}, String(err.message).slice(0,300)));
    try{ swap(box); }catch(e){}
  }
  function dispatch(){
    var raw=location.hash.replace(/^#/,""), qi=raw.indexOf("?"), query={}, hash=raw;
    if(qi>=0){ hash=raw.slice(0,qi); raw.slice(qi+1).split("&").forEach(function(kv){ var p=kv.split("="); if(p[0]) query[safeDec(p[0])]=safeDec(p[1]||""); }); }
    if(hash.indexOf("/c/")===0){ var rest=hash.slice(3), sl=rest.indexOf("/"); return sl<0? viewCategory(rest,null,query) : viewCategory(rest.slice(0,sl), safeDec(rest.slice(sl+1)),query); }
    if(hash.indexOf("/e/")===0) return viewEntry(safeDec(hash.slice(3)));
    if(hash.indexOf("/s/")===0){ var q=safeDec(hash.slice(3)); $("#search").value=q; return viewSearch(q); }
    if(hash==="/fav") return viewFavorites();
    if(hash==="/ref"||hash==="/combat") return viewCombat(query);
    if(hash==="/compare") return viewCompare();
    if(hash==="/gm") return viewGM();
    if(hash==="/names") return viewNames();
    if(hash==="/featweb") return viewFeatWeb(query);
    if(hash==="/cards") return viewCardSheet();
    if(hash==="/init") return viewInit();
    if(hash==="/treasure") return viewTreasure();
    if(hash==="/npc") return viewNPC();
    if(hash==="/encounter") return viewEncounter();
    if(hash==="/shop") return viewShop();
    if(hash==="/thing") return viewThing();
    if(hash==="/randenc") return viewRandEnc();
    if(hash==="/trap") return viewTrap();
    if(hash==="/critfumble") return viewCritFumble();
    if(hash==="/spellprice") return viewSpellPrice();
    if(hash==="/stacking") return viewStacking();
    if(hash==="/weather") return viewWeather();
    if(hash==="/cheat") return viewCheat();
    if(hash==="/recent") return viewRecent();
    if(hash==="/timeline") return viewTimeline();
    if(hash==="/art") return viewArtGallery();
    return viewHome();
  }
  var _reduceMotion=false; try{ _reduceMotion=matchMedia("(prefers-reduced-motion:reduce)").matches; }catch(e){}
  function render(){
    try{ ftHideTip(); hideInfoTip(); killWeb(); }catch(e){}
    var run=function(){ try{ dispatch(); applyRouteArt(location.hash.replace(/^#/,"").split("?")[0]); }catch(err){ showRouteError(err); } };
    // native crossfade between views where supported; instant + safe everywhere else
    if(document.startViewTransition && !_reduceMotion){ try{ document.startViewTransition(run); return; }catch(e){} }
    run();
  }
  window.addEventListener("hashchange", render);

  // ---- instant search palette (live dropdown, keyboard-first, fuzzy + synonyms) ----
  var searchEl=$("#search"), stimer;
  // Keep the placeholder honest: it used to claim "27,000+ rules" long after the real
  // figure had settled at 25,926. Derive it so a data rebuild can never leave it lying.
  if(searchEl && META.total) searchEl.placeholder=searchEl.placeholder.replace("the rules", META.total.toLocaleString()+" rules");
  var SYN={stun:"stunned",stunning:"stunned",fear:"frightened shaken",invis:"invisible invisibility",
    flatfooted:"flat-footed","flat footed":"flat-footed",aoo:"attack of opportunity",ac:"armor class",
    hp:"hit points",cmb:"combat maneuver",cmd:"combat maneuver defense",sr:"spell resistance",dr:"damage reduction",
    grapple:"grappled",unconscious:"unconscious",bleed:"bleed bleeding",crit:"critical"};
  var pal=h("div",{class:"palette"}); pal.style.display="none"; ($(".search-wrap")||document.body).appendChild(pal);
  var palItems=[], palSel=-1;
  function bigrams(s){ var b={},i; for(i=0;i<s.length-1;i++){var g=s.substr(i,2); b[g]=(b[g]||0)+1;} return b; }
  function fuzzyNames(q){
    q=q.toLowerCase(); if(q.length<3) return [];
    var qb=bigrams(q), out=[], fc=q.charAt(0);
    for(var i=0;i<IDX.length;i++){ var nm=IDX[i][I_NAME].toLowerCase();
      if(nm.charAt(0)!==fc || Math.abs(nm.length-q.length)>3) continue;
      var nb=bigrams(nm), inter=0, g; for(g in qb) if(nb[g]) inter+=Math.min(qb[g],nb[g]);
      var dice=2*inter/((q.length-1)+(nm.length-1)||1);
      if(dice>0.55) out.push([dice*30, IDX[i]]);
    }
    out.sort(function(a,b){return b[0]-a[0];}); return out.slice(0,8);
  }
  function paletteSearch(q){
    var p=parseQuery(q); if(!p.terms.length&&!p.phrases.length) return [];
    var res=runSearch(p), key=q.toLowerCase().trim(), seen={}; res.forEach(function(x){seen[x[1][I_ID]]=1;});
    if(SYN[key]) runSearch(parseQuery(SYN[key])).forEach(function(x){ if(!seen[x[1][I_ID]]){seen[x[1][I_ID]]=1;res.push(x);} });
    if(SYN[key]) res.sort(function(a,b){return b[0]-a[0];});
    if(res.length<3) fuzzyNames(key).forEach(function(x){ if(!seen[x[1][I_ID]]){seen[x[1][I_ID]]=1;res.push(x);} });
    return res.slice(0,9);
  }
  function setSel(i){ palSel=i; pal.querySelectorAll(".pal-item").forEach(function(el,idx){ el.classList.toggle("sel",idx===i); }); }
  function hidePalette(){ pal.style.display="none"; palSel=-1; }
  function renderPalette(q){
    if(!q.trim()){ hidePalette(); return; }
    var results=paletteSearch(q); palItems=results.map(function(x){return x[1];}); pal.innerHTML="";
    if(!results.length){ pal.innerHTML='<div class="pal-empty">No matches for &ldquo;'+esc(q)+'&rdquo;</div>'; pal.style.display="block"; return; }
    results.forEach(function(x,i){ var r=x[1], it=h("a",{class:"pal-item"+(i===0?" sel":"")}); it.href="#/e/"+encodeURIComponent(r[I_ID]);
      it.innerHTML='<span class="pal-name">'+esc(r[I_NAME])+'</span><span class="pal-tag" style="--c:'+color(r[I_SLUG])+'">'+esc(LABEL[r[I_SLUG]]||r[I_SLUG])+'</span><span class="pal-snip">'+esc((r[I_SNIP]||"").slice(0,72))+'</span>';
      it.addEventListener("mousemove",function(){ setSel(i); });
      it.addEventListener("click",function(){ hidePalette(); });
      pal.appendChild(it); });
    var foot=h("a",{class:"pal-all"}); foot.href="#/s/"+encodeURIComponent(q); foot.innerHTML='See all results for &ldquo;'+esc(q)+'&rdquo; &#8629;'; foot.addEventListener("click",hidePalette); pal.appendChild(foot);
    palSel=0; pal.style.display="block";
  }
  searchEl.addEventListener("input", function(){ clearTimeout(stimer); var q=searchEl.value; stimer=setTimeout(function(){ renderPalette(q); }, 80); });
  searchEl.addEventListener("focus", function(){ if(searchEl.value.trim()) renderPalette(searchEl.value); });
  searchEl.addEventListener("keydown", function(e){
    if(pal.style.display==="none"){ if(e.key==="Enter"&&searchEl.value.trim()) location.hash="#/s/"+encodeURIComponent(searchEl.value); return; }
    if(e.key==="ArrowDown"){ e.preventDefault(); setSel(Math.min(palSel+1,palItems.length-1)); scrollSel(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); setSel(Math.max(palSel-1,0)); scrollSel(); }
    else if(e.key==="Enter"){ e.preventDefault(); if(palSel>=0&&palItems[palSel]){ location.hash="#/e/"+encodeURIComponent(palItems[palSel][I_ID]); hidePalette(); searchEl.blur(); } else if(searchEl.value.trim()){ location.hash="#/s/"+encodeURIComponent(searchEl.value); hidePalette(); } }
    else if(e.key==="Escape"){ hidePalette(); }
  });
  function scrollSel(){ var el=pal.querySelectorAll(".pal-item")[palSel]; if(el) el.scrollIntoView({block:"nearest"}); }
  document.addEventListener("click", function(e){ if(!pal.contains(e.target)&&e.target!==searchEl) hidePalette(); });

  // ---- menu (mobile) ----
  function closeMenu(){ $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("show"); }
  $("#menuBtn").onclick=function(){ $("#sidebar").classList.toggle("open"); $("#scrim").classList.toggle("show"); };
  $("#scrim").onclick=closeMenu;

  // ---- theme ----
  var themeBtn=$("#themeBtn");
  function applyTheme(t){ if(t) document.documentElement.setAttribute("data-theme",t); else document.documentElement.removeAttribute("data-theme"); }
  applyTheme(localStorage.getItem("pf_theme"));
  themeBtn.onclick=function(){ var cur=document.documentElement.getAttribute("data-theme");
    var dark=cur? cur==="dark" : matchMedia("(prefers-color-scheme:dark)").matches;
    var next=dark?"light":"dark"; applyTheme(next); try{localStorage.setItem("pf_theme",next);}catch(e){} if(_activeWeb) try{ _activeWeb.setTheme(cssTheme()); }catch(e){}
    themeBtn.classList.remove("spin"); void themeBtn.offsetWidth; themeBtn.classList.add("spin"); };

  // ---- random (die tumbles on click) ----
  $("#randomBtn").onclick=function(){ var d=this.querySelector(".die"); if(d){ d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll"); } var r=IDX[(Math.random()*IDX.length)|0]; location.hash="#/e/"+encodeURIComponent(r[I_ID]); };

  // ---- keyboard ----
  document.addEventListener("keydown", function(e){
    var ae=document.activeElement, typing = ae && (ae.tagName==="INPUT" || ae.tagName==="TEXTAREA" || ae.isContentEditable);
    if(e.key==="Shift"){ pinInfoTip(); return; }
    if(e.key==="/" && !typing){ e.preventDefault(); searchEl.focus(); searchEl.select(); }
    // ←/→ page through the current list while reading an entry
    else if((e.key==="ArrowLeft"||e.key==="ArrowRight") && !typing && !e.metaKey && !e.ctrlKey && !e.altKey
            && location.hash.indexOf("#/e/")===0){
      var go = e.key==="ArrowLeft" ? PAGER.prev : PAGER.next;
      if(go){ e.preventDefault(); location.hash = "#/e/" + encodeURIComponent(go); }
    }
    else if(e.key==="Escape"){ hideInfoTip(true); if(ae===searchEl){ searchEl.blur(); } }
    else if(e.key==="r" && !typing && !e.metaKey && !e.ctrlKey){ $("#randomBtn").click(); }
  });

  // ---- last-resort safety net: never let a stray async error white-screen the app ----
  var _errShown=false;
  function globalErrorNet(){
    if(_errShown) return; _errShown=true;
    setTimeout(function(){ _errShown=false; }, 8000); // allow one notice per 8s, no spam
    try{
      var b=h("div",{class:"crash-banner"},"⚠ Something hiccuped — the Codex is still usable. Reload if a page looks stuck.");
      var x=h("button",{class:"crash-banner-x","aria-label":"Dismiss"},"✕");
      x.onclick=function(){ if(b.parentNode) b.parentNode.removeChild(b); };
      b.appendChild(x); document.body.appendChild(b);
      setTimeout(function(){ if(b.parentNode) b.parentNode.removeChild(b); }, 6000);
    }catch(e){}
  }
  window.addEventListener("error", function(e){ if(e && e.error) globalErrorNet(); }); // ignores benign resource 404s (no e.error)
  window.addEventListener("unhandledrejection", function(){ globalErrorNet(); });

  // core rules index missing → don't show a mysteriously empty app; tell the friend how to fix it
  function showDataError(){
    var m=document.getElementById("main"); if(!m) return; m.innerHTML="";
    var box=h("div",{class:"crash-card"});
    box.appendChild(h("h2",null,"⚠ The rules data didn’t load"));
    box.appendChild(h("p",null,"The core rules file couldn’t be read. Usually the folder wasn’t fully unzipped, or the page was opened directly instead of through the launcher."));
    box.appendChild(h("p",null,"Fix: re-extract the whole zip, then start it with “Start Codex (Mac).command” or “Start Codex (Windows).bat”."));
    var row=h("div",{class:"crash-actions"});
    var reload=h("button",{class:"char-act nf-primary"},"Reload"); reload.onclick=function(){ location.reload(); };
    row.appendChild(reload); box.appendChild(row); m.appendChild(box);
  }

  // swap in the original SVG crest + die glyph for the emoji placeholders
  try{ var _bm=document.querySelector(".brand-mark"); if(_bm) _bm.innerHTML=CREST_SVG;
       var _rb=document.getElementById("randomBtn"); if(_rb) _rb.innerHTML=DIE_SVG; }catch(e){}

  // cursor-follow spotlight on cards — one delegated listener, rAF-coalesced, cheap
  if(!_reduceMotion) try{
    var _mainEl=document.getElementById("main"), _spotRAF=0, _spotCard=null, _spX=0, _spY=0;
    _mainEl.addEventListener("pointermove", function(e){
      var c=e.target.closest && e.target.closest(".card"); if(!c) return;
      _spotCard=c; _spX=e.clientX; _spY=e.clientY;
      if(_spotRAF) return;
      _spotRAF=requestAnimationFrame(function(){ _spotRAF=0; if(!_spotCard) return;
        var r=_spotCard.getBoundingClientRect(); _spotCard.style.setProperty("--mx",(_spX-r.left)+"px"); _spotCard.style.setProperty("--my",(_spY-r.top)+"px"); });
    }, {passive:true});
  }catch(e){}

  // floating "Export .txt" button — appears on any page that has generator output (.gen-out)
  try{
    var _exportFab=h("button",{class:"export-fab",title:"Download this result as a .txt file"},"⤓ Export .txt");
    _exportFab.style.display="none"; document.body.appendChild(_exportFab);
    _exportFab.onclick=function(){ var t=currentGenText(); if(t) exportTxt(genFileName(), t); };
    var _fabMain=document.getElementById("main");
    var _fabTick=function(){ _exportFab.style.display=document.querySelector("#main .gen-out")?"inline-flex":"none"; };
    new MutationObserver(_fabTick).observe(_fabMain,{childList:true,subtree:true});
  }catch(e){}

  // universal hover-preview: any entry link in the content pane gets a dwell popout (Shift to pin)
  try{
    var _prevMain=document.getElementById("main");
    _prevMain.addEventListener("mouseover", function(e){
      var a=e.target.closest && e.target.closest('a[href^="#/e/"]'); if(!a || a.hasAttribute("data-notip")) return;
      var m=a.getAttribute("href").match(/#\/e\/(.+)$/); if(!m) return;
      var id=safeDec(m[1]); if(_infoPinned) return;
      if(_infoTimer) clearTimeout(_infoTimer);
      _infoTimer=setTimeout(function(){ showInfoTip(a,id); }, 420);
    });
    _prevMain.addEventListener("mouseout", function(e){
      var a=e.target.closest && e.target.closest('a[href^="#/e/"]'); if(!a) return;
      if(e.relatedTarget && _infoEl && _infoEl.contains(e.relatedTarget)) return; // moving onto the tip
      if(!_infoPinned) hideInfoTip();
    });
  }catch(e){}

  // ---- go ----
  try{
    if(!IDX.length){ showDataError(); }
    else {
      buildSidebar();
      updateCmpTray();
      render();
    }
  }catch(err){
    try{ showRouteError(err); }catch(e){}
  }

  // register the offline service worker from a same-origin file (keeps CSP script-src 'self')
  if("serviceWorker" in navigator){
    window.addEventListener("load", function(){ navigator.serviceWorker.register("sw.js").catch(function(){}); });
  }
  // warm the lazily-loaded data once the page is interactive (keeps cold start fast)
  var _idle=window.requestIdleCallback||function(f){return setTimeout(f,400);};
  _idle(function(){ try{ ensureFeattree(); ensureTables(); }catch(e){} });
})();
