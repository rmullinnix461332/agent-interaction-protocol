import { useCallback, useRef } from 'react'
import {
  Box, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel, Button,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import StopIcon from '@mui/icons-material/Stop'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { useFlowState } from '../store/flow-context'
import { useLabState, useLabDispatch } from '../store/lab-context'
import { useUIDispatch } from '../store/ui-context'
import { FlowEngine } from '../lab/engine'
import { generateHappyPath, generateFailureScenario } from '../lab/mock-generator'
import type { StepStatus } from '../model/mock'

export default function LabControls() {
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

  const onAwait = useCallback((stepId: string): Promise<void> => {
    return new Promise((resolve) => {
      awaitResolveRef.current = resolve
    })
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
  }, [flow, lab.scenario, labDispatch, onStep, onAwait])

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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Tooltip title="Run">
        <IconButton size="small" onClick={handleRun} disabled={lab.running || !flow} color="success">
          <PlayArrowIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={lab.paused ? 'Resume' : 'Pause'}>
        <IconButton size="small" onClick={handlePause} disabled={!lab.running}>
          <PauseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Stop">
        <IconButton size="small" onClick={handleStop} disabled={!lab.running} color="error">
          <StopIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {lab.awaitingStepId && (
        <Tooltip title={`Continue past ${lab.awaitingStepId}`}>
          <Button size="small" variant="outlined" onClick={handleContinueAwait} startIcon={<SkipNextIcon />}>
            Continue
          </Button>
        </Tooltip>
      )}
      <Box sx={{ mx: 0.5 }} />
      <Tooltip title="Generate Happy Path mocks">
        <IconButton size="small" onClick={handleGenerateHappy} disabled={!flow || lab.running}>
          <AutoFixHighIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {lab.scenario && (
        <Box sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5 }}>
          {lab.scenario.name}
        </Box>
      )}
    </Box>
  )
}
