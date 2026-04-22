import { useState, useEffect, useCallback } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Chip, IconButton,
  List, ListItem, ListItemText, ListItemSecondaryAction,
  Select, MenuItem, FormControl, InputLabel, Alert,
  CircularProgress, Divider, Tooltip, Paper,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useGalleryState, useGalleryDispatch } from '../store/gallery-context'
import { useFlowState, useFlowDispatch } from '../store/flow-context'
import type { Agent } from '../model/agent'
import type { Participant } from '../model/flow'

interface Props {
  open: boolean
  onClose: () => void
}

type View = 'list' | 'detail' | 'register'

export default function AgentGalleryDialog({ open, onClose }: Props) {
  const gallery = useGalleryState()
  const galleryDispatch = useGalleryDispatch()
  const { flow } = useFlowState()
  const flowDispatch = useFlowDispatch()

  const [view, setView] = useState<View>('list')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<string>('all')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [newAgent, setNewAgent] = useState<Partial<Agent>>({ kind: 'agent', capabilities: [] })

  const fetchAgents = useCallback(async () => {
    galleryDispatch({ type: 'SET_LOADING', loading: true })
    try {
      const result = await window.electronAPI?.mcpListAgents()
      if (Array.isArray(result)) {
        galleryDispatch({ type: 'SET_AGENTS', agents: result as Agent[] })
      } else {
        galleryDispatch({ type: 'SET_AGENTS', agents: [] })
      }
    } catch (err: any) {
      galleryDispatch({ type: 'SET_ERROR', error: err.message })
    }
  }, [galleryDispatch])

  useEffect(() => {
    if (open) fetchAgents()
  }, [open, fetchAgents])

  const filtered = gallery.agents.filter((a) => {
    if (kindFilter !== 'all' && a.kind !== kindFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return a.id.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        a.capabilities.some((c) => c.toLowerCase().includes(q))
    }
    return true
  })

  const addToFlow = (agent: Agent) => {
    if (!flow) return
    if (flow.participants.some((p) => p.id === agent.id)) return
    const participant: Participant = {
      id: agent.id,
      kind: agent.kind === 'human' ? 'human' : agent.kind === 'service' ? 'service' : 'agent',
      title: agent.title,
      description: agent.description,
      capabilities: agent.capabilities,
    }
    flowDispatch({
      type: 'UPDATE_FLOW',
      flow: { ...flow, participants: [...flow.participants, participant] },
    })
  }

  const removeAgent = async (agent: Agent) => {
    if (!agent.source) return
    const result = await window.electronAPI?.mcpUnregisterAgent({
      serverName: agent.source, agentId: agent.id,
    })
    if (result?.success) {
      galleryDispatch({ type: 'REMOVE_AGENT', agentId: agent.id })
    }
  }

  const registerAgent = async () => {
    if (!newAgent.id || !newAgent.title) return
    // Find first connected server
    const status = await window.electronAPI?.mcpStatus()
    const serverName = status ? Object.keys(status).find((k) => status[k]) : null
    if (!serverName) {
      galleryDispatch({ type: 'SET_ERROR', error: 'No MCP server connected' })
      return
    }
    const result = await window.electronAPI?.mcpRegisterAgent({ serverName, agent: newAgent })
    if (result?.success) {
      galleryDispatch({ type: 'ADD_AGENT', agent: newAgent as Agent })
      setView('list')
      setNewAgent({ kind: 'agent', capabilities: [] })
    } else {
      galleryDispatch({ type: 'SET_ERROR', error: result?.error || 'Registration failed' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Agent Gallery
        <Box sx={{ flex: 1 }} />
        {view === 'list' && (
          <>
            <Tooltip title="Register new agent">
              <IconButton size="small" onClick={() => setView('register')}><AddIcon /></IconButton>
            </Tooltip>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchAgents} disabled={gallery.loading}><RefreshIcon /></IconButton>
            </Tooltip>
          </>
        )}
      </DialogTitle>
      <DialogContent>
        {gallery.error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => galleryDispatch({ type: 'SET_ERROR', error: null })}>{gallery.error}</Alert>}

        {view === 'list' && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
              <TextField
                size="small" fullWidth placeholder="Search agents..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Kind</InputLabel>
                <Select value={kindFilter} label="Kind" onChange={(e) => setKindFilter(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="agent">Agent</MenuItem>
                  <MenuItem value="service">Service</MenuItem>
                  <MenuItem value="human">Human</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {gallery.loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : filtered.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                {gallery.agents.length === 0 ? 'No agents found. Connect an MCP server in Settings.' : 'No agents match your search.'}
              </Typography>
            ) : (
              <List disablePadding>
                {filtered.map((agent) => (
                  <Paper key={agent.id} elevation={0} sx={{ mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600}>{agent.title}</Typography>
                            <Chip label={agent.kind} size="small" sx={{ height: 20, fontSize: 10 }} />
                            {agent.version && <Typography variant="caption" color="text.secondary">v{agent.version}</Typography>}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">{agent.description}</Typography>
                            {agent.capabilities.length > 0 && (
                              <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {agent.capabilities.map((c) => (
                                  <Chip key={c} label={c} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                                ))}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Tooltip title="Details">
                          <IconButton size="small" onClick={() => { setSelectedAgent(agent); setView('detail') }}>
                            <InfoIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Add to flow">
                          <IconButton size="small" onClick={() => addToFlow(agent)} disabled={!flow || flow.participants.some((p) => p.id === agent.id)}>
                            <PlaylistAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeAgent(agent)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </Paper>
                ))}
              </List>
            )}
          </>
        )}

        {view === 'detail' && selectedAgent && (
          <Box>
            <Button size="small" onClick={() => setView('list')} sx={{ mb: 1 }}>&larr; Back</Button>
            <Typography variant="h6">{selectedAgent.title}</Typography>
            <Chip label={selectedAgent.kind} size="small" sx={{ mb: 1 }} />
            <Typography variant="body2" sx={{ mb: 2 }}>{selectedAgent.description}</Typography>
            {selectedAgent.version && <Typography variant="caption" display="block">Version: {selectedAgent.version}</Typography>}
            {selectedAgent.source && <Typography variant="caption" display="block" color="text.secondary">Source: {selectedAgent.source}</Typography>}
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="subtitle2">Capabilities</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
              {selectedAgent.capabilities.map((c) => <Chip key={c} label={c} size="small" />)}
              {selectedAgent.capabilities.length === 0 && <Typography variant="caption" color="text.secondary">None declared</Typography>}
            </Box>
            {selectedAgent.constraints && Object.keys(selectedAgent.constraints).length > 0 && (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="subtitle2">Constraints</Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(selectedAgent.constraints, null, 2)}
                </Typography>
              </>
            )}
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" size="small" startIcon={<PlaylistAddIcon />}
                onClick={() => addToFlow(selectedAgent)}
                disabled={!flow || flow.participants.some((p) => p.id === selectedAgent.id)}>
                Add to Flow
              </Button>
            </Box>
          </Box>
        )}

        {view === 'register' && (
          <Box>
            <Button size="small" onClick={() => setView('list')} sx={{ mb: 1 }}>&larr; Back</Button>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Register New Agent</Typography>
            <TextField label="ID" value={newAgent.id || ''} size="small" fullWidth margin="dense"
              onChange={(e) => setNewAgent({ ...newAgent, id: e.target.value })} />
            <TextField label="Title" value={newAgent.title || ''} size="small" fullWidth margin="dense"
              onChange={(e) => setNewAgent({ ...newAgent, title: e.target.value })} />
            <FormControl size="small" fullWidth margin="dense">
              <InputLabel>Kind</InputLabel>
              <Select value={newAgent.kind || 'agent'} label="Kind"
                onChange={(e) => setNewAgent({ ...newAgent, kind: e.target.value as Agent['kind'] })}>
                <MenuItem value="agent">Agent</MenuItem>
                <MenuItem value="service">Service</MenuItem>
                <MenuItem value="human">Human</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Description" value={newAgent.description || ''} size="small" fullWidth margin="dense" multiline rows={2}
              onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })} />
            <TextField label="Version" value={newAgent.version || ''} size="small" fullWidth margin="dense"
              onChange={(e) => setNewAgent({ ...newAgent, version: e.target.value || undefined })} />
            <TextField label="Capabilities (comma-separated)" value={(newAgent.capabilities || []).join(', ')} size="small" fullWidth margin="dense"
              onChange={(e) => setNewAgent({ ...newAgent, capabilities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            <Button variant="contained" size="small" sx={{ mt: 1 }} onClick={registerAgent}
              disabled={!newAgent.id || !newAgent.title}>
              Register
            </Button>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
