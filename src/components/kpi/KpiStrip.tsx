import type { ReactNode } from 'react'
import { useKpiSnapshot } from '../../hooks/useStreamSnapshot'
import { formatCompactCurrency, formatInt } from '../../core/Sanitizer'
import {
  AnalyticsIcon,
  AntennaIcon,
  CurrencyIcon,
  RobotIcon,
  TrendUpIcon,
  WarningTriangleIcon,
} from '../common/AppIcons'

interface CardProps {
  label: string
  value: string
  accent?: string
  icon: ReactNode
}

function Card({ label, value, accent, icon }: CardProps) {
  return (
    <div className="kpi-card liquid-glass group relative overflow-hidden px-4 py-3">
      <span className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-slate-300">
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
      <Card icon={<AnalyticsIcon className="h-4 w-4" />} label="Total Projects" value={formatInt(kpi.totalRows)} accent="text-accent-soft" />
      <Card icon={<RobotIcon className="h-4 w-4" />} label="Robots Deployed" value={formatInt(kpi.totalRobots)} accent="text-accent" />
      <Card icon={<CurrencyIcon className="h-4 w-4" />} label="Annual Savings" value={formatCompactCurrency(kpi.totalSavings)} accent="text-ok" />
      <Card icon={<TrendUpIcon className="h-4 w-4" />} label="Avg ROI" value={`${kpi.avgRoi.toFixed(1)}%`} accent="text-warn" />
      <Card icon={<AntennaIcon className="h-4 w-4" />} label="Stream Ticks" value={formatInt(kpi.totalTicks)} accent="text-slate-200" />
      <Card
        icon={<WarningTriangleIcon className="h-4 w-4" />}
        label="Active Alerts"
        value={formatInt(kpi.activeAlerts)}
        accent={kpi.activeAlerts > 0 ? 'text-danger' : 'text-slate-300'}
      />
    </section>
  )
}
