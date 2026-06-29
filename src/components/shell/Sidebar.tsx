import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  ArcElement,
  Legend,
  LinearScale,
  Tooltip,
  LineController,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js'
import { useSidebar } from '../../hooks/useSidebar'
import { useKpiSnapshot } from '../../hooks/useStreamSnapshot'
import { useViewVersion } from '../../hooks/useViewVersion'
import { store, viewPool, bufferQueue } from '../../core/engine'
import { exportSnapshot } from '../../core/SnapshotExporter'
import { sidebarStore } from '../../core/SidebarStore'
import { formatCompactCurrency, formatInt, formatPercent } from '../../core/Sanitizer'
import type { SidebarTab } from '../../core/SidebarStore'
import {
  AnalyticsIcon,
  AntennaIcon,
  DownloadIcon,
  MenuIcon,
  SettingsIcon,
} from '../common/AppIcons'

Chart.register(
  BarController, BarElement, CategoryScale,
  DoughnutController, ArcElement,
  Legend, LinearScale, Tooltip,
  LineController, LineElement, PointElement, Filler,
)

// ─── Tab config ──────────────────────────────────────────────────────────────
const TABS: { id: SidebarTab; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <AntennaIcon className="h-4 w-4" /> },
  { id: 'activity', label: 'Activity', icon: <AnalyticsIcon className="h-4 w-4" /> },
  { id: 'export', label: 'Export', icon: <DownloadIcon className="h-4 w-4" /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon className="h-4 w-4" /> },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-400 truncate">{label}</span>
      <span className={`tnum text-xs font-semibold flex-shrink-0 ${accent ?? 'text-white'}`}>{value}</span>
    </div>
  )
}

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const kpi = useKpiSnapshot()
  useViewVersion()
  const visible = viewPool.visibleCount
  const storeSize = store.size

  const topDepts = useMemo(() => {
    const map = new Map<string, number>()
    store.rows.forEach((r) => {
      if (!r.department) return
      map.set(r.department, (map.get(r.department) ?? 0) + r.annual_savings_usd)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSize])

  const topIndustries = useMemo(() => {
    const map = new Map<string, number>()
    store.rows.forEach((r) => {
      if (!r.industry) return
      map.set(r.industry, (map.get(r.industry) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSize])

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Stream health */}
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Stream Health
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Total Rows', value: formatInt(kpi.totalRows), accent: 'text-accent-soft' },
            { label: 'Stream Ticks', value: formatInt(kpi.totalTicks), accent: 'text-slate-200' },
            { label: 'Visible Rows', value: formatInt(visible), accent: 'text-accent' },
            { label: 'Active Alerts', value: formatInt(kpi.activeAlerts), accent: kpi.activeAlerts > 0 ? 'text-danger' : 'text-slate-300' },
          ].map((s) => (
            <div key={s.label} className="liquid-glass flex flex-col rounded-xl px-2.5 py-2">
              <span className="text-[9.5px] uppercase tracking-wider text-slate-400">{s.label}</span>
              <span className={`tnum mt-0.5 text-sm font-bold ${s.accent}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Financials */}
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Financials
        </h4>
        <div className="liquid-glass rounded-xl p-2.5">
          <StatRow label="Total Annual Savings" value={formatCompactCurrency(kpi.totalSavings)} accent="text-ok" />
          <StatRow label="Total Robots" value={formatInt(kpi.totalRobots)} accent="text-accent" />
          <StatRow label="Average ROI" value={formatPercent(kpi.avgRoi)} accent="text-warn" />
        </div>
      </section>

      {/* Top Departments */}
      {topDepts.length > 0 && (
        <section>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
            Top Departments (savings)
          </h4>
          <div className="liquid-glass rounded-xl p-2.5">
            {topDepts.map(([dept, val]) => (
              <StatRow key={dept} label={dept} value={formatCompactCurrency(val)} accent="text-ok" />
            ))}
          </div>
        </section>
      )}

      {/* Top Industries */}
      {topIndustries.length > 0 && (
        <section>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
            Top Industries (projects)
          </h4>
          <div className="liquid-glass rounded-xl p-2.5">
            {topIndustries.map(([ind, count]) => (
              <StatRow key={ind} label={ind} value={formatInt(count)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Activity Tab — live micro chart ──────────────────────────────────────────
const ACTIVITY_MAX_POINTS = 30

function ActivityTab() {
  const kpi = useKpiSnapshot()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<Chart | null>(null)
  const historyRef = useRef<number[]>([])
  const prevTickRef = useRef(0)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(ACTIVITY_MAX_POINTS).fill(''),
        datasets: [
          {
            label: 'Rows/tick',
            data: Array(ACTIVITY_MAX_POINTS).fill(0),
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56,189,248,0.12)',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: {
            display: true,
            ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 4 },
            grid: { color: 'rgba(255,255,255,0.04)' },
            beginAtZero: true,
          },
        },
      },
    })
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [])

  // Push ticks into the chart
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const delta = kpi.totalRows - prevTickRef.current
    prevTickRef.current = kpi.totalRows
    if (delta <= 0 && historyRef.current.length >= ACTIVITY_MAX_POINTS) return

    historyRef.current.push(Math.max(0, delta))
    if (historyRef.current.length > ACTIVITY_MAX_POINTS) {
      historyRef.current.shift()
    }
    chart.data.datasets[0].data = [...historyRef.current]
    chart.update('none')
  }, [kpi.totalRows, kpi.totalTicks])

  const isPaused = bufferQueue.isPaused()

  return (
    <div className="flex flex-col gap-4 p-3">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Row Ingestion Rate
        </h4>
        <div className="liquid-glass relative h-[140px] rounded-xl p-2">
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <p className="mt-1 text-[10px] text-slate-500">Delta rows per stream tick (last {ACTIVITY_MAX_POINTS} ticks)</p>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Pipeline Status
        </h4>
        <div className="liquid-glass rounded-xl p-2.5 space-y-1">
          <StatRow
            label="Stream State"
            value={isPaused ? 'Paused' : 'Live'}
            accent={isPaused ? 'text-warn' : 'text-ok'}
          />
          <StatRow label="Total Ticks" value={formatInt(kpi.totalTicks)} />
          <StatRow label="Total Rows Processed" value={formatInt(kpi.totalRows)} accent="text-accent-soft" />
          <StatRow label="Active Alerts" value={formatInt(kpi.activeAlerts)} accent={kpi.activeAlerts > 0 ? 'text-danger' : 'text-slate-300'} />
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Savings Accumulation
        </h4>
        <div className="liquid-glass rounded-xl p-2.5">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Cumulative Annual Savings</div>
            <div className="tnum mt-1 text-xl font-bold text-ok">{formatCompactCurrency(kpi.totalSavings)}</div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Export Tab ────────────────────────────────────────────────────────────────
function ExportTab() {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [lastExport, setLastExport] = useState<string | null>(null)
  useViewVersion()

  const visible = viewPool.visibleCount

  const handleExport = () => {
    if (exporting || visible === 0) return
    setExporting(true)
    setProgress({ done: 0, total: visible })
    exportSnapshot((done, total) => {
      setProgress({ done, total })
      if (done >= total) {
        const now = new Date().toLocaleTimeString()
        setLastExport(now)
        setTimeout(() => {
          setExporting(false)
          setProgress(null)
        }, 800)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          CSV Snapshot Export
        </h4>
        <div className="liquid-glass rounded-xl p-3 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">
            Downloads the currently visible rows as a <code className="text-accent-soft">.csv</code> file,
            respecting all active multi-column sorts, keyword filters, and search terms.
            Runs fully client-side and does not pause the stream.
          </p>

          <div className="space-y-1.5">
            <StatRow label="Rows to export" value={formatInt(visible)} accent="text-accent-soft" />
            {lastExport && (
              <StatRow label="Last export" value={lastExport} accent="text-ok" />
            )}
          </div>

          <button
            onClick={handleExport}
            disabled={exporting || visible === 0}
            className={
              'w-full flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ' +
              (exporting || visible === 0
                ? 'cursor-not-allowed bg-white/5 text-slate-500'
                : 'bg-accent/20 text-accent-soft hover:bg-accent/30')
            }
          >
            {exporting ? (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
                {progress ? `${Math.round((progress.done / progress.total) * 100)}%` : 'Preparing…'}
              </>
            ) : (
              <><DownloadIcon className="h-4 w-4" /> Download CSV</>
            )}
          </button>
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Export Notes
        </h4>
        <div className="liquid-glass rounded-xl p-2.5 space-y-1.5 text-[11px] text-slate-400">
          <p>• Exported CSV includes all 18 data fields per row</p>
          <p>• Currency values are formatted (e.g. $1,234,567)</p>
          <p>• ROI values include 2 decimal places</p>
          <p>• Processing uses <code className="text-slate-300">requestIdleCallback</code> to avoid blocking stream</p>
          <p>• File name includes export timestamp</p>
        </div>
      </section>
    </div>
  )
}

// ── Settings Tab ─────────────────────────────────────────────────────────────
/* Task 3 — the accent palette is exposed to Tailwind via two CSS
   variables (`--color-accent` and `--color-accent-soft`).  Each
   swatch in the picker maps to a pair of "R G B" triples (the
   Tailwind config wraps them with `rgb(var(...) / <alpha>)`).
   Writing both vars on :root makes every Tailwind utility that
   uses `accent` re-paint instantly, no reload required. */
const ACCENT_MAP: Record<string, { hex: string; main: string; soft: string }> = {
  blue:   { hex: '#38bdf8', main: '56 189 248',  soft: '125 211 252' },
  purple: { hex: '#a78bfa', main: '167 139 250', soft: '196 181 253' },
  green:  { hex: '#4ade80', main: '74 222 128',  soft: '134 239 172' },
  orange: { hex: '#fb923c', main: '251 146 60',  soft: '253 186 116' },
  pink:   { hex: '#f472b6', main: '244 114 182', soft: '249 168 212' },
}

/** Apply an accent key to :root. Re-used by both the picker and the
 *  cross-component reset listener. */
function writeAccentVars(key: string) {
  const entry = ACCENT_MAP[key] ?? ACCENT_MAP.blue
  const root = document.documentElement
  root.style.setProperty('--color-accent', entry.main)
  root.style.setProperty('--color-accent-soft', entry.soft)
}

function SettingsTab() {
  const [rowHeight, setRowHeight] = useState(() => {
    try { return parseInt(localStorage.getItem('rpa-monitor:rowHeight') ?? '34') } catch { return 34 }
  })
  const [accentColor, setAccentColor] = useState(() => {
    try { return localStorage.getItem('rpa-monitor:accent') ?? 'blue' } catch { return 'blue' }
  })
  const [showDebug, setShowDebug] = useState(() => {
    return window.location.search.includes('debug=1')
  })

  /* Hydrate the CSS vars from persisted state on mount so a hard
     refresh doesn't flash the default sky-blue before the picker
     state syncs back in. */
  useEffect(() => {
    writeAccentVars(accentColor)
    document.documentElement.style.setProperty('--row-height', `${rowHeight}px`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applyRowHeight = (h: number) => {
    setRowHeight(h)
    try { localStorage.setItem('rpa-monitor:rowHeight', String(h)) } catch {}
    document.documentElement.style.setProperty('--row-height', `${h}px`)
  }

  /* Task 3 fix — instantly repaint by writing BOTH CSS variables
     that Tailwind's `accent` palette resolves against. The old
     implementation only wrote a single var that the compiled
     CSS never consumed, so the change appeared to need a reload. */
  const applyAccent = (key: string) => {
    setAccentColor(key)
    try { localStorage.setItem('rpa-monitor:accent', key) } catch {}
    writeAccentVars(key)
  }

  /* Task 2 wire-up — the header's Reset Layout button also broadcasts
     a `rpa-monitor:reset-settings` event so this tab can restore its
     own state (row height, accent, debug) without the user having to
     click each one individually. */
  const resetSettings = useCallback(() => {
    setRowHeight(34)
    try { localStorage.removeItem('rpa-monitor:rowHeight') } catch {}
    document.documentElement.style.setProperty('--row-height', '34px')

    setAccentColor('blue')
    try { localStorage.removeItem('rpa-monitor:accent') } catch {}
    writeAccentVars('blue')

    if (window.location.search.includes('debug=1')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('debug')
      window.history.replaceState({}, '', url.toString())
    }
    setShowDebug(false)
  }, [])

  useEffect(() => {
    window.addEventListener('rpa-monitor:reset-settings', resetSettings)
    return () => window.removeEventListener('rpa-monitor:reset-settings', resetSettings)
  }, [resetSettings])

  const toggleDebug = () => {
    const next = !showDebug
    setShowDebug(next)
    const url = new URL(window.location.href)
    if (next) url.searchParams.set('debug', '1')
    else url.searchParams.delete('debug')
    window.history.replaceState({}, '', url.toString())
    window.location.reload()
  }

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Row height */}
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Grid Row Height
        </h4>
        <div className="liquid-glass rounded-xl p-2.5">
          <div className="flex items-center justify-between gap-3">
            <input
              type="range"
              min={28}
              max={56}
              step={4}
              value={rowHeight}
              onChange={(e) => applyRowHeight(Number(e.target.value))}
              className="flex-1 accent-sky-400"
            />
            <span className="tnum w-10 text-right text-xs text-white">{rowHeight}px</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Controls pixel height of each grid row</p>
        </div>
      </section>

      {/* Accent colour */}
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Accent Colour
        </h4>
        <div className="liquid-glass rounded-xl p-2.5">
          <div className="flex flex-wrap gap-2">
            {Object.entries(ACCENT_MAP).map(([key, { hex }]) => (
              <button
                key={key}
                onClick={() => applyAccent(key)}
                title={key}
                className={
                  'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ' +
                  (accentColor === key ? 'border-white scale-110' : 'border-transparent')
                }
                style={{ backgroundColor: hex }}
                aria-pressed={accentColor === key}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] text-slate-500">Updates instantly across the entire workspace</p>
        </div>
      </section>

      {/* Debug overlay toggle */}
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          Debug Tools
        </h4>
        <div className="liquid-glass rounded-xl p-2.5">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-200">Debug Overlay</div>
              <div className="text-[10px] text-slate-500">Live recycler DOM-node count</div>
            </div>
            <button
              onClick={toggleDebug}
              className={
                'h-5 w-9 rounded-full transition-colors relative ' +
                (showDebug ? 'bg-accent' : 'bg-white/10')
              }
              role="switch"
              aria-checked={showDebug}
            >
              <span
                className={
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ' +
                  (showDebug ? 'left-4' : 'left-0.5')
                }
              />
            </button>
          </label>
        </div>
      </section>

      {/* App info */}
      <section>
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-soft">
          App Info
        </h4>
        <div className="liquid-glass rounded-xl p-2.5 space-y-1 text-[10.5px] text-slate-400">
          <p>Akashara · RPA Telemetry Monitor</p>
          <p>Frontend Battle 2026 · Phase 2</p>
          <p>Vite 6 + React 18 + TypeScript</p>
          <p>Zero external grid/virtualization libs</p>
        </div>
      </section>
    </div>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export function Sidebar() {
  const { state, toggle, setTab } = useSidebar()
  const { open, tab } = state

  return (
    <>
      {/* Mobile backdrop when open on small screens */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => sidebarStore.close()}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        aria-label="Operator sidebar"
        className={
          'sidebar-panel liquid-glass flex flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out ' +
          (open
            ? 'w-[260px] min-w-[260px]'
            : 'w-[44px] min-w-[44px]')
        }
        style={{ overflow: 'hidden' }}
      >
        {/* ── Toggle button */}
        <div className="flex h-10 flex-shrink-0 items-center border-b border-white/10 px-2">
          <button
            onClick={toggle}
            title={open ? 'Collapse sidebar' : 'Expand sidebar'}
            className="liquid-glass flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-slate-300 hover:text-white"
            aria-expanded={open}
          >
            <svg
              className="h-3.5 w-3.5 transition-transform duration-200"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M10 3L5 8l5 5" />
            </svg>
          </button>
          {open && (
            <span className="ml-2 truncate text-xs font-semibold text-slate-200">Operator Panel</span>
          )}
        </div>

        {/* ── Tab icons (always visible even when collapsed) */}
        <div className="flex flex-shrink-0 flex-col border-b border-white/10 py-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.label}
              aria-pressed={tab === t.id}
              className={
                'flex items-center gap-2.5 px-2.5 py-2 text-xs transition-colors ' +
                (tab === t.id
                  ? 'text-accent-soft bg-white/5'
                  : 'text-slate-400 hover:text-slate-200')
              }
            >
              <span className="flex-shrink-0 text-base leading-none">{t.icon}</span>
              {open && <span className="truncate font-medium">{t.label}</span>}
            </button>
          ))}
        </div>

        {/* ── Tab content (only rendered when open) */}
        {open && (
          <div className="glass-scroll min-h-0 flex-1 overflow-y-auto">
            {tab === 'overview' && <OverviewTab />}
            {tab === 'activity' && <ActivityTab />}
            {tab === 'export' && <ExportTab />}
            {tab === 'settings' && <SettingsTab />}
          </div>
        )}
      </aside>
    </>
  )
}

// ── Sidebar toggle button for the header bar ─────────────────────────────────
export function SidebarToggleButton() {
  const { state, toggle } = useSidebar()
  return (
    <button
      onClick={toggle}
      title={state.open ? 'Collapse sidebar' : 'Expand sidebar'}
      aria-pressed={state.open}
      className="liquid-glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-slate-300 hover:text-white"
    >
      <MenuIcon className="h-4 w-4" />
      <span className="hidden sm:inline text-xs">{state.open ? 'Hide Panel' : 'Show Panel'}</span>
    </button>
  )
}
