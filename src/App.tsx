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
import { WidgetGate, VisibilityControls } from './components/shell/WidgetVisibility'
import { DebugOverlay } from './components/shell/DebugOverlay'
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
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <header className="liquid-glass flex flex-col gap-3 rounded-2xl px-4 py-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <a
            href="#"
            className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full text-white"
            title="Back to landing"
          >
            <span className="font-heading text-xl">a</span>
          </a>
          <div>
            <h1 className="text-base font-bold text-white sm:text-lg">
              Akashara · RPA Telemetry Monitor
            </h1>
            <span className="hidden text-[11px] font-normal text-slate-400 sm:inline">
              Frontend Battle 2026 · Phase 2 Control Terminal
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <VisibilityControls layout={layout} toggle={toggle} reset={reset} />
          <PausePlay />
          <AnalyticsToggle />
        </div>
      </header>

      {error && (
        <div className="liquid-glass rounded-xl px-3 py-2 text-sm text-danger">⚠️ {error}</div>
      )}

      <WidgetGate show={layout.kpiVisible}>
        <KpiStrip />
      </WidgetGate>

      <WidgetGate show={layout.filtersVisible}>
        <div className="liquid-glass flex flex-col gap-2 rounded-xl p-3 sm:flex-row sm:items-center">
          <FuzzySearchBar />
          <div className="glass-scroll flex flex-wrap items-center gap-2 overflow-x-auto sm:flex-nowrap">
            <FilterDropdowns />
          </div>
        </div>
      </WidgetGate>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch">
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

      <AnalyticsView />
      <RowInspector />

      {debug && <DebugOverlay />}
    </div>
  )
}
