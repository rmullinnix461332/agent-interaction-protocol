import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, Typography, Box,
} from '@mui/material'

interface ResumeDialogProps {
  open: boolean
  onClose: () => void
  onResume: (payload: { ref: string; contentType: string; value: unknown }) => Promise<void>
  awaitInputRef: string
}

export function ResumeDialog({ open, onClose, onResume, awaitInputRef }: ResumeDialogProps) {
  const [ref, setRef] = useState(awaitInputRef)
  const [contentType, setContentType] = useState('application/json')
  const [valueJson, setValueJson] = useState('{\n  \n}')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleResume = async () => {
    setError(null)

    if (!ref.trim()) {
      setError('Artifact ref is required')
      return
    }

    let parsedValue: unknown
    try {
      parsedValue = JSON.parse(valueJson)
    } catch {
      setError('Value must be valid JSON')
      return
    }

    setSubmitting(true)
    try {
      await onResume({ ref: ref.trim(), contentType, value: parsedValue })
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Resume Run</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Provide the artifact-shaped payload to resume this awaiting run.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label="Artifact Ref"
          value={ref}
          onChange={e => setRef(e.target.value)}
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
        />
        <TextField
          label="Content Type"
          value={contentType}
          onChange={e => setContentType(e.target.value)}
          fullWidth
          margin="dense"
        />
        <TextField
          label="Value (JSON)"
          multiline
          rows={8}
          value={valueJson}
          onChange={e => setValueJson(e.target.value)}
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleResume} variant="contained" disabled={submitting}>
          {submitting ? 'Resuming...' : 'Resume'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
