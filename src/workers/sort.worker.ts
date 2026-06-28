/// <reference lib="webworker" />
/**
 * ===========================================================================
 *  MULTI-COLUMN SORT WORKER  (Feature 9)
 * ===========================================================================
 *  Receives a flat columnar payload of the currently-filtered rows plus a
 *  multi-key sort spec, performs a stable multi-column sort off the main
 *  thread, and returns the ordered uid array. Used when sort spec has >= 3
 *  columns or the filtered set is large, keeping the main thread responsive
 *  while the firehose keeps ingesting.
 */

export interface SortField {
  field: string
  dir: 'asc' | 'desc'
  numeric: boolean
}

export interface SortRecord {
  uid: string
  // Each searchable/sortable value keyed by field name.
  values: Record<string, string | number>
}

interface SortRequest {
  type: 'sort'
  records: SortRecord[]
  sorts: SortField[]
  token: number
}

self.onmessage = (e: MessageEvent<SortRequest>) => {
  const { records, sorts, token } = e.data

  records.sort((a, b) => {
    for (let s = 0; s < sorts.length; s++) {
      const { field, dir, numeric } = sorts[s]
      const av = a.values[field]
      const bv = b.values[field]
      let cmp: number
      if (numeric) {
        cmp = (av as number) - (bv as number)
      } else {
        const as = String(av)
        const bs = String(bv)
        cmp = as < bs ? -1 : as > bs ? 1 : 0
      }
      if (cmp !== 0) return dir === 'asc' ? cmp : -cmp
    }
    return a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0
  })

  const uids = new Array<string>(records.length)
  for (let i = 0; i < records.length; i++) uids[i] = records[i].uid

  ;(self as unknown as Worker).postMessage({ type: 'sorted', uids, token })
}
