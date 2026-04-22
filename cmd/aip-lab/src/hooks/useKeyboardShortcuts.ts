import { useEffect } from 'react'

interface ShortcutHandlers {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onUndo: () => void
  onRedo: () => void
  onDelete: () => void
  onDuplicate: () => void
  onFind: () => void
}

/**
 * Global keyboard shortcuts.
 * Skips when focus is in an input/textarea to avoid conflicts.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

      // Shortcuts that work even in inputs
      if (meta && e.key === 's') {
        e.preventDefault()
        handlers.onSave()
        return
      }

      if (meta && e.key === 'n') {
        e.preventDefault()
        handlers.onNew()
        return
      }

      if (meta && e.key === 'o') {
        e.preventDefault()
        handlers.onOpen()
        return
      }

      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handlers.onUndo()
        return
      }

      if (meta && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handlers.onRedo()
        return
      }

      // Shortcuts that only work outside inputs
      if (isInput) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        handlers.onDelete()
        return
      }

      if (meta && e.key === 'd') {
        e.preventDefault()
        handlers.onDuplicate()
        return
      }

      if (meta && e.key === 'f') {
        e.preventDefault()
        handlers.onFind()
        return
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handlers])
}
