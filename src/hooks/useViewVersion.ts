/**
 * useViewVersion — bumps a monotonic counter whenever the ViewPool emits, so
 * the grid knows the visible ordering/contents may have changed. The grid uses
 * this as a cheap signal; it then reads viewPool.getOrder() imperatively.
 */
import { useSyncExternalStore } from 'react'
import { viewPool } from '../core/engine'

let version = 0
const listeners = new Set<() => void>()

// Single bridge subscription: bump version + notify React subscribers.
viewPool.subscribe(() => {
  version += 1
  listeners.forEach((fn) => fn())
})

function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function getSnapshot(): number {
  return version
}

export function useViewVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
