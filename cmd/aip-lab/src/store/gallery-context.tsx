import { createContext, useContext, useReducer, useCallback, type ReactNode, type Dispatch } from 'react'
import type { GalleryEntry, AgentRegistry } from '../model/agent'
import { fetchFromRegistry } from '../gallery/adapters'

export interface GalleryState {
  entries: GalleryEntry[]
  registries: AgentRegistry[]
  categories: string[]
  selectedEntry: GalleryEntry | null
  loading: boolean
  error: string | null
}

// Legacy alias
export type { GalleryEntry as Agent }

const REGISTRIES_KEY = 'aip-lab-registries'

function loadRegistries(): AgentRegistry[] {
  try {
    const stored = localStorage.getItem(REGISTRIES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRegistries(registries: AgentRegistry[]): void {
  localStorage.setItem(REGISTRIES_KEY, JSON.stringify(registries))
}

function extractCategories(entries: GalleryEntry[]): string[] {
  const cats = new Set(entries.map(e => e.category).filter(Boolean))
  return Array.from(cats).sort()
}

const initialState: GalleryState = {
  entries: [],
  registries: loadRegistries(),
  categories: [],
  selectedEntry: null,
  loading: false,
  error: null,
}

type GalleryAction =
  | { type: 'SET_ENTRIES'; entries: GalleryEntry[] }
  | { type: 'APPEND_ENTRIES'; entries: GalleryEntry[] }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SELECT_ENTRY'; entry: GalleryEntry | null }
  | { type: 'ADD_REGISTRY'; registry: AgentRegistry }
  | { type: 'REMOVE_REGISTRY'; url: string }
  | { type: 'TOGGLE_REGISTRY'; url: string }

function galleryReducer(state: GalleryState, action: GalleryAction): GalleryState {
  switch (action.type) {
    case 'SET_ENTRIES': {
      const entries = action.entries
      return { ...state, entries, categories: extractCategories(entries), loading: false, error: null }
    }
    case 'APPEND_ENTRIES': {
      const existing = new Set(state.entries.map(e => `${e.id}@${e.sourceName}`))
      const newEntries = action.entries.filter(e => !existing.has(`${e.id}@${e.sourceName}`))
      const entries = [...state.entries, ...newEntries]
      return { ...state, entries, categories: extractCategories(entries) }
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }
    case 'SELECT_ENTRY':
      return { ...state, selectedEntry: action.entry }
    case 'ADD_REGISTRY': {
      const registries = [...state.registries, action.registry]
      saveRegistries(registries)
      return { ...state, registries }
    }
    case 'REMOVE_REGISTRY': {
      const registries = state.registries.filter(r => r.url !== action.url)
      saveRegistries(registries)
      const entries = state.entries.filter(e => e.sourceName !== action.url && e.sourceName !== state.registries.find(r => r.url === action.url)?.name)
      return { ...state, registries, entries, categories: extractCategories(entries) }
    }
    case 'TOGGLE_REGISTRY': {
      const registries = state.registries.map(r =>
        r.url === action.url ? { ...r, enabled: !r.enabled } : r
      )
      saveRegistries(registries)
      return { ...state, registries }
    }
    default:
      return state
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

export function useGalleryActions() {
  const dispatch = useGalleryDispatch()
  const state = useGalleryState()

  const fetchAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ENTRIES', entries: [] })

    // Fetch from MCP servers
    try {
      const mcpRegistry: AgentRegistry = { url: '', name: 'MCP', sourceType: 'mcp', enabled: true }
      const mcpEntries = await fetchFromRegistry(mcpRegistry)
      if (mcpEntries.length > 0) {
        dispatch({ type: 'APPEND_ENTRIES', entries: mcpEntries })
      }
    } catch {
      // MCP not available
    }

    // Fetch from each enabled registry using adapters
    for (const registry of state.registries) {
      if (!registry.enabled) continue
      try {
        const entries = await fetchFromRegistry(registry)
        dispatch({ type: 'APPEND_ENTRIES', entries })
      } catch (err) {
        console.warn(`Failed to fetch from ${registry.name}:`, err)
      }
    }

    dispatch({ type: 'SET_LOADING', loading: false })
  }, [dispatch, state.registries])

  const addRegistry = useCallback((url: string, name: string, sourceType: AgentRegistry['sourceType'] = 'http-json') => {
    dispatch({ type: 'ADD_REGISTRY', registry: { url, name, sourceType, enabled: true } })
  }, [dispatch])

  const removeRegistry = useCallback((url: string) => {
    dispatch({ type: 'REMOVE_REGISTRY', url })
  }, [dispatch])

  const toggleRegistry = useCallback((url: string) => {
    dispatch({ type: 'TOGGLE_REGISTRY', url })
  }, [dispatch])

  return { fetchAll, addRegistry, removeRegistry, toggleRegistry }
}
