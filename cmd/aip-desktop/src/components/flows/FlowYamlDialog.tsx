import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import yaml from 'js-yaml'
import type { ConnectedFlow } from '@/api/types'

interface FlowYamlDialogProps {
  open: boolean
  onClose: () => void
  flow: ConnectedFlow | null
}

export function FlowYamlDialog({ open, onClose, flow }: FlowYamlDialogProps) {
  // Extract the AIP flow definition (strip desktop metadata)
  const flowDef = flow ? {
    apiVersion: flow.apiVersion,
    kind: flow.kind,
    metadata: flow.metadata,
    participants: flow.participants,
    artifacts: flow.artifacts,
    steps: flow.steps,
  } : null

  const yamlContent = flowDef ? yaml.dump(flowDef, { indent: 2, lineWidth: 120 }) : ''

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {flow?.metadata.title || flow?.metadata.name || 'Flow YAML'}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <Box
          component="pre"
          sx={{
            m: 0, p: 2,
            bgcolor: 'background.default',
            overflow: 'auto',
            maxHeight: 600,
            fontFamily: 'monospace',
            fontSize: 12,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {yamlContent}
        </Box>
      </DialogContent>
    </Dialog>
  )
}
