import { Box, Divider, Typography } from '@mui/material'
import { useUIState } from '@/store/ui-context'
import { useFlowState } from '@/store/flow-context'
import { useGalleryState } from '@/store/gallery-context'
import ActivityBar from './ActivityBar'
import SidePanel from './SidePanel'
import TopBar from './TopBar'
import StatusBar from './StatusBar'
import FlowCanvas from '@/canvas/FlowCanvas'
import YamlEditor from '@/panels/YamlEditor'
import ChatPanel from '@/panels/ChatPanel'
import TracePanel from '@/panels/TracePanel'
import TabBar from '@/panels/TabBar'
import AgentDetailView from '@/panels/AgentDetailView'

const TRACE_HEIGHTS = { closed: 0, small: 200, large: 450 }

interface AppLayoutProps {
  onSettings: () => void
  onFind: () => void
  onGitCommit: () => void
  gitBranch: string | null
  gitDirty: boolean
}

export default function AppLayout({ onSettings, onFind, onGitCommit, gitBranch, gitDirty }: AppLayoutProps) {
  const { viewMode, chatOpen, tracePanelSize, activePanel } = useUIState()
  const flowState = useFlowState()
  const { selectedEntry } = useGalleryState()

  const showAgentDetail = activePanel === 'marketplace' && selectedEntry !== null
  const showCanvas = !showAgentDetail && (viewMode === 'canvas' || viewMode === 'split')
  const showYaml = !showAgentDetail && (viewMode === 'yaml' || viewMode === 'split')
  const traceHeight = TRACE_HEIGHTS[tracePanelSize]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top bar */}
      <TopBar onFind={onFind} />

      {/* Tab bar */}
      <TabBar />

      {/* Main content area */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Activity bar */}
        <ActivityBar onSettings={onSettings} />

        {/* Side panel */}
        <SidePanel />

        {/* Central editor */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            {showAgentDetail && (
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <AgentDetailView />
              </Box>
            )}
            {showCanvas && (
              <Box sx={{ flex: 1, position: 'relative' }}>
                {flowState.flow ? (
                  <FlowCanvas />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="text.secondary">Open a flow file or create a new one</Typography>
                  </Box>
                )}
              </Box>
            )}
            {showCanvas && showYaml && <Divider orientation="vertical" />}
            {showYaml && (
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <YamlEditor />
              </Box>
            )}
          </Box>

          {/* Trace panel */}
          {traceHeight > 0 && (
            <Box sx={{ height: traceHeight, borderTop: 1, borderColor: 'divider', overflow: 'hidden', transition: 'height 0.2s' }}>
              <TracePanel />
            </Box>
          )}
        </Box>

        {/* Chat panel (right) */}
        {chatOpen && (
          <Box sx={{ width: 320, borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <ChatPanel />
          </Box>
        )}
      </Box>

      {/* Status bar */}
      <StatusBar gitBranch={gitBranch} gitDirty={gitDirty} onGitCommit={onGitCommit} />
    </Box>
  )
}
