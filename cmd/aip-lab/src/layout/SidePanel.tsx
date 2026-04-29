import { Box, Typography } from '@mui/material'
import { useUIState } from '@/store/ui-context'
import Toolbox from '@/panels/Toolbox'
import Properties from '@/panels/Properties'
import ExplorerPanel from '@/panels/ExplorerPanel'
import DebugPanel from '@/panels/DebugPanel'
import SCMPanel from '@/panels/SCMPanel'
import MarketplacePanel from '@/panels/MarketplacePanel'

const SIDE_PANEL_WIDTH = 260

const panelTitles: Record<string, string> = {
  explorer: 'EXPLORER',
  design: 'DESIGN',
  debug: 'DEBUG',
  scm: 'SOURCE CONTROL',
  marketplace: 'MARKETPLACE',
}

export default function SidePanel() {
  const { activePanel, sidePanelOpen, selectedNodeId } = useUIState()

  if (!sidePanelOpen) return null

  return (
    <Box
      sx={{
        width: SIDE_PANEL_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Panel header */}
      <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center' }}>
        <Typography variant="caption" fontWeight={600} letterSpacing={0.5} color="text.secondary">
          {panelTitles[activePanel] || activePanel.toUpperCase()}
        </Typography>
      </Box>

      {/* Panel content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activePanel === 'explorer' && <ExplorerPanel />}
        {activePanel === 'design' && <DesignPanelContent showProperties={!!selectedNodeId} />}
        {activePanel === 'debug' && <DebugPanel />}
        {activePanel === 'scm' && <SCMPanel />}
        {activePanel === 'marketplace' && <MarketplacePanel />}
      </Box>
    </Box>
  )
}

function DesignPanelContent({ showProperties }: { showProperties: boolean }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ overflow: 'auto', flexShrink: 0 }}>
        <Toolbox />
      </Box>
      {showProperties && (
        <Box sx={{ flex: 1, overflow: 'auto', borderTop: 1, borderColor: 'divider' }}>
          <Properties />
        </Box>
      )}
    </Box>
  )
}

export { SIDE_PANEL_WIDTH }
