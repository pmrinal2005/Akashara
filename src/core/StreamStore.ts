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
 *
 *  ─── PHASE-2 FIXES ────────────────────────────────────────────────────────
 *   • ALERT AUTO-EXPIRY: previously, once a row was tagged with `_alert` the
 *     flag stuck forever because subsequent ticks never cleared it, causing the
 *     "Active Alerts" KPI to climb monotonically (visible on the live deploy
 *     as `3,056` — the entire row count). Fixed: an animation-driven sweep
 *     drops expired alerts and decrements the aggregator in O(1).
 *   • DESTROY hygiene: cleared both `secondTimer` AND the alert-sweep timer.
 */

import { coerceRow } from './Sanitizer'
import { KpiAggregator } from './KpiAggregator'
import type { KpiSnapshot, RawIncomingRow, RpaRow } from './types'

type FlushListener = (dirty: ReadonlySet<string>) => void

/** How long (ms) an alert flash stays visible before we sweep it away. */
const ALERT_TTL_MS = 2600
/** How often we sweep expired alerts (cheap pass, only over tagged uids). */
const ALERT_SWEEP_MS = 1000

export class StreamStore {
  /** uid -> canonical row. Mutated in place; references stay stable. */
  readonly rows = new Map<string, RpaRow>()

  /** uids changed since the last flush. Cleared every flush. */
  private dirty = new Set<string>()

  /** uids currently tagged with an alert (for cheap expiry sweeps). */
  private alertUids = new Set<string>()

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
  private alertSweepTimer: ReturnType<typeof setInterval> | null = null

  // Cached immutable KPI snapshot; replaced only when values change so
  // useSyncExternalStore can rely on reference equality.
  private kpiCache: KpiSnapshot = this.computeKpi()

  constructor() {
    this.secondTimer = setInterval(() => {
      this.rowsPerSec = this.rowsThisSecond
      this.rowsThisSecond = 0
      this.bumpKpi()
    }, 1000)

    this.alertSweepTimer = setInterval(() => this.sweepExpiredAlerts(), ALERT_SWEEP_MS)
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
        const fresh = coerceRow(raw, undefined, this.tick)
        fresh._alertAt = fresh._alert ? performance.now() : 0
        this.rows.set(uid, fresh)
        this.kpi.applyDelta(fresh, undefined)
        if (fresh._alert) this.alertUids.add(uid)
        this.dirty.add(uid)
        continue
      }

      // Cheap pre-image of KPI-relevant fields BEFORE mutation.
      const preImage: RpaRow = { ...prev }
      const next = coerceRow(raw, prev, this.tick)
      next._alertAt = next._alert ? performance.now() : 0
      Object.assign(prev, next)
      this.kpi.applyDelta(prev, preImage)
      if (prev._alert) this.alertUids.add(uid)
      else this.alertUids.delete(uid)
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
    this.flushListeners.forEach((fn) => fn(dirtySnapshot))
    this.bumpKpi()
  }

  /* ----------------------- alert auto-expiry ---------------------------- */

  /**
   * Sweep alerts older than ALERT_TTL_MS. Touches only `alertUids` (small set),
   * so this stays O(active_alerts), never O(N). The CSS animation has already
   * faded — this just drops the in-memory flag so the KPI counter is honest.
   */
  private sweepExpiredAlerts(): void {
    if (this.alertUids.size === 0) return
    const now = performance.now()
    let cleared = 0
    const expired: string[] = []
    this.alertUids.forEach((uid) => {
      const row = this.rows.get(uid)
      if (!row || !row._alert) {
        expired.push(uid)
        return
      }
      if (now - row._alertAt >= ALERT_TTL_MS) {
        row._alert = null
        row._alertAt = 0
        this.kpi.clearOneAlert()
        cleared += 1
        expired.push(uid)
      }
    })
    for (let i = 0; i < expired.length; i++) this.alertUids.delete(expired[i])
    if (cleared > 0) this.bumpKpi()
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
    return () => {
      this.kpiListeners.delete(fn)
    }
  }

  /* --------------------------- view wiring ------------------------------ */

  subscribeFlush(fn: FlushListener): () => void {
    this.flushListeners.add(fn)
    return () => {
      this.flushListeners.delete(fn)
    }
  }

  getRow(uid: string): RpaRow | undefined {
    return this.rows.get(uid)
  }

  get size(): number {
    return this.rows.size
  }

  /** Public expiry hook (kept for compatibility — used by CSS animationend). */
  expireAlert(uid: string): void {
    const row = this.rows.get(uid)
    if (row && row._alert) {
      row._alert = null
      this.alertUids.delete(uid)
      this.kpi.clearOneAlert()
    }
  }

  /** Teardown — clears timers to avoid leaks (memory hygiene). */
  destroy(): void {
    if (this.secondTimer) clearInterval(this.secondTimer)
    if (this.alertSweepTimer) clearInterval(this.alertSweepTimer)
    if (this.rafHandle !== null) cancelAnimationFrame(this.rafHandle)
    this.secondTimer = null
    this.alertSweepTimer = null
    this.flushListeners.clear()
    this.kpiListeners.clear()
    this.rows.clear()
    this.alertUids.clear()
  }
}
