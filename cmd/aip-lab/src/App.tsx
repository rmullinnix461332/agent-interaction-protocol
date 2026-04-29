import { useMemo, useCallback, useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { FlowProvider, useFlowState, useFlowDispatch } from './store/flow-context'
import { UIProvider, useUIState, useUIDispatch } from './store/ui-context'
import { ChatProvider } from './store/chat-context'
import { LabProvider } from './store/lab-context'
import { GalleryProvider } from './store/gallery-context'
import { WorkspaceProvider, useWorkspaceActions } from './store/workspace-context'
import { buildTheme } from './theme/theme'
import { parseFlow, serializeFlow } from './yaml/parser'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMenuActions } from './hooks/useMenuActions'
import AppLayout from './layout/AppLayout'
import ParticipantsDialog from './dialogs/ParticipantsDialog'
import ArtifactsDialog from './dialogs/ArtifactsDialog'
import MetadataDialog from './dialogs/MetadataDialog'
import SettingsDialog from './dialogs/SettingsDialog'
import GitCommitDialog from './dialogs/GitCommitDialog'
import CLIOutputDialog from './dialogs/CLIOutputDialog'
import WelcomeDialog from './dialogs/WelcomeDialog'
import FindNodeDialog from './dialogs/FindNodeDialog'
import AgentGalleryDialog from './dialogs/AgentGalleryDialog'

function AppContent() {
  const flowState = useFlowState()
  const dispatch = useFlowDispatch()
  const ui = useUIState()
  const uiDispatch = useUIDispatch()
  const theme = useMemo(() => buildTheme(ui.themeMode), [ui.themeMode])

  const [participantsOpen, setParticipantsOpen] = useState(false)
  const [artifactsOpen, setArtifactsOpen] = useState(false)
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [gitCommitOpen, setGitCommitOpen] = useState(false)
  const [cliOpen, setCLIOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(true)
  const [findOpen, setFindOpen] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [gitBranch, setGitBranch] = useState<string | null>(null)
  const [gitDirty, setGitDirty] = useState(false)
  const wsActions = useWorkspaceActions()

  // Git status polling
  useEffect(() => {
    if (!flowState.filePath) { setGitBranch(null); return }
    const poll = () => {
      window.electronAPI?.gitStatus(flowState.filePath!).then((r) => {
        if (!r.error) { setGitBranch(r.branch); setGitDirty(r.dirty) }
      })
    }
    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [flowState.filePath])

  // Load settings on mount
  useEffect(() => {
    window.electronAPI?.loadSettings().then((saved) => {
      if (!saved) return
      const s = saved as any
      if (s.appearance?.theme) uiDispatch({ type: 'SET_THEME', mode: s.appearance.theme })
      if (s.llm) window.electronAPI?.llmConfigure(s.llm)
      if (s.cli?.aipBinaryPath) window.electronAPI?.cliConfigure(s.cli.aipBinaryPath)
    })
  }, [uiDispatch])

  // File operations
  const handleNew = useCallback(() => { dispatch({ type: 'NEW_FLOW' }); setWelcomeOpen(false) }, [dispatch])
  const handleOpen = useCallback(async () => {
    const result = await window.electronAPI?.openFile()
    if (!result) return
    try {
      const flow = parseFlow(result.content)
      const display = result.display ? JSON.parse(result.display) : null
      dispatch({ type: 'LOAD_FLOW', flow, filePath: result.filePath, display })
      setWelcomeOpen(false)
    } catch (err) { console.error('Failed to parse flow:', err) }
  }, [dispatch])
  const handleSave = useCallback(async () => {
    if (!flowState.flow) return
    const content = serializeFlow(flowState.flow)
    const dj = JSON.stringify(flowState.display, null, 2)
    if (flowState.filePath) {
      await window.electronAPI?.saveFile({ filePath: flowState.filePath, content, display: dj })
      dispatch({ type: 'MARK_SAVED' })
    } else {
      const fp = await window.electronAPI?.saveFileAs({ content, display: dj })
      if (fp) { dispatch({ type: 'SET_FILE_PATH', filePath: fp }); dispatch({ type: 'MARK_SAVED' }) }
    }
  }, [flowState, dispatch])

  // Edit operations
  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [dispatch])
  const handleRedo = useCallback(() => dispatch({ type: 'REDO' }), [dispatch])
  const handleDelete = useCallback(() => {
    if (!flowState.flow || !ui.selectedNodeId) return
    const id = ui.selectedNodeId
    const steps = flowState.flow.steps.filter((s) => s.id !== id).map((s) => ({
      ...s, dependsOn: (s.dependsOn || []).filter((d) => d !== id), steps: (s.steps || []).filter((sub) => sub !== id),
    }))
    const { [id]: _, ...nodes } = flowState.display.nodes
    dispatch({ type: 'UPDATE_FLOW', flow: { ...flowState.flow, steps } })
    dispatch({ type: 'UPDATE_DISPLAY', display: { ...flowState.display, nodes } })
    uiDispatch({ type: 'SELECT_NODE', nodeId: null })
  }, [flowState, ui.selectedNodeId, dispatch, uiDispatch])
  const handleDuplicate = useCallback(() => {
    if (!flowState.flow || !ui.selectedNodeId) return
    const step = flowState.flow.steps.find((s) => s.id === ui.selectedNodeId)
    if (!step) return
    const newId = `${step.id}-copy`
    const pos = flowState.display.nodes[step.id]
    dispatch({ type: 'UPDATE_FLOW', flow: { ...flowState.flow, steps: [...flowState.flow.steps, { ...step, id: newId, title: `${step.title || step.id} (copy)` }] } })
    dispatch({ type: 'UPDATE_DISPLAY', display: { ...flowState.display, nodes: { ...flowState.display.nodes, [newId]: pos ? { x: pos.x + 40, y: pos.y + 40 } : { x: 100, y: 100 } } } })
    uiDispatch({ type: 'SELECT_NODE', nodeId: newId })
  }, [flowState, ui.selectedNodeId, dispatch, uiDispatch])

  // Keyboard shortcuts
  useKeyboardShortcuts(useMemo(() => ({
    onNew: handleNew, onOpen: handleOpen, onSave: handleSave,
    onUndo: handleUndo, onRedo: handleRedo, onDelete: handleDelete,
    onDuplicate: handleDuplicate, onFind: () => setFindOpen(true),
  }), [handleNew, handleOpen, handleSave, handleUndo, handleRedo, handleDelete, handleDuplicate]))

  // Menu bar actions
  useMenuActions(useMemo(() => ({
    onNew: handleNew, onOpen: handleOpen, onSave: handleSave,
    onUndo: handleUndo, onRedo: handleRedo,
    onFind: () => setFindOpen(true),
    onDelete: handleDelete, onDuplicate: handleDuplicate,
    onSettings: () => setSettingsOpen(true),
    onWelcome: () => setWelcomeOpen(true),
    onAddFolder: wsActions.addFolder,
    onCloseWorkspace: wsActions.closeAll,
  }), [handleNew, handleOpen, handleSave, handleUndo, handleRedo, handleDelete, handleDuplicate, wsActions]))

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppLayout
        onSettings={() => setSettingsOpen(true)}
        onFind={() => setFindOpen(true)}
        onGitCommit={() => setGitCommitOpen(true)}
        gitBranch={gitBranch}
        gitDirty={gitDirty}
      />

      {/* Dialogs (unchanged) */}
      <ParticipantsDialog open={participantsOpen} onClose={() => setParticipantsOpen(false)} />
      <ArtifactsDialog open={artifactsOpen} onClose={() => setArtifactsOpen(false)} />
      <MetadataDialog open={metadataOpen} onClose={() => setMetadataOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GitCommitDialog open={gitCommitOpen} onClose={() => setGitCommitOpen(false)} />
      <CLIOutputDialog open={cliOpen} onClose={() => setCLIOpen(false)} />
      <WelcomeDialog open={welcomeOpen} onClose={() => setWelcomeOpen(false)} onNew={handleNew} onOpen={handleOpen} />
      <FindNodeDialog open={findOpen} onClose={() => setFindOpen(false)} />
      <AgentGalleryDialog open={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <UIProvider>
      <FlowProvider>
        <ChatProvider>
          <LabProvider>
            <GalleryProvider>
              <WorkspaceProvider>
                <AppContent />
              </WorkspaceProvider>
            </GalleryProvider>
          </LabProvider>
        </ChatProvider>
      </FlowProvider>
    </UIProvider>
  )
}
