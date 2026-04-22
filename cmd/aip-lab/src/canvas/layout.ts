import dagre from 'dagre'
import type { Flow, Step } from '@/model/flow'
import type { DisplayFile } from '@/model/display'

const NODE_WIDTH = 200
const NODE_HEIGHT = 60

/** Resolve effective dependencies including fanOut/fanIn semantics */
function resolveDeps(flow: Flow): Map<string, string[]> {
  const stepMap = new Map(flow.steps.map((s) => [s.id, s]))
  const deps = new Map<string, string[]>()

  for (const s of flow.steps) {
    const resolved: string[] = []
    for (const dep of s.dependsOn || []) {
      const depStep = stepMap.get(dep)
      if (depStep?.type === 'fanOut' && s.type === 'fanIn') {
        resolved.push(...(depStep.steps || []))
      } else {
        resolved.push(dep)
      }
    }
    deps.set(s.id, resolved)
  }

  // fanOut children implicitly depend on the fanOut
  for (const s of flow.steps) {
    if (s.type === 'fanOut') {
      for (const childId of s.steps || []) {
        const existing = deps.get(childId) || []
        deps.set(childId, [...existing, s.id])
      }
    }
  }

  return deps
}

/** Auto-layout flow using dagre when no display positions exist */
export function autoLayout(flow: Flow): DisplayFile {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 })

  for (const step of flow.steps) {
    g.setNode(step.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }

  const deps = resolveDeps(flow)
  for (const [stepId, depIds] of deps) {
    for (const depId of depIds) {
      g.setEdge(depId, stepId)
    }
  }

  dagre.layout(g)

  const nodes: Record<string, { x: number; y: number }> = {}
  for (const step of flow.steps) {
    const node = g.node(step.id)
    if (node) {
      nodes[step.id] = { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 }
    }
  }

  return {
    version: '1.0',
    viewport: { x: 0, y: 0, zoom: 1.0 },
    nodes,
  }
}

export { resolveDeps, NODE_WIDTH, NODE_HEIGHT }
