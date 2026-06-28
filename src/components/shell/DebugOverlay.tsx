import { useEffect, useState } from 'react'
import { store, viewPool } from '../../core/engine'

export function DebugOverlay() {
  const [stats, setStats] = useState({ domRows: 0, visible: 0, store: 0 })

  useEffect(() => {
    const interval = setInterval(() => {
      const group = document.querySelector('[role="rowgroup"] .vgrid-window')
      setStats({
        domRows: group ? group.childElementCount : 0,
        visible: viewPool.visibleCount,
        store: store.size,
      })
    }, 500)

    let mo: MutationObserver | null = null
    const group = document.querySelector('[role="rowgroup"] .vgrid-window')
    if (group) {
      mo = new MutationObserver(() => {
        if (group.childElementCount > 80) {
          // eslint-disable-next-line no-console
          console.error(
            `[Recycler self-check] DOM row count ${group.childElementCount} exceeds bound — virtualization may be leaking nodes!`,
          )
        }
      })
      mo.observe(group, { childList: true })
    }

    return () => {
      clearInterval(interval)
      mo?.disconnect()
    }
  }, [])

  return (
    <div className="liquid-glass-strong pointer-events-none fixed bottom-3 right-3 z-50 rounded-xl p-3 font-mono text-[11px] text-accent-soft">
      <div className="mb-1 font-bold text-accent">🔬 DEBUG · recycler</div>
      <div className="tnum">DOM row nodes: {stats.domRows}</div>
      <div className="tnum">Visible rows: {stats.visible}</div>
      <div className="tnum">Store rows: {stats.store}</div>
    </div>
  )
}
