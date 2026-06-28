import { useEffect, useMemo, useRef } from 'react'
import {
  Chart,
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { store } from '../../core/engine'
import { useAnalyticsView } from '../../hooks/useAnalyticsView'
import {
  formatCompactCurrency,
  formatCurrency,
  formatInt,
  formatPercent,
} from '../../core/Sanitizer'
import type { RpaRow } from '../../core/types'

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
)

interface Aggregates {
  totalProjects: number
  totalRobots: number
  totalBudget: number
  totalSavings: number
  avgRoi: number
  totalHours: number
  byDepartmentSavings: Array<{ label: string; value: number }>
  byStatus: Array<{ label: string; value: number }>
  byAutomationRobots: Array<{ label: string; value: number }>
  roiBins: { labels: string[]; values: number[] }
}

const ROI_BINS = [-50, -25, 0, 25, 50, 75, 100, 150, 200, 300, 500, 1000, 10000]

function aggregate(rows: Iterable<RpaRow>): Aggregates {
  const deptSavings = new Map<string, number>()
  const statusCounts = new Map<string, number>()
  const autoRobots = new Map<string, number>()
  const binCounts = new Array(ROI_BINS.length - 1).fill(0)

  let totalProjects = 0
  let totalRobots = 0
  let totalBudget = 0
  let totalSavings = 0
  let sumRoi = 0
  let totalHours = 0

  for (const r of rows) {
    totalProjects += 1
    totalRobots += r.robots_deployed
    totalBudget += r.budget_usd
    totalSavings += r.annual_savings_usd
    sumRoi += r.roi_percent
    totalHours += r.employee_hours_saved

    if (r.department) {
      deptSavings.set(r.department, (deptSavings.get(r.department) ?? 0) + r.annual_savings_usd)
    }
    if (r.project_status) {
      statusCounts.set(r.project_status, (statusCounts.get(r.project_status) ?? 0) + 1)
    }
    if (r.automation_type) {
      autoRobots.set(
        r.automation_type,
        (autoRobots.get(r.automation_type) ?? 0) + r.robots_deployed,
      )
    }

    const v = r.roi_percent
    for (let i = 0; i < ROI_BINS.length - 1; i++) {
      if (v >= ROI_BINS[i] && v < ROI_BINS[i + 1]) {
        binCounts[i] += 1
        break
      }
    }
  }

  const topN = (m: Map<string, number>, n: number) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, value]) => ({ label, value }))

  return {
    totalProjects,
    totalRobots,
    totalBudget,
    totalSavings,
    avgRoi: totalProjects > 0 ? sumRoi / totalProjects : 0,
    totalHours,
    byDepartmentSavings: topN(deptSavings, 10),
    byStatus: Array.from(statusCounts.entries()).map(([label, value]) => ({ label, value })),
    byAutomationRobots: topN(autoRobots, 10),
    roiBins: {
      labels: ROI_BINS.slice(0, -1).map((lo, i) => {
        const hi = ROI_BINS[i + 1]
        return hi >= 1000 ? `${lo}%+` : `${lo}→${hi}%`
      }),
      values: binCounts,
    },
  }
}

function KpiTile({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-base-600 bg-base-900/70 px-3 py-2">
      <span className="text-[10.5px] uppercase tracking-wider text-slate-400">{icon} {label}</span>
      <span className={`tnum mt-0.5 text-base font-bold ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 flex-col rounded-lg border border-base-600 bg-base-900/60 p-3">
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-accent-soft">{title}</h3>
        {subtitle && <span className="text-[10.5px] text-slate-500">{subtitle}</span>}
      </header>
      <div className="relative h-[260px] w-full">{children}</div>
    </section>
  )
}

const PALETTE = ['#38bdf8','#7dd3fc','#a78bfa','#f472b6','#fb923c','#fbbf24','#4ade80','#34d399','#22d3ee','#f87171']

function DeptSavingsBar({ data }: { data: Array<{ label: string; value: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          label: 'Annual Savings (USD)',
          data: data.map((d) => d.value),
          backgroundColor: 'rgba(56,189,248,0.55)',
          borderColor: '#38bdf8', borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${formatCurrency(Number(c.parsed.y ?? 0))}` } },
        },
        scales: {
          x: { ticks: { color: '#94a3b8', maxRotation: 40, minRotation: 30 }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#94a3b8', callback: (v) => formatCompactCurrency(Number(v)) }, grid: { color: '#1e293b' } },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} />
}

function StatusDoughnut({ data }: { data: Array<{ label: string; value: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          data: data.map((d) => d.value),
          backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: '#0b1220', borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { color: '#cbd5e1', boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const total = data.reduce((s, d) => s + d.value, 0)
                const pct = total ? ((c.parsed as number) / total) * 100 : 0
                return ` ${c.label}: ${formatInt(c.parsed as number)} (${pct.toFixed(1)}%)`
              },
            },
          },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} />
}

function AutomationRobotsBar({ data }: { data: Array<{ label: string; value: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [{
          label: 'Robots Deployed',
          data: data.map((d) => d.value),
          backgroundColor: 'rgba(167,139,250,0.55)',
          borderColor: '#a78bfa', borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${formatInt(Number(c.parsed.x ?? 0))} robots` } },
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} />
}

function RoiHistogram({ data }: { data: { labels: string[]; values: number[] } }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Projects', data: data.values,
          borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.18)',
          fill: true, tension: 0.35, pointRadius: 3,
          pointBackgroundColor: '#86efac', borderWidth: 2,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${formatInt(Number(c.parsed.y ?? 0))} projects` } },
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' }, beginAtZero: true },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} />
}

export function AnalyticsView() {
  const { isOpen, close } = useAnalyticsView()

  const agg = useMemo<Aggregates | null>(() => {
    if (!isOpen) return null
    return aggregate(store.rows.values())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen || !agg) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]" onClick={close} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label="Analytics view — frozen-snapshot Chart.js dashboard"
        className="fixed inset-x-4 top-4 bottom-4 z-50 flex flex-col rounded-xl border border-base-500 bg-base-800 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-600 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-white">
              📊 Analytics View
              <span className="ml-2 rounded-full border border-warn/50 bg-warn/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-warn">
                Frozen Snapshot
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Chart.js aggregation over {formatInt(agg.totalProjects)} project rows · resume the stream to dismiss
            </p>
          </div>
          <button onClick={close} className="rounded-md border border-base-600 bg-base-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-base-700" aria-label="Close analytics view">
            ✕  Esc
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2 border-b border-base-600 px-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiTile icon="📊" label="Projects" value={formatInt(agg.totalProjects)} accent="text-accent-soft" />
          <KpiTile icon="🤖" label="Robots" value={formatInt(agg.totalRobots)} accent="text-accent" />
          <KpiTile icon="💰" label="Savings" value={formatCompactCurrency(agg.totalSavings)} accent="text-ok" />
          <KpiTile icon="🏦" label="Budget" value={formatCompactCurrency(agg.totalBudget)} />
          <KpiTile icon="📈" label="Avg ROI" value={formatPercent(agg.avgRoi)} accent="text-warn" />
          <KpiTile icon="⏱️" label="Hours Saved" value={formatInt(agg.totalHours)} />
        </div>

        <div className="grid flex-1 min-h-0 gap-3 overflow-y-auto p-4 lg:grid-cols-2">
          <ChartCard title="💹 Top Departments by Annual Savings" subtitle="Top 10">
            <DeptSavingsBar data={agg.byDepartmentSavings} />
          </ChartCard>
          <ChartCard title="🧭 Project Status Distribution">
            <StatusDoughnut data={agg.byStatus} />
          </ChartCard>
          <ChartCard title="🤖 Top Automation Types by Robots Deployed" subtitle="Top 10">
            <AutomationRobotsBar data={agg.byAutomationRobots} />
          </ChartCard>
          <ChartCard title="📈 ROI Distribution (histogram)">
            <RoiHistogram data={agg.roiBins} />
          </ChartCard>
        </div>

        <footer className="border-t border-base-600 bg-base-900/70 px-4 py-2 text-[11px] text-slate-500">
          📌 Chart.js v4 · all aggregations computed once over the paused store snapshot
        </footer>
      </div>
    </>
  )
}
