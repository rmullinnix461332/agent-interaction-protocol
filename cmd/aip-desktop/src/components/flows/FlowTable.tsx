import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Chip,
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DeleteIcon from '@mui/icons-material/Delete'
import type { FlowSummary } from '@/api/types'

interface FlowTableProps {
  flows: FlowSummary[]
  onRun: (flowId: string) => void
  onDisconnect: (flowId: string) => void
}

export function FlowTable({ flows, onRun, onDisconnect }: FlowTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Version</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Runs</TableCell>
            <TableCell>Last Run</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {flows.map(flow => (
            <TableRow key={flow.id} hover>
              <TableCell>
                {flow.title || flow.name}
                {flow.title && (
                  <Chip label={flow.name} size="small" variant="outlined" sx={{ ml: 1 }} />
                )}
              </TableCell>
              <TableCell>{flow.version || '—'}</TableCell>
              <TableCell>
                <Chip label={flow.status} size="small" color="success" variant="outlined" />
              </TableCell>
              <TableCell>{flow.runCount}</TableCell>
              <TableCell>
                {flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString() : '—'}
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Run now">
                  <IconButton size="small" color="primary" onClick={() => onRun(flow.id)}>
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Disconnect">
                  <IconButton size="small" onClick={() => onDisconnect(flow.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {flows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No flows connected
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
