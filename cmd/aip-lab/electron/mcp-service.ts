import { ipcMain } from 'electron'
import { spawn, type ChildProcess } from 'child_process'

interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
}

interface MCPConnection {
  config: MCPServerConfig
  process: ChildProcess | null
  connected: boolean
}

const connections = new Map<string, MCPConnection>()

// Simple JSON-RPC over stdio for MCP
async function callMCP(serverName: string, method: string, params: unknown): Promise<unknown> {
  const conn = connections.get(serverName)
  if (!conn || !conn.process || !conn.connected) {
    throw new Error(`MCP server "${serverName}" not connected`)
  }

  return new Promise((resolve, reject) => {
    const id = Date.now()
    const request = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'

    const timeout = setTimeout(() => reject(new Error('MCP request timeout')), 15000)

    const onData = (data: Buffer) => {
      clearTimeout(timeout)
      conn.process!.stdout?.off('data', onData)
      try {
        const lines = data.toString().split('\n').filter(Boolean)
        for (const line of lines) {
          const response = JSON.parse(line)
          if (response.id === id) {
            if (response.error) reject(new Error(response.error.message))
            else resolve(response.result)
            return
          }
        }
        resolve(null)
      } catch (err) {
        reject(err)
      }
    }

    conn.process!.stdout?.on('data', onData)
    conn.process!.stdin?.write(request)
  })
}

export function registerMCPHandlers() {
  ipcMain.handle('mcp:connect', async (_event, config: MCPServerConfig) => {
    try {
      // Kill existing connection if any
      const existing = connections.get(config.name)
      if (existing?.process) {
        existing.process.kill()
      }

      const env = { ...process.env, ...(config.env || {}) }
      const proc = spawn(config.command, config.args, { env, stdio: ['pipe', 'pipe', 'pipe'] })

      const conn: MCPConnection = { config, process: proc, connected: true }
      connections.set(config.name, conn)

      proc.on('exit', () => { conn.connected = false })
      proc.on('error', () => { conn.connected = false })

      // Wait briefly for process to start
      await new Promise((r) => setTimeout(r, 500))

      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('mcp:disconnect', (_event, serverName: string) => {
    const conn = connections.get(serverName)
    if (conn?.process) {
      conn.process.kill()
      conn.connected = false
    }
    connections.delete(serverName)
    return true
  })

  ipcMain.handle('mcp:status', () => {
    const status: Record<string, boolean> = {}
    for (const [name, conn] of connections) {
      status[name] = conn.connected
    }
    return status
  })

  ipcMain.handle('mcp:call', async (_event, { serverName, method, params }: {
    serverName: string; method: string; params: unknown
  }) => {
    try {
      const result = await callMCP(serverName, method, params)
      return { result, error: null }
    } catch (err: any) {
      return { result: null, error: err.message }
    }
  })

  // Convenience: list agents from all connected servers
  ipcMain.handle('mcp:listAgents', async () => {
    const agents: unknown[] = []
    for (const [name, conn] of connections) {
      if (!conn.connected) continue
      try {
        const result = await callMCP(name, 'tools/call', {
          name: 'list_agents',
          arguments: {},
        })
        if (Array.isArray(result)) {
          agents.push(...result.map((a: any) => ({ ...a, source: name })))
        } else if (result && typeof result === 'object' && 'agents' in (result as any)) {
          agents.push(...(result as any).agents.map((a: any) => ({ ...a, source: name })))
        }
      } catch {}
    }
    return agents
  })

  ipcMain.handle('mcp:getAgent', async (_event, { serverName, agentId }: { serverName: string; agentId: string }) => {
    try {
      const result = await callMCP(serverName, 'tools/call', {
        name: 'get_agent',
        arguments: { id: agentId },
      })
      return { agent: result, error: null }
    } catch (err: any) {
      return { agent: null, error: err.message }
    }
  })

  ipcMain.handle('mcp:registerAgent', async (_event, { serverName, agent }: { serverName: string; agent: unknown }) => {
    try {
      await callMCP(serverName, 'tools/call', {
        name: 'register_agent',
        arguments: agent,
      })
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('mcp:unregisterAgent', async (_event, { serverName, agentId }: { serverName: string; agentId: string }) => {
    try {
      await callMCP(serverName, 'tools/call', {
        name: 'unregister_agent',
        arguments: { id: agentId },
      })
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
