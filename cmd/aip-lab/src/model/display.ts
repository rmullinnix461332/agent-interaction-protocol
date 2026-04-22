export interface DisplayFile {
  version: string
  viewport: { x: number; y: number; zoom: number }
  nodes: Record<string, { x: number; y: number }>
  collapsed?: string[]
  annotations?: unknown[]
}

export function createDefaultDisplay(): DisplayFile {
  return {
    version: '1.0',
    viewport: { x: 0, y: 0, zoom: 1.0 },
    nodes: {},
  }
}
