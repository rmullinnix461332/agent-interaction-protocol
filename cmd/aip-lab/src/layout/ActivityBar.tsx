import { Box, IconButton, Tooltip, Divider } from '@mui/material'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined'
import BugReportOutlinedIcon from '@mui/icons-material/BugReportOutlined'
import SourceOutlinedIcon from '@mui/icons-material/SourceOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import { useUIState, useUIDispatch, type ActivityPanel } from '@/store/ui-context'

const ACTIVITY_WIDTH = 48

const topItems: { id: ActivityPanel; label: string; icon: React.ReactNode }[] = [
  { id: 'explorer', label: 'Explorer', icon: <InsertDriveFileOutlinedIcon /> },
  { id: 'design', label: 'Design', icon: <BrushOutlinedIcon /> },
  { id: 'debug', label: 'Debug', icon: <BugReportOutlinedIcon /> },
  { id: 'scm', label: 'Source Control', icon: <SourceOutlinedIcon /> },
  { id: 'marketplace', label: 'Marketplace', icon: <StorefrontOutlinedIcon /> },
]

interface ActivityBarProps {
  onSettings: () => void
}

export default function ActivityBar({ onSettings }: ActivityBarProps) {
  const { activePanel, sidePanelOpen } = useUIState()
  const dispatch = useUIDispatch()

  return (
    <Box
      sx={{
        width: ACTIVITY_WIDTH,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.default',
        borderRight: 1,
        borderColor: 'divider',
        py: 0.5,
      }}
    >
      {topItems.map(item => {
        const isActive = activePanel === item.id && sidePanelOpen
        return (
          <Tooltip key={item.id} title={item.label} placement="right">
            <IconButton
              onClick={() => dispatch({ type: 'SET_ACTIVE_PANEL', panel: item.id })}
              sx={{
                width: 40,
                height: 40,
                my: 0.25,
                borderRadius: 1,
                color: isActive ? 'primary.main' : 'text.secondary',
                borderLeft: isActive ? '2px solid' : '2px solid transparent',
                borderColor: isActive ? 'primary.main' : 'transparent',
                '&:hover': { color: 'text.primary' },
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        )
      })}

      <Box sx={{ flex: 1 }} />

      <Divider sx={{ width: 24, my: 0.5 }} />

      <Tooltip title="Settings" placement="right">
        <IconButton
          onClick={onSettings}
          sx={{
            width: 40,
            height: 40,
            my: 0.25,
            borderRadius: 1,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <SettingsOutlinedIcon />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export { ACTIVITY_WIDTH }
