import { ipcMain } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import https from 'https'
import http from 'http'

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
  transport: 'stdio' | 'http'
  httpUrl?: string
  sessionId?: string // MCP session token from server
}

const connections = new Map<string, MCPConnection>()

// JSON-RPC over stdio
async function callMCPStdio(conn: MCPConnection, method: string, params: unknown): Promise<unknown> {
  if (!conn.process || !conn.connected) {
    throw new Error(`MCP server "${conn.config.name}" not connected`)
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

// JSON-RPC over HTTP with SSE transport (MCP Streamable HTTP)
// Uses Node http/https directly to avoid Electron renderer fetch issues
async function callMCPHttp(conn: MCPConnection, method: string, params: unknown): Promise<unknown> {
  if (!conn.httpUrl) throw new Error('No HTTP URL configured')

  const id = Date.now()
  const body = JSON.stringify({ jsonrpc: '2.0', id, method, params })

  return new Promise((resolve, reject) => {
    const url = new URL(conn.httpUrl!)
    const transport = url.protocol === 'https:' ? https : http

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream, application/json',
      'Content-Length': String(Buffer.byteLength(body)),
    }
    if (conn.sessionId) {
      headers['Mcp-Session'] = conn.sessionId
    }

    const req = transport.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers,
    }, (res) => {
      // Capture session ID
      const sessionHeader = res.headers['mcp-session']
      if (sessionHeader) {
        conn.sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader
      }

      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
          return
        }

        const contentType = res.headers['content-type'] || ''

        // Handle SSE response
        if (contentType.includes('text/event-stream')) {
          try {
            const result = parseSseData(data, id)
            resolve(result)
          } catch (err) {
            reject(err)
          }
          return
        }

        // Handle plain JSON response
        try {
          const response = JSON.parse(data)
          if (response.error) {
            reject(new Error(response.error.message || JSON.stringify(response.error)))
          } else {
            resolve(response.result)
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 200)}`))
        }
      })
    })

    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timeout')) })
    req.write(body)
    req.end()
  })
}

// Parse SSE data and extract the JSON-RPC response
function parseSseData(text: string, expectedId: number): unknown {
  const lines = text.split('\n')

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)
      if (parsed.jsonrpc === '2.0') {
        if (parsed.error) {
          throw new Error(parsed.error.message || JSON.stringify(parsed.error))
        }
        return parsed.result
      }
    } catch (e) {
      if (e instanceof SyntaxError) continue
      throw e
    }
  }

  throw new Error('No JSON-RPC response found in SSE stream')
}

// Dispatch to the right transport
async function callMCP(serverName: string, method: string, params: unknown): Promise<unknown> {
  const conn = connections.get(serverName)
  if (!conn || !conn.connected) {
    throw new Error(`MCP server "${serverName}" not connected`)
  }

  if (conn.transport === 'http') {
    return callMCPHttp(conn, method, params)
  }
  return callMCPStdio(conn, method, params)
}

// Simple HTTP GET that returns parsed JSON (used to proxy fetches from renderer)
function httpGetJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const transport = parsedUrl.protocol === 'https:' ? https : http

    transport.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`))
          return
        }
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error(`Invalid JSON from ${url}`))
        }
      })
    }).on('error', reject)
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

      const conn: MCPConnection = { config, process: proc, connected: true, transport: 'stdio' }
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

  // Connect to an HTTP-based MCP server (JSON-RPC over HTTP POST)
  ipcMain.handle('mcp:connectHttp', async (_event, { name, url }: { name: string; url: string }) => {
    try {
      // Test connectivity with an initialize or tools/list call
      const conn: MCPConnection = {
        config: { name, command: '', args: [] },
        process: null,
        connected: true,
        transport: 'http',
        httpUrl: url,
      }
      connections.set(name, conn)

      // Verify the server responds
      try {
        await callMCPHttp(conn, 'initialize', {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'aip-lab', version: '0.1.0' },
        })
      } catch {
        // Some servers don't require initialize, try tools/list directly
        try {
          await callMCPHttp(conn, 'tools/list', {})
        } catch (err: any) {
          connections.delete(name)
          return { success: false, error: `Failed to connect: ${err.message}` }
        }
      }

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
    // Special handler: generic HTTP JSON fetch (avoids CORS from renderer)
    if (serverName === '__http_fetch__' && method === '__fetch_json__') {
      try {
        const { url } = params as { url: string }
        const data = await httpGetJson(url)
        return { result: data, error: null }
      } catch (err: any) {
        return { result: null, error: err.message }
      }
    }

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
