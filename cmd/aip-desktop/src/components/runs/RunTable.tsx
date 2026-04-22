import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip,
} from '@mui/material'
import StopIcon from '@mui/icons-material/Stop'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { StepStatusChip } from './StepStatusChip'
import type { RunSummary } from '@/api/types'

interface RunTableProps {
  runs: RunSummary[]
  onInspect: (runId: string) => void
  onStop: (runId: string) => void
}

export function RunTable({ runs, onInspect, onStop }: RunTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Run ID</TableCell>
            <TableCell>Flow</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Started</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map(run => (
            <TableRow key={run.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                {run.id}
              </TableCell>
              <TableCell>{run.flowName}</TableCell>
              <TableCell>
                <StepStatusChip status={run.status} />
              </TableCell>
              <TableCell>{new Date(run.startedAt).toLocaleString()}</TableCell>
              <TableCell>{run.duration || '—'}</TableCell>
              <TableCell align="right">
                <Tooltip title="Inspect">
                  <IconButton size="small" onClick={() => onInspect(run.id)}>
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {(run.status === 'running' || run.status === 'awaiting') && (
                  <Tooltip title="Stop">
                    <IconButton size="small" color="error" onClick={() => onStop(run.id)}>
                      <StopIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
          {runs.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No runs found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
