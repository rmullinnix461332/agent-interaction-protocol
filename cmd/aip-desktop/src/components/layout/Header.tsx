import { AppBar, Toolbar, Typography, Select, MenuItem, Chip, Box } from '@mui/material'
import { useEngines } from '@/store/EngineContext'

export function Header() {
  const { engines, activeEngineId, activeEngine, setActiveEngineId } = useEngines()

  return (
    <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Toolbar variant="dense">
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          Engine:
        </Typography>
        {engines.length > 0 ? (
          <Select
            size="small"
            value={activeEngineId ?? ''}
            onChange={e => setActiveEngineId(e.target.value || null)}
            sx={{ minWidth: 200, mr: 2 }}
          >
            {engines.map(e => (
              <MenuItem key={e.config.id} value={e.config.id}>
                {e.config.name}
              </MenuItem>
            ))}
          </Select>
        ) : (
          <Typography variant="body2" color="text.secondary">No engines configured</Typography>
        )}
        {activeEngine && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              size="small"
              label={activeEngine.online ? 'Online' : 'Offline'}
              color={activeEngine.online ? 'success' : 'error'}
              variant="outlined"
            />
            {activeEngine.health && (
              <Typography variant="caption" color="text.secondary">
                v{activeEngine.health.version} · {activeEngine.health.uptime}
              </Typography>
            )}
          </Box>
        )}
      </Toolbar>
    </AppBar>
  )
}
