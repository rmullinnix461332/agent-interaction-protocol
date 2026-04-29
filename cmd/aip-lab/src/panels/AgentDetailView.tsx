import {
  Box, Typography, Button, Chip, Avatar, Divider, Paper, Link,
} from '@mui/material'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import PersonIcon from '@mui/icons-material/Person'
import { useGalleryState, useGalleryDispatch } from '@/store/gallery-context'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import type { GalleryEntry } from '@/model/agent'
import type { Participant } from '@/model/flow'

const categoryIcons: Record<string, React.ReactNode> = {
  agent: <SmartToyIcon sx={{ fontSize: 40 }} />,
  service: <MiscellaneousServicesIcon sx={{ fontSize: 40 }} />,
  human: <PersonIcon sx={{ fontSize: 40 }} />,
  'mcp-tool': <MiscellaneousServicesIcon sx={{ fontSize: 40 }} />,
}

export default function AgentDetailView() {
  const { selectedEntry } = useGalleryState()
  const galleryDispatch = useGalleryDispatch()
  const { flow } = useFlowState()
  const flowDispatch = useFlowDispatch()

  if (!selectedEntry) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">Select an agent from the marketplace to view details</Typography>
      </Box>
    )
  }

  const entry = selectedEntry
  const alreadyInFlow = flow?.participants.some(p => p.id === entry.id) ?? false

  const addToFlow = () => {
    if (!flow || alreadyInFlow) return
    const participant: Participant = {
      id: entry.id,
      kind: entry.kind === 'human' ? 'human' : entry.kind === 'service' ? 'service' : 'agent',
      title: entry.name,
      description: entry.description,
      capabilities: entry.capabilities,
    }
    if (!participant.constraints) participant.constraints = {}
    participant.constraints = { catalogRef: entry.sourceType, sourceName: entry.sourceName }
    flowDispatch({
      type: 'UPDATE_FLOW',
      flow: { ...flow, participants: [...flow.participants, participant] },
    })
  }

  const icon = entry.iconUrl
    ? <Avatar src={entry.iconUrl} sx={{ width: 64, height: 64 }} variant="rounded" />
    : <Avatar sx={{ width: 64, height: 64, bgcolor: 'action.selected' }} variant="rounded">
        {categoryIcons[entry.category] ?? categoryIcons.agent}
      </Avatar>

  return (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', p: 4 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          {icon}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={600}>{entry.name}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {entry.description}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              by {entry.sourceName}
            </Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<PlaylistAddIcon />}
            onClick={addToFlow}
            disabled={!flow || alreadyInFlow}
          >
            {alreadyInFlow ? 'Already in Flow' : 'Add to Flow'}
          </Button>
          {entry.docsUrl && (
            <Button
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(entry.docsUrl, '_blank')}
            >
              Documentation
            </Button>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Description */}
        <Typography variant="h6" gutterBottom>Description</Typography>
        <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.7 }}>
          {entry.description || 'No description available.'}
        </Typography>

        {/* Metadata */}
        <Box sx={{ display: 'flex', gap: 4, mb: 3, flexWrap: 'wrap' }}>
          <MetaField label="Category" value={entry.category} />
          <MetaField label="Kind" value={entry.kind || 'agent'} />
          {entry.version && <MetaField label="Version" value={entry.version} />}
          <MetaField label="Source Type" value={entry.sourceType} />
        </Box>

        {/* Tags */}
        {entry.tags.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Tags</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {entry.tags.map(tag => (
                <Chip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
          </Box>
        )}

        {/* Capabilities */}
        {entry.capabilities.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Capabilities</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {entry.capabilities.map(cap => (
                <Chip key={cap} label={cap} size="small" />
              ))}
            </Box>
          </Box>
        )}

        {/* MCP Configuration (for MCP tools) */}
        {entry.metadata?.inputSchema != null && (
          <Box sx={{ mb: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              ⚙️ MCP Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Adding this agent would create the following participant in your flow:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
{`participants:
  - id: ${entry.id}
    kind: ${entry.kind || 'agent'}
    metadata:
      catalogRef: ${entry.sourceType}
      sourceName: ${entry.sourceName}`}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Input Schema (for MCP tools) */}
        {entry.metadata?.inputSchema != null && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Input Schema</Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(entry.metadata?.inputSchema as object, null, 2)}
              </Box>
            </Paper>
          </Box>
        )}

        {/* Constraints */}
        {entry.constraints && Object.keys(entry.constraints).length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>Constraints</Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Box component="pre" sx={{ m: 0, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(entry.constraints as object, null, 2)}
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={500}>{value}</Typography>
    </Box>
  )
}
