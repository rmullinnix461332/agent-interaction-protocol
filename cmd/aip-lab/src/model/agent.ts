// Normalized gallery entry — common model for all registry sources
export interface GalleryEntry {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  capabilities: string[]
  iconUrl?: string
  docsUrl?: string
  sourceName: string
  sourceType: RegistrySourceType
  // Original fields preserved for compatibility
  kind?: 'agent' | 'service' | 'human'
  version?: string
  constraints?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// Legacy alias
export type Agent = GalleryEntry

export type RegistrySourceType = 'http-json' | 'github-raw' | 'local-file' | 'mcp' | 'mcp-registry'

export interface AgentRegistry {
  url: string
  name: string
  sourceType: RegistrySourceType
  enabled: boolean
}
