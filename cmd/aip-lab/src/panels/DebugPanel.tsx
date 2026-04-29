import { useCallback, useRef } from 'react'
import {
  Box, Typography, IconButton, Tooltip, Button, Divider,
  Select, MenuItem, FormControl, InputLabel, Chip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { useFlowState } from '@/store/flow-context'
import { useLabState, useLabDispatch } from '@/store/lab-context'
import { useUIDispatch } from '@/store/ui-context'
import { FlowEngine } from '@/lab/engine'
import { generateHappyPath, generateFailureScenario } from '@/lab/mock-generator'
import type { StepStatus } from '@/model/mock'

export default function DebugPanel() {
  const { flow } = useFlowState()
  const lab = useLabState()
  const labDispatch = useLabDispatch()
  const uiDispatch = useUIDispatch()
  const engineRef = useRef<FlowEngine | null>(null)
  const awaitResolveRef = useRef<(() => void) | null>(null)

  const onStep = useCallback((stepId: string, status: StepStatus) => {
    labDispatch({ type: 'SET_NODE_STATE', stepId, status })
    if (status === 'awaiting') {
      labDispatch({ type: 'SET_AWAITING', stepId })
    }
  }, [labDispatch])

  const onAwait = useCallback((_stepId: string): Promise<void> => {
    return new Promise((resolve) => { awaitResolveRef.current = resolve })
  }, [])

  const handleRun = useCallback(async () => {
    if (!flow) return
    const scenario = lab.scenario || generateHappyPath(flow)
    if (!lab.scenario) labDispatch({ type: 'SET_SCENARIO', scenario })
    labDispatch({ type: 'START_RUN' })
    uiDispatch({ type: 'SET_TRACE_PANEL', size: 'small' })
    const engine = new FlowEngine(flow, scenario, onStep, onAwait)
    engineRef.current = engine
    const trace = await engine.run()
    labDispatch({ type: 'SET_TRACE', trace })
    engineRef.current = null
  }, [flow, lab.scenario, labDispatch, uiDispatch, onStep, onAwait])

  const handleStop = useCallback(() => {
    engineRef.current?.abort()
    labDispatch({ type: 'STOP_RUN' })
  }, [labDispatch])

  const handlePause = useCallback(() => {
    if (lab.paused) {
      engineRef.current?.resume()
      labDispatch({ type: 'RESUME' })
    } else {
      engineRef.current?.pause()
      labDispatch({ type: 'PAUSE' })
    }
  }, [lab.paused, labDispatch])

  const handleContinueAwait = useCallback(() => {
    if (awaitResolveRef.current) {
      awaitResolveRef.current()
      awaitResolveRef.current = null
      labDispatch({ type: 'SET_AWAITING', stepId: null })
    }
  }, [labDispatch])

  const handleGenerateHappy = useCallback(() => {
    if (!flow) return
    labDispatch({ type: 'SET_SCENARIO', scenario: generateHappyPath(flow) })
  }, [flow, labDispatch])

  const handleGenerateFailure = useCallback(() => {
    if (!flow) return
    labDispatch({ type: 'SET_SCENARIO', scenario: generateFailureScenario(flow) })
  }, [flow, labDispatch])

  const hasFlow = !!flow

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Run controls */}
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          RUN CONTROLS
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Tooltip title="Run (F5)">
            <span>
              <IconButton size="small" onClick={handleRun} disabled={lab.running || !hasFlow} color="success">
                <PlayArrowIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={lab.paused ? 'Resume (F6)' : 'Pause (F6)'}>
            <span>
              <IconButton size="small" onClick={handlePause} disabled={!lab.running}>
                <PauseIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Stop (Shift+F5)">
            <span>
              <IconButton size="small" onClick={handleStop} disabled={!lab.running} color="error">
                <StopIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* Await continue */}
      {lab.awaitingStepId && (
        <Box sx={{ p: 1, borderRadius: 1, border: 1, borderColor: 'warning.main', bgcolor: 'action.hover' }}>
          <Typography variant="caption" color="warning.main" fontWeight={600}>
            Awaiting: {lab.awaitingStepId}
          </Typography>
          <Button
            size="small" variant="outlined" color="warning"
            startIcon={<SkipNextIcon />}
            onClick={handleContinueAwait}
            sx={{ mt: 0.5, display: 'block' }}
          >
            Continue
          </Button>
        </Box>
      )}

      <Divider />

      {/* Test scenarios */}
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          TEST SCENARIO
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Button
            size="small" variant="outlined" fullWidth
            startIcon={<AutoFixHighIcon />}
            onClick={handleGenerateHappy}
            disabled={!hasFlow || lab.running}
          >
            Happy Path
          </Button>
          <Button
            size="small" variant="outlined" fullWidth color="error"
            startIcon={<WarningAmberIcon />}
            onClick={handleGenerateFailure}
            disabled={!hasFlow || lab.running}
          >
            Failure Scenario
          </Button>
        </Box>
        {lab.scenario && (
          <Chip
            label={lab.scenario.name}
            size="small"
            variant="outlined"
            sx={{ mt: 1, fontSize: 11 }}
          />
        )}
      </Box>

      <Divider />

      {/* Run status */}
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          STATUS
        </Typography>
        {lab.running ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label={lab.paused ? 'Paused' : 'Running'} size="small" color={lab.paused ? 'warning' : 'info'} />
            {Object.entries(lab.nodeStates).filter(([, s]) => s === 'running').map(([id]) => (
              <Typography key={id} variant="caption" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                {id}
              </Typography>
            ))}
          </Box>
        ) : lab.trace ? (
          <Chip
            label={`${lab.trace.status} — ${lab.trace.steps.filter(s => s.status === 'success').length}/${lab.trace.steps.length} passed`}
            size="small"
            color={lab.trace.status === 'completed' ? 'success' : 'error'}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">No runs yet</Typography>
        )}
      </Box>
    </Box>
  )
}
