import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Box, Typography } from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CallSplitIcon from '@mui/icons-material/CallSplit'
import CallMergeIcon from '@mui/icons-material/CallMerge'
import AltRouteIcon from '@mui/icons-material/AltRoute'
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline'
import StopCircleIcon from '@mui/icons-material/StopCircle'

interface StepNodeData {
  label: string
  stepType: string
  [key: string]: unknown
}

const STEP_STYLES: Record<string, { bg: string; border: string; icon: React.ReactNode }> = {
  action:   { bg: '#e3f2fd', border: '#1976d2', icon: <PlayArrowIcon sx={{ fontSize: 20 }} /> },
  fanOut:   { bg: '#fff3e0', border: '#f57c00', icon: <CallSplitIcon sx={{ fontSize: 20 }} /> },
  fanIn:    { bg: '#e8f5e9', border: '#388e3c', icon: <CallMergeIcon sx={{ fontSize: 20 }} /> },
  decision: { bg: '#fffde7', border: '#f9a825', icon: <AltRouteIcon sx={{ fontSize: 20 }} /> },
  await:    { bg: '#f3e5f5', border: '#7b1fa2', icon: <PauseCircleOutlineIcon sx={{ fontSize: 20 }} /> },
  exit:     { bg: '#fce4ec', border: '#c62828', icon: <StopCircleIcon sx={{ fontSize: 20 }} /> },
}

const handleStyle = { width: 10, height: 10, background: '#90a4ae', border: '2px solid #fff' }

function StepNode({ data }: NodeProps & { data: StepNodeData }) {
  const style = STEP_STYLES[data.stepType] || STEP_STYLES.action
  const isDecision = data.stepType === 'decision'

  return (
    <>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Box
        sx={{
          px: 2, py: 1.5, minWidth: 180,
          background: style.bg,
          border: `2px solid ${style.border}`,
          borderRadius: isDecision ? '2px' : '8px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          textAlign: 'center',
          clipPath: isDecision ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : undefined,
          minHeight: isDecision ? 90 : undefined,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
        }}
      >
        <Box sx={{ color: style.border, display: 'flex', alignItems: 'center' }}>{style.icon}</Box>
        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 14 }}>
          {data.label}
        </Typography>
      </Box>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
    </>
  )
}

export default memo(StepNode)
