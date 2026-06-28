/**
 * PAUSE OVERLAY  (Feature 5 visual)
 *  Semi-transparent, pointer-events:none banner over the grid while paused.
 *  Counter updates live to prove the engine keeps capturing during the freeze.
 */
import { useSyncExternalStore } from 'react'
import { bufferQueue } from '../../core/engine'

function subscribe(fn: () => void) {
  return bufferQueue.subscribe(fn)
}
function snapshot() {
  return `${bufferQueue.isPaused()}|${bufferQueue.queuedBatches}|${bufferQueue.queuedRows}`
}

export function PauseOverlay() {
  const snap = useSyncExternalStore(subscribe, snapshot, snapshot)
  const [paused, batches, rows] = snap.split('|')
  if (paused !== 'true') return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-base-900/55 backdrop-blur-[1px]">
      <div className="rounded-lg border border-warn/50 bg-base-800/90 px-6 py-4 text-center">
        <div className="text-lg font-bold text-warn">⏸ STREAM PAUSED</div>
        <div className="tnum mt-1 text-sm text-slate-300">
          Engine still capturing — {batches} batches / {rows} rows queued
        </div>
      </div>
    </div>
  )
}
