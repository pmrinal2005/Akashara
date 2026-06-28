/**
 * DEPARTMENT ANALYTICS CHART  (uPlot — canvas, ~40KB, live time series)
 *  Plots total annual-savings aggregated by department as a live bar-style
 *  series. Recomputed on a throttled interval (NOT per tick) to avoid the
 *  per-tick re-render trap that Chart.js/Recharts would fall into.
 *  Lives in a content-visibility:auto panel so it doesn't paint when off-screen.
 */
import { useEffect, useRef } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { store } from '../../core/engine'
import { formatCompactCurrency } from '../../core/Sanitizer'

const REFRESH_MS = 1500
const TOP_N = 12

export function DepartmentChart() {
  const hostRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const labelsRef = useRef<string[]>([])

  useEffect(() => {
    const host = hostRef.current!
    let disposed = false

    const aggregate = (): { labels: string[]; values: number[] } => {
      const sums = new Map<string, number>()
      store.rows.forEach((r) => {
        sums.set(r.department, (sums.get(r.department) ?? 0) + r.annual_savings_usd)
      })
      const sorted = Array.from(sums.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_N)
      return { labels: sorted.map((s) => s[0]), values: sorted.map((s) => s[1]) }
    }

    const build = () => {
      const { labels, values } = aggregate()
      labelsRef.current = labels
      const xs = values.map((_, i) => i)

      const opts: uPlot.Options = {
        width: host.clientWidth || 600,
        height: 260,
        scales: { x: { time: false } },
        axes: [
          {
            stroke: '#64748b',
            grid: { stroke: '#1e293b' },
            values: (_u, splits) =>
              splits.map((v) => {
                const lbl = labelsRef.current[v]
                return lbl ? (lbl.length > 10 ? lbl.slice(0, 9) + '…' : lbl) : ''
              }),
            rotate: -30,
            size: 70,
          },
          {
            stroke: '#64748b',
            grid: { stroke: '#1e293b' },
            values: (_u, splits) => splits.map((v) => formatCompactCurrency(v)),
            size: 70,
          },
        ],
        series: [
          {},
          {
            label: 'Annual Savings',
            stroke: '#38bdf8',
            fill: 'rgba(56,189,248,0.25)',
            width: 2,
            points: { show: true, size: 5, stroke: '#7dd3fc' },
            value: (_u, v) => (v == null ? '—' : formatCompactCurrency(v)),
          },
        ],
        cursor: { y: false },
        legend: { show: true },
      }

      plotRef.current = new uPlot(opts, [xs, values], host)
    }

    const refresh = () => {
      if (disposed || !plotRef.current) return
      const { labels, values } = aggregate()
      labelsRef.current = labels
      const xs = values.map((_, i) => i)
      plotRef.current.setData([xs, values])
    }

    build()
    const timer = setInterval(refresh, REFRESH_MS)

    const ro = new ResizeObserver(() => {
      if (plotRef.current) plotRef.current.setSize({ width: host.clientWidth, height: 260 })
    })
    ro.observe(host)

    return () => {
      disposed = true
      clearInterval(timer)
      ro.disconnect()
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [])

  return (
    <section
      id="department-chart"
      aria-label="Annual savings by department"
      className="chart-panel rounded-lg border border-base-600 bg-base-800 p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-accent-soft">
        💹 Top Departments by Annual Savings (live)
      </h2>
      <div ref={hostRef} className="w-full" />
    </section>
  )
}
