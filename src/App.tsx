import { useEffect, useState } from 'react'
import { ingestor } from './core/engine'
import { workerBridge } from './core/WorkerBridge'
import { usePersistedLayout } from './hooks/usePersistedLayout'
import { KpiStrip } from './components/kpi/KpiStrip'
import { GridPanel } from './components/grid/GridPanel'
import { DepartmentChart } from './components/analytics/DepartmentChart'
import { AnalyticsView } from './components/analytics/AnalyticsView'
import { PausePlay } from './components/controls/PausePlay'
import { AnalyticsToggle } from './components/controls/AnalyticsToggle'
import { FuzzySearchBar } from './components/controls/FuzzySearchBar'
import { FilterDropdowns } from './components/controls/FilterDropdowns'
import { SnapshotExportButton } from './components/controls/SnapshotExportButton'
import { WidgetGate, VisibilityControls } from './components/shell/WidgetVisibility'
import { DebugOverlay } from './components/shell/DebugOverlay'
import { Sidebar, SidebarToggleButton } from './components/shell/Sidebar'
import { RowInspector } from './components/inspector/RowInspector'
import { LandingPage } from './components/landing/LandingPage'

function useDebugFlag(): boolean {
  const [on] = useState(() => new URLSearchParams(location.search).get('debug') === '1')
  return on
}

type Route = 'landing' | 'dashboard'

function readRoute(): Route {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'dashboard') return 'dashboard'
  return 'landing'
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onHash = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'landing') {
    return (
      <LandingPage
        onEnter={() => {
          window.location.hash = 'dashboard'
        }}
      />
    )
  }

  return <Dashboard />
}

function Dashboard() {
  const { layout, toggle, reset } = usePersistedLayout()
  const debug = useDebugFlag()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ingestor.start(undefined, (msg) => setError(msg))
  }, [])

  useEffect(() => {
    const t = setInterval(() => workerBridge.refreshIfActive(), 2000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const handler = () => workerBridge.destroy()
    window.addEventListener('pagehide', handler)
    return () => window.removeEventListener('pagehide', handler)
  }, [])

  return (
    // Root: full viewport flex column
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="liquid-glass flex flex-shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
        {/* Left: logo + title */}
        <div className="flex items-center gap-2.5">
          <a
            href="#"
            className="liquid-glass flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white"
            title="Back to landing"
          >
            <span className="font-heading text-lg">a</span>
          </a>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-white sm:text-base">
              Akashara · RPA Monitor
            </h1>
            <span className="hidden text-[10px] font-normal text-slate-400 sm:inline">
              Frontend Battle 2026 · Phase 2
            </span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <VisibilityControls layout={layout} toggle={toggle} reset={reset} />
          <SidebarToggleButton />
          <SnapshotExportButton />
          <PausePlay />
          <AnalyticsToggle />
        </div>
      </header>

      {error && (
        <div className="liquid-glass mx-3 mt-1 flex-shrink-0 rounded-xl px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      {/* ── KPI Strip ──────────────────────────────────────────────────── */}
      <WidgetGate show={layout.kpiVisible}>
        <div className="mx-3 mt-2 flex-shrink-0 sm:mx-4">
          <KpiStrip />
        </div>
      </WidgetGate>

      {/* ── Filters + Search ───────────────────────────────────────────── */}
      <WidgetGate show={layout.filtersVisible}>
        <div className="liquid-glass mx-3 mt-2 flex-shrink-0 rounded-xl p-2.5 sm:mx-4">
          {/* Task 2 Fix: use `relative` container; each dropdown has its own
              stacking context so opening one never displaces the others */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <FuzzySearchBar />
            <div className="relative flex flex-wrap items-center gap-2">
              <FilterDropdowns />
            </div>
          </div>
        </div>
      </WidgetGate>

      {/* ── Main content: sidebar + widgets ────────────────────────────── */}
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
        {/* Collapsible Sidebar */}
        <Sidebar />

        {/* Widgets area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-stretch">
          <WidgetGate show={layout.gridVisible}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:basis-2/3">
              <GridPanel />
            </div>
          </WidgetGate>
          <WidgetGate show={layout.chartVisible}>
            <div className="min-h-0 min-w-0 flex-shrink-0 lg:basis-1/3">
              <DepartmentChart />
            </div>
          </WidgetGate>
        </div>
      </div>

      {/* ── Overlays ───────────────────────────────────────────────────── */}
      <AnalyticsView />
      <RowInspector />

      {debug && <DebugOverlay />}
    </div>
  )
}
