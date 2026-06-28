/// <reference lib="webworker" />
/**
 * ===========================================================================
 *  FUZZY SEARCH WORKER  (Feature 10)
 * ===========================================================================
 *  Token-based, out-of-order, case-insensitive partial substring matching over
 *  four target fields. Runs off the main thread so the 60fps paint loop is
 *  never blocked. Not Levenshtein (overkill + slow); per spec, token order does
 *  not matter and partial substrings count.
 */

export interface SearchRecord {
  uid: string
  haystack: string // pre-lowercased concatenation of searchable fields
}

interface SearchRequest {
  type: 'search'
  query: string
  records: SearchRecord[]
}

self.onmessage = (e: MessageEvent<SearchRequest>) => {
  const { query, records } = e.data
  const q = query.trim().toLowerCase()

  if (!q) {
    // Empty query => signal "all pass" with a null sentinel.
    ;(self as unknown as Worker).postMessage({ type: 'result', uids: null, query })
    return
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const matched: string[] = []

  for (let i = 0; i < records.length; i++) {
    const hay = records[i].haystack
    let ok = true
    for (let t = 0; t < tokens.length; t++) {
      if (hay.indexOf(tokens[t]) === -1) {
        ok = false
        break
      }
    }
    if (ok) matched.push(records[i].uid)
  }

  ;(self as unknown as Worker).postMessage({ type: 'result', uids: matched, query })
}
