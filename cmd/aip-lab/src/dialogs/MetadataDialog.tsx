import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box,
} from '@mui/material'
import { useState, useEffect } from 'react'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import type { Metadata } from '@/model/flow'

interface Props {
  open: boolean
  onClose: () => void
}

export default function MetadataDialog({ open, onClose }: Props) {
  const { flow } = useFlowState()
  const dispatch = useFlowDispatch()
  const [meta, setMeta] = useState<Metadata>({ name: '' })

  useEffect(() => {
    if (flow) setMeta({ ...flow.metadata })
  }, [flow, open])

  if (!flow) return null

  const save = () => {
    dispatch({ type: 'UPDATE_FLOW', flow: { ...flow, metadata: meta } })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Flow Metadata</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={meta.name}
            size="small" fullWidth margin="dense" required
            onChange={(e) => setMeta({ ...meta, name: e.target.value })}
          />
          <TextField
            label="Title"
            value={meta.title || ''}
            size="small" fullWidth margin="dense"
            onChange={(e) => setMeta({ ...meta, title: e.target.value || undefined })}
          />
          <TextField
            label="Version"
            value={meta.version || ''}
            size="small" fullWidth margin="dense"
            onChange={(e) => setMeta({ ...meta, version: e.target.value || undefined })}
          />
          <TextField
            label="Description"
            value={meta.description || ''}
            size="small" fullWidth margin="dense" multiline rows={3}
            onChange={(e) => setMeta({ ...meta, description: e.target.value || undefined })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!meta.name}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
