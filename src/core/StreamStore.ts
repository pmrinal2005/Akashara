/**
 * ===========================================================================
 *  STREAM STORE  — the single source of truth
 * ===========================================================================
 *  A plain TypeScript class held OUTSIDE React. It owns every row in a
 *  Map<internal_uid, RpaRow> for O(1) upsert and reference stability.
 *
 *  Decoupling doctrine: the 200ms firehose mutates rows in place and records
 *  dirty uids, but subscriber notification is FLUSHED on the next
 *  requestAnimationFrame — never inside the ingest callback. This separates the
 *  ingest cadence from the paint cadence.
 */

import { coerceRow } from './Sanitizer'
import { KpiAggregator } from './KpiAggregator'
import type { KpiSnapshot, RawIncomingRow, RpaRow } from './types'

type FlushListener = (dirty: ReadonlySet<string>) => void

export class StreamStore {
  /** uid -> canonical row. Mutated in place; references stay stable. */
  readonly rows = new Map<string, RpaRow>()

  /** uids changed since the last flush. Cleared every flush. */
  private dirty = new Set<string>()

  private kpi = new KpiAggregator()
  private flushListeners = new Set<FlushListener>()
  private kpiListeners = new Set<() => void>()

  private tick = 0
  private totalTicks = 0
  private rafHandle: number | null = null
  private needsFlush = false

  // Rows-per-second telemetry (rolling 1s window).
  private rowsThisSecond = 0
  private rowsPerSec = 0
  private secondTimer: ReturnType<typeof setInterval> | null = null

  // Cached immutable KPI snapshot; replaced only when values change so
  // useSyncExternalStore can rely on reference equality.
  private kpiCache: KpiSnapshot = this.computeKpi()

  constructor() {
    this.secondTimer = setInterval(() => {
      this.rowsPerSec = this.rowsThisSecond
      this.rowsThisSecond = 0
      this.bumpKpi()
    }, 1000)
  }

  /* --------------------------- ingestion -------------------------------- */

  /**
   * Upsert a batch coming from the firehose (already past the BufferQueue).
   * Mutates existing row objects in place to preserve references.
   */
  upsertBatch(batch: RawIncomingRow[]): void {
    this.tick += 1
    this.totalTicks += 1
    this.rowsThisSecond += batch.length

    for (let i = 0; i < batch.length; i++) {
      const raw = batch[i]
      const uid = raw.internal_uid
      if (!uid) continue

      const prev = this.rows.get(uid)

      if (!prev) {
        // Brand new row: coerce, store, register as a fresh aggregate.
        const fresh = coerceRow(raw, undefined, this.tick)
        fresh._alertAt = fresh._alert ? performance.now() : 0
        this.rows.set(uid, fresh)
        this.kpi.applyDelta(fresh, undefined)
        this.dirty.add(uid)
        continue
      }

      // Existing row: capture a cheap pre-image of the fields the KPI cares
      // about BEFORE mutating, so the delta is computed against accurate
      // previous values. Then mutate the existing object in place to keep its
      // reference stable for any recycler slot holding it.
      const preImage: RpaRow = {
        ...prev,
      }
      const next = coerceRow(raw, prev, this.tick)
      next._alertAt = next._alert ? performance.now() : 0
      Object.assign(prev, next)
      this.kpi.applyDelta(prev, preImage)
      this.dirty.add(uid)
    }

    this.needsFlush = true
    this.scheduleFlush()
  }

  /* ---------------------------- flushing -------------------------------- */

  private scheduleFlush(): void {
    if (this.rafHandle !== null) return
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null
      if (!this.needsFlush) return
      this.needsFlush = false
      this.flush()
    })
  }

  private flush(): void {
    const dirtySnapshot = this.dirty
    this.dirty = new Set<string>()
    // Notify view listeners with the set of changed uids.
    this.flushListeners.forEach((fn) => fn(dirtySnapshot))
    this.bumpKpi()
  }

  /* ------------------------------ KPI ----------------------------------- */

  private computeKpi(): KpiSnapshot {
    return {
      totalRows: this.kpi.totalRows,
      totalRobots: this.kpi.totalRobots,
      totalSavings: this.kpi.totalSavings,
      avgRoi: this.kpi.avgRoi,
      totalTicks: this.totalTicks,
      activeAlerts: this.kpi.alerts,
      rowsPerSec: this.rowsPerSec,
    }
  }

  private bumpKpi(): void {
    this.kpiCache = this.computeKpi()
    this.kpiListeners.forEach((fn) => fn())
  }

  getKpiSnapshot = (): KpiSnapshot => this.kpiCache

  subscribeKpi = (fn: () => void): (() => void) => {
    this.kpiListeners.add(fn)
    return () => this.kpiListeners.delete(fn)
  }

  /* --------------------------- view wiring ------------------------------ */

  subscribeFlush(fn: FlushListener): () => void {
    this.flushListeners.add(fn)
    return () => this.flushListeners.delete(fn)
  }

  getRow(uid: string): RpaRow | undefined {
    return this.rows.get(uid)
  }

  get size(): number {
    return this.rows.size
  }

  expireAlert(uid: string): void {
    const row = this.rows.get(uid)
    if (row && row._alert) {
      row._alert = null
      this.kpi.clearOneAlert()
    }
  }

  /** Teardown — clears timers to avoid leaks (memory hygiene). */
  destroy(): void {
    if (this.secondTimer) clearInterval(this.secondTimer)
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle)
    this.flushListeners.clear()
    this.kpiListeners.clear()
    this.rows.clear()
  }
}
