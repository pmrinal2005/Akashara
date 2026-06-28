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
      <span className="text-[11px] uppercase tracking-wider text-slate-400">Layout:</span>
      {TOGGLES.map((t) => {
        const on = layout[t.key]
        return (
          <button
            key={t.key}
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
        onClick={reset}
        className="liquid-glass rounded-full px-2.5 py-1 text-xs text-slate-300 hover:text-white"
      >
        reset
      </button>
    </div>
  )
}
