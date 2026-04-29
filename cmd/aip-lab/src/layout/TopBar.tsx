import { Box, IconButton, Tooltip, TextField, InputAdornment, ToggleButtonGroup, ToggleButton } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import SearchIcon from '@mui/icons-material/Search'
import DashboardIcon from '@mui/icons-material/Dashboard'
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit'
import CodeIcon from '@mui/icons-material/Code'
import { useUIState, useUIDispatch, type ViewMode } from '@/store/ui-context'

interface TopBarProps {
  onFind: () => void
}

export default function TopBar({ onFind }: TopBarProps) {
  const { viewMode } = useUIState()
  const dispatch = useUIDispatch()

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1,
        py: 0.5,
        gap: 0.5,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        minHeight: 36,
        // macOS: leave space for traffic lights when titleBarStyle is hiddenInset
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Navigation */}
      <Box sx={{ display: 'flex', gap: 0.25, WebkitAppRegion: 'no-drag' }}>
        <Tooltip title="Back">
          <IconButton size="small" disabled><ArrowBackIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Forward">
          <IconButton size="small" disabled><ArrowForwardIcon fontSize="small" /></IconButton>
        </Tooltip>
      </Box>

      {/* Search */}
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', WebkitAppRegion: 'no-drag' }}>
        <TextField
          size="small"
          placeholder="Search..."
          onClick={onFind}
          slotProps={{
            input: {
              readOnly: true,
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { fontSize: 13, height: 28, cursor: 'pointer' },
            },
          }}
          sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Box>

      {/* Layout toggles */}
      <Box sx={{ WebkitAppRegion: 'no-drag' }}>
        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) dispatch({ type: 'SET_VIEW_MODE', mode: v as ViewMode }) }}
          sx={{ '& .MuiToggleButton-root': { py: 0.25, px: 0.75 } }}
        >
          <ToggleButton value="canvas">
            <Tooltip title="Canvas"><DashboardIcon sx={{ fontSize: 16 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="split">
            <Tooltip title="Split"><VerticalSplitIcon sx={{ fontSize: 16 }} /></Tooltip>
          </ToggleButton>
          <ToggleButton value="yaml">
            <Tooltip title="YAML"><CodeIcon sx={{ fontSize: 16 }} /></Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  )
}
