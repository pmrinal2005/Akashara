/**
 * ===========================================================================
 *  INSPECTOR STORE  (Pause-Gated Row Detail Selection)
 * ===========================================================================
 *  A framework-agnostic singleton observable that owns ONE piece of state:
 *  the internal_uid of the row currently being inspected (or null).
 *
 *  Doctrine:
 *   - Lives OUTSIDE React, like every other store in this codebase
 *     (engine.ts pattern). Components subscribe via useSyncExternalStore.
 *   - Selection is GATED on bufferQueue.isPaused(): attempts to open while
 *     the stream is live are silently rejected, so the inspector only ever
 *     appears in the explicit "frozen" debug state — exactly as the spec
 *     requires.
 *   - Closing on resume is automatic: we subscribe to bufferQueue and clear
 *     the selection the moment the stream un-pauses, preventing a stale
 *     detail panel from lingering over a moving recycler.
 *
 *  Why a dedicated store and not local component state?
 *   - The grid is imperative DOM (VirtualGrid), so the click handler is
 *     attached outside React. It cannot setState; it can only push into a
 *     framework-agnostic sink. This store is that sink.
 */

import { bufferQueue } from './engine'

type Listener = () => void

class InspectorStore {
  private uid: string | null = null
  private listeners = new Set<Listener>()
  private snapshotCache: string | null = null

  constructor() {
    // Auto-close the inspector the instant the stream resumes — the row
    // underneath may be recycled / re-sorted at any time once live.
    bufferQueue.subscribe(() => {
      if (!bufferQueue.isPaused() && this.uid !== null) {
        this.close()
      }
    })
  }

  /** Request to open the inspector for `uid`. Honored ONLY while paused. */
  open(uid: string): boolean {
    if (!bufferQueue.isPaused()) return false
    if (this.uid === uid) return true
    this.uid = uid
    this.snapshotCache = uid
    this.emit()
    return true
  }

  close(): void {
    if (this.uid === null) return
    this.uid = null
    this.snapshotCache = null
    this.emit()
  }

  getUid(): string | null {
    return this.uid
  }

  /** Stable string snapshot for useSyncExternalStore reference equality. */
  getSnapshot = (): string | null => this.snapshotCache

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn())
  }
}

export const inspectorStore = new InspectorStore()
