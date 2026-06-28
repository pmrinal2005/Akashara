/**
 * FUZZY SEARCH BAR  (Feature 10)
 *  Debounced (120ms) input; query forwarded to the search WORKER, which does
 *  token-based, out-of-order, case-insensitive partial matching over
 *  project_name / department / automation_type / industry (+country/id).
 *  Empty query short-circuits to "all pass".
 */
import { useEffect, useRef, useState } from 'react'
import { workerBridge } from '../../core/WorkerBridge'

export function FuzzySearchBar() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    workerBridge.search(value)
  }, [value])

  return (
    <div className="relative flex-1 min-w-[200px]">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        🔍
      </span>
      <input
        ref={inputRef}
        id="fuzzy-search"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Fuzzy search — try 'invoice finance' (order-independent)…"
        aria-label="Fuzzy search projects"
        className="w-full rounded-md border border-base-600 bg-base-900 py-1.5 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-500 focus:border-accent focus:outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
        >
          ✕
        </button>
      )}
    </div>
  )
}
