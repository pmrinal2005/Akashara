/**
 * ===========================================================================
 *  APP — top-level shell.
 * ===========================================================================
 *  Starts the ingestor exactly once (StrictMode-safe), wires the worker bridge,
 *  and lays out the KPI strip, controls, grid, and analytics chart with
 *  layout-persisted widget gates.
 */
import { useEffect, useState } from 'react'
import { ingestor } from './core/engine'
import { workerBridge } from './core/WorkerBridge'
import { usePersistedLayout } from './hooks/usePersistedLayout'
import { KpiStrip } from './components/kpi/KpiStrip'
import { GridPanel } from './components/grid/GridPanel'
import { DepartmentChart } from './components/analytics/DepartmentChart'
import { PausePlay } from './components/controls/PausePlay'
import { FuzzySearchBar } from './components/controls/FuzzySearchBar'
import { FilterDropdowns } from './components/controls/FilterDropdowns'
import { WidgetGate, VisibilityControls } from './components/shell/WidgetVisibility'
import { DebugOverlay } from './components/shell/DebugOverlay'

function useDebugFlag(): boolean {
  const [on] = useState(() => new URLSearchParams(location.search).get('debug') === '1')
  return on
}

export default function App() {
  const { layout, toggle, reset } = usePersistedLayout()
  const debug = useDebugFlag()
  const [error, setError] = useState<string | null>(null)

  // Start the official stream exactly once. StrictMode double-invokes this
  // effect in dev; ingestor.start() and dataStream.js are both idempotent.
  useEffect(() => {
    ingestor.start(undefined, (msg) => setError(msg))
    return () => {
      // Workers are torn down only on real unmount (full app teardown).
      // Intentionally NOT terminating on StrictMode remount.
    }
  }, [])

  // Tear down workers when the tab/app is actually destroyed.
  useEffect(() => {
    const handler = () => workerBridge.destroy()
    window.addEventListener('pagehide', handler)
    return () => window.removeEventListener('pagehide', handler)
  }, [])

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">
            🤖 RPA Telemetry Monitor
            <span className="ml-2 text-xs font-normal text-slate-500">Frontend Battle 2026</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <VisibilityControls layout={layout} toggle={toggle} reset={reset} />
          <PausePlay />
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger">
          ⚠️ {error}
        </div>
      )}

      {/* KPI strip */}
      <WidgetGate show={layout.kpiVisible}>
        <KpiStrip />
      </WidgetGate>

      {/* Controls row */}
      <WidgetGate show={layout.filtersVisible}>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-base-600 bg-base-800 p-2">
          <FuzzySearchBar />
          <FilterDropdowns />
        </div>
      </WidgetGate>

      {/* Main content: grid + chart */}
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

      {debug && <DebugOverlay />}
    </div>
  )
}
