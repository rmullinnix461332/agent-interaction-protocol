import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnReconnect,
  type EdgeMouseHandler,
  type NodeMouseHandler,
  type NodeChange,
  type Connection,
  MarkerType,
  reconnectEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import StepNode from './nodes/StepNode'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import { useUIState, useUIDispatch } from '@/store/ui-context'
import { useLabState } from '@/store/lab-context'
import { autoLayout, resolveDeps } from './layout'
import { validateSemantic } from '@/yaml/validator'
import type { StepType, Step } from '@/model/flow'

const nodeTypes = { step: StepNode }

let dropCounter = 0

function FlowCanvasInner() {
  const { flow, display } = useFlowState()
  const flowDispatch = useFlowDispatch()
  const uiDispatch = useUIDispatch()
  const { selectedNodeId } = useUIState()
  const { nodeStates } = useLabState()
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const [dragPositions, setDragPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Auto-layout on first load when display has no positions
  useEffect(() => {
    if (!flow || flow.steps.length === 0) return
    if (Object.keys(display.nodes).length > 0) return
    const autoDisplay = autoLayout(flow)
    flowDispatch({ type: 'UPDATE_DISPLAY', display: { ...display, ...autoDisplay } })
  }, [flow, display, flowDispatch])

  // Derive nodes from flow + display
  const nodes = useMemo<Node[]>(() => {
    if (!flow) return []
    const positions = display.nodes

    // Compute per-step validation errors
    const errors = validateSemantic(flow)
    const errorStepIds = new Set(
      errors.map((e) => {
        const match = e.path.match(/^\/steps\/([^/]+)/)
        return match ? match[1] : ''
      }).filter(Boolean)
    )

    return flow.steps.map((step) => ({
      id: step.id,
      type: 'step',
      position: dragPositions[step.id] || positions[step.id] || { x: 0, y: 0 },
      selected: step.id === selectedNodeId,
      data: {
        label: step.title || step.id,
        stepType: step.type,
        hasIteration: !!step.iteration,
        hasError: errorStepIds.has(step.id),
        execStatus: nodeStates[step.id] || undefined,
      },
    }))
  }, [flow, display, dragPositions, selectedNodeId, nodeStates])

  // Derive edges from flow
  const edges = useMemo<Edge[]>(() => {
    if (!flow) return []
    const deps = resolveDeps(flow)
    const result: Edge[] = []

    for (const [stepId, depIds] of deps) {
      for (const depId of depIds) {
        result.push({
          id: `${depId}->${stepId}`,
          source: depId,
          target: stepId,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
          style: { strokeWidth: 2 },
          reconnectable: 'target',
        })
      }
    }

    for (const step of flow.steps) {
      if (step.iteration?.scope) {
        const targetId = step.iteration.scope.ref
        result.push({
          id: `iter-${step.id}->${targetId}`,
          source: step.id,
          target: targetId,
          animated: true,
          style: { strokeDasharray: '5,5', stroke: '#f57c00', strokeWidth: 2 },
          label: `${step.iteration.mode}`,
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#f57c00' },
        })
      }
    }

    return result
  }, [flow])

  // --- Node dragging ---
  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const posChanges = changes.filter(
        (c): c is NodeChange & { type: 'position'; id: string; position?: { x: number; y: number }; dragging?: boolean } =>
          c.type === 'position'
      )

      if (posChanges.length > 0) {
        const newDragPos = { ...dragPositions }
        let anyDragEnd = false

        for (const change of posChanges) {
          if (change.position) {
            newDragPos[change.id] = change.position
          }
          if (change.dragging === false) anyDragEnd = true
        }

        setDragPositions(newDragPos)

        if (anyDragEnd) {
          const updatedNodes = { ...display.nodes }
          for (const change of posChanges) {
            if (change.dragging === false && change.position) {
              updatedNodes[change.id] = change.position
            }
          }
          flowDispatch({ type: 'UPDATE_DISPLAY', display: { ...display, nodes: updatedNodes } })
          setDragPositions({})
        }
      }
    },
    [dragPositions, display, flowDispatch]
  )

  // --- Connect: draw edge from source handle to target handle ---
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!flow || !connection.source || !connection.target) return
      if (connection.source === connection.target) return

      const targetStep = flow.steps.find((s) => s.id === connection.target)
      if (!targetStep) return

      // Don't add duplicate
      const existing = targetStep.dependsOn || []
      if (existing.includes(connection.source)) return

      const updatedSteps = flow.steps.map((s) =>
        s.id === connection.target
          ? { ...s, dependsOn: [...(s.dependsOn || []), connection.source!] }
          : s
      )
      flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps: updatedSteps } })
    },
    [flow, flowDispatch]
  )

  // --- Reconnect: drag edge endpoint to a different node ---
  const handleReconnect: OnReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      if (!flow || !newConnection.source || !newConnection.target) return

      // Parse old edge to find original source->target
      const oldSource = oldEdge.source
      const oldTarget = oldEdge.target

      // Remove old dependency
      let updatedSteps = flow.steps.map((s) => {
        if (s.id === oldTarget) {
          return { ...s, dependsOn: (s.dependsOn || []).filter((d) => d !== oldSource) }
        }
        return s
      })

      // Add new dependency
      updatedSteps = updatedSteps.map((s) => {
        if (s.id === newConnection.target) {
          const deps = s.dependsOn || []
          if (!deps.includes(newConnection.source!)) {
            return { ...s, dependsOn: [...deps, newConnection.source!] }
          }
        }
        return s
      })

      flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps: updatedSteps } })
    },
    [flow, flowDispatch]
  )

  // --- Delete selected node/edge via keyboard ---
  const deleteSelected = useCallback(() => {
    if (!flow || !selectedNodeId) return

    // Remove the step
    const updatedSteps = flow.steps
      .filter((s) => s.id !== selectedNodeId)
      .map((s) => ({
        ...s,
        dependsOn: (s.dependsOn || []).filter((d) => d !== selectedNodeId),
        steps: (s.steps || []).filter((sub) => sub !== selectedNodeId),
      }))

    // Remove from display
    const { [selectedNodeId]: _, ...remainingNodes } = display.nodes

    flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps: updatedSteps } })
    flowDispatch({ type: 'UPDATE_DISPLAY', display: { ...display, nodes: remainingNodes } })
    uiDispatch({ type: 'SELECT_NODE', nodeId: null })
  }, [flow, display, selectedNodeId, flowDispatch, uiDispatch])

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        // Don't delete if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedNodeId, deleteSelected])

  // --- Edge delete on click ---
  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_event, edge) => {
      // Select edge for potential deletion — for now just highlight
      // Could add edge selection state if needed
    },
    []
  )

  // --- Edge deletion via edges change (React Flow built-in) ---
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (!flow) return
      const removals = changes.filter((c) => c.type === 'remove')
      if (removals.length === 0) return

      let updatedSteps = [...flow.steps]
      for (const removal of removals) {
        if (removal.type !== 'remove') continue
        // Parse edge id: "source->target"
        const parts = removal.id.split('->')
        if (parts.length === 2) {
          const [source, target] = parts
          updatedSteps = updatedSteps.map((s) => {
            if (s.id === target) {
              return { ...s, dependsOn: (s.dependsOn || []).filter((d) => d !== source) }
            }
            return s
          })
        }
      }
      flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps: updatedSteps } })
    },
    [flow, flowDispatch]
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      uiDispatch({ type: 'SELECT_NODE', nodeId: node.id })
    },
    [uiDispatch]
  )

  const handlePaneClick = useCallback(() => {
    uiDispatch({ type: 'SELECT_NODE', nodeId: null })
  }, [uiDispatch])

  // --- Drag and drop from toolbox ---
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (!flow) return

      const stepType = event.dataTransfer.getData('application/aip-step-type') as StepType
      if (!stepType) return

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })

      dropCounter++
      const id = `${stepType}-${dropCounter}`

      const newStep: Step = {
        id,
        type: stepType,
        title: `New ${stepType}`,
        ...(stepType === 'action' ? { participantRef: '' } : {}),
        ...(stepType === 'exit' ? { exit: { status: 'success' } } : {}),
        ...(stepType === 'fanOut' ? { steps: [] } : {}),
      }

      flowDispatch({ type: 'UPDATE_FLOW', flow: { ...flow, steps: [...flow.steps, newStep] } })
      flowDispatch({
        type: 'UPDATE_DISPLAY',
        display: { ...display, nodes: { ...display.nodes, [id]: { x: position.x, y: position.y } } },
      })
    },
    [flow, display, flowDispatch, screenToFlowPosition]
  )

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={null}
        edgesReconnectable
      >
        <Background />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>
    </div>
  )
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}
