/**
 * GRID HEADER  (Feature 4 single-column sort + Feature 9 multi-column sort)
 *  - Plain click: REPLACE sort with this field (toggles asc/desc).
 *  - Shift+click: APPEND this field to the multi-key sort spec.
 *  Numbered badges show multi-column order (1▼, 2▲ ...).
 *  When sort spec has >= 3 keys, the sort is offloaded to the sort worker.
 */
import { useState } from 'react'
import { viewPool } from '../../core/engine'
import { workerBridge } from '../../core/WorkerBridge'
import { COLUMNS, GRID_TEMPLATE, ROW_HEIGHT } from './columns'
import type { SortDir, SortSpec, SortableField } from '../../core/types'

const WORKER_THRESHOLD = 3 // >= 3 sort keys -> offload to worker

export function GridHeader() {
  const [sorts, setSorts] = useState<SortSpec[]>(viewPool.getSorts())

  const apply = (next: SortSpec[]) => {
    setSorts(next)
    if (next.length >= WORKER_THRESHOLD) {
      // Keep current order on screen, compute heavy sort off-thread.
      viewPool.setSort(next) // sets spec; main-thread pass gives an immediate result
      workerBridge.sortOffloaded(next) // refines via worker (stale-then-fresh)
    } else {
      viewPool.setSort(next)
    }
  }

  const handleClick = (field: SortableField, e: React.MouseEvent) => {
    const existingIdx = sorts.findIndex((s) => s.field === field)

    if (e.shiftKey) {
      // append / toggle within multi-spec
      if (existingIdx === -1) {
        apply([...sorts, { field, dir: 'asc' }])
      } else {
        const copy = sorts.slice()
        const cur = copy[existingIdx]
        if (cur.dir === 'asc') {
          copy[existingIdx] = { field, dir: 'desc' }
        } else {
          copy.splice(existingIdx, 1) // third shift-click removes the key
        }
        apply(copy)
      }
      return
    }

    // plain click: replace
    let dir: SortDir = 'asc'
    if (existingIdx !== -1 && sorts.length === 1 && sorts[0].dir === 'asc') dir = 'desc'
    apply([{ field, dir }])
  }

  return (
    <div
      className="vrow sticky top-0 z-10 select-none border-b border-base-500 bg-base-800 font-semibold text-accent-soft"
      style={{ gridTemplateColumns: GRID_TEMPLATE, height: ROW_HEIGHT }}
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
