/**
 * useInspector — thin React adapter over inspectorStore.
 *
 * Returns the currently inspected internal_uid (or null) and a stable close
 * callback. Uses useSyncExternalStore so it never tears under concurrent
 * rendering and never re-renders unless the uid actually changes.
 */
import { useSyncExternalStore, useCallback } from 'react'
import { inspectorStore } from '../core/InspectorStore'

export function useInspector(): {
  uid: string | null
  close: () => void
} {
  const uid = useSyncExternalStore(
    inspectorStore.subscribe,
    inspectorStore.getSnapshot,
    inspectorStore.getSnapshot,
  )
  const close = useCallback(() => inspectorStore.close(), [])
  return { uid, close }
}
