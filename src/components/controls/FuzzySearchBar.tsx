import { useEffect, useRef, useState } from 'react'
import { workerBridge } from '../../core/WorkerBridge'

export function FuzzySearchBar() {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    workerBridge.search(value)
  }, [value])

  return (
    <div className="liquid-glass relative flex-1 min-w-[180px] rounded-full">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
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
        className="w-full bg-transparent py-2 pl-9 pr-8 text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
        >
          ✕
        </button>
      )}
    </div>
  )
}
