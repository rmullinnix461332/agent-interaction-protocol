import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { Agent } from '../model/agent'

export interface GalleryState {
  agents: Agent[]
  loading: boolean
  error: string | null
}

const initialState: GalleryState = { agents: [], loading: false, error: null }

type GalleryAction =
  | { type: 'SET_AGENTS'; agents: Agent[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'ADD_AGENT'; agent: Agent }
  | { type: 'REMOVE_AGENT'; agentId: string }

function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'SET_AGENTS': return { ...state, agents: action.agents, loading: false, error: null }
    case 'SET_LOADING': return { ...state, loading: action.loading }
    case 'SET_ERROR': return { ...state, error: action.error, loading: false }
    case 'ADD_AGENT': return { ...state, agents: [...state.agents, action.agent] }
    case 'REMOVE_AGENT': return { ...state, agents: state.agents.filter((a) => a.id !== action.agentId) }
    default: return state
  }
}

const GalleryStateContext = createContext<GalleryState>(initialState)
const GalleryDispatchContext = createContext<Dispatch<GalleryAction>>(() => {})

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(galleryReducer, initialState)
  return (
    <GalleryStateContext.Provider value={state}>
      <GalleryDispatchContext.Provider value={dispatch}>
        {children}
      </GalleryDispatchContext.Provider>
    </GalleryStateContext.Provider>
  )
}

export function useGalleryState() { return useContext(GalleryStateContext) }
export function useGalleryDispatch() { return useContext(GalleryDispatchContext) }
