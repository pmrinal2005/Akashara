import { useState, useCallback } from 'react'
import { exportSnapshot } from '../../core/SnapshotExporter'
import { viewPool } from '../../core/engine'
import { useViewVersion } from '../../hooks/useViewVersion'
import { DownloadIcon } from '../common/AppIcons'

export function SnapshotExportButton() {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  useViewVersion() // re-render when view changes so count stays accurate

  const handleExport = useCallback(() => {
    if (exporting) return
    const count = viewPool.visibleCount
    if (count === 0) {
      alert('No rows in the current view to export.')
      return
    }
    setExporting(true)
    setProgress({ done: 0, total: count })
    exportSnapshot((done, total) => {
      setProgress({ done, total })
      if (done >= total) {
        setTimeout(() => {
          setExporting(false)
          setProgress(null)
        }, 800)
      }
    })
  }, [exporting])

  const count = viewPool.visibleCount

  return (
    <button
      onClick={handleExport}
      disabled={exporting || count === 0}
      title={
        count === 0
          ? 'No rows to export (apply filters or wait for stream)'
          : `Export ${count.toLocaleString()} rows as CSV (respects active sort & filters)`
      }
      className={
        'liquid-glass flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ' +
        (exporting || count === 0
          ? 'cursor-not-allowed text-slate-500'
          : 'text-accent-soft hover:text-white')
      }
      aria-busy={exporting}
    >
      {exporting ? (
        <>
          <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
          {progress
            ? `${Math.round((progress.done / progress.total) * 100)}%`
            : 'Preparing…'}
        </>
      ) : (
        <>
          <DownloadIcon className="h-4 w-4" /> Export CSV
          {count > 0 && (
            <span className="tnum rounded-full bg-white/10 px-1.5 py-0.5 text-[10.5px] text-slate-300">
              {count.toLocaleString()}
            </span>
          )}
        </>
      )}
    </button>
  )
}
