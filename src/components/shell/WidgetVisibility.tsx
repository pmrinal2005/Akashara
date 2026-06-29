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
  /* Task 3 fix — the reset handler is now wrapped in `e.preventDefault` so
     it can never bubble into an enclosing form, and we use `type=button`
     to be explicit.  The visual treatment also makes it look like a real
     interactive control. */
  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    reset()
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
        title="Restore all panels to default visibility"
        aria-label="Reset layout to defaults"
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
