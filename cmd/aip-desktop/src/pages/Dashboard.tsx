import { useCallback } from 'react'
import {
  Typography, Box, Paper, Chip, List, ListItemButton, ListItemText, ListItemIcon,
} from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import { StepStatusChip } from '@/components/runs/StepStatusChip'
import type { DiagnosticsResponse, RunListResponse } from '@/api/types'

interface DashboardProps {
  onNavigateRun?: (runId: string) => void
}

export function Dashboard({ onNavigateRun }: DashboardProps) {
  const { engines, activeEngine } = useEngines()
  const endpoint = activeEngine?.config.endpoint ?? ''
  const enabled = !!activeEngine?.online

  const diagFetcher = useCallback(() => new EngineClient(endpoint).diagnostics(), [endpoint])
  const activeFetcher = useCallback(() => new EngineClient(endpoint).listRuns({ status: 'running' }), [endpoint])
  const awaitFetcher = useCallback(() => new EngineClient(endpoint).listRuns({ status: 'awaiting' }), [endpoint])
  const recentFetcher = useCallback(() => new EngineClient(endpoint).listRuns(), [endpoint])

  const { data: diag } = usePolling<DiagnosticsResponse>({ fetcher: diagFetcher, interval: 15_000, enabled })
  const { data: activeRuns } = usePolling<RunListResponse>({ fetcher: activeFetcher, interval: 5_000, enabled })
  const { data: awaitRuns } = usePolling<RunListResponse>({ fetcher: awaitFetcher, interval: 5_000, enabled })
  const { data: allRuns } = usePolling<RunListResponse>({ fetcher: recentFetcher, interval: 30_000, enabled })

  const onlineCount = engines.filter(e => e.online).length
  const offlineCount = engines.filter(e => !e.online).length

  const recentFailed = allRuns?.runs.filter(r => r.status === 'failed').slice(0, 5) ?? []
  const recentCompleted = allRuns?.runs.filter(r => r.status === 'completed').slice(0, 5) ?? []

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Dashboard</Typography>

      {/* Metric cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, mb: 3 }}>
        <MetricCard label="Engines" value={engines.length}>
          <Chip size="small" label={`${onlineCount} online`} color="success" variant="outlined" />
          {offlineCount > 0 && <Chip size="small" label={`${offlineCount} offline`} color="error" variant="outlined" />}
        </MetricCard>

        {diag && (
          <>
            <MetricCard label="Flows" value={diag.flows} />
            <MetricCard label="Active Runs" value={diag.activeRuns} color={diag.activeRuns > 0 ? 'info.main' : undefined} />
            <MetricCard label="Awaiting" value={diag.awaitingRuns} color={diag.awaitingRuns > 0 ? 'secondary.main' : undefined} />
            <MetricCard label="Failed" value={diag.failedRuns} color={diag.failedRuns > 0 ? 'error.main' : undefined} />
            <MetricCard label="Completed" value={diag.completedRuns} />
          </>
        )}
      </Box>

      {/* Active runs */}
      {activeRuns && activeRuns.runs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <PlayArrowIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
            Active Runs
          </Typography>
          <RunList runs={activeRuns.runs} onSelect={onNavigateRun} />
        </Box>
      )}

      {/* Pending awaits */}
      {awaitRuns && awaitRuns.runs.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <HourglassEmptyIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" />
            Pending Awaits
          </Typography>
          <RunList runs={awaitRuns.runs} onSelect={onNavigateRun} />
        </Box>
      )}

      {/* Recent failures */}
      {recentFailed.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <ErrorIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" color="error" />
            Recent Failures
          </Typography>
          <RunList runs={recentFailed} onSelect={onNavigateRun} />
        </Box>
      )}

      {/* Recent completions */}
      {recentCompleted.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <CheckCircleIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} fontSize="small" color="success" />
            Recent Completions
          </Typography>
          <RunList runs={recentCompleted} onSelect={onNavigateRun} />
        </Box>
      )}

      {engines.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No engines configured. Go to Engines to add one.
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

function MetricCard({ label, value, color, children }: {
  label: string; value: number; color?: string; children?: React.ReactNode
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography variant="h4" sx={{ color }}>{value}</Typography>
      {children && <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>{children}</Box>}
    </Paper>
  )
}

function RunList({ runs, onSelect }: {
  runs: { id: string; flowName: string; status: string; startedAt: string }[]
  onSelect?: (runId: string) => void
}) {
  return (
    <Paper variant="outlined">
      <List dense disablePadding>
        {runs.map(run => (
          <ListItemButton key={run.id} onClick={() => onSelect?.(run.id)}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <StepStatusChip status={run.status} />
            </ListItemIcon>
            <ListItemText
              primary={run.flowName}
              secondary={`${run.id} · ${new Date(run.startedAt).toLocaleString()}`}
              secondaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: 11 } }}
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  )
}
