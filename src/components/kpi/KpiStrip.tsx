/**
 * KPI STRIP  (Feature 1 — KPI Dashboard)
 *  Bound to the engine's incrementally-maintained KPI snapshot via
 *  useSyncExternalStore. tabular-nums locks column width during digit changes.
 *
 *  Visual model matches the reference dashboard mockups: each card is a dark
 *  rounded tile with a small uppercase label + icon at the top and a large
 *  coloured numeric below. Responsive: 2 cols on phone, 3 on tablet, 6 on
 *  desktop.
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
    <div className="kpi-card group relative overflow-hidden rounded-lg border border-base-600 bg-base-800 px-4 py-3 transition-colors hover:border-accent/40">
      <span className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
        <span className="text-base leading-none">{icon}</span>
        {label}
      </span>
      <span className={`tnum block text-2xl font-bold leading-tight ${accent ?? 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

export function KpiStrip() {
  const kpi = useKpiSnapshot()

  return (
    <section
      id="kpi-strip"
      aria-label="Key performance indicators"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6"
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
