import { useMemo } from 'react'
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material'
import ErrorIcon from '@mui/icons-material/Error'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useFlowState } from '@/store/flow-context'
import { validateSchema, validateSemantic, type ValidationError } from '@/yaml/validator'

export default function ValidationPanel() {
  const { flow } = useFlowState()

  const errors = useMemo<ValidationError[]>(() => {
    if (!flow) return []
    return [...validateSchema(flow), ...validateSemantic(flow)]
  }, [flow])

  if (!flow) return null

  if (errors.length === 0) {
    return (
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircleIcon color="success" fontSize="small" />
        <Typography variant="body2" color="success.main">Valid</Typography>
      </Box>
    )
  }

  return (
    <List dense>
      {errors.map((err, i) => (
        <ListItem key={i}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ErrorIcon color="error" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={err.message}
            secondary={err.path}
            primaryTypographyProps={{ variant: 'body2' }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItem>
      ))}
    </List>
  )
}
