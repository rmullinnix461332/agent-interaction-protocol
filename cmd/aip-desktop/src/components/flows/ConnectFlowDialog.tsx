import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Alert, Box, Typography, Chip,
} from '@mui/material'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import yaml from 'js-yaml'

interface ConnectFlowDialogProps {
  open: boolean
  onClose: () => void
  onConnect: (flowJson: unknown) => Promise<void>
}

export function ConnectFlowDialog({ open, onClose, onConnect }: ConnectFlowDialogProps) {
  const [content, setContent] = useState('')
  const [filePath, setFilePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleBrowse = async () => {
    setError(null)
    const result = await window.electronAPI.openFlowFile()
    if (!result) return
    setContent(result.content)
    setFilePath(result.filePath)
  }

  const handleConnect = async () => {
    setError(null)
    const parsed = parseFlowContent(content)
    if (parsed.error) {
      setError(parsed.error)
      return
    }

    setSubmitting(true)
    try {
      await onConnect(parsed.data)
      setContent('')
      setFilePath(null)
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setContent('')
    setFilePath(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Connect Flow</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <Button variant="outlined" startIcon={<FolderOpenIcon />} onClick={handleBrowse}>
            Open File
          </Button>
          {filePath && (
            <Chip
              label={filePath.split('/').pop()}
              size="small"
              onDelete={() => { setFilePath(null); setContent('') }}
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Supports JSON and YAML
          </Typography>
        </Box>

        <TextField
          label="Flow Definition"
          multiline
          rows={16}
          value={content}
          onChange={e => { setContent(e.target.value); setFilePath(null) }}
          placeholder="Paste or open a JSON/YAML flow file..."
          fullWidth
          margin="dense"
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 12 } } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConnect} variant="contained" disabled={!content.trim() || submitting}>
          {submitting ? 'Connecting...' : 'Connect'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function parseFlowContent(content: string): { data?: unknown; error?: string } {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'No content provided' }

  // Try JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return { data: JSON.parse(trimmed) }
    } catch (e) {
      return { error: `Invalid JSON: ${e}` }
    }
  }

  // Try YAML
  try {
    const parsed = yaml.load(trimmed)
    if (typeof parsed === 'object' && parsed !== null) {
      return { data: parsed }
    }
    return { error: 'YAML did not produce a valid object' }
  } catch (e) {
    return { error: `Invalid YAML: ${e}` }
  }
}
