import { useCallback } from 'react'
import {
  Typography, Box, Paper, Tabs, Tab, List, ListItem, ListItemText,
} from '@mui/material'
import { useState } from 'react'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import { LogViewer } from '@/components/diagnostics/LogViewer'
import type { DiagnosticsResponse } from '@/api/types'

export function Diagnostics() {
  const { activeEngine } = useEngines()
  const endpoint = activeEngine?.config.endpoint ?? ''
  const [tab, setTab] = useState(0)

  const fetcher = useCallback(
    () => new EngineClient(endpoint).diagnostics(),
    [endpoint],
  )

  const { data: diag } = usePolling<DiagnosticsResponse>({
    fetcher,
    interval: 15_000,
    enabled: !!activeEngine?.online,
  })

  if (!activeEngine?.online) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Diagnostics</Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {activeEngine ? 'Engine is offline' : 'Select an engine to view diagnostics'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Diagnostics</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Health" />
        <Tab label="Logs" />
        <Tab label="Errors" />
      </Tabs>

      {/* Health tab */}
      {tab === 0 && diag && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Engine</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 2 }}>
              <Metric label="Status" value={diag.engine.status} />
              <Metric label="Uptime" value={diag.engine.uptime} />
              <Metric label="Goroutines" value={String(diag.engine.goroutines)} />
              <Metric label="Memory" value={`${diag.engine.memAllocMB.toFixed(1)} MB`} />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Runs</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 }}>
              <Metric label="Total" value={String(diag.runs)} />
              <Metric label="Active" value={String(diag.activeRuns)} />
              <Metric label="Awaiting" value={String(diag.awaitingRuns)} />
              <Metric label="Failed" value={String(diag.failedRuns)} />
              <Metric label="Completed" value={String(diag.completedRuns)} />
            </Box>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Flows</Typography>
            <Metric label="Connected" value={String(diag.flows)} />
          </Paper>
        </Box>
      )}

      {/* Logs tab */}
      {tab === 1 && <LogViewer />}

      {/* Errors tab */}
      {tab === 2 && (
        <Paper variant="outlined">
          {diag?.recentErrors && diag.recentErrors.length > 0 ? (
            <List dense>
              {diag.recentErrors.map((err, i) => (
                <ListItem key={i} divider>
                  <ListItemText
                    primary={err.error}
                    secondary={`Run: ${err.runId} · Flow: ${err.flowId}${err.occurredAt ? ` · ${new Date(err.occurredAt).toLocaleString()}` : ''}`}
                    primaryTypographyProps={{ color: 'error', fontSize: 13 }}
                    secondaryTypographyProps={{ sx: { fontFamily: 'monospace', fontSize: 11 } }}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              No recent errors
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  )
}
