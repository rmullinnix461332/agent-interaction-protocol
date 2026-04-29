import { useState, useEffect } from 'react'
import {
  Box, Typography, TextField, Button, IconButton, Tooltip, Chip,
  CircularProgress, Alert, Paper, Switch, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import PersonIcon from '@mui/icons-material/Person'
import LinkIcon from '@mui/icons-material/Link'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useGalleryState, useGalleryDispatch, useGalleryActions } from '@/store/gallery-context'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import type { GalleryEntry, AgentRegistry, RegistrySourceType } from '@/model/agent'
import type { Participant } from '@/model/flow'

type Tab = 'gallery' | 'registries'

const categoryIcons: Record<string, React.ReactNode> = {
  agent: <SmartToyIcon sx={{ fontSize: 20 }} />,
  service: <MiscellaneousServicesIcon sx={{ fontSize: 20 }} />,
  human: <PersonIcon sx={{ fontSize: 20 }} />,
}

export default function MarketplacePanel() {
  const gallery = useGalleryState()
  const galleryDispatch = useGalleryDispatch()
  const { fetchAll, addRegistry, removeRegistry, toggleRegistry } = useGalleryActions()
  const { flow } = useFlowState()
  const flowDispatch = useFlowDispatch()

  const [tab, setTab] = useState<Tab>('gallery')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [addRegOpen, setAddRegOpen] = useState(false)

  useEffect(() => { fetchAll() }, [])

  const filtered = gallery.entries.filter(entry => {
    if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.tags.some(t => t.toLowerCase().includes(q)) ||
        entry.capabilities.some(c => c.toLowerCase().includes(q))
    }
    return true
  })

  const addToFlow = (entry: GalleryEntry) => {
    if (!flow) return
    if (flow.participants.some(p => p.id === entry.id)) return
    const participant: Participant = {
      id: entry.id,
      kind: entry.kind === 'human' ? 'human' : entry.kind === 'service' ? 'service' : 'agent',
      title: entry.name,
      description: entry.description,
      capabilities: entry.capabilities,
    }
    // Add catalogRef metadata
    if (!participant.constraints) participant.constraints = {}
    participant.constraints = { catalogRef: entry.sourceType, sourceName: entry.sourceName }

    flowDispatch({
      type: 'UPDATE_FLOW',
      flow: { ...flow, participants: [...flow.participants, participant] },
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab toggle */}
      <Box sx={{ display: 'flex', gap: 0.5, px: 1, mb: 1 }}>
        <Button size="small" variant={tab === 'gallery' ? 'contained' : 'text'} onClick={() => setTab('gallery')} sx={{ flex: 1, fontSize: 11 }}>
          Gallery
        </Button>
        <Button size="small" variant={tab === 'registries' ? 'contained' : 'text'} onClick={() => setTab('registries')} sx={{ flex: 1, fontSize: 11 }}>
          Sources
        </Button>
      </Box>

      {gallery.error && (
        <Alert severity="error" sx={{ mx: 1, mb: 1, py: 0 }} onClose={() => galleryDispatch({ type: 'SET_ERROR', error: null })}>
          {gallery.error}
        </Alert>
      )}

      {/* Gallery tab */}
      {tab === 'gallery' && (
        <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
          {/* Search */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
            <TextField
              size="small" fullWidth placeholder="Search agents..."
              value={search} onChange={e => setSearch(e.target.value)}
              slotProps={{ input: { sx: { fontSize: 12, height: 30 } } }}
            />
            <Tooltip title="Refresh all sources">
              <IconButton size="small" onClick={fetchAll} disabled={gallery.loading}>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Category filter */}
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            <Chip
              label="All" size="small"
              variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
              onClick={() => setCategoryFilter('all')}
              sx={{ fontSize: 10, height: 22 }}
            />
            {gallery.categories.map(cat => (
              <Chip
                key={cat} label={cat} size="small"
                variant={categoryFilter === cat ? 'filled' : 'outlined'}
                onClick={() => setCategoryFilter(cat)}
                sx={{ fontSize: 10, height: 22 }}
              />
            ))}
          </Box>

          {/* Results */}
          {gallery.loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={24} /></Box>
          ) : filtered.length === 0 ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', py: 3 }}>
              {gallery.entries.length === 0 ? 'No agents found. Add a registry source.' : 'No matches.'}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {filtered.map(entry => (
                <AgentCard
                  key={`${entry.id}@${entry.sourceName}`}
                  entry={entry}
                  expanded={gallery.selectedEntry?.id === entry.id && gallery.selectedEntry?.sourceName === entry.sourceName}
                  onToggle={() => {
                    const isSame = gallery.selectedEntry?.id === entry.id && gallery.selectedEntry?.sourceName === entry.sourceName
                    galleryDispatch({ type: 'SELECT_ENTRY', entry: isSame ? null : entry })
                  }}
                  onAdd={() => addToFlow(entry)}
                  canAdd={!!flow && !flow.participants.some(p => p.id === entry.id)}
                />
              ))}
            </Box>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            {filtered.length} of {gallery.entries.length} entries
          </Typography>
        </Box>
      )}

      {/* Sources tab */}
      {tab === 'registries' && (
        <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
          <Button size="small" variant="outlined" fullWidth startIcon={<AddIcon />} onClick={() => setAddRegOpen(true)} sx={{ mb: 1 }}>
            Add Source
          </Button>

          {gallery.registries.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                No registry sources configured.
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Add an HTTP JSON URL, GitHub raw manifest, or local JSON file.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {gallery.registries.map(reg => (
                <RegistryCard
                  key={reg.url}
                  registry={reg}
                  onToggle={() => toggleRegistry(reg.url)}
                  onRemove={() => removeRegistry(reg.url)}
                />
              ))}
            </Box>
          )}
        </Box>
      )}

      <AddRegistryDialog open={addRegOpen} onClose={() => setAddRegOpen(false)} onAdd={addRegistry} />
    </Box>
  )
}

// --- Agent Card ---

function AgentCard({ entry, expanded, onToggle, onAdd, canAdd }: {
  entry: GalleryEntry; expanded: boolean; onToggle: () => void; onAdd: () => void; canAdd: boolean
}) {
  const icon = entry.iconUrl
    ? <Avatar src={entry.iconUrl} sx={{ width: 32, height: 32 }} variant="rounded" />
    : <Avatar sx={{ width: 32, height: 32, bgcolor: 'action.selected' }} variant="rounded">
        {categoryIcons[entry.category] || categoryIcons.agent}
      </Avatar>

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Box
        onClick={onToggle}
        sx={{ display: 'flex', gap: 1, p: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
      >
        {icon}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 12 }}>{entry.name}</Typography>
            {canAdd && (
              <Tooltip title="Add to flow">
                <IconButton size="small" onClick={e => { e.stopPropagation(); onAdd() }} sx={{ ml: 'auto', p: 0.25 }}>
                  <PlaylistAddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 11, lineHeight: 1.3 }}>
            {entry.description}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip label={entry.category} size="small" sx={{ height: 18, fontSize: 9 }} />
            {entry.tags.slice(0, 3).map(t => (
              <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 18, fontSize: 9 }} />
            ))}
          </Box>
        </Box>
      </Box>

      {/* Expanded detail */}
      {expanded && (
        <Box sx={{ px: 1.5, pb: 1.5, borderTop: 1, borderColor: 'divider', pt: 1 }}>
          {entry.capabilities.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">Capabilities</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                {entry.capabilities.map(c => (
                  <Chip key={c} label={c} size="small" variant="outlined" sx={{ height: 18, fontSize: 9 }} />
                ))}
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {entry.version && (
              <Typography variant="caption" color="text.secondary">Version: {entry.version}</Typography>
            )}
            <Typography variant="caption" color="text.secondary">Source: {entry.sourceName}</Typography>
            <Typography variant="caption" color="text.secondary">Type: {entry.sourceType}</Typography>
          </Box>
          {entry.docsUrl && (
            <Button size="small" startIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />} sx={{ mt: 0.5, fontSize: 10 }}
              onClick={() => window.open(entry.docsUrl, '_blank')}>
              Documentation
            </Button>
          )}
          {canAdd && (
            <Button size="small" variant="contained" startIcon={<PlaylistAddIcon sx={{ fontSize: 14 }} />}
              onClick={onAdd} sx={{ mt: 0.5, ml: 1, fontSize: 10 }}>
              Add to Flow
            </Button>
          )}
        </Box>
      )}
    </Paper>
  )
}

// --- Registry Card ---

function RegistryCard({ registry, onToggle, onRemove }: {
  registry: AgentRegistry; onToggle: () => void; onRemove: () => void
}) {
  const typeLabels: Record<RegistrySourceType, string> = {
    'http-json': 'HTTP JSON',
    'github-raw': 'GitHub Raw',
    'local-file': 'Local File',
    'mcp': 'MCP Server',
    'mcp-registry': 'MCP Registry',
  }

  return (
    <Paper variant="outlined" sx={{ px: 1.5, py: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <LinkIcon sx={{ fontSize: 16, color: registry.enabled ? 'primary.main' : 'text.disabled' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={500} noWrap sx={{ fontSize: 12 }}>{registry.name}</Typography>
            <Chip label={typeLabels[registry.sourceType]} size="small" variant="outlined" sx={{ height: 18, fontSize: 9 }} />
          </Box>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 10, fontFamily: 'monospace' }}>
            {registry.url}
          </Typography>
        </Box>
        <Switch size="small" checked={registry.enabled} onChange={onToggle} />
        <IconButton size="small" onClick={onRemove}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
      </Box>
    </Paper>
  )
}

// --- Add Registry Dialog ---

function AddRegistryDialog({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void
  onAdd: (url: string, name: string, sourceType: RegistrySourceType) => void
}) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState<RegistrySourceType>('http-json')

  const handleAdd = () => {
    if (!url.trim()) return
    let regName = name.trim()
    if (!regName) {
      try { regName = new URL(url).hostname } catch { regName = url.slice(0, 30) }
    }
    onAdd(url.trim(), regName, sourceType)
    setUrl('')
    setName('')
    setSourceType('http-json')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Registry Source</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
        <FormControl size="small" fullWidth margin="dense">
          <InputLabel>Source Type</InputLabel>
          <Select value={sourceType} onChange={e => setSourceType(e.target.value as RegistrySourceType)} label="Source Type">
            <MenuItem value="http-json">HTTP JSON URL</MenuItem>
            <MenuItem value="github-raw">GitHub Raw Manifest</MenuItem>
            <MenuItem value="mcp-registry">MCP Registry (JSON-RPC)</MenuItem>
            <MenuItem value="local-file">Local JSON File</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={sourceType === 'local-file' ? 'File Path' : sourceType === 'mcp-registry' ? 'MCP Server URL' : 'Registry URL'}
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={
            sourceType === 'local-file' ? '/path/to/agents.json'
            : sourceType === 'mcp-registry' ? 'https://mcp.example.com/mcp'
            : 'https://registry.example.com/agents.json'
          }
          fullWidth autoFocus margin="dense"
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
        />
        <TextField
          label="Display Name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Agent Registry"
          fullWidth margin="dense"
        />
        <Typography variant="caption" color="text.secondary">
          {sourceType === 'mcp-registry'
            ? 'Enter the MCP server endpoint URL. The adapter will connect via JSON-RPC and call tools/list to discover available tools.'
            : 'Registry should return a JSON array of agent entries, or an object with an "agents", "entries", or "catalog" field.'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!url.trim()}>Add</Button>
      </DialogActions>
    </Dialog>
  )
}
