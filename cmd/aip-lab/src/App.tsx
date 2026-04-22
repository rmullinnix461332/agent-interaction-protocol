import { useMemo, useCallback, useState, useEffect } from 'react'
import { ThemeProvider, CssBaseline } from '@mui/material'
import {
  Box, AppBar, Toolbar, Typography, IconButton, Divider,
  Tooltip, ToggleButtonGroup, ToggleButton, Chip,
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import SaveIcon from '@mui/icons-material/Save'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import PeopleIcon from '@mui/icons-material/People'
import InventoryIcon from '@mui/icons-material/Inventory'
import InfoIcon from '@mui/icons-material/Info'
import ChatIcon from '@mui/icons-material/Chat'
import DashboardIcon from '@mui/icons-material/Dashboard'
import CodeIcon from '@mui/icons-material/Code'
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit'
import SettingsIcon from '@mui/icons-material/Settings'
import TerminalIcon from '@mui/icons-material/Terminal'
import CommitIcon from '@mui/icons-material/Commit'
import HelpIcon from '@mui/icons-material/Help'
import StorefrontIcon from '@mui/icons-material/Storefront'
import { FlowProvider, useFlowState, useFlowDispatch } from './store/flow-context'
import { UIProvider, useUIState, useUIDispatch, type ViewMode } from './store/ui-context'
import { ChatProvider } from './store/chat-context'
import { LabProvider } from './store/lab-context'
import { GalleryProvider } from './store/gallery-context'
import { buildTheme } from './theme/theme'
import { parseFlow, serializeFlow } from './yaml/parser'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import FlowCanvas from './canvas/FlowCanvas'
import Toolbox from './panels/Toolbox'
import Properties from './panels/Properties'
import ChatPanel from './panels/ChatPanel'
import YamlEditor from './panels/YamlEditor'
import ValidationPanel from './panels/ValidationPanel'
import LabControls from './panels/LabControls'
import TracePanel from './panels/TracePanel'
import TabBar from './panels/TabBar'
import ParticipantsDialog from './dialogs/ParticipantsDialog'
import ArtifactsDialog from './dialogs/ArtifactsDialog'
import MetadataDialog from './dialogs/MetadataDialog'
import SettingsDialog from './dialogs/SettingsDialog'
import GitCommitDialog from './dialogs/GitCommitDialog'
import CLIOutputDialog from './dialogs/CLIOutputDialog'
import WelcomeDialog from './dialogs/WelcomeDialog'
import FindNodeDialog from './dialogs/FindNodeDialog'
import AgentGalleryDialog from './dialogs/AgentGalleryDialog'

const TRACE_HEIGHTS = { closed: 0, small: 200, large: 450 }

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

  useEffect(() => {
    window.electronAPI?.loadSettings().then((saved) => {
      if (!saved) return
      const s = saved as any
      if (s.appearance?.theme) uiDispatch({ type: 'SET_THEME', mode: s.appearance.theme })
      if (s.llm) window.electronAPI?.llmConfigure(s.llm)
      if (s.cli?.aipBinaryPath) window.electronAPI?.cliConfigure(s.cli.aipBinaryPath)
    })
  }, [uiDispatch])

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

  useKeyboardShortcuts(useMemo(() => ({
    onNew: handleNew, onOpen: handleOpen, onSave: handleSave,
    onUndo: handleUndo, onRedo: handleRedo, onDelete: handleDelete,
    onDuplicate: handleDuplicate, onFind: () => setFindOpen(true),
  }), [handleNew, handleOpen, handleSave, handleUndo, handleRedo, handleDelete, handleDuplicate]))

  const hasFlow = !!flowState.flow
  const showCanvas = ui.viewMode === 'canvas' || ui.viewMode === 'split'
  const showYaml = ui.viewMode === 'yaml' || ui.viewMode === 'split'
  const flowTitle = flowState.flow ? (flowState.flow.metadata.title || flowState.flow.metadata.name) : ''
  const traceHeight = TRACE_HEIGHTS[ui.tracePanelSize]

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Toolbar */}
        <AppBar position="static" elevation={1} color="default" sx={{ zIndex: 1201 }}>
          <Toolbar variant="dense" sx={{ gap: 0.5, pl: '80px' }}>
            <Typography variant="subtitle1" sx={{ mr: 2, fontWeight: 600 }}>AIP Lab</Typography>
            <Tooltip title="New (Cmd+N)"><IconButton size="small" onClick={handleNew}><NoteAddIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Open (Cmd+O)"><IconButton size="small" onClick={handleOpen}><FolderOpenIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Save (Cmd+S)"><IconButton size="small" onClick={handleSave} disabled={!flowState.dirty}><SaveIcon fontSize="small" /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Undo (Cmd+Z)"><IconButton size="small" onClick={handleUndo} disabled={flowState.past.length === 0}><UndoIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Redo (Cmd+Shift+Z)"><IconButton size="small" onClick={handleRedo} disabled={flowState.future.length === 0}><RedoIcon fontSize="small" /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="Metadata"><IconButton size="small" onClick={() => setMetadataOpen(true)} disabled={!hasFlow}><InfoIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Participants"><IconButton size="small" onClick={() => setParticipantsOpen(true)} disabled={!hasFlow}><PeopleIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Artifacts"><IconButton size="small" onClick={() => setArtifactsOpen(true)} disabled={!hasFlow}><InventoryIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Agent Gallery"><IconButton size="small" onClick={() => setGalleryOpen(true)}><StorefrontIcon fontSize="small" /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <Tooltip title="AI Chat"><IconButton size="small" onClick={() => uiDispatch({ type: 'TOGGLE_CHAT' })} color={ui.chatOpen ? 'primary' : 'default'}><ChatIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="AIP CLI"><IconButton size="small" onClick={() => setCLIOpen(true)} disabled={!flowState.filePath}><TerminalIcon fontSize="small" /></IconButton></Tooltip>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <ToggleButtonGroup size="small" value={ui.viewMode} exclusive onChange={(_, v) => { if (v) uiDispatch({ type: 'SET_VIEW_MODE', mode: v as ViewMode }) }} sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 1 } }}>
              <ToggleButton value="canvas"><Tooltip title="Canvas"><DashboardIcon sx={{ fontSize: 18 }} /></Tooltip></ToggleButton>
              <ToggleButton value="split"><Tooltip title="Split"><VerticalSplitIcon sx={{ fontSize: 18 }} /></Tooltip></ToggleButton>
              <ToggleButton value="yaml"><Tooltip title="YAML"><CodeIcon sx={{ fontSize: 18 }} /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
            <LabControls />
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Help"><IconButton size="small" onClick={() => setWelcomeOpen(true)}><HelpIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Settings"><IconButton size="small" onClick={() => setSettingsOpen(true)}><SettingsIcon fontSize="small" /></IconButton></Tooltip>
            {flowState.flow && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{flowTitle}{flowState.dirty ? ' \u2022' : ''}</Typography>}
          </Toolbar>
        </AppBar>

        {/* Tab bar */}
        <TabBar />

        {/* Main content */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {ui.toolboxOpen && showCanvas && (
            <Box sx={{ width: ui.chatOpen ? 280 : 170, borderRight: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'width 0.2s' }}>
              <Box sx={{ overflow: 'auto', flexShrink: 0 }}><Toolbox /></Box>
              {ui.chatOpen && (<><Divider /><Box sx={{ flex: 1, minHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}><ChatPanel /></Box></>)}
            </Box>
          )}
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', flexDirection: 'column' }}>
            <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {showCanvas && (
                <Box sx={{ flex: 1, position: 'relative' }}>
                  {flowState.flow ? <FlowCanvas /> : (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Typography color="text.secondary">Open a flow file or create a new one</Typography>
                    </Box>
                  )}
                </Box>
              )}
              {showCanvas && showYaml && <Divider orientation="vertical" />}
              {showYaml && <Box sx={{ flex: 1, overflow: 'hidden' }}><YamlEditor /></Box>}
            </Box>
            {/* Trace panel */}
            {traceHeight > 0 && (
              <Box sx={{ height: traceHeight, borderTop: 1, borderColor: 'divider', overflow: 'hidden', transition: 'height 0.2s' }}>
                <TracePanel />
              </Box>
            )}
          </Box>
          {ui.propertiesOpen && showCanvas && (
            <Box sx={{ width: 300, borderLeft: 1, borderColor: 'divider', overflow: 'auto' }}><Properties /></Box>
          )}
        </Box>

        {/* Status bar */}
        <Box sx={{ px: 2, py: 0.5, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'background.paper' }}>
          <ValidationPanel />
          <Box sx={{ flex: 1 }} />
          {gitBranch && (
            <Tooltip title="Git commit">
              <Chip size="small" icon={<CommitIcon sx={{ fontSize: 14 }} />} label={`${gitBranch}${gitDirty ? ' \u2022' : ''}`} onClick={() => setGitCommitOpen(true)} variant="outlined" sx={{ height: 22, fontSize: 11, cursor: 'pointer' }} />
            </Tooltip>
          )}
          <Typography variant="caption" color="text.secondary">{ui.viewMode}</Typography>
          {flowState.filePath && <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>{flowState.filePath}</Typography>}
        </Box>
      </Box>

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
              <AppContent />
            </GalleryProvider>
          </LabProvider>
        </ChatProvider>
      </FlowProvider>
    </UIProvider>
  )
}
