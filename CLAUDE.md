# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Panasonic IMPULSE (American football) **defense scouting dashboard**. A coach uploads a scouting CSV of an opponent's defensive plays and the dashboard cross-tabs their tendencies (coverage, front, blitz, stunts) by field zone, down & distance, and offensive formation, then optionally compares pre-scouting vs. post-game data and generates an AI coaching comment.

The entire app is **two files**:
- `index.html` — the whole client (vanilla JS, no framework, no build step). ~1400 lines: markup, inlined CSS, and one `<script>` with all logic.
- `api/analyze.js` — a single Vercel serverless function that proxies the Claude API (keeps `ANTHROPIC_API_KEY` server-side).

`vercel.json` wires `/api/analyze` → the function and everything else → `index.html`.

## Commands

There is **no local Node/Python toolchain** on this machine (`python` is the Windows Store stub), so a dev server can't be run locally. Verify changes via the **Vercel preview** that auto-builds when a branch/PR is pushed.

- `npm run dev` → `vercel dev` (local emulation — only works where the Vercel CLI + Node are installed; not here)
- `npm run deploy` → `vercel --prod`
- There are no tests, linter, or build.

`api/analyze.js` requires the Vercel env var `ANTHROPIC_API_KEY` for AI analysis. It calls model `claude-sonnet-4-6`.

## Repo & workflow

- Git repo: **`Yanbo-57/impulse-scouting`** (private). Default branch is **`main`**.
- Active working branch: **`feat/dashboard-v2`** (branch from `main`). Do new work here; keep PRs to `main` small.
- New PR: commit on `feat/dashboard-v2`, push, then `gh pr create -R Yanbo-57/impulse-scouting --base main --head feat/dashboard-v2`.
- Note: the project lives at the nested path `…/impulse scouting/impulse-scouting/impulse-scouting`. The outer `C:/Users/lotus` is a stray git repo — ignore it; the real `.git` is in the project dir.

## Architecture / data flow

1. **Load** — `DOMContentLoaded` wires file-drop + file-input for the scouting CSV. `parseCSV` (RFC4180-aware via `parseCSVLine`, which honors quoted commas — important because blitz calls like `"L-5,W-6"` contain commas) → array of row objects keyed by CSV header.
2. **`boot(rows, label)`** is the entry point after parse. It calls `processData` (per-row enrichment), filters out `ZONE==='UNKNOWN'`, then renders all four tabs and stashes the result on `window.__scoutData`.
3. **Per-row enrichment** (`processData` → `getZone`, `getDist`, `parseBlitz`, `bSide`/`bType`, `formGroup`) adds derived fields: field `ZONE`, distance bucket, parsed blitz entries, blitz side/direction, and formation group `FG`.
4. **Aggregation** — `analyze(rows)` computes the tendency stats (`bp`/`sp` blitz/stunt %, `cov`/`front`/`blitz`/`stunt` top-N lists, `bt` blitz-direction counts) used everywhere. `byZone` buckets rows by field zone.
5. **Rendering** — small functions return HTML strings injected via `innerHTML`. Reusable building blocks: `overviewBody`, `makeBars`/`barRow`, `donut`, the DOWN×DIST matrix (`mtxTable`/`mtxInner`/`mCell`), `buildInsights`, `buildRecommendations`. Tabs: OVERVIEW, SUMMARY (`buildOverview2`), FIELD ZONE (`setupZoneYard`), FORMATION (`setupMultiTabs`).
6. **Compare** — `renderCompare(scout, game)` re-runs the pipeline on a second (post-game) CSV and renders pre-vs-post diffs (`cmpDonut`, `cmpBars`, `cmpArrow`, `diffColor`). Toggle screen has its own OVERVIEW/SUMMARY/FIELD ZONE/FORMATION modes (`cmpMode`).
7. **AI** — a "Generate / Compare analysis" button POSTs the computed `stats` (and `compareStats` when comparing) to `/api/analyze`, which builds a Japanese coaching prompt and returns the comment.

### Domain logic that isn't obvious from the code

- **Field position** uses two coordinate systems. CSV `YARD LN` is signed (own = negative, opponent = positive). `fpos(y)` converts to a 0–100 scale (0 = own goal → 100 = opponent goal) for the draggable FIELD ZONE yard bar. `getZone` maps signed yardage to named zones (KNOCK/YELLOW/GREEN/ORANGE/HRED/MRED/LRED).
- **Blitz notation**: letters = LB position, number = gap. `W/F/C` = boundary-side LB, `M/S` = field-side LB. Even gap numbers → boundary-direction, odd → field-direction (`bSide`). A call combining both sides (or front `ALL GAP`) is `BOTH` (`bType`). `parseBlitz` splits on commas but `parseCSVLine` has already preserved the quoted comma in a single call.
- **Formation grouping** (`formGroup`/`FO_KNOWN`): raw `OFF FORM` strings are normalized into canonical groups (DOUBLE, SUPER/TPER/XPER, STRONG, WEAK, WING, WEAPON, FIB BUNDLE). `getFOrder` builds the live formation tab list from actual data, so a new formation auto-creates its own tab.
- Zone names/colors/emoji/ranges and formation colors live in the `CONSTANTS` block at the top of the script (`ZCS`, `ZN`, `ZR`, `ZO`, `ZYARD`, `FO`, `FC`). The header logo is an inlined base64 JPEG.

## UI conventions (the user iterates on these heavily — match them)

- **Theme is white/light** (a dark theme was tried and rejected). Keep the refined look — gradients, donuts, frosted accents — but on white.
- **Labels: English-forward and terse.** Canonical terms: BLITZ, STUNTS, FRONT, COVERAGE, DOWN & DISTANCE. The DOWN & DISTANCE cell label is **COVERAGE** (not "MAIN COVER"). Bilingual JP/EN appears in headings; keep both but don't add JP suffixes to stat labels.
- **KEY INSIGHTS = facts only** (NFL-coach-level cross-tab tendencies, no prescriptions). **RECOMMENDATIONS = the actions** (specific).
- **Do not split BLITZ/STUNT calls on commas** for type breakdowns — show the raw call (e.g. `L-5,W-6`) as one item.
- Diff/indicator arrows use **↑/↓** (not ▲/▼ — the triangle reads as a minus). Large decrease color = dark blue `#0A357E`, not orange.
- All percentages are integers.
- FIELD ZONE and FORMATION panels use the **same layout as OVERVIEW**; their BLITZ/STUNTS donuts show the diff vs. OVERVIEW(ALL).
- Bars: only segments ≥25% are colored, the rest grey; for narrow bars put the value outside (in dark text) so white text isn't clipped.
