import { Chip, type ChipProps } from '@mui/material'

const statusColors: Record<string, ChipProps['color']> = {
  pending: 'default',
  running: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
  awaiting: 'secondary',
}

interface StepStatusChipProps {
  status: string
}

export function StepStatusChip({ status }: StepStatusChipProps) {
  return (
    <Chip
      label={status}
      size="small"
      color={statusColors[status] ?? 'default'}
      variant="outlined"
    />
  )
}
