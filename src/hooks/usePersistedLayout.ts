/**
 * usePersistedLayout (Feature 6) — versioned localStorage round-trip for widget
 * visibility. Hidden widgets are unmounted by WidgetGate so they also stop
 * subscribing to the store (memory hygiene).
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

function read(): LayoutState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw) as Partial<LayoutState>
    return { ...DEFAULT_LAYOUT, ...parsed }
  } catch {
    return DEFAULT_LAYOUT
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

  const reset = useCallback(() => setLayout(DEFAULT_LAYOUT), [])

  return { layout, toggle, reset }
}
