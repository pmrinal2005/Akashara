import { useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { store } from '../../core/engine'
import {
  formatCurrency,
  formatCompactCurrency,
  formatInt,
  formatPercent,
} from '../../core/Sanitizer'
import { useInspector } from '../../hooks/useInspector'
import type { RpaRow } from '../../core/types'
import {
  BadgeIcon,
  CalendarIcon,
  CloseIcon,
  CurrencyIcon,
  SatelliteIcon,
  TagIcon,
} from '../common/AppIcons'

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
      <span className="text-[10.5px] uppercase tracking-wider text-slate-400">
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
  icon: ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="liquid-glass rounded-2xl p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-soft">
        <span className="mr-1.5 inline-flex align-middle">{icon}</span>
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
        : status === 'Failed' || status === 'Cancelled'
          ? 'pill pill-failed'
          : 'pill pill-planned'
  return <span className={cls}>{status || '—'}</span>
}

function AlertBadge({ level }: { level: RpaRow['_alert'] }) {
  if (!level) {
    return <span className="text-[11px] text-slate-400">no active alert</span>
  }
  const cls =
    level === 'critical'
      ? 'text-danger'
      : 'text-warn'
  return (
    <span
      className={
        'liquid-glass rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase ' +
        cls
      }
    >
      {level}
    </span>
  )
}

export function RowInspector() {
  const { uid, close } = useInspector()

  useEffect(() => {
    if (!uid) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [uid, close])

  const row: RpaRow | null = useMemo(
    () => (uid ? store.getRow(uid) ?? null : null),
    [uid],
  )

  if (!uid || !row) return null

  const savingsRatio =
    row.budget_usd > 0 ? row.annual_savings_usd / row.budget_usd : 0
  const netAnnualDelta = row.annual_savings_usd - row.budget_usd

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[3px]"
        onClick={close}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Project ${row.project_id} inspector`}
        className="liquid-glass-strong fixed right-0 top-0 z-40 flex h-full w-full max-w-[480px] flex-col rounded-l-2xl shadow-2xl animate-inspector-in"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10.5px] uppercase tracking-wider text-slate-400">
                Project
              </span>
              <span className="font-mono text-[11px] text-slate-300">
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
            className="liquid-glass rounded-full px-3 py-1 text-xs text-slate-200 hover:text-white"
            aria-label="Close inspector"
          >
            <span className="inline-flex items-center gap-1.5"><CloseIcon className="h-3.5 w-3.5" /> Esc</span>
          </button>
        </header>

        <div className="glass-scroll flex-1 space-y-3 overflow-y-auto p-3">
          <Card title="Identity" icon={<BadgeIcon className="h-3.5 w-3.5" />}>
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

          <Card title="Classification" icon={<TagIcon className="h-3.5 w-3.5" />}>
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

          <Card title="Timeline" icon={<CalendarIcon className="h-3.5 w-3.5" />}>
            <Field label="Start Date" value={row.start_date} mono />
            <Field label="Completion Date" value={row.completion_date} mono />
          </Card>

          <Card title="Financials & Operations" icon={<CurrencyIcon className="h-3.5 w-3.5" />}>
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

          <section className="liquid-glass rounded-2xl p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-soft">
              <span className="inline-flex items-center gap-1.5"><SatelliteIcon className="h-3.5 w-3.5" /> Engine Telemetry</span>
            </h3>
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400">
                  Updates
                </div>
                <div className="tnum text-slate-100">{row._updateCount}</div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400">
                  Last Tick
                </div>
                <div className="tnum text-slate-100">#{row._lastTick}</div>
              </div>
              <div>
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400">
                  Alert
                </div>
                <AlertBadge level={row._alert} />
              </div>
            </div>
          </section>
        </div>

        <footer className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-400">
          Snapshot taken while stream was paused. Resume to refresh.
        </footer>
      </aside>
    </>
  )
}
