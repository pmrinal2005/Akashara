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
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <div className="liquid-glass-strong rounded-2xl px-6 py-4 text-center">
        <div className="text-lg font-bold text-warn">⏸ STREAM PAUSED</div>
        <div className="tnum mt-1 text-sm text-slate-200">
          Engine still capturing — {batches} batches / {rows} rows queued
        </div>
      </div>
    </div>
  )
}
