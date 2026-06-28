/**
 * ===========================================================================
 *  ENGINE SINGLETON — wires the framework-agnostic core together.
 * ===========================================================================
 *  Instantiated once, outside React, so the 200ms firehose never causes React
 *  re-renders directly. Components subscribe to snapshots via hooks.
 */

import { StreamStore } from './StreamStore'
import { BufferQueue } from './BufferQueue'
import { StreamIngestor } from './StreamIngestor'
import { ViewPool } from './ViewPool'

export const store = new StreamStore()
export const bufferQueue = new BufferQueue()
export const ingestor = new StreamIngestor(store, bufferQueue)
export const viewPool = new ViewPool(store)

/** Pause/resume helpers that keep ingestor + queue in sync. */
export function pauseStream(): void {
  bufferQueue.pause()
}

export function resumeStream(): void {
  const coalesced = bufferQueue.resume()
  ingestor.flushResumed(coalesced)
}
