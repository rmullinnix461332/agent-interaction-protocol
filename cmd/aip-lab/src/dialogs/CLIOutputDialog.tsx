import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Select, MenuItem, FormControl, InputLabel, Alert,
} from '@mui/material'
import { useFlowState } from '../store/flow-context'

interface Props {
  open: boolean
  onClose: () => void
}

const COMMANDS = [
  { value: 'validate', label: 'Validate' },
  { value: 'render', label: 'Render (ASCII)' },
  { value: 'plan', label: 'Plan (stages)' },
  { value: 'lint', label: 'Lint' },
  { value: 'test', label: 'Test (mocks)' },
]

export default function CLIOutputDialog({ open, onClose }: Props) {
  const { filePath } = useFlowState()
  const [command, setCommand] = useState('validate')
  const [output, setOutput] = useState('')
  const [exitCode, setExitCode] = useState<number | null>(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    if (!filePath) return
    setRunning(true)
    setOutput('')
    setExitCode(null)
    const result = await window.electronAPI?.cliRun({ command, filePath })
    if (result) {
      setOutput(result.stdout + (result.stderr ? '\n' + result.stderr : ''))
      setExitCode(result.exitCode)
    }
    setRunning(false)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>AIP CLI</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Command</InputLabel>
            <Select value={command} label="Command" onChange={(e) => setCommand(e.target.value)}>
              {COMMANDS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" size="small" onClick={run} disabled={running || !filePath}>
            {running ? 'Running...' : 'Run'}
          </Button>
          {exitCode !== null && (
            <Alert severity={exitCode === 0 ? 'success' : 'error'} sx={{ py: 0, flex: 1 }}>
              Exit code: {exitCode}
            </Alert>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5, minHeight: 200, maxHeight: 400, overflow: 'auto',
            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5,
            bgcolor: 'grey.900', color: 'grey.100', borderRadius: 1,
            whiteSpace: 'pre-wrap',
          }}
        >
          {output || (running ? 'Running...' : 'Click Run to execute')}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
