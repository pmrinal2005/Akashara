/**
 * useViewVersion — bumps a monotonic counter whenever the ViewPool emits, so
 * the grid knows the visible ordering/contents may have changed. The grid uses
 * this as a cheap signal; it then reads viewPool.getOrder() imperatively.
 *
 * ─── PHASE-2 FIX ──────────────────────────────────────────────────────────
 * Previously, a module-level `viewPool.subscribe(...)` ran on import and was
 * never torn down — a slow leak across hot-reload cycles in dev and (more
 * importantly) a long-lived closure capturing the listener Set. Now the
 * subscription is lazily created on first use and reference-counted, so the
 * single bridge subscription detaches when no React subscribers remain.
 */
import { useSyncExternalStore } from 'react'
import { viewPool } from '../core/engine'

let version = 0
const listeners = new Set<() => void>()
let bridgeUnsub: (() => void) | null = null

function ensureBridge(): void {
  if (bridgeUnsub) return
  bridgeUnsub = viewPool.subscribe(() => {
    version += 1
    listeners.forEach((fn) => fn())
  })
}

function teardownBridgeIfIdle(): void {
  if (listeners.size === 0 && bridgeUnsub) {
    bridgeUnsub()
    bridgeUnsub = null
  }
}

function subscribe(fn: () => void): () => void {
  ensureBridge()
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
    teardownBridgeIfIdle()
  }
}

function getSnapshot(): number {
  return version
}

export function useViewVersion(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
