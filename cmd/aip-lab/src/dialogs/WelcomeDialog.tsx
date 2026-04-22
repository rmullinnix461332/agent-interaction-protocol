import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, List, ListItemButton, ListItemIcon, ListItemText,
  Link,
} from '@mui/material'
import NoteAddIcon from '@mui/icons-material/NoteAdd'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import DescriptionIcon from '@mui/icons-material/Description'
import MenuBookIcon from '@mui/icons-material/MenuBook'

interface Props {
  open: boolean
  onClose: () => void
  onNew: () => void
  onOpen: () => void
}

const EXAMPLES = [
  { name: 'hello-flow.yaml', desc: 'Simple two-step flow' },
  { name: 'dual-fanout-flow.yaml', desc: 'Fan-out with fan-in' },
  { name: 'comic-strip-flow.yaml', desc: 'Complex flow with subflows and iteration' },
  { name: 'parallel-review-flow.yaml', desc: 'Parallel review with human approval' },
  { name: 'research-publish-flow.yaml', desc: 'Research, review, and publish' },
]

export default function WelcomeDialog({ open, onClose, onNew, onOpen }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>AIP Lab</Typography>
          <Typography variant="caption" color="text.secondary">v0.1.0</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Visual designer for Agent Interaction Protocol flows.
          Create, edit, and test multi-agent orchestration workflows.
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>Get Started</Typography>
        <List dense disablePadding>
          <ListItemButton onClick={() => { onNew(); onClose() }}>
            <ListItemIcon sx={{ minWidth: 36 }}><NoteAddIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="New Flow" secondary="Start with a blank flow" />
          </ListItemButton>
          <ListItemButton onClick={() => { onOpen(); onClose() }}>
            <ListItemIcon sx={{ minWidth: 36 }}><FolderOpenIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Open Flow" secondary="Open an existing YAML file" />
          </ListItemButton>
        </List>

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Example Flows</Typography>
        <List dense disablePadding>
          {EXAMPLES.map((ex) => (
            <ListItemButton key={ex.name} disabled>
              <ListItemIcon sx={{ minWidth: 36 }}><DescriptionIcon fontSize="small" /></ListItemIcon>
              <ListItemText
                primary={ex.name}
                secondary={ex.desc}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          ))}
        </List>

        <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Keyboard Shortcuts</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, fontSize: 12 }}>
          {[
            ['Cmd+N', 'New flow'],
            ['Cmd+O', 'Open flow'],
            ['Cmd+S', 'Save'],
            ['Cmd+Z', 'Undo'],
            ['Cmd+Shift+Z', 'Redo'],
            ['Delete', 'Delete node'],
            ['Cmd+D', 'Duplicate node'],
            ['Cmd+F', 'Find node'],
            ['Cmd+Shift+F', 'Format YAML'],
          ].map(([key, desc]) => (
            <Box key={key} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.75, py: 0.25, borderRadius: 0.5, fontSize: 10 }}>
                {key}
              </Typography>
              <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <MenuBookIcon fontSize="small" color="action" />
          <Link href="#" variant="caption" color="text.secondary" underline="hover">
            AIP Specification Documentation
          </Link>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
