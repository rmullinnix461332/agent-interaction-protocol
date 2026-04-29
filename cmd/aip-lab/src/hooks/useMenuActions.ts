import { useEffect } from 'react'
import { useUIDispatch } from '@/store/ui-context'

interface MenuHandlers {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onFind: () => void
  onDelete: () => void
  onDuplicate: () => void
  onSettings: () => void
  onWelcome: () => void
  onAddFolder?: () => void
  onCloseWorkspace?: () => void
  onRunStart?: () => void
  onRunPause?: () => void
  onRunStop?: () => void
}

export function useMenuActions(handlers: MenuHandlers) {
  const uiDispatch = useUIDispatch()

  useEffect(() => {
    const cleanup = window.electronAPI?.onMenuAction((action: string) => {
      switch (action) {
        case 'menu:new': handlers.onNew(); break
        case 'menu:open': handlers.onOpen(); break
        case 'menu:save': handlers.onSave(); break
        case 'menu:undo': handlers.onUndo(); break
        case 'menu:redo': handlers.onRedo(); break
        case 'menu:find': handlers.onFind(); break
        case 'menu:delete': handlers.onDelete(); break
        case 'menu:duplicate': handlers.onDuplicate(); break
        case 'menu:settings': handlers.onSettings(); break
        case 'menu:welcome': handlers.onWelcome(); break
        case 'menu:addFolder': handlers.onAddFolder?.(); break
        case 'menu:closeWorkspace': handlers.onCloseWorkspace?.(); break
        case 'menu:runStart': handlers.onRunStart?.(); break
        case 'menu:runPause': handlers.onRunPause?.(); break
        case 'menu:runStop': handlers.onRunStop?.(); break
        case 'menu:viewCanvas': uiDispatch({ type: 'SET_VIEW_MODE', mode: 'canvas' }); break
        case 'menu:viewYaml': uiDispatch({ type: 'SET_VIEW_MODE', mode: 'yaml' }); break
        case 'menu:viewSplit': uiDispatch({ type: 'SET_VIEW_MODE', mode: 'split' }); break
        case 'menu:toggleChat': uiDispatch({ type: 'TOGGLE_CHAT' }); break
        case 'menu:toggleSidePanel': uiDispatch({ type: 'TOGGLE_SIDE_PANEL' }); break
        case 'menu:toggleTrace':
          uiDispatch({ type: 'SET_TRACE_PANEL', size: 'small' })
          break
      }
    })
    return cleanup
  }, [handlers, uiDispatch])
}
