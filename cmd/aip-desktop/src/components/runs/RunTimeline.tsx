import { Box, Typography, Chip, type ChipProps } from '@mui/material'
import type { Event } from '@/api/types'

const eventColors: Record<string, ChipProps['color']> = {
  run_started: 'info',
  step_started: 'info',
  step_completed: 'success',
  step_failed: 'error',
  await_entered: 'secondary',
  await_resumed: 'primary',
  artifact_produced: 'default',
  run_completed: 'success',
  run_failed: 'error',
}

interface RunTimelineProps {
  events: Event[]
}

export function RunTimeline({ events }: RunTimelineProps) {
  if (events.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
        No events yet
      </Typography>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {events.map(event => (
        <Box
          key={event.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 0.5,
            px: 1,
            borderRadius: 1,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontFamily: 'monospace', minWidth: 80, flexShrink: 0 }}
          >
            {new Date(event.timestamp).toLocaleTimeString()}
          </Typography>
          <Chip
            label={formatEventType(event.type)}
            size="small"
            color={eventColors[event.type] ?? 'default'}
            variant="outlined"
            sx={{ minWidth: 110 }}
          />
          {event.stepId && (
            <Typography
              variant="caption"
              sx={{ fontFamily: 'monospace', color: 'primary.main', minWidth: 80 }}
            >
              {event.stepId}
            </Typography>
          )}
          <Typography variant="body2" sx={{ fontSize: 12, flexGrow: 1 }} noWrap>
            {event.message}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ')
}
