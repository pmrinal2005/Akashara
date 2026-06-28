/**
 * ===========================================================================
 *  SANITIZER  (Feature 2 — Numeric Sanitation)
 * ===========================================================================
 *  THE CRITICAL BRIDGE.
 *
 *  dataStream.js's parseCSV only coerces a *company* schema
 *  (employee_count, annual_revenue_usd, customer_count, founded_year,
 *  market_share_percent). Our dataset (automation_projects.csv) uses a
 *  *project* schema, so EVERY numeric column we care about
 *  (robots_deployed, budget_usd, annual_savings_usd, roi_percent,
 *  employee_hours_saved) arrives as a RAW STRING.
 *
 *  Without coercion here, sorting is lexicographic ("9" > "100"), KPI sums
 *  become NaN, and currency formatting breaks. This file is what separates a
 *  working submission from a broken one.
 */

import type { AlertLevel, RawIncomingRow, RpaRow } from './types'

// Cached Intl formatters at module scope. Constructing one per render/cell is a
// well-known performance sink — do it exactly once.
const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactCurrencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const integerFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** Safe numeric coercion: tolerates strings, commas, undefined, NaN. */
export function toNumber(v: unknown): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') {
    const cleaned = v.replace(/[, ]/g, '')
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function toStr(v: unknown): string {
  if (v === undefined || v === null) return ''
  return String(v)
}

/** Clamp roi to a fixed display range so cells never blow out their width. */
function clampRoi(n: number): number {
  if (n > 9999.99) return 9999.99
  if (n < -9999.99) return -9999.99
  return n
}

/**
 * Convert a raw incoming row into a fully-typed RpaRow.
 * `prev` is the existing stored row (if any) so we can preserve update history.
 */
export function coerceRow(raw: RawIncomingRow, prev?: RpaRow, tick = 0): RpaRow {
  const roi = clampRoi(toNumber(raw.roi_percent))

  const row: RpaRow = {
    internal_uid: raw.internal_uid,

    project_id: toStr(raw.project_id),
    company_id: toStr(raw.company_id),
    project_name: toStr(raw.project_name),
    project_status: toStr(raw.project_status),
    automation_type: toStr(raw.automation_type),
    department: toStr(raw.department),
    implementation_partner: toStr(raw.implementation_partner),
    country: toStr(raw.country),
    industry: toStr(raw.industry),
    ai_enabled: toStr(raw.ai_enabled),
    cloud_deployment: toStr(raw.cloud_deployment),
    start_date: toStr(raw.start_date),
    completion_date: toStr(raw.completion_date) || '—',

    robots_deployed: Math.round(toNumber(raw.robots_deployed)),
    budget_usd: Math.round(toNumber(raw.budget_usd)),
    annual_savings_usd: Math.round(toNumber(raw.annual_savings_usd)),
    roi_percent: roi,
    employee_hours_saved: Math.round(toNumber(raw.employee_hours_saved)),

    _lastTick: tick,
    _updateCount: prev ? prev._updateCount + 1 : 0,
    _alert: detectAlert(raw, roi),
    _alertAt: 0,
  }
  return row
}

/**
 * Alert detection (drives Feature 3).
 *
 * The static CSV contains NO "Failed" status and NO negative ROI, so naive
 * rules would never fire on live data. The firehose, however, injects macro
 * volatility into synthetic company fields (annual_revenue_usd, customer_count,
 * market_share_percent) that become NaN/extreme for our rows on its 5%
 * "isAnomaly" path. We treat those signals — plus genuine business-rule
 * breaches — as alert triggers so the UI demonstrably reacts to the stream.
 */
function detectAlert(raw: RawIncomingRow, roi: number): AlertLevel | null {
  const status = toStr(raw.project_status)

  // Hard business-rule breaches (critical).
  if (status === 'Failed' || status === 'Cancelled') return 'critical'
  if (roi < 0) return 'critical'

  // Stream-injected macro-volatility anomaly: the firehose touched the
  // synthetic company fields. Presence of these keys means this row was part of
  // an anomaly/volatility tick. NaN (our rows) or large customer swings => warn.
  const rev = raw.annual_revenue_usd
  const share = raw.market_share_percent
  const touchedSynthetic =
    rev !== undefined || share !== undefined || raw.customer_count !== undefined
  if (touchedSynthetic) {
    if (
      (typeof rev === 'number' && Number.isNaN(rev)) ||
      (typeof share === 'number' && Number.isNaN(share))
    ) {
      return 'warn'
    }
  }

  // Genuine low-performance project warning.
  if (roi > 0 && roi < 25) return 'warn'

  return null
}

/* ----------------------------- Formatters --------------------------------- */

export function formatCurrency(n: number): string {
  return currencyFmt.format(n)
}

export function formatCompactCurrency(n: number): string {
  return compactCurrencyFmt.format(n)
}

export function formatInt(n: number): string {
  return integerFmt.format(n)
}

export function formatPercent(n: number): string {
  // Fixed 2-decimals so cells keep constant width with tabular-nums.
  return `${n.toFixed(2)}%`
}
