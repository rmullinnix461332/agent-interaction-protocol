import { useMemo } from 'react'
import { Dialog, DialogTitle, DialogContent, IconButton, Box } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import {
  ReactFlow, Background, Controls, MiniMap,
  ReactFlowProvider, MarkerType,
  type Node, type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import StepNode from './StepNode'
import type { ConnectedFlow } from '@/api/types'

const nodeTypes = { step: StepNode }
const NODE_WIDTH = 200
const NODE_HEIGHT = 60

interface FlowDiagramDialogProps {
  open: boolean
  onClose: () => void
  flow: ConnectedFlow | null
}

export function FlowDiagramDialog({ open, onClose, flow }: FlowDiagramDialogProps) {
  const { nodes, edges } = useMemo(() => {
    if (!flow) return { nodes: [], edges: [] }
    return buildGraph(flow)
  }, [flow])

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {flow?.metadata.title || flow?.metadata.name || 'Flow Diagram'}
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, height: 600 }}>
        <ReactFlowProvider>
          <Box sx={{ width: '100%', height: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag
              zoomOnScroll
            >
              <Background />
              <Controls showInteractive={false} />
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
          </Box>
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  )
}

function buildGraph(flow: ConnectedFlow): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  for (const step of flow.steps) {
    g.setNode(step.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  // Resolve dependencies
  const stepMap = new Map(flow.steps.map(s => [s.id, s]))
  const deps = new Map<string, string[]>()

  for (const s of flow.steps) {
    const resolved: string[] = []
    for (const dep of s.dependsOn || []) {
      const depStep = stepMap.get(dep)
      if (depStep?.type === 'fanOut' && s.type === 'fanIn') {
        // FanIn after fanOut: connect from fanOut's children
        const fanOutStep = stepMap.get(dep)
        resolved.push(...(fanOutStep?.steps || []))
      } else {
        resolved.push(dep)
      }
    }
    deps.set(s.id, resolved)
  }

  // FanOut children implicitly depend on the fanOut
  for (const s of flow.steps) {
    if (s.type === 'fanOut') {
      for (const childId of s.steps || []) {
        const existing = deps.get(childId) || []
        deps.set(childId, [...existing, s.id])
      }
    }
  }

  // Add edges to dagre
  for (const [stepId, depIds] of deps) {
    for (const depId of depIds) {
      g.setEdge(depId, stepId)
    }
  }

  dagre.layout(g)

  const nodes: Node[] = flow.steps.map(step => {
    const node = g.node(step.id)
    return {
      id: step.id,
      type: 'step',
      position: node ? { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 } : { x: 0, y: 0 },
      data: { label: step.id, stepType: step.type },
    }
  })

  const edges: Edge[] = []
  for (const [stepId, depIds] of deps) {
    for (const depId of depIds) {
      edges.push({
        id: `${depId}->${stepId}`,
        source: depId,
        target: stepId,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { strokeWidth: 2 },
      })
    }
  }

  return { nodes, edges }
}
