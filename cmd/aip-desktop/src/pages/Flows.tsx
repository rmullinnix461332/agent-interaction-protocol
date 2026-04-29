import { useState, useCallback } from 'react'
import { Typography, Box, Button, Paper, Alert } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useEngines } from '@/store/EngineContext'
import { usePolling } from '@/hooks/usePolling'
import { EngineClient } from '@/api/client'
import { FlowTable } from '@/components/flows/FlowTable'
import { ConnectFlowDialog } from '@/components/flows/ConnectFlowDialog'
import { FlowYamlDialog } from '@/components/flows/FlowYamlDialog'
import { FlowDiagramDialog } from '@/components/flows/FlowDiagramDialog'
import type { FlowListResponse, ConnectedFlow } from '@/api/types'

interface FlowsProps {
  onStartRun?: (flowId: string) => void
}

export function Flows({ onStartRun }: FlowsProps) {
  const { activeEngine } = useEngines()
  const [connectOpen, setConnectOpen] = useState(false)
  const [yamlFlow, setYamlFlow] = useState<ConnectedFlow | null>(null)
  const [diagramFlow, setDiagramFlow] = useState<ConnectedFlow | null>(null)
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
    await new EngineClient(activeEngine.config.endpoint).connectFlow(flowJson)
    refresh()
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

  const handleViewYaml = async (flowId: string) => {
    if (!activeEngine) return
    try {
      const flow = await new EngineClient(activeEngine.config.endpoint).getFlow(flowId)
      setYamlFlow(flow)
    } catch (err) {
      setActionError(String(err))
    }
  }

  const handleViewDiagram = async (flowId: string) => {
    if (!activeEngine) return
    try {
      const flow = await new EngineClient(activeEngine.config.endpoint).getFlow(flowId)
      setDiagramFlow(flow)
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
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setConnectOpen(true)}>
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
          onViewYaml={handleViewYaml}
          onViewDiagram={handleViewDiagram}
        />
      )}

      <ConnectFlowDialog
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onConnect={handleConnect}
      />
      <FlowYamlDialog
        open={!!yamlFlow}
        onClose={() => setYamlFlow(null)}
        flow={yamlFlow}
      />
      <FlowDiagramDialog
        open={!!diagramFlow}
        onClose={() => setDiagramFlow(null)}
        flow={diagramFlow}
      />
    </Box>
  )
}
