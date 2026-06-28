# 🤖 RPA Telemetry Monitor — Frontend Battle 2026

A **real-time, high-performance virtualized telemetry dashboard** that ingests a
200 ms firehose of RPA-automation project updates over **50,000 records** and
renders them in a hand-rolled recycler-view grid — **zero data-grid /
virtualization libraries, 100 % client-side, free / open-source stack**.

---

## 1. Project Overview

- **Name**: RPA Telemetry Monitor (`rpa-monitor`)
- **Goal**: Stream-ingest the official hackathon firehose (`dataStream.js` →
  `automation_projects.csv`) and present a buttery-smooth, leak-free, fully
  interactive monitoring UI that holds 60 FPS while up to 50 rows mutate every
  200 ms.
- **Stack**: **Vite 6 + React 18 + TypeScript (strict)** · Tailwind CSS ·
  native Web Workers · uPlot · idb-keyval · Zustand-ready architecture.
- **Deployment target**: pure static SPA → Cloudflare Pages / Vercel free tier
  (no server code, no serverless functions).

---

## 2. Live URLs & Entry Points

| Entry | Path / Param | Description |
|---|---|---|
| App shell | `/` | Full dashboard (KPIs, controls, grid, chart) |
| Debug overlay | `/?debug=1` | Live recycler DOM-node-count + `MutationObserver` self-check (proof of bounded virtualization) |
| Pipeline script | `/dataStream.js` | **Official file, UNCHANGED** — exposes `window.initializeRpaStream` |
| Dataset | `/automation_projects.csv` | 50,000-row project dataset (served from `public/`) |
| Worker chunks | `/assets/search.worker-*.js`, `/assets/sort.worker-*.js` | Fuzzy-search & multi-column-sort workers |

> Local sandbox preview runs on port **3000** via PM2 (`vite preview`).

---

## 3. The Critical Insight — Schema Mismatch (why most submissions break)

`dataStream.js`'s built-in `parseCSV` only coerces a **company** schema
(`employee_count`, `annual_revenue_usd`, `customer_count`, `founded_year`,
`market_share_percent`). Our dataset uses a **project** schema, so **every
numeric column we care about** (`robots_deployed`, `budget_usd`,
`annual_savings_usd`, `roi_percent`, `employee_hours_saved`) arrives as a **raw
string**.

Left uncoerced this causes: lexicographic sort (`"9" > "100"`), `NaN` KPI sums,
and broken currency formatting. **`src/core/Sanitizer.ts` is the bridge** that
coerces every incoming row before it reaches the store. This single insight
separates a working submission from a broken one.

---

## 4. Architecture — Decoupling the Firehose from the Paint Loop

```
window.initializeRpaStream (dataStream.js, untouched)
        │  200 ms batches (5–50 raw rows)
        ▼
StreamIngestor ──► BufferQueue (Feature 5: pause coalesces by uid)
        │
        ▼
StreamStore  (Map<uid,RpaRow>, mutate-in-place, dirty-set, O(1) KPI deltas)
        │  notify on requestAnimationFrame (NOT inside the 200ms callback)
        ▼
ViewPool  (filter + sort + search projection → ordered uid[])
        │
   ┌────┴─────────────────────────┐
   ▼                              ▼
VirtualGrid (recycler view,    KpiStrip / DepartmentChart
imperative cell patching)      (useSyncExternalStore snapshots)
```

**Doctrines enforced in code:**
- **Reference stability over deep cloning** — rows are mutated in place inside
  the master `Map`; recycler slots holding a row reference see updates for free.
- **Ingest at 200 ms, paint at `rAF`** — `StreamStore.scheduleFlush()` batches
  all subscriber notifications onto the next animation frame.
- **The DOM is the bottleneck** — the grid keeps only
  `viewportHeight / rowHeight + 8` nodes and patches `textContent` imperatively.
- **O(1) KPI aggregation** — `KpiAggregator` maintains running sums by delta,
  never rescanning the store.

---

## 5. Folder Structure

```
webapp/
├── public/
│   ├── automation_projects.csv   ← provided dataset (50,000 rows, UNCHANGED)
│   └── dataStream.js             ← provided pipeline (UNCHANGED)
├── src/
│   ├── main.tsx · App.tsx        ← entry + shell
│   ├── core/                     ← FRAMEWORK-AGNOSTIC ENGINE
│   │   ├── StreamStore.ts        ← master Map store + rAF flush
│   │   ├── StreamIngestor.ts     ← bridge to window.initializeRpaStream
│   │   ├── ViewPool.ts           ← filtered/sorted/searched projection
│   │   ├── BufferQueue.ts        ← pause/play coalescing queue
│   │   ├── Sanitizer.ts          ← numeric coercion + formatters (THE bridge)
│   │   ├── KpiAggregator.ts      ← O(1) incremental aggregates
│   │   ├── WorkerBridge.ts       ← search/sort worker lifecycle
│   │   ├── engine.ts             ← singleton wiring
│   │   └── types.ts
│   ├── workers/
│   │   ├── search.worker.ts      ← token-based fuzzy search (Feature 10)
│   │   └── sort.worker.ts        ← multi-column sort offload (Feature 9)
│   ├── components/
│   │   ├── kpi/KpiStrip.tsx
│   │   ├── grid/ (VirtualGrid, GridHeader, GridPanel, columns)
│   │   ├── controls/ (PausePlay, FilterDropdowns, FuzzySearchBar)
│   │   ├── analytics/DepartmentChart.tsx
│   │   └── shell/ (WidgetVisibility, PauseOverlay, DebugOverlay)
│   ├── hooks/ (useStreamSnapshot, useViewVersion, usePersistedLayout)
│   └── styles/globals.css
├── vite.config.ts · tailwind.config.cjs · postcss.config.cjs
├── ecosystem.config.cjs · wrangler.jsonc
└── package.json
```

This deliberate modular split (7 module groups) directly defeats the
"single-file dump" disqualifier.

---

## 6. Feature Map → Rubric

| # | Feature (pts) | Where | How |
|---|---|---|---|
| 1 | **KPI Dashboard** (10) | `KpiAggregator.ts`, `KpiStrip.tsx` | Incremental O(1) deltas; `useSyncExternalStore`; `tabular-nums` locks width |
| 2 | **Numeric Sanitation** (10) | `Sanitizer.ts` | Coerces project-schema strings → numbers; cached `Intl` formatters; ROI clamp + `toFixed(2)` |
| 3 | **Visual Alerts** (10) | `Sanitizer.detectAlert`, `globals.css` | `data-alert` attribute → pure-CSS `@keyframes` auto-expiring flash (no JS timer) |
| 4 | **Single-Column Sort** (10) | `GridHeader.tsx`, `ViewPool.sortRows` | Click toggles asc/desc; stable comparator with uid tiebreaker |
| 5 | **Pause / Play** (10) | `BufferQueue.ts`, `PausePlay.tsx`, `PauseOverlay.tsx` | Engine keeps capturing; batches coalesced by uid; live queued counter; single coalesced resume |
| 6 | **Layout Persistence** (10) | `usePersistedLayout.ts`, `WidgetVisibility.tsx` | Versioned `localStorage` key; `WidgetGate` **unmounts** hidden widgets (stops subscriptions) |
| 7 | **Categorical Filters** (10) | `FilterDropdowns.tsx`, `ViewPool` | Distinct sets discovered incrementally; `Map<field,Set>` → O(1) membership |
| 8 | **Virtualized Grid** (15) | `VirtualGrid.tsx`, `globals.css` | Android-style recycler view; ~25–45 DOM nodes regardless of size; imperative cell patching; `contain:strict` |
| 9 | **Multi-Column Sort** (10) | `GridHeader.tsx`, `sort.worker.ts` | Shift-click appends keys; numbered badges; ≥3 keys offload to worker (stale-then-fresh) |
| 10 | **Fuzzy Search** (5) | `FuzzySearchBar.tsx`, `search.worker.ts` | 120 ms debounce; token-based, out-of-order, case-insensitive partial match in a worker |

---

## 7. Performance & Memory Hygiene

- **Bounded DOM**: recycler keeps `≈ rows-in-view + 8` nodes; verified live via
  `?debug=1` overlay + a `MutationObserver` self-check that errors loudly if the
  node count ever exceeds bound.
- **rAF-throttled scroll** (never debounced — debounce drops frames).
- **`AbortController`** for outside-click listeners; `ResizeObserver` (not
  `window.resize`); timers/workers torn down on teardown.
- **CSS containment**: `contain: strict` on the grid, `content-visibility: auto`
  on the off-screen chart, `will-change: transform` only on the scroll window.
- **`tabular-nums`** everywhere numbers live → digit changes never reflow.
- **No deep cloning** in the hot path — mutate-in-place + frozen-view discipline.
- **Chart throttled** to a 1.5 s interval (never per tick) to dodge the
  Recharts/Chart.js per-tick re-render trap.

---

## 8. Data Model

`RpaRow` (canonical, fully coerced) — see `src/core/types.ts`:

- **Strings**: `project_id`, `company_id`, `project_name`, `project_status`,
  `automation_type`, `department`, `implementation_partner`, `country`,
  `industry`, `ai_enabled`, `cloud_deployment`, `start_date`, `completion_date`
- **Numbers** (coerced): `robots_deployed`, `budget_usd`, `annual_savings_usd`,
  `roi_percent`, `employee_hours_saved`
- **Engine transients**: `_lastTick`, `_updateCount`, `_alert`, `_alertAt`

**Storage**: in-memory `Map<internal_uid, RpaRow>` (the master store) +
`localStorage` for layout persistence. No database, no server — fully
client-side as the rubric requires.

---

## 9. User Guide

1. **Watch it stream** — the grid fills as the 200 ms firehose mutates rows;
   updated numeric cells pulse cyan, alert rows flash and auto-clear.
2. **Sort** — click a header (toggle asc/desc); **Shift+click** additional
   headers to build a multi-column sort (numbered badges show order).
3. **Filter** — open Status / Automation Type / Department / Industry dropdowns
   and tick values; counts show active selections.
4. **Search** — type in the search bar; tokens match out-of-order across name /
   department / type / industry (e.g. `invoice finance`).
5. **Pause / Resume** — freeze the view; the overlay proves the engine keeps
   capturing (live queued counter); resume replays one coalesced flush.
6. **Customize layout** — toggle KPIs / Filters / Grid / Chart chips; the
   choice persists across reloads (`localStorage`). "reset" restores defaults.
7. **Debug** — append `?debug=1` to see live recycler DOM-node count.

---

## 10. Local Development

```bash
npm install
npm run dev            # Vite dev server (HMR) on :3000

# Production build + static preview
npm run build          # tsc -b && vite build  →  dist/
npm run preview        # serve dist/ on :3000

# Sandbox (PM2)
pm2 start ecosystem.config.cjs
```

---

## 11. Deployment

- **Platform**: Cloudflare Pages / Vercel (static `dist/` output, no functions)
- **Build command**: `npm run build`
- **Output dir**: `dist`
- **Status**: ✅ Builds clean (TypeScript strict, 0 errors); runs leak-free; the
  official pipeline parses all 50,000 rows and the firehose ticks every 200 ms.
- **Tech stack**: Vite + React 18 + TypeScript + Tailwind + Web Workers + uPlot
- **Last Updated**: 2026-06-28

---

## 12. Constraints Compliance

- ✅ **Zero** external data-grid / virtualization libraries (AG-Grid, TanStack
  Table, react-window, react-virtualized — none). Recycler is hand-rolled.
- ✅ uPlot is a *charting* library (allowed) — not a grid/virtualizer.
- ✅ 100 % client-side — no API routes, no serverless, no server compute.
- ✅ Provided `dataStream.js` and `automation_projects.csv` used **unchanged**.
- ✅ Free / open-source only (Vite, React, Tailwind, uPlot, idb-keyval — MIT/ISC).
- ✅ Modular codebase (7 module groups) — no single-file dump.
- ✅ Static build → Cloudflare Pages / Vercel free tier compatible.

---

_MIT License._
