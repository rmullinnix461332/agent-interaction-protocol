import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, List, ListItemButton, ListItemText,
  ListItemIcon, Chip, Paper, Button, IconButton, Tooltip,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import LoopIcon from '@mui/icons-material/Loop'
import DownloadIcon from '@mui/icons-material/Download'
import CloseIcon from '@mui/icons-material/Close'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import { useLabState } from '../store/lab-context'
import { useUIState, useUIDispatch } from '../store/ui-context'
import type { StepTrace } from '../model/mock'

const STATUS_ICON: Record<string, React.ReactNode> = {
  success: <CheckCircleIcon fontSize="small" color="success" />,
  failure: <ErrorIcon fontSize="small" color="error" />,
  running: <HourglassEmptyIcon fontSize="small" color="info" />,
  awaiting: <HourglassEmptyIcon fontSize="small" color="warning" />,
  iterating: <LoopIcon fontSize="small" color="warning" />,
  pending: <HourglassEmptyIcon fontSize="small" color="disabled" />,
}

export default function TracePanel() {
  const { trace } = useLabState()
  const { tracePanelSize } = useUIState()
  const uiDispatch = useUIDispatch()
  const [tab, setTab] = useState(0)
  const [selectedStep, setSelectedStep] = useState<StepTrace | null>(null)

  if (!trace) {
    return (
      <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Run a flow to see the execution trace
        </Typography>
        <IconButton size="small" onClick={() => uiDispatch({ type: 'SET_TRACE_PANEL', size: 'closed' })}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    )
  }

  const totalDuration = trace.endTime ? trace.endTime - trace.startTime : 0
  const passed = trace.steps.filter((s) => s.status === 'success').length

  const exportTrace = () => {
    const blob = new Blob([JSON.stringify(trace, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${trace.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" fontWeight={600}>Mock Lab</Typography>
        <Chip
          size="small"
          label={trace.status}
          color={trace.status === 'completed' ? 'success' : trace.status === 'failed' ? 'error' : 'default'}
          sx={{ height: 20, fontSize: 10 }}
        />
        <Typography variant="caption" color="text.secondary">
          {passed}/{trace.steps.length} passed &middot; {totalDuration}ms
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<DownloadIcon sx={{ fontSize: 14 }} />} onClick={exportTrace} sx={{ fontSize: 10 }}>
          Export
        </Button>
        <Tooltip title={tracePanelSize === 'large' ? 'Shrink' : 'Expand'}>
          <IconButton size="small" onClick={() => uiDispatch({ type: 'SET_TRACE_PANEL', size: tracePanelSize === 'large' ? 'small' : 'large' })}>
            {tracePanelSize === 'large' ? <CloseFullscreenIcon sx={{ fontSize: 16 }} /> : <OpenInFullIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Close">
          <IconButton size="small" onClick={() => uiDispatch({ type: 'SET_TRACE_PANEL', size: 'closed' })}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0, fontSize: 11 } }}>
        <Tab label="Timeline" />
        <Tab label="Artifacts" />
        <Tab label="Detail" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tab === 0 && (
          <List dense disablePadding>
            {trace.steps.map((st) => (
              <ListItemButton key={st.stepId} selected={selectedStep?.stepId === st.stepId} onClick={() => { setSelectedStep(st); setTab(2) }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  {STATUS_ICON[st.status] || STATUS_ICON.pending}
                </ListItemIcon>
                <ListItemText
                  primary={st.stepId}
                  secondary={`${st.duration || 0}ms${st.iterationCount ? ` \u00b7 ${st.iterationCount} iterations` : ''}${st.decisionBranch ? ` \u00b7 \u2192 ${st.decisionBranch}` : ''}`}
                  primaryTypographyProps={{ variant: 'body2', fontSize: 12 }}
                  secondaryTypographyProps={{ variant: 'caption', fontSize: 10 }}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {tab === 1 && (
          <Box sx={{ p: 1 }}>
            {Object.entries(trace.artifacts).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No artifacts produced</Typography>
            ) : (
              Object.entries(trace.artifacts).map(([ref, content]) => (
                <Paper key={ref} elevation={0} sx={{ p: 1, mb: 0.5, border: 1, borderColor: 'divider' }}>
                  <Typography variant="caption" fontWeight={600}>{ref}</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 0.5, fontFamily: 'monospace', fontSize: 10, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
                    {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
                  </Typography>
                </Paper>
              ))
            )}
          </Box>
        )}

        {tab === 2 && selectedStep && (
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle2">{selectedStep.stepId}</Typography>
            <Chip size="small" label={selectedStep.status} sx={{ mt: 0.5, mb: 1 }}
              color={selectedStep.status === 'success' ? 'success' : selectedStep.status === 'failure' ? 'error' : 'default'} />

            {selectedStep.mockUsed && (
              <Typography variant="caption" display="block" color="text.secondary">
                Mock: {selectedStep.mockUsed}
              </Typography>
            )}
            {selectedStep.duration !== undefined && (
              <Typography variant="caption" display="block" color="text.secondary">
                Duration: {selectedStep.duration}ms
              </Typography>
            )}
            {selectedStep.iterationCount !== undefined && (
              <Typography variant="caption" display="block" color="text.secondary">
                Iterations: {selectedStep.iterationCount}
              </Typography>
            )}
            {selectedStep.decisionBranch && (
              <Typography variant="caption" display="block" color="text.secondary">
                Branch: {selectedStep.decisionBranch}
              </Typography>
            )}
            {selectedStep.error && (
              <Typography variant="caption" display="block" color="error">
                Error: {selectedStep.error}
              </Typography>
            )}

            {Object.keys(selectedStep.inputs).length > 0 && (
              <>
                <Typography variant="caption" fontWeight={600} sx={{ mt: 1, display: 'block' }}>Inputs</Typography>
                {Object.entries(selectedStep.inputs).map(([ref, val]) => (
                  <Typography key={ref} variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                    {ref}: {typeof val === 'string' ? val : JSON.stringify(val)}
                  </Typography>
                ))}
              </>
            )}
            {Object.keys(selectedStep.outputs).length > 0 && (
              <>
                <Typography variant="caption" fontWeight={600} sx={{ mt: 1, display: 'block' }}>Outputs</Typography>
                {Object.entries(selectedStep.outputs).map(([ref, val]) => (
                  <Typography key={ref} variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                    {ref}: {typeof val === 'string' ? val : JSON.stringify(val)}
                  </Typography>
                ))}
              </>
            )}
          </Box>
        )}
        {tab === 2 && !selectedStep && (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">Click a step in the timeline to see details</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
