/**
 * ===========================================================================
 *  KPI AGGREGATOR  (Feature 1 — KPI Dashboard)
 * ===========================================================================
 *  Maintains running aggregates incrementally (O(1) per upsert via deltas),
 *  never by scanning the full store on every tick. This is what keeps the KPI
 *  strip cheap under a 200ms firehose touching up to 50 rows/tick.
 */

import type { RpaRow } from './types'

export class KpiAggregator {
  private rowCount = 0
  private sumRobots = 0
  private sumSavings = 0
  private sumRoi = 0
  private activeAlerts = 0

  /** Apply the difference between a new row and its previous version. */
  applyDelta(next: RpaRow, prev?: RpaRow): void {
    if (!prev) {
      this.rowCount += 1
      this.sumRobots += next.robots_deployed
      this.sumSavings += next.annual_savings_usd
      this.sumRoi += next.roi_percent
      if (next._alert) this.activeAlerts += 1
      return
    }
    this.sumRobots += next.robots_deployed - prev.robots_deployed
    this.sumSavings += next.annual_savings_usd - prev.annual_savings_usd
    this.sumRoi += next.roi_percent - prev.roi_percent

    const wasAlert = prev._alert ? 1 : 0
    const isAlert = next._alert ? 1 : 0
    this.activeAlerts += isAlert - wasAlert
  }

  /** Called when an alert auto-expires (CSS flash done) to keep count honest. */
  clearOneAlert(): void {
    if (this.activeAlerts > 0) this.activeAlerts -= 1
  }

  get totalRows(): number {
    return this.rowCount
  }
  get totalRobots(): number {
    return this.sumRobots
  }
  get totalSavings(): number {
    return this.sumSavings
  }
  get avgRoi(): number {
    return this.rowCount === 0 ? 0 : this.sumRoi / this.rowCount
  }
  get alerts(): number {
    return Math.max(0, this.activeAlerts)
  }
}
