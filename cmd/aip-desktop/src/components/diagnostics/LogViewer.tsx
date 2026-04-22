import { useState, useCallback } from 'react'
import {
  Box, Paper, Typography, TextField, Select, MenuItem, FormControl, InputLabel,
  Button, Chip, type ChipProps,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import type { LogsResponse } from '@/api/types'

const levelColors: Record<string, ChipProps['color']> = {
  debug: 'default',
  info: 'info',
  warning: 'warning',
  warn: 'warning',
  error: 'error',
}

export function LogViewer() {
  const { activeEngine } = useEngines()
  const endpoint = activeEngine?.config.endpoint ?? ''
  const [level, setLevel] = useState('')
  const [runId, setRunId] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const fetcher = useCallback(() => {
    const query: Record<string, string | number> = { offset, limit }
    if (level) query.level = level
    if (runId.trim()) query.runId = runId.trim()
    return new EngineClient(endpoint).logs(query as any)
  }, [endpoint, level, runId, offset])

  const { data, refresh } = usePolling<LogsResponse>({
    fetcher,
    interval: 10_000,
    enabled: !!activeEngine?.online,
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const hasMore = data?.hasMore ?? false

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Level</InputLabel>
          <Select value={level} onChange={e => { setLevel(e.target.value); setOffset(0) }} label="Level">
            <MenuItem value="">All</MenuItem>
            <MenuItem value="debug">Debug</MenuItem>
            <MenuItem value="info">Info</MenuItem>
            <MenuItem value="warning">Warning</MenuItem>
            <MenuItem value="error">Error</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Run ID"
          value={runId}
          onChange={e => { setRunId(e.target.value); setOffset(0) }}
          placeholder="Filter by run ID"
          sx={{ minWidth: 200 }}
        />
        <Button size="small" startIcon={<RefreshIcon />} onClick={refresh}>Refresh</Button>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {total} entries
        </Typography>
      </Box>

      {/* Log entries */}
      <Paper variant="outlined" sx={{ maxHeight: 500, overflow: 'auto' }}>
        {logs.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
            No log entries
          </Typography>
        ) : (
          <Box sx={{ fontFamily: 'monospace', fontSize: 12 }}>
            {logs.map((entry, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  gap: 1,
                  px: 1.5,
                  py: 0.4,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                  alignItems: 'center',
                }}
              >
                <Typography variant="caption" sx={{ fontFamily: 'monospace', minWidth: 75, color: 'text.secondary', flexShrink: 0 }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </Typography>
                <Chip
                  label={entry.level}
                  size="small"
                  color={levelColors[entry.level] ?? 'default'}
                  variant="outlined"
                  sx={{ minWidth: 60, height: 20, fontSize: 10 }}
                />
                {entry.runId && (
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'primary.main', minWidth: 60, flexShrink: 0 }}>
                    {entry.runId.slice(0, 16)}
                  </Typography>
                )}
                <Typography variant="caption" sx={{ fontFamily: 'monospace', flexGrow: 1 }} noWrap>
                  {entry.message}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Pagination */}
      {total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, alignItems: 'center' }}>
          <Button size="small" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))}>
            Previous
          </Button>
          <Typography variant="caption" color="text.secondary">
            {offset + 1}–{Math.min(offset + limit, total)} of {total}
          </Typography>
          <Button size="small" disabled={!hasMore} onClick={() => setOffset(offset + limit)}>
            Next
          </Button>
        </Box>
      )}
    </Box>
  )
}
