/**
 * PAUSE / PLAY  (Feature 5)
 *  Toggles the BufferQueue. While paused the engine KEEPS capturing (batches
 *  are coalesced by uid in the queue); resume replays one coalesced flush.
 *  A live counter proves capture continues during the freeze.
 */
import { useSyncExternalStore } from 'react'
import { bufferQueue, pauseStream, resumeStream } from '../../core/engine'

function subscribe(fn: () => void) {
  return bufferQueue.subscribe(fn)
}
function snapshot() {
  // encode paused + counts into a string for cheap equality
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
        'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ' +
        (paused
          ? 'border-ok/50 bg-ok/15 text-ok hover:bg-ok/25'
          : 'border-warn/50 bg-warn/10 text-warn hover:bg-warn/20')
      }
      aria-pressed={paused}
    >
      {paused ? (
        <>
          ▶ Resume
          <span className="tnum rounded bg-base-900 px-1.5 py-0.5 text-[11px] text-slate-300">
            {batches} batches / {rows} rows queued
          </span>
        </>
      ) : (
        <>⏸ Pause Stream</>
      )}
    </button>
  )
}
