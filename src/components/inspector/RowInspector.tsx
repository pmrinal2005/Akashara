/**
 * ===========================================================================
 *  ROW INSPECTOR  — Pause-Gated Detail Viewport (Feature 5 companion)
 * ===========================================================================
 *  An isolated, modal-style side-panel that parses and beautifully displays
 *  EVERY relational attribute of a single RpaRow.
 *
 *  Visibility contract:
 *   - Mounted only when bufferQueue is paused AND inspectorStore has a uid.
 *   - Source-of-truth: store.getRow(uid). Because the stream is paused, the
 *     row is frozen — we render once on open and on Esc/X/backdrop close.
 *
 *  Layout:
 *   - Right-anchored sliding panel (480px wide, full grid height) so the
 *     virtual grid stays visible underneath for context.
 *   - Header: project name + status pill + close button.
 *   - Body, grouped into 4 semantic cards:
 *        1. Identity        — project_id, company_id, internal_uid
 *        2. Classification  — automation_type, department, industry,
 *                             country, implementation_partner, ai_enabled,
 *                             cloud_deployment
 *        3. Timeline        — start_date, completion_date, status
 *        4. Financials & Ops— robots_deployed, budget_usd,
 *                             annual_savings_usd, roi_percent,
 *                             employee_hours_saved, plus derived
 *                             savings/budget ratio and net annual delta.
 *   - Footer: engine telemetry — _updateCount, _lastTick, _alert level.
 */
import { useEffect, useMemo } from 'react'
import { store } from '../../core/engine'
import {
  formatCurrency,
  formatCompactCurrency,
  formatInt,
  formatPercent,
} from '../../core/Sanitizer'
import { useInspector } from '../../hooks/useInspector'
import type { RpaRow } from '../../core/types'

/* ---------- presentational atoms ---------- */

function Field({
  label,
  value,
  mono = false,
  numeric = false,
  hint,
}: {
  label: string
  value: string
  mono?: boolean
  numeric?: boolean
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span
        className={
          'text-[13px] text-slate-100 ' +
          (mono ? 'font-mono ' : '') +
          (numeric ? 'tnum ' : '')
        }
      >
        {value || <span className="text-slate-600">—</span>}
      </span>
      {hint && (
        <span className="text-[10px] text-slate-500">{hint}</span>
      )}
    </div>
  )
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-base-600 bg-base-900/60 p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-soft">
        <span className="mr-1.5">{icon}</span>
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</div>
    </section>
  )
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === 'Active'
      ? 'pill pill-active'
      : status === 'Completed'
        ? 'pill pill-completed'
        : 'pill pill-planned'
  return <span className={cls}>{status || '—'}</span>
}

function AlertBadge({ level }: { level: RpaRow['_alert'] }) {
  if (!level) {
    return <span className="text-[11px] text-slate-500">no active alert</span>
  }
  const cls =
    level === 'critical'
      ? 'border-danger/50 bg-danger/15 text-danger'
      : 'border-warn/50 bg-warn/15 text-warn'
  return (
    <span
      className={
        'rounded border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase ' +
        cls
      }
    >
      {level}
    </span>
  )
}

/* ---------- container ---------- */

export function RowInspector() {
  const { uid, close } = useInspector()

  // Esc-to-close — installed only while open.
  useEffect(() => {
    if (!uid) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [uid, close])

  // Snapshot the row ONCE per open. Stream is paused, so it cannot change.
  const row: RpaRow | null = useMemo(
    () => (uid ? store.getRow(uid) ?? null : null),
    [uid],
  )

  if (!uid || !row) return null

  // Derived metrics
  const savingsRatio =
    row.budget_usd > 0 ? row.annual_savings_usd / row.budget_usd : 0
  const netAnnualDelta = row.annual_savings_usd - row.budget_usd

  return (
    <>
      {/* Backdrop — clicking it closes the inspector */}
      <div
        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px]"
        onClick={close}
        aria-hidden="true"
      />

      {/* Sliding side panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Project ${row.project_id} inspector`}
        className="fixed right-0 top-0 z-40 flex h-full w-full max-w-[480px] flex-col border-l border-base-600 bg-base-800 shadow-2xl animate-inspector-in"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-base-600 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-wider text-slate-500">
                Project
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {row.project_id}
              </span>
              <StatusPill status={row.project_status} />
            </div>
            <h2 className="mt-1 truncate text-base font-bold text-white">
              {row.project_name || 'Untitled Project'}
            </h2>
          </div>
          <button
            onClick={close}
            className="rounded-md border border-base-600 bg-base-900 px-2 py-1 text-xs text-slate-300 hover:bg-base-700"
            aria-label="Close inspector"
          >
            ✕  Esc
          </button>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {/* 1. Identity */}
          <Card title="Identity" icon="🪪">
            <Field label="Project ID" value={row.project_id} mono />
            <Field label="Company ID" value={row.company_id} mono />
            <Field
              label="Internal UID"
              value={row.internal_uid}
              mono
              hint="engine-assigned, immutable"
            />
            <Field label="Status" value={row.project_status} />
          </Card>

          {/* 2. Classification */}
          <Card title="Classification" icon="🏷️">
            <Field label="Automation Type" value={row.automation_type} />
            <Field label="Department" value={row.department} />
            <Field label="Industry" value={row.industry} />
            <Field label="Country" value={row.country} />
            <Field
              label="Implementation Partner"
              value={row.implementation_partner}
            />
            <Field label="AI Enabled" value={row.ai_enabled} />
            <Field label="Cloud Deployment" value={row.cloud_deployment} />
          </Card>

          {/* 3. Timeline */}
          <Card title="Timeline" icon="📅">
            <Field label="Start Date" value={row.start_date} mono />
            <Field label="Completion Date" value={row.completion_date} mono />
          </Card>

          {/* 4. Financials & Ops */}
          <Card title="Financials & Operations" icon="💹">
            <Field
              label="Robots Deployed"
              value={formatInt(row.robots_deployed)}
              numeric
            />
            <Field
              label="Employee Hours Saved"
              value={formatInt(row.employee_hours_saved)}
              numeric
              hint="annualized"
            />
            <Field
              label="Budget"
              value={formatCurrency(row.budget_usd)}
              numeric
              hint={formatCompactCurrency(row.budget_usd)}
            />
            <Field
              label="Annual Savings"
              value={formatCurrency(row.annual_savings_usd)}
              numeric
              hint={formatCompactCurrency(row.annual_savings_usd)}
            />
            <Field
              label="ROI"
              value={formatPercent(row.roi_percent)}
              numeric
            />
            <Field
              label="Savings ÷ Budget"
              value={savingsRatio.toFixed(2) + '×'}
              numeric
              hint={
                netAnnualDelta >= 0
                  ? `net +${formatCompactCurrency(netAnnualDelta)} / yr`
                  : `net ${formatCompactCurrency(netAnnualDelta)} / yr`
              }
            />
          </Card>

          {/* 5. Engine telemetry */}
          <section className="rounded-lg border border-base-600 bg-base-900/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-soft">
              🛰️ Engine Telemetry
            </h3>
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-slate-500">
                  Updates
                </div>
                <div className="tnum text-slate-100">{row._updateCount}</div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-slate-500">
                  Last Tick
                </div>
                <div className="tnum text-slate-100">#{row._lastTick}</div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-slate-500">
                  Alert
                </div>
                <AlertBadge level={row._alert} />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="border-t border-base-600 bg-base-900/70 px-4 py-2 text-[11px] text-slate-500">
          ⏸ Snapshot taken while stream was paused. Resume to refresh.
        </footer>
      </aside>
    </>
  )
}
