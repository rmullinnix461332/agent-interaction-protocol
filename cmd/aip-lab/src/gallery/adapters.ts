import type { RegistryAdapter } from './types'
import type { GalleryEntry, AgentRegistry, RegistrySourceType } from '@/model/agent'
import { normalizeEntry } from './normalize'

// HttpJsonAdapter fetches a JSON catalog from a URL.
// Routes through Electron main process to avoid CORS issues.
const httpJsonAdapter: RegistryAdapter = {
  async fetch(registry: AgentRegistry): Promise<GalleryEntry[]> {
    // Use IPC to fetch from main process (avoids CORS)
    const result = await window.electronAPI?.mcpCall({
      serverName: '__http_fetch__',
      method: '__fetch_json__',
      params: { url: registry.url },
    }).catch(() => null)

    // Fallback to direct fetch if IPC not available
    let data: any
    if (result?.result) {
      data = result.result
    } else {
      const resp = await globalThis.fetch(registry.url)
      if (!resp.ok) {
        throw new Error(`Registry ${registry.name}: HTTP ${resp.status}`)
      }
      data = await resp.json()
    }

    const rawEntries: Record<string, any>[] = Array.isArray(data)
      ? data
      : (data.agents || data.entries || data.catalog || [])

    return rawEntries.map(raw => normalizeEntry(raw, registry.name, registry.sourceType))
  },
}

// LocalFileAdapter reads a JSON file from disk via the Electron API.
// The registry URL is treated as a file path.
const localFileAdapter: RegistryAdapter = {
  async fetch(registry: AgentRegistry): Promise<GalleryEntry[]> {
    const result = await window.electronAPI?.workspaceReadFile(registry.url)
    if (!result || 'error' in result) {
      throw new Error(`Failed to read local file: ${registry.url}`)
    }
    const data = JSON.parse(result.content)
    const rawEntries: Record<string, any>[] = Array.isArray(data)
      ? data
      : (data.agents || data.entries || data.catalog || [])

    return rawEntries.map(raw => normalizeEntry(raw, registry.name, 'local-file'))
  },
}

// McpAdapter fetches agents from connected MCP servers (stdio-based).
const mcpAdapter: RegistryAdapter = {
  async fetch(_registry: AgentRegistry): Promise<GalleryEntry[]> {
    const result = await window.electronAPI?.mcpListAgents()
    if (!Array.isArray(result)) return []
    return result.map((raw: any) => normalizeEntry(raw, 'MCP', 'mcp'))
  },
}

// McpRegistryAdapter connects to an HTTP-based MCP server via JSON-RPC
// and calls tools/list to discover available tools/agents.
const mcpRegistryAdapter: RegistryAdapter = {
  async fetch(registry: AgentRegistry): Promise<GalleryEntry[]> {
    // Connect to the MCP server over HTTP
    const connectResult = await window.electronAPI?.mcpConnectHttp({
      name: registry.name,
      url: registry.url,
    })
    if (!connectResult?.success) {
      throw new Error(connectResult?.error || 'Failed to connect to MCP registry')
    }

    // Call tools/list to get available tools
    const toolsResult = await window.electronAPI?.mcpCall({
      serverName: registry.name,
      method: 'tools/list',
      params: {},
    })

    if (toolsResult?.error) {
      throw new Error(toolsResult.error)
    }

    const result = toolsResult?.result as any
    const tools: any[] = result?.tools || (Array.isArray(result) ? result : [])

    // Normalize MCP tools into gallery entries
    return tools.map((tool: any) => normalizeEntry({
      id: tool.name || tool.id,
      name: tool.name || tool.id,
      title: tool.name || tool.id,
      description: tool.description || '',
      kind: 'service',
      category: 'mcp-tool',
      capabilities: extractToolCapabilities(tool),
      tags: ['mcp', registry.name],
      metadata: { inputSchema: tool.inputSchema },
    }, registry.name, 'mcp-registry'))
  },
}

// Extract capabilities from an MCP tool's input schema
function extractToolCapabilities(tool: any): string[] {
  const caps: string[] = []
  if (tool.inputSchema?.properties) {
    caps.push(...Object.keys(tool.inputSchema.properties).slice(0, 5))
  }
  return caps
}

// Adapter registry — maps source types to their adapter implementation
const adapters: Record<RegistrySourceType, RegistryAdapter> = {
  'http-json': httpJsonAdapter,
  'github-raw': httpJsonAdapter, // Same fetch logic, different label
  'local-file': localFileAdapter,
  'mcp': mcpAdapter,
  'mcp-registry': mcpRegistryAdapter,
}

// getAdapter returns the adapter for a given source type
export function getAdapter(sourceType: RegistrySourceType): RegistryAdapter {
  return adapters[sourceType] || httpJsonAdapter
}

// fetchFromRegistry fetches entries from a single registry using the appropriate adapter
export async function fetchFromRegistry(registry: AgentRegistry): Promise<GalleryEntry[]> {
  // Auto-detect MCP registry URLs that were saved with wrong source type
  const effectiveType = detectSourceType(registry)
  const adapter = getAdapter(effectiveType)
  return adapter.fetch({ ...registry, sourceType: effectiveType })
}

// detectSourceType checks if a registry URL looks like an MCP endpoint
// and overrides the source type if needed
function detectSourceType(registry: AgentRegistry): RegistrySourceType {
  if (registry.sourceType === 'mcp-registry') return 'mcp-registry'
  // Auto-detect MCP endpoints by URL pattern
  if (registry.url && /\/mcp\/?$/i.test(registry.url)) return 'mcp-registry'
  return registry.sourceType
}
