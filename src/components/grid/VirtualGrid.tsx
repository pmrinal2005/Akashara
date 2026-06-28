import { useEffect, useLayoutEffect, useRef } from 'react'
import { store, viewPool } from '../../core/engine'
import { inspectorStore } from '../../core/InspectorStore'
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
  if (status === 'Failed') return 'pill pill-failed'
  if (status === 'Cancelled') return 'pill pill-failed'
  return 'pill pill-planned'
}

export function VirtualGrid() {
  const viewportRef = useRef<HTMLDivElement>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)

  const slotsRef = useRef<Slot[]>([])
  const firstVisibleRef = useRef(0)
  const orderRef = useRef<string[]>([])
  const rafScrollRef = useRef<number | null>(null)
  const slotByUid = useRef<Map<string, number>>(new Map())

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const windowEl = windowRef.current
    if (!viewport || !windowEl) return

    const buildPool = () => {
      const visibleRows = Math.max(1, Math.ceil(viewport.clientHeight / ROW_HEIGHT))
      const poolSize = visibleRows + OVERSCAN
      if (slotsRef.current.length >= poolSize) return

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

    let resizeRaf = 0
    const ro = new ResizeObserver(() => {
      if (resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        buildPool()
        paint(true)
      })
    })
    ro.observe(viewport)

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const rowEl = target.closest('.vrow') as HTMLDivElement | null
      if (!rowEl) return
      const uid = rowEl.dataset.uid
      if (!uid) return
      inspectorStore.open(uid)
    }
    windowEl.addEventListener('click', onClick)

    return () => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      ro.disconnect()
      windowEl.removeEventListener('click', onClick)
      windowEl.replaceChildren()
      slotsRef.current = []
      slotByUid.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    const samePosition = !force && first === firstVisibleRef.current
    firstVisibleRef.current = first

    windowEl.style.transform = `translateY(${first * ROW_HEIGHT}px)`

    if (!samePosition || force) {
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
  }

  const fillSlot = (slot: Slot, row: RpaRow, full: boolean) => {
    slot.uid = row.internal_uid
    slot.el.dataset.uid = row.internal_uid
    const cells = slot.cells
    for (let c = 0; c < COLUMNS.length; c++) {
      const col = COLUMNS[c]
      if (col.field === 'project_status') {
        const span = cells[c]
        const want = row.project_status
        if (span.dataset.v !== want) {
          span.dataset.v = want
          span.innerHTML = `<span class="${statusPillClass(want)}">${escapeHtml(want)}</span>`
        }
        continue
      }
      const text = col.render(row)
      const span = cells[c]
      if (full || span.textContent !== text) {
        span.textContent = text
      }
    }
    if (row._alert) {
      if (slot.el.getAttribute('data-alert') !== row._alert) {
        slot.el.setAttribute('data-alert', row._alert)
      }
    } else if (slot.el.hasAttribute('data-alert')) {
      slot.el.removeAttribute('data-alert')
    }
  }

  useEffect(() => {
    const unsubView = viewPool.subscribe(() => {
      orderRef.current = viewPool.getOrder()
      paint(true)
    })

    const unsubFlush = store.subscribeFlush((dirty) => {
      const slots = slotsRef.current
      dirty.forEach((uid) => {
        const slotIndex = slotByUid.current.get(uid)
        if (slotIndex === undefined) return
        const row = store.getRow(uid)
        if (!row) return
        const slot = slots[slotIndex]
        fillSlot(slot, row, false)
      })
    })

    orderRef.current = viewPool.getOrder()
    paint(true)

    return () => {
      unsubView()
      unsubFlush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScroll = () => {
    const viewport = viewportRef.current
    const headerScroll = headerScrollRef.current
    if (viewport && headerScroll) {
      headerScroll.scrollLeft = viewport.scrollLeft
    }
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
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div
        ref={headerScrollRef}
        className="min-w-0 overflow-x-hidden border-b border-white/10"
      >
        <div style={{ minWidth: 1180 }}>
          <GridHeader />
        </div>
      </div>
      <div
        ref={viewportRef}
        className="vgrid-viewport flex-1 min-w-0"
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
