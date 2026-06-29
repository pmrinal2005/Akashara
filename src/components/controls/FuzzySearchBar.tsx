import { useEffect, useRef, useState } from 'react'
import { workerBridge } from '../../core/WorkerBridge'
import { CloseIcon, SearchIcon } from '../common/AppIcons'

export function FuzzySearchBar() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    workerBridge.search(value)
  }, [value])

  /* Task 2 — the dashboard-wide Reset button broadcasts this event
     so we can clear the controlled input without prop-drilling. */
  useEffect(() => {
    const onReset = () => setValue('')
    window.addEventListener('rpa-monitor:reset-search', onReset)
    return () => window.removeEventListener('rpa-monitor:reset-search', onReset)
  }, [])

  return (
    <div className="liquid-glass relative flex-1 min-w-[180px] rounded-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
        <SearchIcon className="h-4 w-4" />
      </span>
      <input
        ref={inputRef}
        id="fuzzy-search"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Fuzzy search — try 'invoice finance' (order-independent)…"
        aria-label="Fuzzy search projects"
        className="w-full bg-transparent py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
