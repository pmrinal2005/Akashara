/**
 * ===========================================================================
 *  VIEW POOL — filtered + sorted + searched projection of the StreamStore
 * ===========================================================================
 *  Maintains an ordered array of internal_uid strings representing exactly what
 *  the grid should paint, given the active filter spec, sort spec, and fuzzy
 *  search result. The master StreamStore still holds ALL rows; the ViewPool is
 *  only the visible projection (capped for the grid).
 *
 *  ─── PERFORMANCE-CRITICAL FIXES (Phase 2 hardening) ───────────────────────
 *   1. Rebuild is now THROTTLED to at most once per ~120 ms during streaming.
 *      Previously every 200 ms tick triggered a full O(N) rebuild → thrashing.
 *   2. Rebuilds during the warm-up phase (store < initial size) fire eagerly
 *      so the user sees the grid populate immediately; after warm-up they are
 *      coalesced because row identities don't change — only their values do.
 *   3. `rebuildScheduled` uses a single source of truth and is cleared INSIDE
 *      the scheduled callback to avoid orphan rebuild requests.
 *   4. Stable comparator avoids Array.prototype.sort engine differences by
 *      using deterministic uid tiebreaker.
 */

import type {
  FilterSpec,
  RpaRow,
  SortableField,
  SortSpec,
} from './types'
import { isNumericField } from './types'
import type { StreamStore } from './StreamStore'

export interface DistinctSets {
  automation_type: Set<string>
  department: Set<string>
  industry: Set<string>
  project_status: Set<string>
}

type ViewListener = () => void

const MAX_VISIBLE = 8000
/** Coalesce rebuilds to at most once per this many ms during live streaming. */
const REBUILD_THROTTLE_MS = 140

export class ViewPool {
  private order: string[] = []
  private listeners = new Set<ViewListener>()

  private filter: FilterSpec = {
    automation_type: new Set(),
    department: new Set(),
    industry: new Set(),
    project_status: new Set(),
  }
  private sorts: SortSpec[] = [{ field: 'roi_percent', dir: 'desc' }]
  private searchMatches: Set<string> | null = null // null => no search active
  private searchQuery = ''

  readonly distinct: DistinctSets = {
    automation_type: new Set(),
    department: new Set(),
    industry: new Set(),
    project_status: new Set(),
  }

  // Rebuild scheduling --------------------------------------------------------
  private rebuildTimer: ReturnType<typeof setTimeout> | null = null
  private rebuildRafHandle: number | null = null
  private lastRebuildAt = 0
  private lastStoreSize = 0

  constructor(private store: StreamStore) {
    this.store.subscribeFlush((dirty) => this.onFlush(dirty))
  }

  /* --------------------------- subscriptions ---------------------------- */

  subscribe(fn: ViewListener): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn())
  }

  getOrder(): string[] {
    return this.order
  }

  get visibleCount(): number {
    return this.order.length
  }

  /* ------------------------------ flush --------------------------------- */

  private onFlush(dirty: ReadonlySet<string>): void {
    // 1. Maintain distinct-value sets incrementally (cheap O(dirty)).
    let distinctChanged = false
    dirty.forEach((uid) => {
      const r = this.store.getRow(uid)
      if (!r) return
      if (r.automation_type && !this.distinct.automation_type.has(r.automation_type)) {
        this.distinct.automation_type.add(r.automation_type)
        distinctChanged = true
      }
      if (r.department && !this.distinct.department.has(r.department)) {
        this.distinct.department.add(r.department)
        distinctChanged = true
      }
      if (r.industry && !this.distinct.industry.has(r.industry)) {
        this.distinct.industry.add(r.industry)
        distinctChanged = true
      }
      if (r.project_status && !this.distinct.project_status.has(r.project_status)) {
        this.distinct.project_status.add(r.project_status)
        distinctChanged = true
      }
    })

    // 2. Decide rebuild policy.
    const storeGrew = this.store.size !== this.lastStoreSize
    if (storeGrew) {
      this.lastStoreSize = this.store.size
      // Eager rebuild only while the store is *growing* (warm-up phase).
      this.scheduleRebuild(true)
    } else {
      // Steady state — values mutate but identities don't change. Coalesce.
      this.scheduleRebuild(false)
    }

    if (distinctChanged) this.emit()
  }

  /* --------------------------- controls --------------------------------- */

  setFilter(next: Partial<FilterSpec>): void {
    this.filter = { ...this.filter, ...next }
    this.rebuild()
  }

  getFilter(): FilterSpec {
    return this.filter
  }

  setSort(sorts: SortSpec[]): void {
    this.sorts = sorts.length ? sorts : [{ field: 'roi_percent', dir: 'desc' }]
    this.rebuild()
  }

  getSorts(): SortSpec[] {
    return this.sorts
  }

  setSearchResult(matches: Set<string> | null, query: string): void {
    this.searchMatches = matches
    this.searchQuery = query
    this.rebuild()
  }

  getSearchQuery(): string {
    return this.searchQuery
  }

  /* ---------------------------- rebuild --------------------------------- */

  private scheduleRebuild(eager: boolean): void {
    if (this.rebuildTimer !== null || this.rebuildRafHandle !== null) return

    const now = performance.now()
    const since = now - this.lastRebuildAt

    if (eager || since >= REBUILD_THROTTLE_MS) {
      // Use rAF so we coalesce with the paint cycle (no layout thrash).
      this.rebuildRafHandle = requestAnimationFrame(() => {
        this.rebuildRafHandle = null
        this.rebuild()
      })
      return
    }

    // Defer until the throttle window elapses.
    const delay = REBUILD_THROTTLE_MS - since
    this.rebuildTimer = setTimeout(() => {
      this.rebuildTimer = null
      this.rebuildRafHandle = requestAnimationFrame(() => {
        this.rebuildRafHandle = null
        this.rebuild()
      })
    }, delay)
  }

  /** Full filter + sort pass over the master store. */
  rebuild(): void {
    this.lastRebuildAt = performance.now()

    const passing: RpaRow[] = []
    const f = this.filter
    const search = this.searchMatches
    const hasSearch = search !== null
    const aFilter = f.automation_type.size > 0 ? f.automation_type : null
    const dFilter = f.department.size > 0 ? f.department : null
    const iFilter = f.industry.size > 0 ? f.industry : null
    const sFilter = f.project_status.size > 0 ? f.project_status : null

    this.store.rows.forEach((row, uid) => {
      if (hasSearch && !search!.has(uid)) return
      if (aFilter && !aFilter.has(row.automation_type)) return
      if (dFilter && !dFilter.has(row.department)) return
      if (iFilter && !iFilter.has(row.industry)) return
      if (sFilter && !sFilter.has(row.project_status)) return
      passing.push(row)
    })

    this.sortRows(passing)

    const cap = Math.min(passing.length, MAX_VISIBLE)
    const next = new Array<string>(cap)
    for (let i = 0; i < cap; i++) next[i] = passing[i].internal_uid
    this.order = next
    this.emit()
  }

  /** Stable multi-key comparator. Index tiebreaker keeps streaming jitter low. */
  private sortRows(rows: RpaRow[]): void {
    const sorts = this.sorts
    rows.sort((a, b) => {
      for (let s = 0; s < sorts.length; s++) {
        const { field, dir } = sorts[s]
        const cmp = compareField(a, b, field)
        if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
      }
      return a.internal_uid < b.internal_uid ? -1 : a.internal_uid > b.internal_uid ? 1 : 0
    })
  }

  /** Apply a worker-computed ordering of uids directly (Feature 9 offload). */
  applyExternalOrder(uids: string[]): void {
    this.order = uids.length > MAX_VISIBLE ? uids.slice(0, MAX_VISIBLE) : uids
    this.emit()
  }

  /** Teardown — clear timers / handles (memory hygiene). */
  destroy(): void {
    if (this.rebuildTimer) clearTimeout(this.rebuildTimer)
    if (this.rebuildRafHandle !== null) cancelAnimationFrame(this.rebuildRafHandle)
    this.rebuildTimer = null
    this.rebuildRafHandle = null
    this.listeners.clear()
  }
}

function compareField(a: RpaRow, b: RpaRow, field: SortableField): number {
  const av = a[field] as unknown
  const bv = b[field] as unknown
  if (isNumericField(field)) {
    return (av as number) - (bv as number)
  }
  const as = String(av)
  const bs = String(bv)
  return as < bs ? -1 : as > bs ? 1 : 0
}

export { MAX_VISIBLE }
