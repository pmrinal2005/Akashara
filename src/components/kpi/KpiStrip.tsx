/**
 * KPI STRIP  (Feature 1 — KPI Dashboard)
 *  Bound to the engine's incrementally-maintained KPI snapshot via
 *  useSyncExternalStore. tabular-nums locks column width during digit changes.
 */
import { useKpiSnapshot } from '../../hooks/useStreamSnapshot'
import { formatCompactCurrency, formatInt } from '../../core/Sanitizer'

interface CardProps {
  label: string
  value: string
  accent?: string
  icon: string
}

function Card({ label, value, accent, icon }: CardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-base-600 bg-base-800 px-4 py-3">
      <span className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">
        {icon} {label}
      </span>
      <span className={`tnum text-xl font-bold ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

export function KpiStrip() {
  const kpi = useKpiSnapshot()

  return (
    <section
      id="kpi-strip"
      aria-label="Key performance indicators"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <Card icon="📊" label="Total Projects" value={formatInt(kpi.totalRows)} accent="text-accent-soft" />
      <Card icon="🤖" label="Robots Deployed" value={formatInt(kpi.totalRobots)} accent="text-accent" />
      <Card icon="💰" label="Annual Savings" value={formatCompactCurrency(kpi.totalSavings)} accent="text-ok" />
      <Card icon="📈" label="Avg ROI" value={`${kpi.avgRoi.toFixed(1)}%`} accent="text-warn" />
      <Card icon="📡" label="Stream Ticks" value={formatInt(kpi.totalTicks)} accent="text-slate-200" />
      <Card
        icon="⚠️"
        label="Active Alerts"
        value={formatInt(kpi.activeAlerts)}
        accent={kpi.activeAlerts > 0 ? 'text-danger' : 'text-slate-400'}
      />
    </section>
  )
}
