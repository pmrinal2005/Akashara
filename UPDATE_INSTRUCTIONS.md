# Akashara — Update Drop-in Package

## How to apply

1. Copy every file in this folder into the root of your `Akashara` repo, preserving the directory structure (overwrite existing files).
2. **Upload your background video** to `public/landing_page.mp4` — this is where the landing page hero pulls its background from. So in your repo:
   ```
   Akashara/
   └── public/
       ├── automation_projects.csv   (already there)
       ├── dataStream.js              (already there)
       └── landing_page.mp4           ← drop your file here
   ```
3. Commit + push. Vercel auto-deploys.

## What changed

| Area | Change |
|---|---|
| `src/App.tsx` | Hash-based router (`#dashboard` → terminal; default → landing) |
| `src/components/landing/LandingPage.tsx` | New cinematic landing page (Hero + Capabilities) following the exact prompt, content adjusted to the RPA telemetry / Phase-2 concept |
| `src/styles/globals.css` | Liquid-glass design system + glass scrollbars + mobile responsive rules + glass row styling |
| `tailwind.config.cjs` | `font-heading` (Instrument Serif) + `font-body` (Barlow) |
| `index.html` | Google Fonts preconnect for Instrument Serif + Barlow |
| `src/components/kpi/KpiStrip.tsx` | KPI cards converted to `liquid-glass` |
| `src/components/grid/GridPanel.tsx` | Wrapped in `liquid-glass`, fixed `min-w-0` overflow guard |
| `src/components/grid/VirtualGrid.tsx` | Header now lives in its own scroll-sync container that mirrors the viewport's `scrollLeft` — fixes chart-overlap bug; grid container `overflow-hidden min-w-0` so it never bleeds into the chart |
| `src/components/grid/GridHeader.tsx` | Header bar styled as glass strip |
| `src/components/controls/*` | All filter buttons, dropdowns, search, pause/play, analytics toggle converted to `liquid-glass` |
| `src/components/shell/*` | Widget visibility buttons, pause overlay, debug overlay all converted to glass |
| `src/components/inspector/RowInspector.tsx` | Cards + side panel converted to `liquid-glass-strong` |
| `src/components/analytics/*` | Department chart + analytics modal converted to glass |

## Bug fix — grid + chart overlap (image 1)

Root cause: the grid's inner spacer (`.vgrid-spacer`) had `min-width: 1100px` which forced its scrollable parent wider than the parent flex column. When `lg:basis-2/3` was applied, the flex track allowed the overflow to escape sideways because the row container did not enforce `min-w-0`, so the chart was painted on top.

Fix:
- `GridPanel` now has `min-w-0 overflow-hidden`
- Dashboard column wrappers carry `min-w-0` + `flex-shrink-0` on the chart side
- `VirtualGrid` wraps everything in `overflow-hidden min-w-0`; horizontal scroll is bound to the inner `.vgrid-viewport` only
- Header scroll syncs to viewport via `onScroll` handler so column titles always align with the rows below

## Mobile responsiveness

- All flex containers carry `flex-wrap`
- KPI grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`
- Dashboard column stack: `flex-col lg:flex-row`
- Filter bar: `flex-col sm:flex-row` with `glass-scroll` overflow
- Mobile-specific row sizing in `globals.css` (`@media (max-width: 640px)`)
- Inspector takes `w-full max-w-[480px]` so it fits on phones

## Engine code is untouched

`src/core/*`, `src/workers/*`, `src/hooks/*`, `src/components/grid/columns.ts`, `src/main.tsx`, `public/dataStream.js`, `public/automation_projects.csv` — none of these are modified. All 10 feature modules and the performance doctrine remain intact.
