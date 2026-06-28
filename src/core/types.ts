/**
 * ===========================================================================
 *  CORE DATA CONTRACTS
 * ===========================================================================
 *  These types describe the PROJECT schema delivered by automation_projects.csv
 *  (NOT the company schema that dataStream.js internally assumes — see
 *  Sanitizer.ts for the critical coercion bridge).
 */

/** Raw row exactly as window.initializeRpaStream hands it to us. */
export interface RawIncomingRow {
  internal_uid: string

  // --- Project schema columns (arrive as STRINGS — dataStream.js never coerces them) ---
  project_id?: string
  company_id?: string
  project_name?: string
  start_date?: string
  completion_date?: string
  project_status?: string
  automation_type?: string
  robots_deployed?: string | number
  budget_usd?: string | number
  annual_savings_usd?: string | number
  roi_percent?: string | number
  department?: string
  implementation_partner?: string
  country?: string
  industry?: string
  employee_hours_saved?: string | number
  ai_enabled?: string
  cloud_deployment?: string

  // --- Synthetic volatility fields the firehose injects (company schema). ---
  // These become NaN for our rows but signal that a tick mutated this record.
  annual_revenue_usd?: number
  employee_count?: number
  customer_count?: number
  market_share_percent?: number

  [key: string]: unknown
}

/** Canonical, fully-coerced, render-ready row stored in the master StreamStore. */
export interface RpaRow {
  internal_uid: string

  project_id: string
  company_id: string
  project_name: string
  project_status: string
  automation_type: string
  department: string
  implementation_partner: string
  country: string
  industry: string
  ai_enabled: string
  cloud_deployment: string
  start_date: string
  completion_date: string

  // Coerced numerics (always real numbers, never strings / NaN).
  robots_deployed: number
  budget_usd: number
  annual_savings_usd: number
  roi_percent: number
  employee_hours_saved: number

  // --- Engine-managed transient metadata (not from CSV) ---
  /** Monotonic tick index of the last mutation; powers "live" indicators. */
  _lastTick: number
  /** Number of times this row has been touched by the stream. */
  _updateCount: number
  /** Alert severity for Feature 3. null => no active alert. */
  _alert: AlertLevel | null
  /** Wall-clock ms when the alert was raised (drives CSS flash + expiry). */
  _alertAt: number
}

export type AlertLevel = 'warn' | 'critical'

/** Numeric / categorical fields the user can sort & filter against. */
export type SortableField =
  | 'project_id'
  | 'project_name'
  | 'project_status'
  | 'automation_type'
  | 'department'
  | 'industry'
  | 'country'
  | 'robots_deployed'
  | 'budget_usd'
  | 'annual_savings_usd'
  | 'roi_percent'
  | 'employee_hours_saved'

export type SortDir = 'asc' | 'desc'

export interface SortSpec {
  field: SortableField
  dir: SortDir
}

/** Categorical filter selections. Empty set on a field == "no filter". */
export interface FilterSpec {
  automation_type: Set<string>
  department: Set<string>
  industry: Set<string>
  project_status: Set<string>
}

export interface KpiSnapshot {
  totalRows: number
  totalRobots: number
  totalSavings: number
  avgRoi: number
  totalTicks: number
  activeAlerts: number
  rowsPerSec: number
}

export const NUMERIC_FIELDS: SortableField[] = [
  'robots_deployed',
  'budget_usd',
  'annual_savings_usd',
  'roi_percent',
  'employee_hours_saved',
]

export function isNumericField(f: SortableField): boolean {
  return NUMERIC_FIELDS.includes(f)
}
