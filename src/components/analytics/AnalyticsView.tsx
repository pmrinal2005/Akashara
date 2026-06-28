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

// ─── KPI Tile ─────────────────────────────────────────────────────────────
function KpiTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: string
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="liquid-glass flex min-w-0 flex-col rounded-xl px-3 py-2.5">
      <span className="text-[10px] uppercase tracking-wider text-slate-300">
        {icon} {label}
      </span>
      <span className={`tnum mt-0.5 truncate text-sm font-bold sm:text-base ${accent ?? 'text-white'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Chart Card — fixed-height container so canvas always has room ────────
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="liquid-glass flex min-h-0 w-full flex-col rounded-2xl p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <h3 className="text-xs font-semibold text-accent-soft sm:text-sm">{title}</h3>
        {subtitle && (
          <span className="text-[10px] text-slate-400 sm:text-[10.5px]">{subtitle}</span>
        )}
      </div>
      {/* Fixed height so Chart.js maintainAspectRatio=false always has a concrete container */}
      <div className="relative h-[220px] w-full sm:h-[260px]">{children}</div>
    </div>
  )
}

const PALETTE = [
  '#38bdf8',
  '#7dd3fc',
  '#a78bfa',
  '#f472b6',
  '#fb923c',
  '#fbbf24',
  '#4ade80',
  '#34d399',
  '#22d3ee',
  '#f87171',
]

// ─── Individual chart components ─────────────────────────────────────────

function DeptSavingsBar({ data }: { data: Array<{ label: string; value: number }> }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((d) => d.label),
        datasets: [
          {
            label: 'Annual Savings (USD)',
            data: data.map((d) => d.value),
            backgroundColor: 'rgba(56,189,248,0.55)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` ${formatCurrency(Number(c.parsed.y ?? 0))}`,
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8',
              maxRotation: 40,
              minRotation: 20,
              font: { size: 10 },
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: {
              color: '#94a3b8',
              callback: (v) => formatCompactCurrency(Number(v)),
              font: { size: 10 },
            },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
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
        datasets: [
          {
            data: data.map((d) => d.value),
            backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length]),
            borderColor: 'rgba(11,18,32,0.8)',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#cbd5e1',
              boxWidth: 10,
              font: { size: 10 },
              padding: 8,
            },
          },
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
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
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
        datasets: [
          {
            label: 'Robots Deployed',
            data: data.map((d) => d.value),
            backgroundColor: 'rgba(167,139,250,0.55)',
            borderColor: '#a78bfa',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` ${formatInt(Number(c.parsed.x ?? 0))} robots`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
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
        datasets: [
          {
            label: 'Projects',
            data: data.values,
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74,222,128,0.18)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: '#86efac',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => ` ${formatInt(Number(c.parsed.y ?? 0))} projects`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', maxRotation: 30, font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.05)' },
            beginAtZero: true,
          },
        },
      },
    })
    return () => chart.destroy()
  }, [data])
  return <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
}

// ─── Main Analytics View ──────────────────────────────────────────────────
export function AnalyticsView() {
  const { isOpen, close } = useAnalyticsView()

  const agg = useMemo<Aggregates | null>(() => {
    if (!isOpen) return null
    return aggregate(store.rows.values())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  if (!isOpen || !agg) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[3px]"
        onClick={close}
        aria-hidden="true"
      />

      {/* Modal — true full-screen with safe inset so it never clips on mobile */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Analytics view — frozen-snapshot Chart.js dashboard"
        className="analytics-modal liquid-glass-strong fixed inset-0 z-50 flex flex-col sm:inset-2 sm:rounded-2xl"
        style={{ isolation: 'isolate' }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-white sm:text-base">
              📊 Analytics View
              <span className="liquid-glass inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-warn sm:text-[10.5px]">
                Frozen Snapshot
              </span>
            </h2>
            <p className="mt-0.5 text-[10px] text-slate-300 sm:text-[11px]">
              Chart.js aggregation over {formatInt(agg.totalProjects)} project rows · resume the stream to dismiss
            </p>
          </div>
          <button
            onClick={close}
            className="liquid-glass flex-shrink-0 rounded-full px-3 py-1.5 text-xs text-slate-200 hover:text-white"
            aria-label="Close analytics view"
          >
            ✕ Esc
          </button>
        </header>

        {/* ── KPI Strip ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-b border-white/10 px-3 py-2.5 sm:px-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <KpiTile icon="📊" label="Projects" value={formatInt(agg.totalProjects)} accent="text-accent-soft" />
            <KpiTile icon="🤖" label="Robots" value={formatInt(agg.totalRobots)} accent="text-accent" />
            <KpiTile icon="💰" label="Savings" value={formatCompactCurrency(agg.totalSavings)} accent="text-ok" />
            <KpiTile icon="🏦" label="Budget" value={formatCompactCurrency(agg.totalBudget)} />
            <KpiTile icon="📈" label="Avg ROI" value={formatPercent(agg.avgRoi)} accent="text-warn" />
            <KpiTile icon="⏱️" label="Hours Saved" value={formatInt(agg.totalHours)} />
          </div>
        </div>

        {/* ── Charts Grid ───────────────────────────────────────────────── */}
        {/*
          Task 3 Fix:
          - flex-1 min-h-0 so the scroll region fills all remaining height.
          - overflow-y-auto handles overflow cleanly.
          - Responsive: 1 col on mobile, 2 cols on ≥ md.
          - Each ChartCard has explicit h-[220px]/h-[260px] so the canvas
            always has a finite pixel height for Chart.js to paint into.
        */}
        <div className="glass-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
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
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="flex-shrink-0 border-t border-white/10 px-4 py-2 text-[10px] text-slate-400 sm:text-[11px]">
          📌 Chart.js v4 · all aggregations computed once over the paused store snapshot
        </footer>
      </div>
    </>
  )
}
