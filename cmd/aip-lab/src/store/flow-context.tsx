import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { Flow } from '../model/flow'
import type { DisplayFile } from '../model/display'
import { createDefaultDisplay } from '../model/display'

// --- Tab ---

export interface FlowTab {
  id: string
  flow: Flow
  filePath: string | null
  display: DisplayFile
  dirty: boolean
  past: Flow[]
  future: Flow[]
}

// --- State ---

export interface FlowState {
  tabs: FlowTab[]
  activeTabId: string | null
  // Convenience accessors for the active tab
  flow: Flow | null
  filePath: string | null
  display: DisplayFile
  dirty: boolean
  past: Flow[]
  future: Flow[]
}

const BLANK_FLOW: Flow = {
  apiVersion: 'aip/v0.1',
  kind: 'Flow',
  metadata: { name: 'untitled' },
  participants: [],
  artifacts: [],
  steps: [],
}

let tabCounter = 0

function newTabId(): string {
  tabCounter++
  return `tab-${tabCounter}`
}

const initialState: FlowState = {
  tabs: [],
  activeTabId: null,
  flow: null,
  filePath: null,
  display: createDefaultDisplay(),
  dirty: false,
  past: [],
  future: [],
}

// --- Actions ---

type FlowAction =
  | { type: 'NEW_FLOW' }
  | { type: 'LOAD_FLOW'; flow: Flow; filePath: string; display: DisplayFile | null }
  | { type: 'UPDATE_FLOW'; flow: Flow }
  | { type: 'UPDATE_DISPLAY'; display: DisplayFile }
  | { type: 'SET_FILE_PATH'; filePath: string }
  | { type: 'MARK_SAVED' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SWITCH_TAB'; tabId: string }
  | { type: 'CLOSE_TAB'; tabId: string }

// --- Helpers ---

const MAX_HISTORY = 50

function deriveActive(tabs: FlowTab[], activeTabId: string | null): Partial<FlowState> {
  const tab = tabs.find((t) => t.id === activeTabId)
  if (!tab) return { flow: null, filePath: null, display: createDefaultDisplay(), dirty: false, past: [], future: [] }
  return { flow: tab.flow, filePath: tab.filePath, display: tab.display, dirty: tab.dirty, past: tab.past, future: tab.future }
}

function updateActiveTab(state: FlowState, updater: (tab: FlowTab) => FlowTab): FlowState {
  if (!state.activeTabId) return state
  const tabs = state.tabs.map((t) => t.id === state.activeTabId ? updater(t) : t)
  return { ...state, tabs, ...deriveActive(tabs, state.activeTabId) }
}

// --- Reducer ---

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case 'NEW_FLOW': {
      const id = newTabId()
      const tab: FlowTab = {
        id, flow: { ...BLANK_FLOW, metadata: { name: 'untitled' } },
        filePath: null, display: createDefaultDisplay(), dirty: false, past: [], future: [],
      }
      const tabs = [...state.tabs, tab]
      return { ...state, tabs, activeTabId: id, ...deriveActive(tabs, id) }
    }

    case 'LOAD_FLOW': {
      // Check if already open
      const existing = state.tabs.find((t) => t.filePath === action.filePath)
      if (existing) {
        return { ...state, activeTabId: existing.id, ...deriveActive(state.tabs, existing.id) }
      }
      const id = newTabId()
      const tab: FlowTab = {
        id, flow: action.flow, filePath: action.filePath,
        display: action.display || createDefaultDisplay(), dirty: false, past: [], future: [],
      }
      const tabs = [...state.tabs, tab]
      return { ...state, tabs, activeTabId: id, ...deriveActive(tabs, id) }
    }

    case 'UPDATE_FLOW':
      return updateActiveTab(state, (tab) => ({
        ...tab,
        flow: action.flow,
        dirty: true,
        past: [...tab.past.slice(-(MAX_HISTORY - 1)), tab.flow],
        future: [],
      }))

    case 'UPDATE_DISPLAY':
      return updateActiveTab(state, (tab) => ({ ...tab, display: action.display }))

    case 'SET_FILE_PATH':
      return updateActiveTab(state, (tab) => ({ ...tab, filePath: action.filePath }))

    case 'MARK_SAVED':
      return updateActiveTab(state, (tab) => ({ ...tab, dirty: false }))

    case 'UNDO':
      return updateActiveTab(state, (tab) => {
        if (tab.past.length === 0) return tab
        const previous = tab.past[tab.past.length - 1]
        return {
          ...tab, flow: previous,
          past: tab.past.slice(0, -1),
          future: [tab.flow, ...tab.future],
          dirty: true,
        }
      })

    case 'REDO':
      return updateActiveTab(state, (tab) => {
        if (tab.future.length === 0) return tab
        const next = tab.future[0]
        return {
          ...tab, flow: next,
          past: [...tab.past, tab.flow],
          future: tab.future.slice(1),
          dirty: true,
        }
      })

    case 'SWITCH_TAB': {
      if (!state.tabs.find((t) => t.id === action.tabId)) return state
      return { ...state, activeTabId: action.tabId, ...deriveActive(state.tabs, action.tabId) }
    }

    case 'CLOSE_TAB': {
      const tabs = state.tabs.filter((t) => t.id !== action.tabId)
      let activeTabId = state.activeTabId
      if (activeTabId === action.tabId) {
        activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null
      }
      return { ...state, tabs, activeTabId, ...deriveActive(tabs, activeTabId) }
    }

    default:
      return state
  }
}

// --- Context ---

const FlowStateContext = createContext<FlowState>(initialState)
const FlowDispatchContext = createContext<Dispatch<FlowAction>>(() => {})

export function FlowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, initialState)
  return (
    <FlowStateContext.Provider value={state}>
      <FlowDispatchContext.Provider value={dispatch}>
        {children}
      </FlowDispatchContext.Provider>
    </FlowStateContext.Provider>
  )
}

export function useFlowState() { return useContext(FlowStateContext) }
export function useFlowDispatch() { return useContext(FlowDispatchContext) }
