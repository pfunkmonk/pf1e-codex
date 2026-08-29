# PF1e Codex

A fast, searchable Pathfinder First Edition rules reference published at
`codex.pipsprojects.com`.

The application is static and deploys directly from the repository root on
Netlify. It supports offline use through its service worker and web manifest.

25,917 browsable entries — classes, races, feats, traits, spells, monsters, items,
rules and more — with search, per-category filtering, prev/next paging through any
list, an artwork gallery backed by 3,784 illustrations, and a set of at-the-table
tools (encounter builder, initiative tracker, treasure and NPC generators, GM screen).

(The dataset holds 25,926 rows; nine are scraped "1st Level"–"9th Level" index pages
that are hidden from browse and search. Every count the app displays is derived from
the same filter, so the nav never advertises an entry you cannot reach.)

**Working on this? Read [HANDOFF.md](HANDOFF.md) first.** It covers the deploy rules
(a push to `main` is a live release, and there is no build gate), the three cache
tokens that must be bumped together, how art resolution works, and the data repairs
that have been applied.

PF1e Codex is an unofficial, noncommercial fan reference and is not published,
endorsed, or specifically approved by Paizo Inc. Pathfinder and associated marks
are owned by Paizo Inc. Rules content is used under the Open Game License 1.0a.
