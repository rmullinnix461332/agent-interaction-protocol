import { useState, useMemo } from 'react'
import {
  Dialog, DialogContent, TextField, List, ListItemButton, ListItemText,
  ListItemIcon, Box,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import { useFlowState } from '../store/flow-context'
import { useUIDispatch } from '../store/ui-context'

interface Props {
  open: boolean
  onClose: () => void
}

export default function FindNodeDialog({ open, onClose }: Props) {
  const { flow } = useFlowState()
  const uiDispatch = useUIDispatch()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!flow || !query.trim()) return flow?.steps || []
    const q = query.toLowerCase()
    return flow.steps.filter(
      (s) => s.id.toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q)
    )
  }, [flow, query])

  const select = (id: string) => {
    uiDispatch({ type: 'SELECT_NODE', nodeId: id })
    onClose()
    setQuery('')
  }

  return (
    <Dialog open={open} onClose={() => { onClose(); setQuery('') }} maxWidth="xs" fullWidth>
      <DialogContent sx={{ p: 1 }}>
        <TextField
          autoFocus fullWidth size="small" placeholder="Find step by ID or title..."
          value={query} onChange={(e) => setQuery(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) select(results[0].id)
            if (e.key === 'Escape') { onClose(); setQuery('') }
          }}
        />
        <List dense disablePadding sx={{ maxHeight: 300, overflow: 'auto', mt: 0.5 }}>
          {results.map((s) => (
            <ListItemButton key={s.id} onClick={() => select(s.id)}>
              <ListItemText
                primary={s.title || s.id}
                secondary={s.title ? s.id : s.type}
                primaryTypographyProps={{ variant: 'body2', fontSize: 13 }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  )
}
