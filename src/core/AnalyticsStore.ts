/**
 * ===========================================================================
 *  ANALYTICS STORE  — Pause-Gated Overlay Toggle
 * ===========================================================================
 *  A framework-agnostic singleton observable that owns ONE piece of state:
 *  whether the "Analytics View" overlay (Chart.js-powered) is open.
 *
 *  Doctrine (mirrors InspectorStore):
 *   - Lives OUTSIDE React, like every other store in this codebase
 *     (engine.ts pattern). Components subscribe via useSyncExternalStore.
 *   - Toggling is GATED on bufferQueue.isPaused(): the spec requires the
 *     analytics overlay to ONLY be reachable when the pipeline is frozen.
 *     Attempts to open while live are silently rejected.
 *   - Auto-closes the instant the stream resumes — Chart.js instances paint
 *     a single static aggregation of the frozen store; we tear them down so
 *     the live stream never thrashes a hidden canvas.
 *   - Aggregation happens in the AnalyticsView component AT OPEN TIME from
 *     `store.rows` (the frozen snapshot). The store itself does no data work
 *     — it is just a tiny on/off latch.
 */

import { bufferQueue } from './engine'

type Listener = () => void

class AnalyticsStore {
  private open = false
  private listeners = new Set<Listener>()
  private snapshotCache: 'open' | 'closed' = 'closed'

  constructor() {
    bufferQueue.subscribe(() => {
      if (!bufferQueue.isPaused() && this.open) {
        this.setOpen(false)
      }
    })
  }

  openView(): boolean {
    if (!bufferQueue.isPaused()) return false
    this.setOpen(true)
    return true
  }

  closeView(): void {
    this.setOpen(false)
  }

  toggle(): void {
    if (this.open) {
      this.closeView()
    } else {
      this.openView()
    }
  }

  isOpen(): boolean {
    return this.open
  }

  private setOpen(v: boolean): void {
    if (this.open === v) return
    this.open = v
    this.snapshotCache = v ? 'open' : 'closed'
    this.emit()
  }

  getSnapshot = (): 'open' | 'closed' => this.snapshotCache

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn())
  }
}

export const analyticsStore = new AnalyticsStore()
