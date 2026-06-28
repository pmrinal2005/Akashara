/**
 * ===========================================================================
 *  SNAPSHOT EXPORTER  (Task 1 — Client-Side CSV Export)
 * ===========================================================================
 *  Exports the currently visible (filtered + sorted) rows as a downloadable
 *  CSV file. Runs entirely on the main thread via requestIdleCallback so it
 *  does NOT freeze the ongoing stream operations.
 *
 *  - Reads the current ordered uid array from ViewPool (respects active
 *    multi-column sort AND all active filters/search).
 *  - Fetches each row from StreamStore by uid — O(1) per row.
 *  - Builds the CSV string in chunks using requestIdleCallback so the frame
 *    loop is never blocked by a 500+ row serialisation burst.
 *  - Triggers a download via a temporary <a> element (standard, no server).
 */

import { store, viewPool } from './engine'
import type { RpaRow } from './types'
import { formatCurrency, formatPercent, formatInt } from './Sanitizer'

const CSV_HEADERS: Array<{ key: keyof RpaRow; label: string; format?: (v: unknown) => string }> = [
  { key: 'project_id', label: 'Project ID' },
  { key: 'project_name', label: 'Project Name' },
  { key: 'project_status', label: 'Status' },
  { key: 'automation_type', label: 'Automation Type' },
  { key: 'department', label: 'Department' },
  { key: 'industry', label: 'Industry' },
  { key: 'country', label: 'Country' },
  { key: 'company_id', label: 'Company ID' },
  { key: 'implementation_partner', label: 'Implementation Partner' },
  { key: 'ai_enabled', label: 'AI Enabled' },
  { key: 'cloud_deployment', label: 'Cloud Deployment' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'completion_date', label: 'Completion Date' },
  { key: 'robots_deployed', label: 'Robots Deployed', format: (v) => formatInt(v as number) },
  { key: 'budget_usd', label: 'Budget (USD)', format: (v) => formatCurrency(v as number) },
  { key: 'annual_savings_usd', label: 'Annual Savings (USD)', format: (v) => formatCurrency(v as number) },
  { key: 'roi_percent', label: 'ROI (%)', format: (v) => formatPercent(v as number) },
  { key: 'employee_hours_saved', label: 'Employee Hours Saved', format: (v) => formatInt(v as number) },
]

function escapeCell(value: unknown): string {
  const s = String(value ?? '')
  // RFC 4180: if field contains comma, double-quote, or newline, wrap in quotes
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function buildHeaderRow(): string {
  return CSV_HEADERS.map((h) => escapeCell(h.label)).join(',')
}

function rowToCsvLine(row: RpaRow): string {
  return CSV_HEADERS.map(({ key, format }) => {
    const value = row[key]
    return escapeCell(format ? format(value) : value)
  }).join(',')
}

const CHUNK_SIZE = 500

/**
 * Export the current view (filtered + sorted) as a CSV download.
 * Uses requestIdleCallback to chunk the serialisation, keeping the main
 * thread free. Falls back to synchronous processing if rIC is unavailable.
 */
export function exportSnapshot(onProgress?: (done: number, total: number) => void): void {
  const uids = viewPool.getOrder()
  const total = uids.length

  if (total === 0) {
    alert('No rows in the current view to export.')
    return
  }

  const lines: string[] = [buildHeaderRow()]
  let index = 0

  const processChunk = (deadline?: IdleDeadline) => {
    const end = Math.min(index + CHUNK_SIZE, total)
    while (index < end) {
      const row = store.getRow(uids[index])
      if (row) lines.push(rowToCsvLine(row))
      index++
      // If we have a deadline and time is running out, yield
      if (deadline && deadline.timeRemaining() < 2 && index < total) break
    }
    onProgress?.(index, total)

    if (index < total) {
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(processChunk, { timeout: 500 })
      } else {
        setTimeout(() => processChunk(), 0)
      }
    } else {
      // All rows serialised — trigger download
      const csv = lines.join('\r\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
      const a = document.createElement('a')
      a.href = url
      a.download = `akashara-snapshot-${ts}.csv`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Revoke after a short delay to allow the browser to initiate download
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    }
  }

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(processChunk, { timeout: 500 })
  } else {
    setTimeout(() => processChunk(), 0)
  }
}
