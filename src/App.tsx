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

function useDebugFlag(): boolean {
  const [on] = useState(() => new URLSearchParams(location.search).get('debug') === '1')
  return on
}

export default function App() {
  const { layout, toggle, reset } = usePersistedLayout()
  const debug = useDebugFlag()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ingestor.start(undefined, (msg) => setError(msg))
  }, [])

  // Periodically refresh active search results so newly arriving rows that
  // match the query become visible without the user re-typing.
  useEffect(() => {
    const t = setInterval(() => workerBridge.refreshIfActive(), 2000)
    return () => clearInterval(t)
  }, [])

  // Clean worker teardown on full page unload (page lifecycle).
  useEffect(() => {
    const handler = () => workerBridge.destroy()
    window.addEventListener('pagehide', handler)
    return () => window.removeEventListener('pagehide', handler)
  }, [])

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-bold text-white sm:text-lg">
            🤖 RPA Telemetry Monitor
          </h1>
          <span className="hidden text-xs font-normal text-slate-500 sm:inline">
            Frontend Battle 2026
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <VisibilityControls layout={layout} toggle={toggle} reset={reset} />
          <PausePlay />
          <AnalyticsToggle />
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      <WidgetGate show={layout.kpiVisible}>
        <KpiStrip />
      </WidgetGate>

      <WidgetGate show={layout.filtersVisible}>
        <div className="flex flex-col gap-2 rounded-lg border border-base-600 bg-base-800 p-2 sm:flex-row sm:items-center">
          <FuzzySearchBar />
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto sm:flex-nowrap">
            <FilterDropdowns />
          </div>
        </div>
      </WidgetGate>

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <WidgetGate show={layout.gridVisible}>
          <div className="flex min-h-0 flex-1 flex-col lg:basis-2/3">
            <GridPanel />
          </div>
        </WidgetGate>
        <WidgetGate show={layout.chartVisible}>
          <div className="min-h-0 lg:basis-1/3">
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
