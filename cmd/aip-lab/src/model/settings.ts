export interface AppSettings {
  llm: {
    provider: 'openai' | 'anthropic' | 'ollama'
    apiKey: string
    model: string
    endpoint: string
  }
  git: {
    autoCommitOnSave: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    showGrid: boolean
  }
  editor: {
    indent: 2 | 4
    autoValidate: boolean
    autoLayoutNewNodes: boolean
  }
  cli: {
    aipBinaryPath: string
  }
  mcp: {
    servers: { name: string; command: string; args: string; env: string }[]
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  llm: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o',
    endpoint: '',
  },
  git: {
    autoCommitOnSave: false,
  },
  appearance: {
    theme: 'system',
    showGrid: true,
  },
  editor: {
    indent: 2,
    autoValidate: true,
    autoLayoutNewNodes: true,
  },
  cli: {
    aipBinaryPath: 'aip',
  },
  mcp: {
    servers: [],
  },
}
