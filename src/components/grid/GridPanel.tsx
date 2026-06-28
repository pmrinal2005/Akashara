import { viewPool } from '../../core/engine'
import { useViewVersion } from '../../hooks/useViewVersion'
import { useKpiSnapshot } from '../../hooks/useStreamSnapshot'
import { VirtualGrid } from './VirtualGrid'
import { PauseOverlay } from '../shell/PauseOverlay'

export function GridPanel() {
  useViewVersion()
  const kpi = useKpiSnapshot()
  const visible = viewPool.visibleCount
  const warming = kpi.totalRows === 0

  return (
    <section
      id="grid-panel"
      aria-label="Project telemetry grid"
      className="liquid-glass relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-slate-300">
        <span className="font-semibold text-accent-soft">📋 Live Project Grid</span>
        <span className="tnum">
          {warming ? 'connecting…' : `${visible.toLocaleString()} rows visible`}
        </span>
      </div>

      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <VirtualGrid />
        <PauseOverlay />

        {!warming && visible === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-400">
            <div>
              <div className="mb-1 text-2xl">🗂️</div>
              No projects match the current filters / search.
            </div>
          </div>
        )}

        {warming && (
          <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-400">
            <div>
              <div className="mb-2 animate-pulse text-2xl">📡</div>
              Connecting to telemetry firehose & parsing 50,000 records…
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
