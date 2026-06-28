import { useSyncExternalStore } from 'react'
import { bufferQueue } from '../../core/engine'
import { analyticsStore } from '../../core/AnalyticsStore'

function subscribePaused(fn: () => void) {
  return bufferQueue.subscribe(fn)
}
function snapshotPaused() {
  return bufferQueue.isPaused() ? '1' : '0'
}
function snapshotOpen() {
  return analyticsStore.isOpen() ? '1' : '0'
}

export function AnalyticsToggle() {
  const pausedFlag = useSyncExternalStore(subscribePaused, snapshotPaused, snapshotPaused)
  const openFlag = useSyncExternalStore(
    analyticsStore.subscribe,
    snapshotOpen,
    snapshotOpen,
  )
  const paused = pausedFlag === '1'
  const open = openFlag === '1'

  const handleClick = () => {
    if (!paused) return
    analyticsStore.toggle()
  }

  return (
    <button
      onClick={handleClick}
      disabled={!paused}
      aria-pressed={open}
      title={
        paused
          ? open
            ? 'Close Analytics View'
            : 'Open Chart.js Analytics View over the frozen snapshot'
          : 'Pause the stream first to open Analytics View'
      }
      className={
        'flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ' +
        (paused
          ? open
            ? 'border-accent/60 bg-accent/20 text-accent-soft hover:bg-accent/30'
            : 'border-accent/50 bg-accent/10 text-accent-soft hover:bg-accent/20'
          : 'cursor-not-allowed border-base-600 bg-base-900 text-slate-500')
      }
    >
      📊 Analytics View
      {!paused && (
        <span className="rounded bg-base-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
          pause to enable
        </span>
      )}
      {paused && open && (
        <span className="rounded bg-accent/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent-soft">
          open
        </span>
      )}
    </button>
  )
}
