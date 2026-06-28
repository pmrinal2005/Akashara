/**
 * ===========================================================================
 *  STREAM INGESTOR — the bridge to the official dataStream.js
 * ===========================================================================
 *  Responsibilities:
 *   1. Wait for window.initializeRpaStream (loaded via <script> in index.html).
 *   2. Register the callback EXACTLY ONCE (guards React StrictMode double-mount
 *      AND dataStream.js's own isInitialized guard).
 *   3. Route each batch through the BufferQueue (pause/play), then to the store.
 */

import type { BufferQueue } from './BufferQueue'
import type { StreamStore } from './StreamStore'
import type { RawIncomingRow } from './types'

declare global {
  interface Window {
    initializeRpaStream?: (
      callback: (batch: RawIncomingRow[]) => void,
      csvUrl?: string,
    ) => void | Promise<void>
  }
}

const CSV_URL = '/automation_projects.csv'

export class StreamIngestor {
  private started = false

  constructor(
    private store: StreamStore,
    private queue: BufferQueue,
  ) {}

  /** Idempotent start. Safe to call from a StrictMode-double-invoked effect. */
  start(onReady?: () => void, onError?: (msg: string) => void): void {
    if (this.started) return
    this.started = true

    const boot = (attempt = 0) => {
      if (typeof window.initializeRpaStream === 'function') {
        try {
          window.initializeRpaStream((batch: RawIncomingRow[]) => {
            this.handleBatch(batch)
          }, CSV_URL)
          onReady?.()
        } catch (e) {
          onError?.(String(e))
        }
        return
      }
      if (attempt > 50) {
        onError?.('window.initializeRpaStream never became available (dataStream.js failed to load).')
        return
      }
      setTimeout(() => boot(attempt + 1), 100)
    }

    boot()
  }

  private handleBatch(batch: RawIncomingRow[]): void {
    // If paused, the queue absorbs (engine keeps capturing).
    if (this.queue.absorb(batch)) return
    this.store.upsertBatch(batch)
  }

  /** Called by the Pause/Play control on resume to replay coalesced rows. */
  flushResumed(rows: RawIncomingRow[]): void {
    if (rows.length) this.store.upsertBatch(rows)
  }
}
