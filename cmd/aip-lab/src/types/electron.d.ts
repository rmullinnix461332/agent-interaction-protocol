interface ElectronAPI {
  // File I/O
  openFile: () => Promise<{ filePath: string; content: string; display: string | null } | null>
  saveFile: (data: { filePath: string; content: string; display?: string }) => Promise<boolean>
  saveFileAs: (data: { content: string; display?: string }) => Promise<string | null>

  // LLM
  llmChat: (data: {
    messages: { role: string; content: string }[]
    systemPrompt: string
  }) => Promise<{ choices?: { message: { role: string; content: string } }[]; error?: string }>
  llmConfigure: (config: { provider: string; apiKey?: string; model: string; endpoint?: string }) => Promise<boolean>
  llmGetConfig: () => Promise<{ provider: string; apiKey?: string; model: string; endpoint?: string }>

  // Settings
  loadSettings: () => Promise<Record<string, unknown> | null>
  saveSettings: (settings: object) => Promise<boolean>

  // Git
  gitStatus: (filePath: string) => Promise<{ branch: string | null; dirty: boolean; error: string | null }>
  gitCommit: (data: { filePath: string; message: string }) => Promise<{ success: boolean; error: string | null }>
  gitLog: (filePath: string) => Promise<{ entries: string[]; error: string | null }>
  gitDiff: (filePath: string) => Promise<{ diff: string; error: string | null }>
  gitBranches: (filePath: string) => Promise<{ current: string | null; branches: string[]; error: string | null }>
  gitCheckout: (data: { filePath: string; branch: string }) => Promise<{ success: boolean; error: string | null }>

  // CLI bridge
  cliRun: (data: { command: string; filePath: string; schemaPath?: string }) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  cliConfigure: (binaryPath: string) => Promise<boolean>

  // MCP
  mcpConnect: (config: { name: string; command: string; args: string[]; env?: Record<string, string> }) => Promise<{ success: boolean; error: string | null }>
  mcpDisconnect: (serverName: string) => Promise<boolean>
  mcpStatus: () => Promise<Record<string, boolean>>
  mcpListAgents: () => Promise<unknown[]>
  mcpGetAgent: (data: { serverName: string; agentId: string }) => Promise<{ agent: unknown; error: string | null }>
  mcpRegisterAgent: (data: { serverName: string; agent: unknown }) => Promise<{ success: boolean; error: string | null }>
  mcpUnregisterAgent: (data: { serverName: string; agentId: string }) => Promise<{ success: boolean; error: string | null }>
  mcpConnectHttp: (data: { name: string; url: string }) => Promise<{ success: boolean; error: string | null }>
  mcpCall: (data: { serverName: string; method: string; params: unknown }) => Promise<{ result: unknown; error: string | null }>

  // Menu events
  onMenuAction: (callback: (action: string) => void) => (() => void) | undefined

  // Workspace
  workspaceGetFolders: () => Promise<string[]>
  workspaceAddFolder: () => Promise<string | null>
  workspaceRemoveFolder: (folderPath: string) => Promise<string[]>
  workspaceCloseAll: () => Promise<string[]>
  workspaceGetTree: (folderPath: string) => Promise<FileTreeNode[]>
  workspaceReadFile: (filePath: string) => Promise<{ filePath: string; content: string; display: string | null } | { error: string }>
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  gitStatus?: string | null
}

interface Window {
  electronAPI?: ElectronAPI
}
