/**
 * usePersistedLayout (Feature 6) — versioned localStorage round-trip for widget
 * visibility. Hidden widgets are unmounted by WidgetGate so they also stop
 * subscribing to the store (memory hygiene).
 *
 * Bug fix (Task 3): the previous `reset()` returned the SAME `DEFAULT_LAYOUT`
 * reference on every call. When React's `setState` saw the identical object
 * reference it bailed out — the visible toggles never moved.  We now:
 *   1. Always return a fresh `{ ...DEFAULT_LAYOUT }` object so React's
 *      shallow check sees a real change.
 *   2. Use the functional form `setLayout(prev => ...)` to make sure the
 *      update is applied even if React has stale closure state.
 *   3. Eagerly persist the reset to localStorage in the same call so the
 *      reset is durable even if the component unmounts before the effect
 *      flushes.
 */
import { useCallback, useEffect, useState } from 'react'

export interface LayoutState {
  kpiVisible: boolean
  gridVisible: boolean
  chartVisible: boolean
  filtersVisible: boolean
}

const KEY = 'rpa-monitor:layout:v1'

const DEFAULT_LAYOUT: LayoutState = {
  kpiVisible: true,
  gridVisible: true,
  chartVisible: true,
  filtersVisible: true,
}

function makeDefault(): LayoutState {
  // Fresh object reference every call — critical for setState to register.
  return {
    kpiVisible: true,
    gridVisible: true,
    chartVisible: true,
    filtersVisible: true,
  }
}

function read(): LayoutState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return makeDefault()
    const parsed = JSON.parse(raw) as Partial<LayoutState>
    return { ...DEFAULT_LAYOUT, ...parsed }
  } catch {
    return makeDefault()
  }
}

export function usePersistedLayout() {
  const [layout, setLayout] = useState<LayoutState>(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(layout))
    } catch {
      /* storage may be unavailable (private mode); fail silently */
    }
  }, [layout])

  const toggle = useCallback((key: keyof LayoutState) => {
    setLayout((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  /* Task 3 fix — always assign a fresh default object.  We also push the
     reset straight into localStorage so the change is durable even before
     the persistence effect fires. */
  const reset = useCallback(() => {
    const next = makeDefault()
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setLayout(() => next)
  }, [])

  return { layout, toggle, reset }
}
