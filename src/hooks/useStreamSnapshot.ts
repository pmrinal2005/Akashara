/**
 * useStreamSnapshot — subscribes to the engine's KPI snapshot via
 * useSyncExternalStore. The snapshot reference only changes when KPI values
 * change, so React renders are minimal and tear-free under concurrent mode.
 */
import { useSyncExternalStore } from 'react'
import { store } from '../core/engine'
import type { KpiSnapshot } from '../core/types'

export function useKpiSnapshot(): KpiSnapshot {
  return useSyncExternalStore(store.subscribeKpi, store.getKpiSnapshot, store.getKpiSnapshot)
}
