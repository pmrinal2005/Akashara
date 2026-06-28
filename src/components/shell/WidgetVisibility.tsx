/**
 * WIDGET VISIBILITY  (Feature 6)
 *  - WidgetGate unmounts a hidden widget entirely so it also STOPS subscribing
 *    to the store (memory hygiene), not merely display:none.
 *  - VisibilityControls renders toggle chips persisted to localStorage.
 */
import type { ReactNode } from 'react'
import type { LayoutState } from '../../hooks/usePersistedLayout'

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
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-slate-500">Layout:</span>
      {TOGGLES.map((t) => {
        const on = layout[t.key]
        return (
          <button
            key={t.key}
            onClick={() => toggle(t.key)}
            aria-pressed={on}
            className={
              'rounded-full border px-2.5 py-1 text-xs transition-colors ' +
              (on
                ? 'border-accent/50 bg-accent/15 text-accent-soft'
                : 'border-base-600 bg-base-900 text-slate-500 line-through')
            }
          >
            {t.label}
          </button>
        )
      })}
      <button
        onClick={reset}
        className="rounded-full border border-base-600 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
      >
        reset
      </button>
    </div>
  )
}
