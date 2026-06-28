import { useEffect, useMemo, useRef, useState } from 'react'
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

function MultiSelect({ field, label }: { field: FilterField; label: string }) {
  const version = useViewVersion()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const options = useMemo(() => {
    return Array.from(viewPool.distinct[field]).sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, field])

  // ── Fix Task 2: portal-style absolute positioning so the dropdown does NOT
  //    push or displace sibling elements in the flex row.
  //    We measure the button's position and apply inline styles so the panel
  //    is taken out of the normal flow entirely.
  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    document.addEventListener(
      'mousedown',
      (e) => {
        const container = containerRef.current
        const dropdown = dropdownRef.current
        if (
          container &&
          !container.contains(e.target as Node) &&
          dropdown &&
          !dropdown.contains(e.target as Node)
        ) {
          setOpen(false)
        }
      },
      { signal: ctrl.signal },
    )
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

  return (
    // `relative` wrapper keeps the dropdown anchored correctly.
    // `isolate` creates a new stacking context so z-index works against
    // siblings that also have positioned children.
    <div ref={containerRef} className="relative isolate flex-shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          'liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors whitespace-nowrap ' +
          (selected.size
            ? 'text-accent-soft'
            : 'text-slate-200 hover:text-white')
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

      {open && (
        // `fixed`-ish panel: absolute + high z-index + explicit top/left so
        // it escapes the flex row's overflow and never displaces layout.
        // The panel is 256 px wide and max-h-72 to keep it compact.
        <div
          ref={dropdownRef}
          className="liquid-glass-strong glass-scroll absolute left-0 top-full z-[200] mt-2 max-h-72 w-64 overflow-y-auto rounded-xl p-1 shadow-xl"
          role="listbox"
          style={{ minWidth: '220px' }}
        >
          <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-300">
            <span>{options.length} options</span>
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
        </div>
      )}
    </div>
  )
}

export function FilterDropdowns() {
  return (
    // `relative` on this wrapper so stacking contexts are self-contained.
    // The buttons themselves are flex items; dropdowns escape via absolute+z.
    <div
      id="filter-bar"
      className="relative flex flex-wrap items-center gap-2"
    >
      {FIELDS.map((f) => (
        <MultiSelect key={f.key} field={f.key} label={f.label} />
      ))}
    </div>
  )
}
