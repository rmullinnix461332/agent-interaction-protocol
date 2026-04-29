import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material'
import { useUIDispatch } from '../store/ui-context'

interface Props {
  open: boolean
  onClose: () => void
}

export default function AgentGalleryDialog({ open, onClose }: Props) {
  const uiDispatch = useUIDispatch()

  const handleOpenPanel = () => {
    uiDispatch({ type: 'SET_ACTIVE_PANEL', panel: 'marketplace' })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle>Agent Gallery</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          The Agent Gallery has moved to the Marketplace panel in the side bar.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleOpenPanel}>Open Marketplace</Button>
      </DialogActions>
    </Dialog>
  )
}
