import { Card, CardContent, Typography, Chip, Box, IconButton, Tooltip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import type { EngineStatus } from '@/api/types'

interface EngineCardProps {
  engine: EngineStatus
  isActive: boolean
  onSelect: () => void
  onRemove: () => void
  onStart?: () => void
  onStop?: () => void
}

export function EngineCard({ engine, isActive, onSelect, onRemove, onStart, onStop }: EngineCardProps) {
  const { config, online, health, info, capabilities } = engine
  const isLocal = config.type === 'local'

  return (
    <Card
      variant="outlined"
      onClick={onSelect}
      sx={{
        cursor: 'pointer',
        borderColor: isActive ? 'primary.main' : undefined,
        borderWidth: isActive ? 2 : 1,
        '&:hover': { borderColor: 'primary.light' },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>{config.name}</Typography>
              <Chip label={config.type} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
            </Box>
            <Typography variant="caption" color="text.secondary">{config.endpoint}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              size="small"
              label={online ? 'Online' : 'Offline'}
              color={online ? 'success' : 'error'}
              variant="outlined"
            />
            {isLocal && !online && onStart && (
              <Tooltip title="Start engine">
                <IconButton size="small" color="success" onClick={e => { e.stopPropagation(); onStart() }}>
                  <PlayArrowIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {isLocal && online && onStop && (
              <Tooltip title="Stop engine">
                <IconButton size="small" color="warning" onClick={e => { e.stopPropagation(); onStop() }}>
                  <StopIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Remove engine">
              <IconButton size="small" onClick={e => { e.stopPropagation(); onRemove() }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {online && info && (
          <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              Version: {info.version}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Uptime: {health?.uptime}
            </Typography>
          </Box>
        )}

        {online && capabilities && (
          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {capabilities.await && <Chip label="await" size="small" variant="outlined" />}
            {capabilities.iteration && <Chip label="iteration" size="small" variant="outlined" />}
            {capabilities.operators.map(op => (
              <Chip key={op} label={op} size="small" variant="outlined" />
            ))}
          </Box>
        )}

        {!online && engine.error && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            {engine.error}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
