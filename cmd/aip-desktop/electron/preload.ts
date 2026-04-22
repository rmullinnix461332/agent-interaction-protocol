import { contextBridge, ipcRenderer } from 'electron'

export interface EngineConfig {
  id: string
  name: string
  endpoint: string
  type: 'local' | 'remote'
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  getEngines: (): Promise<EngineConfig[]> => ipcRenderer.invoke('config:getEngines'),
  addEngine: (engine: EngineConfig): Promise<EngineConfig[]> => ipcRenderer.invoke('config:addEngine', engine),
  removeEngine: (engineId: string): Promise<EngineConfig[]> => ipcRenderer.invoke('config:removeEngine', engineId),
  updateEngine: (engine: EngineConfig): Promise<EngineConfig[]> => ipcRenderer.invoke('config:updateEngine', engine),

  // Engine process management
  startEngine: (opts: {
    engineId: string
    binaryPath: string
    port: number
    dataDir: string
    logLevel?: string
  }): Promise<{ status: string; port?: number; error?: string }> =>
    ipcRenderer.invoke('engine:start', opts),
  stopEngine: (engineId: string): Promise<{ status: string }> =>
    ipcRenderer.invoke('engine:stop', engineId),
  engineStatus: (engineId: string): Promise<{ status: string; port?: number; error?: string }> =>
    ipcRenderer.invoke('engine:status', engineId),
})
