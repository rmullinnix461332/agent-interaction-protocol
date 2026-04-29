import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode, type Dispatch } from 'react'

interface WorkspaceState {
  folders: string[]
  trees: Record<string, FileTreeNode[]>
  loading: boolean
}

type WorkspaceAction =
  | { type: 'SET_FOLDERS'; folders: string[] }
  | { type: 'SET_TREE'; folder: string; tree: FileTreeNode[] }
  | { type: 'SET_LOADING'; loading: boolean }

const initialState: WorkspaceState = {
  folders: [],
  trees: {},
  loading: false,
}

function reducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_FOLDERS':
      return { ...state, folders: action.folders }
    case 'SET_TREE':
      return { ...state, trees: { ...state.trees, [action.folder]: action.tree } }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    default:
      return state
  }
}

const WorkspaceStateContext = createContext<WorkspaceState>(initialState)
const WorkspaceDispatchContext = createContext<Dispatch<WorkspaceAction>>(() => {})

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Load workspace folders on mount
  useEffect(() => {
    window.electronAPI?.workspaceGetFolders().then(folders => {
      dispatch({ type: 'SET_FOLDERS', folders })
    })
  }, [])

  // Load trees when folders change
  useEffect(() => {
    for (const folder of state.folders) {
      if (!state.trees[folder]) {
        window.electronAPI?.workspaceGetTree(folder).then(tree => {
          dispatch({ type: 'SET_TREE', folder, tree })
        })
      }
    }
  }, [state.folders, state.trees])

  return (
    <WorkspaceStateContext.Provider value={state}>
      <WorkspaceDispatchContext.Provider value={dispatch}>
        {children}
      </WorkspaceDispatchContext.Provider>
    </WorkspaceStateContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceStateContext)
}

export function useWorkspaceDispatch() {
  return useContext(WorkspaceDispatchContext)
}

export function useWorkspaceActions() {
  const dispatch = useWorkspaceDispatch()

  const addFolder = useCallback(async () => {
    const folderPath = await window.electronAPI?.workspaceAddFolder()
    if (folderPath) {
      const folders = await window.electronAPI?.workspaceGetFolders() ?? []
      dispatch({ type: 'SET_FOLDERS', folders })
      const tree = await window.electronAPI?.workspaceGetTree(folderPath) ?? []
      dispatch({ type: 'SET_TREE', folder: folderPath, tree })
    }
  }, [dispatch])

  const removeFolder = useCallback(async (folderPath: string) => {
    const folders = await window.electronAPI?.workspaceRemoveFolder(folderPath) ?? []
    dispatch({ type: 'SET_FOLDERS', folders })
  }, [dispatch])

  const closeAll = useCallback(async () => {
    await window.electronAPI?.workspaceCloseAll()
    dispatch({ type: 'SET_FOLDERS', folders: [] })
  }, [dispatch])

  const refreshFolder = useCallback(async (folderPath: string) => {
    const tree = await window.electronAPI?.workspaceGetTree(folderPath) ?? []
    dispatch({ type: 'SET_TREE', folder: folderPath, tree })
  }, [dispatch])

  return { addFolder, removeFolder, closeAll, refreshFolder }
}
