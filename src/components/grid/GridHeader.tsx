import { useEffect, useState } from 'react'
import { viewPool } from '../../core/engine'
import { workerBridge } from '../../core/WorkerBridge'
import { COLUMNS, GRID_TEMPLATE, ROW_HEIGHT } from './columns'
import type { SortDir, SortSpec, SortableField } from '../../core/types'

const WORKER_THRESHOLD = 3

export function GridHeader() {
  const [sorts, setSorts] = useState<SortSpec[]>(viewPool.getSorts())

  const apply = (next: SortSpec[]) => {
    setSorts(next)
    if (next.length >= WORKER_THRESHOLD) {
      viewPool.setSort(next)
      workerBridge.sortOffloaded(next)
    } else {
      viewPool.setSort(next)
    }
  }

  /* Task 2 — the dashboard-wide Reset button calls
     `viewPool.setSort([{ field: 'roi_percent', dir: 'desc' }])` but the
     header keeps its own local `sorts` state for fast re-render of the
     sort indicators. Without this listener the local state never
     resynced with the view-pool after a reset, so the up/down arrows
     stayed pinned to whatever the user last clicked even though the
     grid had already re-sorted. We listen to the broadcast event the
     reset handler fires, then pull the canonical sorts back from the
     view-pool — keeping every UI surface and the engine in lockstep. */
  useEffect(() => {
    const onReset = () => setSorts(viewPool.getSorts())
    window.addEventListener('rpa-monitor:reset-filters', onReset)
    return () => window.removeEventListener('rpa-monitor:reset-filters', onReset)
  }, [])

  const handleClick = (field: SortableField, e: React.MouseEvent) => {
    const existingIdx = sorts.findIndex((s) => s.field === field)

    if (e.shiftKey) {
      if (existingIdx === -1) {
        apply([...sorts, { field, dir: 'asc' }])
      } else {
        const copy = sorts.slice()
        const cur = copy[existingIdx]
        if (cur.dir === 'asc') {
          copy[existingIdx] = { field, dir: 'desc' }
        } else {
          copy.splice(existingIdx, 1)
        }
        apply(copy)
      }
      return
    }

    let dir: SortDir = 'asc'
    if (existingIdx !== -1 && sorts.length === 1 && sorts[0].dir === 'asc') dir = 'desc'
    apply([{ field, dir }])
  }

  return (
    <div
      className="vrow select-none font-semibold text-accent-soft"
      style={{
        gridTemplateColumns: GRID_TEMPLATE,
        height: ROW_HEIGHT,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        cursor: 'default',
      }}
      role="row"
    >
      {COLUMNS.map((c) => {
        const idx = sorts.findIndex((s) => s.field === c.field)
        const spec = idx === -1 ? null : sorts[idx]
        return (
          <span
            key={c.field}
            role="columnheader"
            aria-sort={spec ? (spec.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            tabIndex={0}
            onClick={(e) => handleClick(c.field, e)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(c.field, e as unknown as React.MouseEvent)
              }
            }}
            className={
              (c.numeric ? 'vcell vcell-num ' : 'vcell ') +
              'cursor-pointer hover:text-white focus:outline-none focus:text-white'
            }
            title="Click to sort • Shift+Click for multi-column"
          >
            {c.label}
            {spec && (
              <span className="ml-1 text-[10px] text-accent">
                {sorts.length > 1 ? `${idx + 1}` : ''}
                {spec.dir === 'asc' ? '▲' : '▼'}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
