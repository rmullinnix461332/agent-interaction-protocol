import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Box, Typography, Divider,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import type { Participant } from '@/model/flow'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY: Participant = { id: '', kind: 'agent', title: '', description: '' }

export default function ParticipantsDialog({ open, onClose }: Props) {
  const { flow } = useFlowState()
  const dispatch = useFlowDispatch()
  const [editing, setEditing] = useState<Participant | null>(null)
  const [isNew, setIsNew] = useState(false)

  if (!flow) return null

  const startAdd = () => {
    setEditing({ ...EMPTY })
    setIsNew(true)
  }

  const startEdit = (p: Participant) => {
    setEditing({ ...p })
    setIsNew(false)
  }

  const save = () => {
    if (!editing || !editing.id) return
    let participants: Participant[]
    if (isNew) {
      participants = [...flow.participants, editing]
    } else {
      participants = flow.participants.map((p) => (p.id === editing.id ? editing : p))
    }
    dispatch({ type: 'UPDATE_FLOW', flow: { ...flow, participants } })
    setEditing(null)
  }

  const remove = (id: string) => {
    dispatch({
      type: 'UPDATE_FLOW',
      flow: { ...flow, participants: flow.participants.filter((p) => p.id !== id) },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Participants</DialogTitle>
      <DialogContent>
        {!editing ? (
          <>
            <List dense>
              {flow.participants.map((p) => (
                <ListItem key={p.id}>
                  <ListItemText
                    primary={p.title || p.id}
                    secondary={`${p.kind}${p.flowRef ? ` → ${p.flowRef}` : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => startEdit(p)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => remove(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {flow.participants.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No participants defined
                </Typography>
              )}
            </List>
            <Button startIcon={<AddIcon />} onClick={startAdd} sx={{ mt: 1 }}>
              Add Participant
            </Button>
          </>
        ) : (
          <Box sx={{ mt: 1 }}>
            <TextField
              label="ID"
              value={editing.id}
              size="small" fullWidth margin="dense"
              disabled={!isNew}
              onChange={(e) => setEditing({ ...editing, id: e.target.value })}
            />
            <TextField
              label="Title"
              value={editing.title || ''}
              size="small" fullWidth margin="dense"
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <FormControl size="small" fullWidth margin="dense">
              <InputLabel>Kind</InputLabel>
              <Select
                value={editing.kind}
                label="Kind"
                onChange={(e) => setEditing({ ...editing, kind: e.target.value as Participant['kind'] })}
              >
                <MenuItem value="agent">agent</MenuItem>
                <MenuItem value="service">service</MenuItem>
                <MenuItem value="human">human</MenuItem>
                <MenuItem value="subflow">subflow</MenuItem>
              </Select>
            </FormControl>
            {editing.kind === 'subflow' && (
              <TextField
                label="Flow Ref"
                value={editing.flowRef || ''}
                size="small" fullWidth margin="dense"
                onChange={(e) => setEditing({ ...editing, flowRef: e.target.value })}
              />
            )}
            <TextField
              label="Description"
              value={editing.description || ''}
              size="small" fullWidth margin="dense" multiline rows={2}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
            <TextField
              label="Version"
              value={editing.version || ''}
              size="small" fullWidth margin="dense"
              onChange={(e) => setEditing({ ...editing, version: e.target.value || undefined })}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {editing ? (
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!editing.id}>Save</Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
