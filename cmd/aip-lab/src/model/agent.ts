export interface Agent {
  id: string
  kind: 'agent' | 'service' | 'human'
  title: string
  description: string
  version?: string
  capabilities: string[]
  constraints?: Record<string, unknown>
  metadata?: Record<string, unknown>
  source?: string // which MCP server provided this agent
}
