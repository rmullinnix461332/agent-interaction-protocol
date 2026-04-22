import { Box, Typography, Paper, Divider } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline'
import StopCircleIcon from '@mui/icons-material/StopCircle'
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat'
import type { StepType } from '@/model/flow'

const SHAPES: { type: StepType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'action', label: 'Action', icon: <PlayArrowIcon />, color: '#1976d2' },
  { type: 'fanOut', label: 'Fan Out', icon: <CallSplitIcon />, color: '#f57c00' },
  { type: 'fanIn', label: 'Fan In', icon: <CallMergeIcon />, color: '#388e3c' },
  { type: 'decision', label: 'Decision', icon: <AltRouteIcon />, color: '#f9a825' },
  { type: 'await', label: 'Await', icon: <PauseCircleOutlineIcon />, color: '#7b1fa2' },
  { type: 'exit', label: 'Exit', icon: <StopCircleIcon />, color: '#c62828' },
]

export default function Toolbox() {
  const onDragStart = (event: React.DragEvent, stepType: StepType) => {
    event.dataTransfer.setData('application/aip-step-type', stepType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2" sx={{ px: 1, mb: 1, fontWeight: 600 }}>
        Steps
      </Typography>
      {SHAPES.map(({ type, label, icon, color }) => (
        <Paper
          key={type}
          elevation={1}
          draggable
          onDragStart={(e) => onDragStart(e, type)}
          sx={{
            p: 1.25,
            mb: 0.75,
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            borderLeft: `3px solid ${color}`,
            '&:hover': { bgcolor: 'action.hover', elevation: 3 },
            '&:active': { cursor: 'grabbing' },
            userSelect: 'none',
          }}
        >
          <Box sx={{ color, display: 'flex', alignItems: 'center' }}>
            {icon}
          </Box>
          <Typography variant="body2" fontWeight={500}>
            {label}
          </Typography>
        </Paper>
      ))}

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="subtitle2" sx={{ px: 1, mb: 1, fontWeight: 600 }}>
        Connections
      </Typography>
      <Paper
        elevation={0}
        sx={{
          p: 1.25,
          mb: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          borderLeft: '3px solid #90a4ae',
          bgcolor: 'action.hover',
        }}
      >
        <Box sx={{ color: '#90a4ae', display: 'flex', alignItems: 'center' }}>
          <TrendingFlatIcon />
        </Box>
        <Box>
          <Typography variant="body2" fontWeight={500}>
            Connector
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
            Drag from bottom handle of a step to top handle of another
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
