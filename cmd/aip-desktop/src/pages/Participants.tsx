import { useCallback } from 'react'
import {
  Typography, Box, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import type { ParticipantListResponse } from '@/api/types'

export function Participants() {
  const { activeEngine } = useEngines()
  const endpoint = activeEngine?.config.endpoint ?? ''

  const fetcher = useCallback(
    () => new EngineClient(endpoint).listParticipants(),
    [endpoint],
  )

  const { data, loading } = usePolling<ParticipantListResponse>({
    fetcher,
    interval: 30_000,
    enabled: !!activeEngine?.online,
  })

  if (!activeEngine?.online) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Participants</Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {activeEngine ? 'Engine is offline' : 'Select an engine to view participants'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  const participants = data?.participants ?? []

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Participants</Typography>

      {loading && !data ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Participant Ref</TableCell>
                <TableCell>Provider Target</TableCell>
                <TableCell>Config</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {participants.map(p => (
                <TableRow key={p.participantRef} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{p.participantRef}</TableCell>
                  <TableCell>
                    <Chip label={p.providerTarget} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {p.config ? JSON.stringify(p.config) : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {participants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No participant bindings registered
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
