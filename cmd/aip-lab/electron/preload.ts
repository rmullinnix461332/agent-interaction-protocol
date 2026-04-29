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
  mcpConnectHttp: (data: { name: string; url: string }) => ipcRenderer.invoke('mcp:connectHttp', data),
  mcpCall: (data: { serverName: string; method: string; params: unknown }) => ipcRenderer.invoke('mcp:call', data),

  // Workspace
  workspaceGetFolders: (): Promise<string[]> => ipcRenderer.invoke('workspace:getFolders'),
  workspaceAddFolder: (): Promise<string | null> => ipcRenderer.invoke('workspace:addFolder'),
  workspaceRemoveFolder: (folderPath: string): Promise<string[]> => ipcRenderer.invoke('workspace:removeFolder', folderPath),
  workspaceCloseAll: (): Promise<string[]> => ipcRenderer.invoke('workspace:closeAll'),
  workspaceGetTree: (folderPath: string): Promise<any[]> => ipcRenderer.invoke('workspace:getTree', folderPath),
  workspaceReadFile: (filePath: string): Promise<{ filePath: string; content: string; display: string | null } | { error: string }> =>
    ipcRenderer.invoke('workspace:readFile', filePath),

  // Menu events (main → renderer)
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action)
    // Listen for all menu: channels
    const channels = [
      'menu:new', 'menu:open', 'menu:save', 'menu:saveAs',
      'menu:addFolder', 'menu:closeWorkspace',
      'menu:undo', 'menu:redo', 'menu:find', 'menu:delete', 'menu:duplicate',
      'menu:runStart', 'menu:runPause', 'menu:runStop',
      'menu:viewCanvas', 'menu:viewYaml', 'menu:viewSplit',
      'menu:toggleChat', 'menu:toggleSidePanel', 'menu:toggleTrace',
      'menu:welcome', 'menu:about', 'menu:settings',
    ]
    for (const ch of channels) {
      ipcRenderer.on(ch, (_e) => callback(ch))
    }
    return () => {
      for (const ch of channels) {
        ipcRenderer.removeAllListeners(ch)
      }
    }
  },
})
