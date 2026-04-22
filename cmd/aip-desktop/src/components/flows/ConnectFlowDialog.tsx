import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert,
} from '@mui/material'

interface ConnectFlowDialogProps {
  open: boolean
  onClose: () => void
  onConnect: (flowJson: unknown) => Promise<void>
}

export function ConnectFlowDialog({ open, onClose, onConnect }: ConnectFlowDialogProps) {
  const [json, setJson] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleConnect = async () => {
    setError(null)
    let parsed: unknown
    try {
      parsed = JSON.parse(json)
    } catch {
      setError('Invalid JSON')
      return
    }

    setSubmitting(true)
    try {
      await onConnect(parsed)
      setJson('')
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Connect Flow</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Flow JSON"
          multiline
          rows={16}
          value={json}
          onChange={e => setJson(e.target.value)}
          placeholder='Paste AIP flow JSON here...'
          fullWidth
          margin="dense"
          sx={{ fontFamily: 'monospace' }}
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConnect} variant="contained" disabled={!json.trim() || submitting}>
          {submitting ? 'Connecting...' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
