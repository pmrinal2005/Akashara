import { useSyncExternalStore } from 'react'
import { bufferQueue, pauseStream, resumeStream } from '../../core/engine'

function subscribe(fn: () => void) {
  return bufferQueue.subscribe(fn)
}
function snapshot() {
  return `${bufferQueue.isPaused()}|${bufferQueue.queuedBatches}|${bufferQueue.queuedRows}`
}

export function PausePlay() {
  const snap = useSyncExternalStore(subscribe, snapshot, snapshot)
  const [pausedStr, batches, rows] = snap.split('|')
  const paused = pausedStr === 'true'

  return (
    <button
      id="pause-play-btn"
      onClick={() => (paused ? resumeStream() : pauseStream())}
      className={
        'liquid-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ' +
        (paused ? 'text-ok' : 'text-warn')
      }
      aria-pressed={paused}
    >
      {paused ? (
        <>
          ▶ Resume
          <span className="tnum rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">
            {batches} batches / {rows} rows queued
          </span>
        </>
      ) : (
        <>⏸ Pause Stream</>
      )}
    </button>
  )
}
