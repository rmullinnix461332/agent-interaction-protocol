import { useState, useCallback } from 'react'
import {
  Typography, Box, Paper, ToggleButtonGroup, ToggleButton, Alert,
} from '@mui/material'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import { RunTable } from '@/components/runs/RunTable'
import type { RunListResponse } from '@/api/types'

interface RunsProps {
  onInspect: (runId: string) => void
}

export function Runs({ onInspect }: RunsProps) {
  const { activeEngine } = useEngines()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionError, setActionError] = useState<string | null>(null)
  const endpoint = activeEngine?.config.endpoint ?? ''

  const fetcher = useCallback(() => {
    const filter = statusFilter !== 'all' ? { status: statusFilter } : undefined
    return new EngineClient(endpoint).listRuns(filter)
  }, [endpoint, statusFilter])

  const { data, loading, refresh } = usePolling<RunListResponse>({
    fetcher,
    interval: 5_000,
    enabled: !!activeEngine?.online,
  })

  const handleStop = async (runId: string) => {
    if (!activeEngine) return
    setActionError(null)
    try {
      await new EngineClient(activeEngine.config.endpoint).stopRun(runId)
      refresh()
    } catch (err) {
      setActionError(String(err))
    }
  }

  if (!activeEngine?.online) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Runs</Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {activeEngine ? 'Engine is offline' : 'Select an engine to view runs'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Runs</Typography>
        <ToggleButtonGroup
          size="small"
          value={statusFilter}
          exclusive
          onChange={(_, val) => setStatusFilter(val ?? 'all')}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="running">Running</ToggleButton>
          <ToggleButton value="awaiting">Awaiting</ToggleButton>
          <ToggleButton value="completed">Completed</ToggleButton>
          <ToggleButton value="failed">Failed</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

      {loading && !data ? (
        <Typography color="text.secondary">Loading runs...</Typography>
      ) : (
        <RunTable
          runs={data?.runs ?? []}
          onInspect={onInspect}
          onStop={handleStop}
        />
      )}
    </Box>
  )
}
