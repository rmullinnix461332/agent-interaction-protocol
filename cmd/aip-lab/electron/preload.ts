import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // File I/O
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data: { filePath: string; content: string; display?: string }) =>
    ipcRenderer.invoke('file:save', data),
  saveFileAs: (data: { content: string; display?: string }) =>
    ipcRenderer.invoke('file:saveAs', data),

  // LLM
  llmChat: (data: { messages: { role: string; content: string }[]; systemPrompt: string }) =>
    ipcRenderer.invoke('llm:chat', data),
  llmConfigure: (config: { provider: string; apiKey?: string; model: string; endpoint?: string }) =>
    ipcRenderer.invoke('llm:configure', config),
  llmGetConfig: () => ipcRenderer.invoke('llm:getConfig'),

  // Settings
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: object) => ipcRenderer.invoke('settings:save', settings),

  // Git
  gitStatus: (filePath: string) => ipcRenderer.invoke('git:status', filePath),
  gitCommit: (data: { filePath: string; message: string }) => ipcRenderer.invoke('git:commit', data),
  gitLog: (filePath: string) => ipcRenderer.invoke('git:log', filePath),
  gitDiff: (filePath: string) => ipcRenderer.invoke('git:diff', filePath),
  gitBranches: (filePath: string) => ipcRenderer.invoke('git:branches', filePath),
  gitCheckout: (data: { filePath: string; branch: string }) => ipcRenderer.invoke('git:checkout', data),

  // CLI bridge
  cliRun: (data: { command: string; filePath: string; schemaPath?: string }) =>
    ipcRenderer.invoke('cli:run', data),
  cliConfigure: (binaryPath: string) => ipcRenderer.invoke('cli:configure', binaryPath),

  // MCP
  mcpConnect: (config: { name: string; command: string; args: string[]; env?: Record<string, string> }) =>
    ipcRenderer.invoke('mcp:connect', config),
  mcpDisconnect: (serverName: string) => ipcRenderer.invoke('mcp:disconnect', serverName),
  mcpStatus: () => ipcRenderer.invoke('mcp:status'),
  mcpListAgents: () => ipcRenderer.invoke('mcp:listAgents'),
  mcpGetAgent: (data: { serverName: string; agentId: string }) => ipcRenderer.invoke('mcp:getAgent', data),
  mcpRegisterAgent: (data: { serverName: string; agent: unknown }) => ipcRenderer.invoke('mcp:registerAgent', data),
  mcpUnregisterAgent: (data: { serverName: string; agentId: string }) => ipcRenderer.invoke('mcp:unregisterAgent', data),
})
