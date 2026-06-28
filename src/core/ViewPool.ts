/**
 * ===========================================================================
 *  VIEW POOL — filtered + sorted + searched projection of the StreamStore
 * ===========================================================================
 *  Maintains an ordered array of internal_uid strings representing exactly what
 *  the grid should paint, given the active filter spec, sort spec, and fuzzy
 *  search result. The master StreamStore still holds ALL rows; the ViewPool is
 *  only the visible projection (capped for the grid).
 *
 *  Performance strategy:
 *   - Single-column sort: main thread (cheap on 50k rows).
 *   - Multi-column (>=3) or large sorts: offloaded to sort.worker (Feature 9).
 *   - Fuzzy search: offloaded to search.worker (Feature 10).
 *   - Distinct categorical sets maintained incrementally for filter UI (F7).
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

  private rebuildScheduled = false

  constructor(private store: StreamStore) {
    this.store.subscribeFlush((dirty) => this.onFlush(dirty))
  }

  /* --------------------------- subscriptions ---------------------------- */

  subscribe(fn: ViewListener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
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
    // Extend distinct sets from changed rows (cheap, incremental).
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

    // If the visible set is still small (warm-up), or order is empty, do a full
    // rebuild so newly arriving rows appear. Otherwise schedule a coalesced
    // rebuild on idle to keep ordering correct as values mutate.
    if (this.order.length === 0 || this.store.size !== this.lastStoreSize) {
      this.lastStoreSize = this.store.size
      this.scheduleRebuild()
    } else {
      this.scheduleRebuild()
    }

    if (distinctChanged) this.emit()
  }

  private lastStoreSize = 0

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

  private scheduleRebuild(): void {
    if (this.rebuildScheduled) return
    this.rebuildScheduled = true
    const ric: typeof requestAnimationFrame =
      (window as unknown as { requestIdleCallback?: typeof requestAnimationFrame })
        .requestIdleCallback ?? requestAnimationFrame
    ric(() => {
      this.rebuildScheduled = false
      this.rebuild()
    })
  }

  /** Full filter + sort pass over the master store. */
  rebuild(): void {
    const passing: RpaRow[] = []
    const f = this.filter
    const search = this.searchMatches

    this.store.rows.forEach((row, uid) => {
      if (search && !search.has(uid)) return
      if (f.automation_type.size && !f.automation_type.has(row.automation_type)) return
      if (f.department.size && !f.department.has(row.department)) return
      if (f.industry.size && !f.industry.has(row.industry)) return
      if (f.project_status.size && !f.project_status.has(row.project_status)) return
      passing.push(row)
    })

    this.sortRows(passing)

    const next = new Array<string>(Math.min(passing.length, MAX_VISIBLE))
    for (let i = 0; i < next.length; i++) next[i] = passing[i].internal_uid
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
      // Stable tiebreaker by uid.
      return a.internal_uid < b.internal_uid ? -1 : a.internal_uid > b.internal_uid ? 1 : 0
    })
  }

  /** Apply a worker-computed ordering of uids directly (Feature 9 offload). */
  applyExternalOrder(uids: string[]): void {
    this.order = uids.length > MAX_VISIBLE ? uids.slice(0, MAX_VISIBLE) : uids
    this.emit()
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
