import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert,
} from '@mui/material'
import { useFlowState } from '../store/flow-context'

interface Props {
  open: boolean
  onClose: () => void
}

export default function GitCommitDialog({ open, onClose }: Props) {
  const { filePath } = useFlowState()
  const [message, setMessage] = useState('')
  const [diff, setDiff] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    if (!open || !filePath) return
    setMessage('')
    setError(null)
    window.electronAPI?.gitDiff(filePath).then((r) => {
      setDiff(r.diff || '(no changes)')
      if (r.error) setError(r.error)
    })
  }, [open, filePath])

  const handleCommit = async () => {
    if (!filePath || !message.trim()) return
    setCommitting(true)
    const result = await window.electronAPI?.gitCommit({ filePath, message: message.trim() })
    setCommitting(false)
    if (result?.success) {
      onClose()
    } else {
      setError(result?.error || 'Commit failed')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Git Commit</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <TextField
          label="Commit message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          size="small" fullWidth margin="dense" autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommit() } }}
        />
        <Typography variant="caption" fontWeight={600} sx={{ mt: 2, display: 'block' }}>Diff</Typography>
        <Box
          sx={{
            mt: 0.5, p: 1, maxHeight: 300, overflow: 'auto',
            fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5,
            bgcolor: 'grey.50', borderRadius: 1, whiteSpace: 'pre-wrap',
            border: 1, borderColor: 'divider',
          }}
        >
          {diff}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleCommit} disabled={!message.trim() || committing}>
          {committing ? 'Committing...' : 'Commit'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
