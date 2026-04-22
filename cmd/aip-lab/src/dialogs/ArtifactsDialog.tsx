import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Chip, Box, Typography,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Autocomplete, Switch, FormControlLabel,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import type { Artifact } from '@/model/flow'

interface Props {
  open: boolean
  onClose: () => void
}

const EMPTY: Artifact = { ref: 'aip://artifact/', contentType: 'text/markdown' }

export default function ArtifactsDialog({ open, onClose }: Props) {
  const { flow } = useFlowState()
  const dispatch = useFlowDispatch()
  const [editing, setEditing] = useState<Artifact | null>(null)
  const [isNew, setIsNew] = useState(false)

  if (!flow) return null

  const participantIds = flow.participants.map((p) => p.id)

  const startAdd = () => {
    setEditing({ ...EMPTY })
    setIsNew(true)
  }

  const startEdit = (a: Artifact) => {
    setEditing({ ...a })
    setIsNew(false)
  }

  const save = () => {
    if (!editing || !editing.ref) return
    let artifacts: Artifact[]
    if (isNew) {
      artifacts = [...flow.artifacts, editing]
    } else {
      artifacts = flow.artifacts.map((a) => (a.ref === editing.ref ? editing : a))
    }
    dispatch({ type: 'UPDATE_FLOW', flow: { ...flow, artifacts } })
    setEditing(null)
  }

  const remove = (ref: string) => {
    dispatch({
      type: 'UPDATE_FLOW',
      flow: { ...flow, artifacts: flow.artifacts.filter((a) => a.ref !== ref) },
    })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Artifacts</DialogTitle>
      <DialogContent>
        {!editing ? (
          <>
            <List dense>
              {flow.artifacts.map((a) => (
                <ListItem key={a.ref}>
                  <ListItemText
                    primary={a.title || a.ref}
                    secondary={`${a.contentType || 'text/markdown'}${a.producer ? ` • producer: ${a.producer}` : ''}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton size="small" onClick={() => startEdit(a)}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => remove(a.ref)}><DeleteIcon fontSize="small" /></IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
              {flow.artifacts.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                  No artifacts defined
                </Typography>
              )}
            </List>
            <Button startIcon={<AddIcon />} onClick={startAdd} sx={{ mt: 1 }}>
              Add Artifact
            </Button>
          </>
        ) : (
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Ref"
              value={editing.ref}
              size="small" fullWidth margin="dense"
              disabled={!isNew}
              placeholder="aip://artifact/my-artifact"
              onChange={(e) => setEditing({ ...editing, ref: e.target.value })}
            />
            <TextField
              label="Title"
              value={editing.title || ''}
              size="small" fullWidth margin="dense"
              onChange={(e) => setEditing({ ...editing, title: e.target.value || undefined })}
            />
            <TextField
              label="Content Type"
              value={editing.contentType || ''}
              size="small" fullWidth margin="dense"
              placeholder="text/markdown"
              onChange={(e) => setEditing({ ...editing, contentType: e.target.value || undefined })}
            />
            <TextField
              label="Description"
              value={editing.description || ''}
              size="small" fullWidth margin="dense" multiline rows={2}
              onChange={(e) => setEditing({ ...editing, description: e.target.value || undefined })}
            />
            <Autocomplete
              size="small"
              options={participantIds}
              value={editing.producer || null}
              onChange={(_, val) => setEditing({ ...editing, producer: val || undefined })}
              renderInput={(params) => <TextField {...params} label="Producer" margin="dense" />}
            />
            <Autocomplete
              multiple size="small"
              options={participantIds}
              value={editing.consumers || []}
              onChange={(_, val) => setEditing({ ...editing, consumers: val.length > 0 ? val : undefined })}
              renderInput={(params) => <TextField {...params} label="Consumers" margin="dense" />}
              renderTags={(value, getTagProps) =>
                value.map((id, i) => <Chip {...getTagProps({ index: i })} key={id} label={id} size="small" />)
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editing.required || false}
                  onChange={(e) => setEditing({ ...editing, required: e.target.checked || undefined })}
                  size="small"
                />
              }
              label="Required"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {editing ? (
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" onClick={save} disabled={!editing.ref}>Save</Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
