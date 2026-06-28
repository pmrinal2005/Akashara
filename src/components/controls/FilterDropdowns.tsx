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
  const ref = useRef<HTMLDivElement>(null)

  const options = useMemo(() => {
    return Array.from(viewPool.distinct[field]).sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, field])

  useEffect(() => {
    if (!open) return
    const ctrl = new AbortController()
    document.addEventListener(
      'mousedown',
      (e) => {
        if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          'liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ' +
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
        <div
          className="liquid-glass-strong glass-scroll absolute z-30 mt-2 max-h-72 w-64 overflow-y-auto rounded-xl p-1"
          role="listbox"
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
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-100 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => toggleValue(opt)}
                className="accent-accent"
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
    <div id="filter-bar" className="flex flex-wrap items-center gap-2">
      {FIELDS.map((f) => (
        <MultiSelect key={f.key} field={f.key} label={f.label} />
      ))}
    </div>
  )
}
