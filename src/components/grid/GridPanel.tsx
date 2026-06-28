/**
 * GRID PANEL — wraps the VirtualGrid with the pause overlay and empty-state.
 */
import { viewPool } from '../../core/engine'
import { useViewVersion } from '../../hooks/useViewVersion'
import { useKpiSnapshot } from '../../hooks/useStreamSnapshot'
import { VirtualGrid } from './VirtualGrid'
import { PauseOverlay } from '../shell/PauseOverlay'
import { RowInspector } from '../inspector/RowInspector'

export function GridPanel() {
  useViewVersion() // re-evaluate empty state on view changes
  const kpi = useKpiSnapshot()
  const visible = viewPool.visibleCount
  const warming = kpi.totalRows === 0

  return (
    <section
      id="grid-panel"
      aria-label="Project telemetry grid"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-base-600 bg-base-800"
    >
      <div className="flex items-center justify-between border-b border-base-600 px-3 py-2 text-xs text-slate-400">
        <span className="font-semibold text-accent-soft">📋 Live Project Grid</span>
        <span className="tnum">
          {warming ? 'connecting…' : `${visible.toLocaleString()} rows visible`}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <VirtualGrid />
        <PauseOverlay />

        {!warming && visible === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-500">
            <div>
              <div className="mb-1 text-2xl">🗂️</div>
              No projects match the current filters / search.
            </div>
          </div>
        )}

        {warming && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-500">
            <div>
              <div className="mb-2 animate-pulse text-2xl">📡</div>
              Connecting to telemetry firehose & parsing 50,000 records…
            </div>
          </div>
        )}
      </div>
      <RowInspector />
    </section>
  )
}
