import { useCallback } from 'react'
import {
  Typography, Box, Paper, Button, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import { useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StopIcon from '@mui/icons-material/Stop'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import { StepStatusChip } from '@/components/runs/StepStatusChip'
import { RunTimeline } from '@/components/runs/RunTimeline'
import { ArtifactList } from '@/components/artifacts/ArtifactList'
import { ResumeDialog } from '@/components/runs/ResumeDialog'
import type { Run, EventListResponse, ArtifactListResponse } from '@/api/types'

interface RunDetailProps {
  runId: string
  onBack: () => void
}

export function RunDetail({ runId, onBack }: RunDetailProps) {
  const { activeEngine } = useEngines()
  const endpoint = activeEngine?.config.endpoint ?? ''
  const [tab, setTab] = useState(0)
  const [resumeOpen, setResumeOpen] = useState(false)

  const runFetcher = useCallback(
    () => new EngineClient(endpoint).getRun(runId),
    [endpoint, runId],
  )
  const eventFetcher = useCallback(
    () => new EngineClient(endpoint).runEvents(runId),
    [endpoint, runId],
  )
  const artifactFetcher = useCallback(
    () => new EngineClient(endpoint).listArtifacts(runId),
    [endpoint, runId],
  )

  const enabled = !!activeEngine?.online
  const { data: run, loading } = usePolling<Run>({ fetcher: runFetcher, interval: 3000, enabled })
  const { data: events } = usePolling<EventListResponse>({ fetcher: eventFetcher, interval: 5000, enabled })
  const { data: artifacts } = usePolling<ArtifactListResponse>({ fetcher: artifactFetcher, interval: 10000, enabled })

  const handleStop = async () => {
    if (!activeEngine) return
    try {
      await new EngineClient(activeEngine.config.endpoint).stopRun(runId)
    } catch (err) {
      console.error('Failed to stop run:', err)
    }
  }

  const handleResume = async (payload: { ref: string; contentType: string; value: unknown }) => {
    if (!activeEngine) return
    await new EngineClient(activeEngine.config.endpoint).resumeRun(runId, payload)
  }

  if (loading && !run) {
    return <Typography color="text.secondary">Loading...</Typography>
  }

  if (!run) {
    return <Typography color="error">Run not found</Typography>
  }

  const isActive = run.status === 'running' || run.status === 'awaiting'
  const duration = run.completedAt
    ? formatDuration(new Date(run.startedAt), new Date(run.completedAt))
    : formatDuration(new Date(run.startedAt), new Date())

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack} size="small">Back</Button>
        <Typography variant="h5">Run Detail</Typography>
        {run.status === 'awaiting' && (
          <Button startIcon={<PlayArrowIcon />} color="secondary" variant="contained" size="small" onClick={() => setResumeOpen(true)}>
            Resume
          </Button>
        )}
        {isActive && (
          <Button startIcon={<StopIcon />} color="error" variant="outlined" size="small" onClick={handleStop}>
            Stop
          </Button>
        )}
      </Box>

      {/* Await state banner */}
      {run.status === 'awaiting' && run.awaitState && (
        <Paper sx={{ p: 2, mb: 2, borderLeft: '4px solid', borderColor: 'secondary.main' }}>
          <Typography variant="subtitle2" color="secondary">Awaiting Input</Typography>
          <Box sx={{ display: 'flex', gap: 3, mt: 0.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Step</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{run.awaitState.stepId}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Expected Input</Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{run.awaitState.awaitInputRef}</Typography>
            </Box>
          </Box>
          <Button size="small" color="secondary" variant="outlined" sx={{ mt: 1 }} onClick={() => setResumeOpen(true)}>
            Provide Input
          </Button>
        </Paper>
      )}

      {/* Summary */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2 }}>
          <Field label="Run ID" value={run.id} mono />
          <Field label="Flow" value={run.flowName} />
          <Field label="Status" value={run.status} chip />
          <Field label="Started" value={new Date(run.startedAt).toLocaleString()} />
          <Field label="Duration" value={duration} />
          {run.currentStep && <Field label="Current Step" value={run.currentStep} />}
          {run.error && <Field label="Error" value={run.error} error />}
        </Box>
      </Paper>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Steps (${Object.keys(run.stepStatuses).length})`} />
        <Tab label={`Timeline (${events?.events.length ?? 0})`} />
        <Tab label={`Artifacts (${artifacts?.artifacts.length ?? 0})`} />
      </Tabs>

      {/* Steps tab */}
      {tab === 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Step ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.entries(run.stepStatuses).map(([stepId, ss]) => (
                <TableRow key={stepId}>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{stepId}</TableCell>
                  <TableCell><StepStatusChip status={ss.status} /></TableCell>
                  <TableCell>{ss.startedAt ? new Date(ss.startedAt).toLocaleTimeString() : '—'}</TableCell>
                  <TableCell>{ss.completedAt ? new Date(ss.completedAt).toLocaleTimeString() : '—'}</TableCell>
                  <TableCell sx={{ color: 'error.main', fontSize: 12 }}>{ss.error || ''}</TableCell>
                </TableRow>
              ))}
              {Object.keys(run.stepStatuses).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                    No step data yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Timeline tab */}
      {tab === 1 && (
        <Paper variant="outlined" sx={{ p: 1 }}>
          <RunTimeline events={events?.events ?? []} />
        </Paper>
      )}

      {/* Artifacts tab */}
      {tab === 2 && (
        <ArtifactList artifacts={artifacts?.artifacts ?? []} />
      )}

      {/* Resume dialog */}
      <ResumeDialog
        open={resumeOpen}
        onClose={() => setResumeOpen(false)}
        onResume={handleResume}
        awaitInputRef={run.awaitState?.awaitInputRef ?? ''}
      />
    </Box>
  )
}

function Field({ label, value, mono, chip, error }: {
  label: string; value: string; mono?: boolean; chip?: boolean; error?: boolean
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {chip ? (
        <Box><StepStatusChip status={value} /></Box>
      ) : (
        <Typography
          variant="body2"
          sx={{
            fontFamily: mono ? 'monospace' : undefined,
            fontSize: mono ? 12 : undefined,
            color: error ? 'error.main' : undefined,
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  )
}

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  if (ms < 1000) return `${ms}ms`
  const secs = Math.floor(ms / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const remSecs = secs % 60
  return `${mins}m ${remSecs}s`
}
