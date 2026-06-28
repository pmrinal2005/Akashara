/**
 * ===========================================================================
 *  WORKER BRIDGE — manages the search & sort web workers.
 * ===========================================================================
 *  Owns worker lifecycle, debouncing, and result routing back to the ViewPool.
 *  Workers are created lazily and reused. All listeners are torn down on
 *  destroy() to avoid leaks.
 */

import SearchWorker from '../workers/search.worker.ts?worker'
import SortWorker from '../workers/sort.worker.ts?worker'
import type { SearchRecord } from '../workers/search.worker'
import type { SortField, SortRecord } from '../workers/sort.worker'
import { store } from './engine'
import { viewPool } from './engine'
import type { SortSpec } from './types'
import { isNumericField } from './types'

const SEARCH_FIELDS = ['project_name', 'department', 'automation_type', 'industry'] as const

export class WorkerBridge {
  private searchWorker: Worker
  private sortWorker: Worker
  private searchDebounce: ReturnType<typeof setTimeout> | null = null
  private sortToken = 0

  constructor() {
    this.searchWorker = new SearchWorker()
    this.sortWorker = new SortWorker()

    this.searchWorker.onmessage = (
      e: MessageEvent<{ type: string; uids: string[] | null; query: string }>,
    ) => {
      if (e.data.type !== 'result') return
      const set = e.data.uids === null ? null : new Set(e.data.uids)
      viewPool.setSearchResult(set, e.data.query)
    }

    this.sortWorker.onmessage = (
      e: MessageEvent<{ type: string; uids: string[]; token: number }>,
    ) => {
      if (e.data.type !== 'sorted') return
      if (e.data.token !== this.sortToken) return // stale result, ignore
      viewPool.applyExternalOrder(e.data.uids)
    }
  }

  /* ----------------------------- search --------------------------------- */

  search(query: string): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce)
    this.searchDebounce = setTimeout(() => {
      const records: SearchRecord[] = []
      store.rows.forEach((row, uid) => {
        const hay = (
          row.project_name +
          ' ' +
          row.department +
          ' ' +
          row.automation_type +
          ' ' +
          row.industry +
          ' ' +
          row.country +
          ' ' +
          row.project_id
        ).toLowerCase()
        records.push({ uid, haystack: hay })
      })
      this.searchWorker.postMessage({ type: 'search', query, records })
    }, 120)
  }

  /* ------------------------------ sort ---------------------------------- */

  /** Offload a heavy multi-column sort. Operates over the current view order. */
  sortOffloaded(sorts: SortSpec[]): void {
    this.sortToken += 1
    const token = this.sortToken
    const sortFields: SortField[] = sorts.map((s) => ({
      field: s.field,
      dir: s.dir,
      numeric: isNumericField(s.field),
    }))

    // Build columnar records from the currently visible (filtered) order.
    const order = viewPool.getOrder()
    const records: SortRecord[] = []
    for (let i = 0; i < order.length; i++) {
      const row = store.getRow(order[i])
      if (!row) continue
      const values: Record<string, string | number> = {}
      for (let s = 0; s < sorts.length; s++) {
        const f = sorts[s].field
        values[f] = row[f] as string | number
      }
      records.push({ uid: order[i], values })
    }
    this.sortWorker.postMessage({ type: 'sort', records, sorts: sortFields, token })
  }

  destroy(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce)
    this.searchWorker.terminate()
    this.sortWorker.terminate()
  }
}

export const workerBridge = new WorkerBridge()
export { SEARCH_FIELDS }
