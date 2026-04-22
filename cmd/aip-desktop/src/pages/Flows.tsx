import { useState, useCallback } from 'react'
import { Typography, Box, Button, Paper, Alert } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import { FlowTable } from '@/components/flows/FlowTable'
import { ConnectFlowDialog } from '@/components/flows/ConnectFlowDialog'
import type { FlowListResponse } from '@/api/types'

interface FlowsProps {
  onStartRun?: (flowId: string) => void
}

export function Flows({ onStartRun }: FlowsProps) {
  const { activeEngine } = useEngines()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const endpoint = activeEngine?.config.endpoint ?? ''

  const fetcher = useCallback(() => {
    return new EngineClient(endpoint).listFlows()
  }, [endpoint])

  const { data, loading, refresh } = usePolling<FlowListResponse>({
    fetcher,
    interval: 30_000,
    enabled: !!activeEngine?.online,
  })

  const handleConnect = async (flowJson: unknown) => {
    if (!activeEngine) return
    setActionError(null)
    try {
      await new EngineClient(activeEngine.config.endpoint).connectFlow(flowJson)
      refresh()
    } catch (err) {
      throw err // Let dialog handle it
    }
  }

  const handleDisconnect = async (flowId: string) => {
    if (!activeEngine) return
    setActionError(null)
    try {
      await new EngineClient(activeEngine.config.endpoint).disconnectFlow(flowId)
      refresh()
    } catch (err) {
      setActionError(String(err))
    }
  }

  const handleRun = async (flowId: string) => {
    if (!activeEngine) return
    setActionError(null)
    try {
      await new EngineClient(activeEngine.config.endpoint).startRun(flowId)
      if (onStartRun) onStartRun(flowId)
    } catch (err) {
      setActionError(String(err))
    }
  }

  if (!activeEngine?.online) {
    return (
      <Box>
        <Typography variant="h5" gutterBottom>Flows</Typography>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {activeEngine ? 'Engine is offline' : 'Select an engine to view flows'}
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Flows</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Connect Flow
        </Button>
      </Box>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

      {loading && !data ? (
        <Typography color="text.secondary">Loading flows...</Typography>
      ) : (
        <FlowTable
          flows={data?.flows ?? []}
          onRun={handleRun}
          onDisconnect={handleDisconnect}
        />
      )}

      <ConnectFlowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConnect={handleConnect}
      />
    </Box>
  )
}
