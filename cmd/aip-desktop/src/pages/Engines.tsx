import { useState } from 'react'
import { Typography, Box, Button, Alert } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useEngines } from '@/store/EngineContext'
import { EngineCard } from '@/components/engines/EngineCard'
import { AddEngineDialog } from '@/components/engines/AddEngineDialog'

export function Engines() {
  const { engines, activeEngineId, setActiveEngineId, addEngine, removeEngine } = useEngines()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleStart = async (engineId: string) => {
    setActionError(null)
    const engine = engines.find(e => e.config.id === engineId)
    if (!engine) return

    // Extract port from endpoint URL
    const url = new URL(engine.config.endpoint)
    const port = parseInt(url.port) || 8080

    try {
      const result = await window.electronAPI.startEngine({
        engineId,
        binaryPath: 'aip-engine',
        port,
        dataDir: `./data-${engine.config.name}`,
      })
      if (result.status === 'error') {
        setActionError(result.error || 'Failed to start engine')
      }
    } catch (err) {
      setActionError(String(err))
    }
  }

  const handleStop = async (engineId: string) => {
    setActionError(null)
    try {
      await window.electronAPI.stopEngine(engineId)
    } catch (err) {
      setActionError(String(err))
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Engines</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Add Engine
        </Button>
      </Box>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {engines.map(engine => (
          <EngineCard
            key={engine.config.id}
            engine={engine}
            isActive={engine.config.id === activeEngineId}
            onSelect={() => setActiveEngineId(engine.config.id)}
            onRemove={() => removeEngine(engine.config.id)}
            onStart={() => handleStart(engine.config.id)}
            onStop={() => handleStop(engine.config.id)}
          />
        ))}
      </Box>

      {engines.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No engines configured. Click "Add Engine" to connect to an aip-engine instance.
        </Typography>
      )}

      <AddEngineDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addEngine}
      />
    </Box>
  )
}
