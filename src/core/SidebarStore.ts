/**
 * ===========================================================================
 *  SIDEBAR STORE — collapsible sidebar state (framework-agnostic)
 * ===========================================================================
 *  Persists the open/closed state and the active tab in localStorage so the
 *  operator's workspace choice survives a hard refresh.
 */

type Listener = () => void

export type SidebarTab = 'overview' | 'activity' | 'export' | 'settings'

export interface SidebarState {
  open: boolean
  tab: SidebarTab
}

const LS_KEY = 'rpa-monitor:sidebar:v1'

function read(): SidebarState {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { open: true, tab: 'overview' }
    return JSON.parse(raw) as SidebarState
  } catch {
    return { open: true, tab: 'overview' }
  }
}

function persist(state: SidebarState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    // storage may be unavailable
  }
}

class SidebarStore {
  private state: SidebarState = read()
  private listeners = new Set<Listener>()

  getState(): SidebarState {
    return this.state
  }

  toggle(): void {
    this.state = { ...this.state, open: !this.state.open }
    persist(this.state)
    this.emit()
  }

  open(): void {
    if (this.state.open) return
    this.state = { ...this.state, open: true }
    persist(this.state)
    this.emit()
  }

  close(): void {
    if (!this.state.open) return
    this.state = { ...this.state, open: false }
    persist(this.state)
    this.emit()
  }

  setTab(tab: SidebarTab): void {
    this.state = { ...this.state, tab, open: true }
    persist(this.state)
    this.emit()
  }

  getSnapshot = (): SidebarState => this.state

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(): void {
    this.listeners.forEach((fn) => fn())
  }
}

export const sidebarStore = new SidebarStore()
