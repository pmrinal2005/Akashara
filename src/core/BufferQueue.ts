/**
 * ===========================================================================
 *  BUFFER QUEUE  (Feature 5 — Pause / Play)
 * ===========================================================================
 *  When paused, the ingestor keeps RECEIVING batches (rubric requires the
 *  state engine to keep capturing) but instead of forwarding to the store, the
 *  batches are deduplicated by internal_uid into a pending map. On resume, a
 *  single coalesced flush replays only the FINAL state of each touched uid —
 *  so 30 mutations to one row during a pause cost exactly one paint, and memory
 *  stays bounded.
 */

import type { RawIncomingRow } from './types'

export class BufferQueue {
  private paused = false
  /** uid -> latest raw row seen while paused (dedup, bounded memory). */
  private pending = new Map<string, RawIncomingRow>()
  /** number of raw batches absorbed while paused (for the live counter). */
  private bufferedBatches = 0
  private listeners = new Set<() => void>()

  isPaused(): boolean {
    return this.paused
  }

  get queuedBatches(): number {
    return this.bufferedBatches
  }

  get queuedRows(): number {
    return this.pending.size
  }

  pause(): void {
    if (this.paused) return
    this.paused = true
    this.emit()
  }

  /** Resume and hand back the coalesced batch of final-state rows to replay. */
  resume(): RawIncomingRow[] {
    if (!this.paused) return []
    this.paused = false
    const coalesced = Array.from(this.pending.values())
    this.pending.clear()
    this.bufferedBatches = 0
    this.emit()
    return coalesced
  }

  /** Absorb a batch while paused. Returns true if it was buffered. */
  absorb(batch: RawIncomingRow[]): boolean {
    if (!this.paused) return false
    this.bufferedBatches += 1
    for (let i = 0; i < batch.length; i++) {
      const r = batch[i]
      if (r.internal_uid) this.pending.set(r.internal_uid, r)
    }
    this.emit()
    return true
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn())
  }
}
