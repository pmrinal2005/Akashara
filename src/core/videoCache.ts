/**
 * videoCache.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Aggressive, parallel video pre-warmer for the cinematic landing page.
 *
 * WHY:
 *   The landing page stitches 7 background MP4s (~5 MB each). When each
 *   <video> tag mounts and only then starts fetching its source, the user
 *   sees black frames every time they scroll into a new section. The original
 *   build relied on `preload="metadata"`, which is not enough to begin
 *   playback instantly.
 *
 * HOW:
 *   At app boot, we kick off `fetch()` for every clip in parallel. Each
 *   response is read fully and stored as an in-memory Blob, then exposed via
 *   a `URL.createObjectURL(blob)`. Once a blob URL is ready, subsequent
 *   <video> elements that point at the same logical src receive an instant
 *   handoff — no further network round-trips, no chunked range requests.
 *
 *   Hero video is fetched with the highest priority (it sits above the fold);
 *   the rest are warmed up immediately after, but they do not block the
 *   landing shell from painting.
 *
 *   Same-origin assets are downloaded with `fetch()`. If a source is
 *   cross-origin and CORS blocks the body read, we gracefully fall back to
 *   the raw URL — the original <video> tag will still play, just without
 *   the instant-blob handoff.
 */

type CacheEntry = {
  /** The original src the caller asked for. */
  originalSrc: string
  /** A blob URL once ready, otherwise the original src. */
  resolvedSrc: string
  /** Resolves when the blob URL is available (or when fallback is decided). */
  ready: Promise<string>
  /** True when the blob URL has been materialised. */
  isBlob: boolean
}

const cache = new Map<string, CacheEntry>()

function isLikelyCrossOrigin(src: string): boolean {
  if (typeof window === 'undefined') return true
  if (src.startsWith('/') || src.startsWith('./')) return false
  try {
    const u = new URL(src, window.location.href)
    return u.origin !== window.location.origin
  } catch {
    return false
  }
}

/**
 * Begin warming a single video. Idempotent: repeated calls for the same src
 * return the same Promise.
 */
export function warmVideo(src: string, priority: 'high' | 'auto' = 'auto'): Promise<string> {
  const existing = cache.get(src)
  if (existing) return existing.ready

  const fallbackEntry: CacheEntry = {
    originalSrc: src,
    resolvedSrc: src,
    isBlob: false,
    // Will be replaced below
    ready: Promise.resolve(src),
  }

  const readyPromise = (async () => {
    try {
      // `fetchpriority` is a Chromium-supported hint; supplying it via an
      // `as any` is benign elsewhere.
      const init: RequestInit & { priority?: 'high' | 'auto' | 'low' } = {
        method: 'GET',
        credentials: 'omit',
        cache: 'force-cache',
        priority,
      }

      // For cross-origin assets we still TRY fetch() — if the server sends
      // permissive CORS headers (e.g. CloudFront), great. If not, we catch
      // below and fall back to the raw URL.
      if (isLikelyCrossOrigin(src)) {
        init.mode = 'cors'
      }

      const response = await fetch(src, init)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)

      // Patch the entry in place (callers may already hold the reference).
      const entry = cache.get(src)
      if (entry) {
        entry.resolvedSrc = blobUrl
        entry.isBlob = true
      }
      return blobUrl
    } catch {
      // CORS or network failure — gracefully fall back to the raw URL. The
      // <video> will simply load from the network on demand, exactly as it
      // did before the cache existed.
      return src
    }
  })()

  fallbackEntry.ready = readyPromise
  cache.set(src, fallbackEntry)
  return readyPromise
}

/**
 * Kick off parallel warming for a list of clips. The first entry is treated
 * as the above-the-fold hero and gets `fetchpriority: high`; the rest get
 * `auto`. Returns the hero's ready-promise so callers can gate their loader
 * exclusively on the hero (other clips can finish later, in the background).
 */
export function warmAll(sources: string[]): Promise<string> {
  if (sources.length === 0) return Promise.resolve('')
  const [hero, ...rest] = sources
  const heroReady = warmVideo(hero, 'high')
  // Fire-and-forget the rest in parallel — do not await.
  rest.forEach((src) => {
    warmVideo(src, 'auto')
  })
  return heroReady
}

/**
 * Synchronously read the current resolved src for a given input (blob URL if
 * ready, otherwise the original src). Useful for the very first paint when we
 * don't want to suspend on a Promise.
 */
export function peekResolvedSrc(src: string): string {
  const entry = cache.get(src)
  return entry?.resolvedSrc ?? src
}

/**
 * Subscribe to the ready event for a particular src. Resolves to the final
 * resolvedSrc (blob or fallback). Mirrors warmVideo but does not initiate the
 * warm if it hasn't started — useful for components that simply want to know
 * when a previously kicked-off warm has completed.
 */
export function whenReady(src: string): Promise<string> {
  const entry = cache.get(src)
  if (entry) return entry.ready
  // No warm was ever requested; start one now so the consumer doesn't stall.
  return warmVideo(src, 'auto')
}

/**
 * Release all blob URLs. Called by the landing page on unmount as a courtesy
 * — modern browsers handle the GC automatically, but it keeps DevTools clean.
 */
export function dropAll(): void {
  cache.forEach((entry) => {
    if (entry.isBlob) {
      try {
        URL.revokeObjectURL(entry.resolvedSrc)
      } catch {
        // ignore
      }
    }
  })
  cache.clear()
}
