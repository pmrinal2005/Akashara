import { useSyncExternalStore } from 'react'
import { bufferQueue } from '../../core/engine'
import { analyticsStore } from '../../core/AnalyticsStore'
import { AnalyticsIcon } from '../common/AppIcons'

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
        'liquid-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ' +
        (paused
          ? open
            ? 'text-accent-soft'
            : 'text-accent-soft hover:text-white'
          : 'cursor-not-allowed text-slate-500')
      }
    >
      <AnalyticsIcon className="h-4 w-4" /> Analytics View
      {!paused && (
        <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-slate-400">
          pause to enable
        </span>
      )}
      {paused && open && (
        <span className="rounded-full bg-accent/25 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent-soft">
          open
        </span>
      )}
    </button>
  )
}
