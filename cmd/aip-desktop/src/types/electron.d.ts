import type { EngineConfig } from '@/api/types'

declare global {
  interface Window {
    electronAPI: {
      // Config
      getEngines: () => Promise<EngineConfig[]>
      addEngine: (engine: EngineConfig) => Promise<EngineConfig[]>
      removeEngine: (engineId: string) => Promise<EngineConfig[]>
      updateEngine: (engine: EngineConfig) => Promise<EngineConfig[]>

      startEngine: (opts: {
        engineId: string
        binaryPath: string
        port: number
        dataDir: string
        logLevel?: string
      }) => Promise<{ status: string; port?: number; error?: string }>
      stopEngine: (engineId: string) => Promise<{ status: string }>
      engineStatus: (engineId: string) => Promise<{ status: string; port?: number; error?: string }>

      // File dialogs
      openFlowFile: () => Promise<{ filePath: string; content: string } | null>
    }
  }
}

export {}
