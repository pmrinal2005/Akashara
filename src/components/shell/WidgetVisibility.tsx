import type { ReactNode } from 'react'
import type { LayoutState } from '../../hooks/usePersistedLayout'
import { viewPool } from '../../core/engine'

export function WidgetGate({ show, children }: { show: boolean; children: ReactNode }) {
  if (!show) return null
  return <>{children}</>
}

interface ControlsProps {
  layout: LayoutState
  toggle: (k: keyof LayoutState) => void
  reset: () => void
}

const TOGGLES: { key: keyof LayoutState; label: string }[] = [
  { key: 'kpiVisible', label: 'KPIs' },
  { key: 'filtersVisible', label: 'Filters' },
  { key: 'gridVisible', label: 'Grid' },
  { key: 'chartVisible', label: 'Chart' },
]

export function VisibilityControls({ layout, toggle, reset }: ControlsProps) {
  /*
   * Task 2 — the Reset button used to ONLY call the layout reset hook.
   * When every panel was already visible (the default) clicking the
   * button produced no visible change, so it looked broken.
   *
   * The new behaviour is a real "dashboard reset":
   *   1. Restore default widget visibility (the original hook call).
   *   2. Clear all categorical filters (automation_type, department,
   *      industry, project_status) in the ViewPool.
   *   3. Reset the sort spec back to the default `roi_percent desc`.
   *   4. Clear the fuzzy-search query.
   *   5. Broadcast `rpa-monitor:reset-search` so the search bar
   *      empties its controlled input, and `rpa-monitor:reset-settings`
   *      so the sidebar's Settings tab (row height, accent, debug)
   *      goes back to defaults too.
   *
   * All of this is synchronous and idempotent — clicking it twice is
   * safe and yields the same final state.
   */
  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()

    // 1. Widget visibility
    reset()

    // 2. + 3. View-pool projection: filters + sort
    try {
      viewPool.setFilter({
        automation_type: new Set<string>(),
        department: new Set<string>(),
        industry: new Set<string>(),
        project_status: new Set<string>(),
      })
      viewPool.setSort([{ field: 'roi_percent', dir: 'desc' }])
      // 4. Search
      viewPool.setSearchResult(null, '')
    } catch {
      /* engine not yet initialised — ignore */
    }

    // 5. Notify dependent UIs to clear their local controlled state.
    try {
      window.dispatchEvent(new CustomEvent('rpa-monitor:reset-search'))
      window.dispatchEvent(new CustomEvent('rpa-monitor:reset-settings'))
      window.dispatchEvent(new CustomEvent('rpa-monitor:reset-filters'))
    } catch {
      /* CustomEvent not supported (very old browser) — ignore */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-slate-400">Layout:</span>
      {TOGGLES.map((t) => {
        const on = layout[t.key]
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => toggle(t.key)}
            aria-pressed={on}
            className={
              'liquid-glass rounded-full px-2.5 py-1 text-xs transition-colors ' +
              (on ? 'text-accent-soft' : 'text-slate-500 line-through')
            }
          >
            {t.label}
          </button>
        )
      })}
      <button
        type="button"
        onClick={handleReset}
        title="Restore panels, filters, sort, search and settings to defaults"
        aria-label="Reset dashboard"
        className="liquid-glass inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-slate-200 transition-colors hover:bg-white/10 hover:text-white active:bg-white/15"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        reset
      </button>
    </div>
  )
}
