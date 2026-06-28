import { useEffect, useRef } from 'react'
import {
  Chart, BarController, BarElement, CategoryScale, Legend, LinearScale, Title, Tooltip,
} from 'chart.js'
import { store } from '../../core/engine'
import { formatCompactCurrency, formatCurrency } from '../../core/Sanitizer'

Chart.register(BarController, BarElement, CategoryScale, Legend, LinearScale, Title, Tooltip)

const REFRESH_MS = 1500
const TOP_N = 12

interface Aggregate { labels: string[]; values: number[] }

function aggregate(): Aggregate {
  const sums = new Map<string, number>()
  store.rows.forEach((r) => {
    if (!r.department) return
    sums.set(r.department, (sums.get(r.department) ?? 0) + r.annual_savings_usd)
  })
  const sorted = Array.from(sums.entries()).sort((a, b) => b[1] - a[1]).slice(0, TOP_N)
  return { labels: sorted.map((s) => s[0]), values: sorted.map((s) => s[1]) }
}

export function DepartmentChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let disposed = false
    const seed = aggregate()

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: seed.labels,
        datasets: [{
          label: 'Annual Savings (USD)',
          data: seed.values,
          backgroundColor: 'rgba(56,189,248,0.45)',
          borderColor: '#38bdf8', borderWidth: 1, borderRadius: 4,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: true, labels: { color: '#cbd5e1', boxWidth: 12 } },
          tooltip: { callbacks: { label: (c) => ` ${formatCurrency(Number(c.parsed.y ?? 0))}` } },
          title: { display: false },
        },
        scales: {
          x: {
            ticks: {
              color: '#94a3b8', maxRotation: 40, minRotation: 30,
              callback: function (value) {
                const lbl = this.getLabelForValue(value as number) ?? ''
                return lbl.length > 11 ? lbl.slice(0, 10) + '…' : lbl
              },
            },
            grid: { color: '#1e293b' },
          },
          y: {
            ticks: { color: '#94a3b8', callback: (v) => formatCompactCurrency(Number(v)) },
            grid: { color: '#1e293b' }, beginAtZero: true,
          },
        },
      },
    })

    const timer = setInterval(() => {
      if (disposed || !chartRef.current) return
      const { labels, values } = aggregate()
      const c = chartRef.current
      c.data.labels = labels
      c.data.datasets[0].data = values
      c.update('none')
    }, REFRESH_MS)

    return () => {
      disposed = true
      clearInterval(timer)
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [])

  return (
    <section id="department-chart" aria-label="Annual savings by department"
      className="chart-panel rounded-lg border border-base-600 bg-base-800 p-4">
      <h2 className="mb-3 text-sm font-semibold text-accent-soft">
        💹 Top Departments by Annual Savings (live)
      </h2>
      <div className="relative h-[280px] w-full">
        <canvas ref={canvasRef} />
      </div>
      <p className="mt-2 text-[10.5px] text-slate-500">
        Chart.js v4 · aggregated every {REFRESH_MS} ms over the master store
      </p>
    </section>
  )
}
