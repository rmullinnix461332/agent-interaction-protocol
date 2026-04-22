import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, FormControl, InputLabel, Select, MenuItem, Typography,
} from '@mui/material'
import type { EngineConfig } from '@/api/types'

interface AddEngineDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (engine: EngineConfig) => void
}

export function AddEngineDialog({ open, onClose, onAdd }: AddEngineDialogProps) {
  const [name, setName] = useState('')
  const [endpoint, setEndpoint] = useState('http://localhost:8080')
  const [type, setType] = useState<'local' | 'remote'>('local')

  const handleAdd = () => {
    if (!name.trim() || !endpoint.trim()) return
    onAdd({
      id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      name: name.trim(),
      endpoint: endpoint.trim(),
      type,
    })
    setName('')
    setEndpoint('http://localhost:8080')
    setType('local')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Engine</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <TextField
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="local-engine"
          fullWidth
          autoFocus
          margin="dense"
        />
        <TextField
          label="Endpoint URL"
          value={endpoint}
          onChange={e => setEndpoint(e.target.value)}
          placeholder="http://localhost:8080"
          fullWidth
          margin="dense"
        />
        <FormControl fullWidth margin="dense">
          <InputLabel>Type</InputLabel>
          <Select value={type} onChange={e => setType(e.target.value as 'local' | 'remote')} label="Type">
            <MenuItem value="local">Local</MenuItem>
            <MenuItem value="remote">Remote</MenuItem>
          </Select>
        </FormControl>
        {type === 'local' && (
          <Typography variant="caption" color="text.secondary">
            Local engines can be started and stopped from the Engines page.
            Ensure aip-engine binary is available on your PATH.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!name.trim() || !endpoint.trim()}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  )
}
