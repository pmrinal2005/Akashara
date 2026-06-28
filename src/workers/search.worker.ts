/// <reference lib="webworker" />
/**
 * ===========================================================================
 *  FUZZY SEARCH WORKER  (Feature 10)
 * ===========================================================================
 *  Token-based, out-of-order, case-insensitive partial substring matching over
 *  the concatenated searchable haystack for each row. Runs off the main thread
 *  so the 60fps paint loop is never blocked.
 *
 *  ─── PHASE-2 ARCHITECTURE FIX ─────────────────────────────────────────────
 *  Previously the main thread re-shipped the ENTIRE 50K-row haystack on every
 *  search → ~4 MB of garbage per keystroke. Now the worker holds a persistent
 *  haystack array; the main thread sends an `append` delta when new rows land
 *  and only a tiny `search` query payload on each keystroke.
 */

export interface SearchRecord {
  uid: string
  haystack: string // pre-lowercased concatenation of searchable fields
}

type IncomingMessage =
  | { type: 'append'; records: SearchRecord[] }
  | { type: 'search'; query: string; token: number }
  | { type: 'clear' }

/** Persistent worker-side haystack. */
const haystacks: SearchRecord[] = []

self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data

  if (msg.type === 'append') {
    // Append new records to the persistent buffer (no copying, no realloc burst).
    for (let i = 0; i < msg.records.length; i++) {
      haystacks.push(msg.records[i])
    }
    return
  }

  if (msg.type === 'clear') {
    haystacks.length = 0
    return
  }

  if (msg.type !== 'search') return

  const q = msg.query.trim().toLowerCase()
  if (!q) {
    ;(self as unknown as Worker).postMessage({
      type: 'result',
      uids: null,
      query: msg.query,
      token: msg.token,
    })
    return
  }

  const tokens = q.split(/\s+/).filter(Boolean)
  const tlen = tokens.length
  const matched: string[] = []

  // Tight loops, indexOf rather than regex — the hot path.
  for (let i = 0; i < haystacks.length; i++) {
    const hay = haystacks[i].haystack
    let ok = true
    for (let t = 0; t < tlen; t++) {
      if (hay.indexOf(tokens[t]) === -1) {
        ok = false
        break
      }
    }
    if (ok) matched.push(haystacks[i].uid)
  }

  ;(self as unknown as Worker).postMessage({
    type: 'result',
    uids: matched,
    query: msg.query,
    token: msg.token,
  })
}
