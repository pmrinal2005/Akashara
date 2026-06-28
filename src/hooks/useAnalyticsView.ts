import { useSyncExternalStore, useCallback } from 'react'
import { analyticsStore } from '../core/AnalyticsStore'

export function useAnalyticsView(): {
  isOpen: boolean
  open: () => boolean
  close: () => void
  toggle: () => void
} {
  const snap = useSyncExternalStore(
    analyticsStore.subscribe,
    analyticsStore.getSnapshot,
    analyticsStore.getSnapshot,
  )
  const open = useCallback(() => analyticsStore.openView(), [])
  const close = useCallback(() => analyticsStore.closeView(), [])
  const toggle = useCallback(() => analyticsStore.toggle(), [])
  return { isOpen: snap === 'open', open, close, toggle }
}
