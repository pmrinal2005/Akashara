import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { viewPool } from '../../core/engine'
import { useViewVersion } from '../../hooks/useViewVersion'
import type { FilterSpec } from '../../core/types'

type FilterField = keyof FilterSpec

const FIELDS: { key: FilterField; label: string }[] = [
  { key: 'project_status', label: 'Status' },
  { key: 'automation_type', label: 'Automation Type' },
  { key: 'department', label: 'Department' },
  { key: 'industry', label: 'Industry' },
]

/* ──────────────────────────────────────────────────────────────────────────
   TASK 3 — DROPDOWN MUST NOT EXPAND THE FILTER PANEL LAYOUT
   ──────────────────────────────────────────────────────────────────────────
   Why the previous implementation broke the layout:
     The filter bar wrapper uses the `.liquid-glass` utility, which sets
     `overflow: hidden`. Any descendant absolutely-positioned dropdown is
     therefore clipped by the parent box. The previous workaround tried to
     mitigate this with z-index + isolate, but the clipping still happened
     whenever the dropdown's panel was taller than the bar.

   Robust fix:
     Render the dropdown panel via `ReactDOM.createPortal` to `document.body`
     with `position: fixed`. The portal node lives OUTSIDE the clipped
     parent, so it visually overlays everything without affecting the
     filter bar's box. We measure the trigger button's bounding rect and
     keep it pinned to that anchor — updated on scroll & resize.
   ────────────────────────────────────────────────────────────────────── */

type AnchorRect = {
  top: number
  left: number
  width: number
  height: number
}

function MultiSelect({ field, label }: { field: FilterField; label: string }) {
  const version = useViewVersion()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<AnchorRect | null>(null)

  const options = useMemo(() => {
    return Array.from(viewPool.distinct[field]).sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, field])

  /* Measure the trigger button so we can position the floating panel. */
  const measure = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    setAnchor({ top: r.bottom, left: r.left, width: r.width, height: r.height })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    measure()
  }, [open, measure])

  /* Re-measure on scroll / resize so the panel stays glued to its anchor. */
  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => measure()
    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true })
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, { capture: true } as AddEventListenerOptions)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, measure])

  /* Outside-click dismissal — works across the portal because we explicitly
     check both the trigger and the panel. */
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown, { signal: ctrl.signal })
    document.addEventListener('keydown', onKey, { signal: ctrl.signal })
    return () => ctrl.abort()
  }, [open])

  const toggleValue = (val: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(val)) next.delete(val)
      else next.add(val)
      viewPool.setFilter({ [field]: next } as Partial<FilterSpec>)
      return next
    })
  }

  const clear = () => {
    setSelected(new Set())
    viewPool.setFilter({ [field]: new Set<string>() } as Partial<FilterSpec>)
  }

  /* Compute the panel's resolved position (with viewport clamping so it
     never spills off the right edge on narrow mobile screens). */
  const panelStyle = useMemo<React.CSSProperties | null>(() => {
    if (!anchor || typeof window === 'undefined') return null
    const PANEL_W = Math.min(280, window.innerWidth - 16)
    const margin = 8
    let left = anchor.left
    // Clamp to viewport
    if (left + PANEL_W > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - PANEL_W - margin)
    }
    if (left < margin) left = margin
    let top = anchor.top + 6
    // If we'd overflow the bottom, flip above the trigger.
    const panelMaxH = Math.min(360, window.innerHeight * 0.7)
    if (top + panelMaxH > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - anchor.height - 6 - panelMaxH)
    }
    return { top, left, width: PANEL_W }
  }, [anchor])

  return (
    <div className="flex-shrink-0">
      <button
        ref={buttonRef}
        onClick={() => setOpen((o) => !o)}
        className={
          'liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors whitespace-nowrap ' +
          (selected.size ? 'text-accent-soft' : 'text-slate-200 hover:text-white')
        }
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        {selected.size > 0 && (
          <span className="tnum rounded-full bg-accent/30 px-1.5 text-[11px]">{selected.size}</span>
        )}
        <span className="text-[10px]">▾</span>
      </button>

      {open && panelStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={panelRef}
              className="liquid-glass-strong filter-portal-panel glass-scroll rounded-xl p-1 shadow-2xl"
              role="listbox"
              style={panelStyle}
            >
              <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-300">
                <span>
                  {options.length} options{selected.size ? ` · ${selected.size} selected` : ''}
                </span>
                {selected.size > 0 && (
                  <button onClick={clear} className="text-accent hover:underline">
                    clear
                  </button>
                )}
              </div>
              {options.length === 0 && (
                <div className="px-2 py-2 text-xs text-slate-400">waiting for stream…</div>
              )}
              {options.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-100 hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(opt)}
                    onChange={() => toggleValue(opt)}
                    className="accent-accent flex-shrink-0"
                  />
                  <span className="truncate">{opt}</span>
                </label>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

export function FilterDropdowns() {
  return (
    <div id="filter-bar" className="flex flex-wrap items-center gap-2">
      {FIELDS.map((f) => (
        <MultiSelect key={f.key} field={f.key} label={f.label} />
      ))}
    </div>
  )
}
