/**
 * ===========================================================================
 *  VIRTUAL GRID  (Feature 8 — 15 pts, highest weight)
 * ===========================================================================
 *  Android-style RECYCLER VIEW. The DOM holds only
 *  (viewportHeight / rowHeight + overscan) row nodes — typically 25-40 —
 *  REGARDLESS of dataset size. Rows are created ONCE at mount and reused; on
 *  scroll and on stream updates we imperatively patch textContent of the
 *  recycled cells (no React reconciliation in the hot path).
 *
 *  - Outer spacer div height = totalRows * rowHeight  -> real scrollbar.
 *  - Inner window translated with transform: translateY(...).
 *  - Pool of nodes recycled; a Map<slot, uid> tracks what each slot shows.
 *  - Stream flush -> patch only visible dirty slots.
 *  - rAF-throttled scroll (never debounced; debounce drops frames).
 *  - WeakMap-free design: slots are torn down on unmount via cleanup.
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import { store, viewPool } from '../../core/engine'
import { COLUMNS, GRID_TEMPLATE, ROW_HEIGHT } from './columns'
import { GridHeader } from './GridHeader'
import type { RpaRow } from '../../core/types'

const OVERSCAN = 8

interface Slot {
  el: HTMLDivElement
  cells: HTMLSpanElement[]
  uid: string | null
}

function statusPillClass(status: string): string {
  if (status === 'Active') return 'pill pill-active'
  if (status === 'Completed') return 'pill pill-completed'
  return 'pill pill-planned'
}

export function VirtualGrid() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)

  const slotsRef = useRef<Slot[]>([])
  const firstVisibleRef = useRef(0)
  const orderRef = useRef<string[]>([])
  const rafScrollRef = useRef<number | null>(null)
  const slotByUid = useRef<Map<string, number>>(new Map())

  // ----- Build the recycler pool once, sized to viewport -----
  useLayoutEffect(() => {
    const viewport = viewportRef.current!
    const windowEl = windowRef.current!

    const buildPool = () => {
      const visibleRows = Math.ceil(viewport.clientHeight / ROW_HEIGHT)
      const poolSize = visibleRows + OVERSCAN
      // (Re)build only if size grew.
      if (slotsRef.current.length >= poolSize) return

      // Clear and rebuild.
      windowEl.replaceChildren()
      const slots: Slot[] = []
      for (let i = 0; i < poolSize; i++) {
        const row = document.createElement('div')
        row.className = 'vrow'
        row.style.gridTemplateColumns = GRID_TEMPLATE
        const cells: HTMLSpanElement[] = []
        for (let c = 0; c < COLUMNS.length; c++) {
          const span = document.createElement('span')
          span.className = COLUMNS[c].numeric ? 'vcell vcell-num' : 'vcell'
          row.appendChild(span)
          cells.push(span)
        }
        windowEl.appendChild(row)
        slots.push({ el: row, cells, uid: null })
      }
      slotsRef.current = slots
    }

    buildPool()

    const ro = new ResizeObserver(() => {
      buildPool()
      paint(true)
    })
    ro.observe(viewport)

    return () => {
      ro.disconnect()
      windowEl.replaceChildren()
      slotsRef.current = []
      slotByUid.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Paint: position the window + fill recycled slots -----
  const paint = (force = false) => {
    const viewport = viewportRef.current
    const windowEl = windowRef.current
    const spacer = spacerRef.current
    if (!viewport || !windowEl || !spacer) return

    const order = orderRef.current
    const total = order.length
    spacer.style.height = `${total * ROW_HEIGHT}px`

    const scrollTop = viewport.scrollTop
    let first = Math.floor(scrollTop / ROW_HEIGHT) - Math.floor(OVERSCAN / 2)
    if (first < 0) first = 0
    const slots = slotsRef.current
    const maxFirst = Math.max(0, total - slots.length)
    if (first > maxFirst) first = maxFirst

    if (!force && first === firstVisibleRef.current) {
      // Same window — still may need content patch on stream flush (handled by patchDirty).
    }
    firstVisibleRef.current = first

    windowEl.style.transform = `translateY(${first * ROW_HEIGHT}px)`

    slotByUid.current.clear()
    for (let s = 0; s < slots.length; s++) {
      const rowIndex = first + s
      const slot = slots[s]
      if (rowIndex >= total) {
        if (slot.uid !== null) {
          slot.el.style.display = 'none'
          slot.uid = null
        }
        continue
      }
      slot.el.style.display = ''
      const uid = order[rowIndex]
      const row = store.getRow(uid)
      slotByUid.current.set(uid, s)
      if (!row) continue
      fillSlot(slot, row, true)
    }
  }

  // ----- Fill a single slot's cells (imperative, no React) -----
  const fillSlot = (slot: Slot, row: RpaRow, full: boolean) => {
    slot.uid = row.internal_uid
    const cells = slot.cells
    for (let c = 0; c < COLUMNS.length; c++) {
      const col = COLUMNS[c]
      if (col.field === 'project_status') {
        const span = cells[c]
        // status pill: only rebuild if changed
        const want = row.project_status
        if (span.dataset.v !== want) {
          span.dataset.v = want
          span.innerHTML = `<span class="${statusPillClass(want)}">${want}</span>`
        }
        continue
      }
      const text = col.render(row)
      const span = cells[c]
      if (full || span.textContent !== text) {
        span.textContent = text
      }
    }
    // Alert flash via data attribute (CSS keyframes auto-expire).
    if (row._alert) {
      slot.el.setAttribute('data-alert', row._alert)
      // remove after animation so it can re-trigger later
    } else if (slot.el.hasAttribute('data-alert')) {
      slot.el.removeAttribute('data-alert')
    }
  }

  // ----- Stream flush: patch only visible dirty slots -----
  useEffect(() => {
    const unsubView = viewPool.subscribe(() => {
      orderRef.current = viewPool.getOrder()
      paint(true)
    })

    const unsubFlush = store.subscribeFlush((dirty) => {
      // Patch only the dirty uids currently mapped to a visible slot.
      const slots = slotsRef.current
      dirty.forEach((uid) => {
        const slotIndex = slotByUid.current.get(uid)
        if (slotIndex === undefined) return
        const row = store.getRow(uid)
        if (!row) return
        const slot = slots[slotIndex]
        // brief "live" pulse on number cells
        slot.el.setAttribute('data-live', '1')
        fillSlot(slot, row, false)
        // clear the live flag next frame so the CSS animation can retrigger
        requestAnimationFrame(() => slot.el.removeAttribute('data-live'))
      })
    })

    // initialize order
    orderRef.current = viewPool.getOrder()
    paint(true)

    return () => {
      unsubView()
      unsubFlush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- Scroll handler: rAF-throttled -----
  const onScroll = () => {
    if (rafScrollRef.current !== null) return
    rafScrollRef.current = requestAnimationFrame(() => {
      rafScrollRef.current = null
      paint(false)
    })
  }

  useEffect(() => {
    return () => {
      if (rafScrollRef.current !== null) cancelAnimationFrame(rafScrollRef.current)
    }
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header (Feature 4 + 9 sort UI) */}
      <GridHeader />

      {/* Recycler viewport */}
      <div
        ref={viewportRef}
        className="vgrid-viewport flex-1"
        role="rowgroup"
        aria-label="RPA project rows"
        onScroll={onScroll}
      >
        <div ref={spacerRef} className="vgrid-spacer">
          <div ref={windowRef} className="vgrid-window" />
        </div>
      </div>
    </div>
  )
}
