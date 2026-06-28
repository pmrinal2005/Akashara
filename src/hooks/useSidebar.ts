import { useSyncExternalStore } from 'react'
import { sidebarStore } from '../core/SidebarStore'
import type { SidebarState, SidebarTab } from '../core/SidebarStore'

export function useSidebar(): {
  state: SidebarState
  toggle: () => void
  open: () => void
  close: () => void
  setTab: (tab: SidebarTab) => void
} {
  const state = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getSnapshot,
  )
  return {
    state,
    toggle: () => sidebarStore.toggle(),
    open: () => sidebarStore.open(),
    close: () => sidebarStore.close(),
    setTab: (tab) => sidebarStore.setTab(tab),
  }
}
