import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ViewMode = 'canvas' | 'yaml' | 'split'
export type TracePanelSize = 'closed' | 'small' | 'large'

export interface UIState {
  themeMode: ThemeMode
  viewMode: ViewMode
  toolboxOpen: boolean
  propertiesOpen: boolean
  chatOpen: boolean
  tracePanelSize: TracePanelSize
  selectedNodeId: string | null
}

const initialState: UIState = {
  themeMode: 'system',
  viewMode: 'canvas',
  toolboxOpen: true,
  propertiesOpen: true,
  chatOpen: false,
  tracePanelSize: 'closed',
  selectedNodeId: null,
}

type UIAction =
  | { type: 'SET_THEME'; mode: ThemeMode }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'TOGGLE_TOOLBOX' }
  | { type: 'TOGGLE_PROPERTIES' }
  | { type: 'TOGGLE_CHAT' }
  | { type: 'SET_TRACE_PANEL'; size: TracePanelSize }
  | { type: 'SELECT_NODE'; nodeId: string | null }

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, themeMode: action.mode }
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode }
    case 'TOGGLE_TOOLBOX':
      return { ...state, toolboxOpen: !state.toolboxOpen }
    case 'TOGGLE_PROPERTIES':
      return { ...state, propertiesOpen: !state.propertiesOpen }
    case 'TOGGLE_CHAT':
      return { ...state, chatOpen: !state.chatOpen }
    case 'SET_TRACE_PANEL':
      return { ...state, tracePanelSize: action.size }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId, propertiesOpen: action.nodeId !== null }
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
