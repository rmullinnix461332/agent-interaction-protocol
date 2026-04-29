import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ViewMode = 'canvas' | 'yaml' | 'split'
export type TracePanelSize = 'closed' | 'small' | 'large'
export type ActivityPanel = 'explorer' | 'design' | 'debug' | 'scm' | 'marketplace'

export interface UIState {
  themeMode: ThemeMode
  viewMode: ViewMode
  activePanel: ActivityPanel
  sidePanelOpen: boolean
  chatOpen: boolean
  tracePanelSize: TracePanelSize
  selectedNodeId: string | null
  // Legacy compat
  toolboxOpen: boolean
  propertiesOpen: boolean
}

const initialState: UIState = {
  themeMode: 'system',
  viewMode: 'canvas',
  activePanel: 'design',
  sidePanelOpen: true,
  chatOpen: false,
  tracePanelSize: 'closed',
  selectedNodeId: null,
  toolboxOpen: true,
  propertiesOpen: true,
}

type UIAction =
  | { type: 'SET_THEME'; mode: ThemeMode }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_ACTIVE_PANEL'; panel: ActivityPanel }
  | { type: 'TOGGLE_SIDE_PANEL' }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_TRACE_PANEL'; size: TracePanelSize }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  // Legacy compat
  | { type: 'TOGGLE_TOOLBOX' }
  | { type: 'TOGGLE_PROPERTIES' }

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, themeMode: action.mode }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode }
    case 'SET_ACTIVE_PANEL': {
      // Clicking the same panel toggles the side panel
      if (state.activePanel === action.panel && state.sidePanelOpen) {
        return { ...state, sidePanelOpen: false }
      }
      // Switch editor mode based on panel
      const viewMode = action.panel === 'design' ? 'canvas' as ViewMode
        : action.panel === 'explorer' ? 'yaml' as ViewMode
        : state.viewMode
      return { ...state, activePanel: action.panel, sidePanelOpen: true, viewMode }
    }
    case 'TOGGLE_SIDE_PANEL':
      return { ...state, sidePanelOpen: !state.sidePanelOpen }
    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen }
    case 'SET_TRACE_PANEL':
      return { ...state, tracePanelSize: action.size }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId, propertiesOpen: action.nodeId !== null }
    case 'TOGGLE_TOOLBOX':
      return { ...state, toolboxOpen: !state.toolboxOpen }
    case 'TOGGLE_PROPERTIES':
      return { ...state, propertiesOpen: !state.propertiesOpen }
    default:
      return state
  }
}

const UIStateContext = createContext<UIState>(initialState)
const UIDispatchContext = createContext<Dispatch<UIAction>>(() => {})

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState)
  return (
    <UIStateContext.Provider value={state}>
      <UIDispatchContext.Provider value={dispatch}>
        {children}
      </UIDispatchContext.Provider>
    </UIStateContext.Provider>
  )
}

export function useUIState() { return useContext(UIStateContext) }
export function useUIDispatch() { return useContext(UIDispatchContext) }
