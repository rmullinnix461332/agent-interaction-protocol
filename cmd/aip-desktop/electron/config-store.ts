import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

export interface EngineConfig {
  id: string
  name: string
  endpoint: string
  type: 'local' | 'remote'
}

interface AppConfig {
  engines: EngineConfig[]
}

function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig(): AppConfig {
  try {
    const data = fs.readFileSync(configPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return { engines: [] }
  }
}

function saveConfig(config: AppConfig): void {
  const dir = path.dirname(configPath())
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2))
}

export function registerConfigHandlers(): void {
  ipcMain.handle('config:getEngines', () => {
    return loadConfig().engines
  })

  ipcMain.handle('config:addEngine', (_event, engine: EngineConfig) => {
    const config = loadConfig()
    config.engines.push(engine)
    saveConfig(config)
    return config.engines
  })

  ipcMain.handle('config:removeEngine', (_event, engineId: string) => {
    const config = loadConfig()
    config.engines = config.engines.filter(e => e.id !== engineId)
    saveConfig(config)
    return config.engines
  })

  ipcMain.handle('config:updateEngine', (_event, engine: EngineConfig) => {
    const config = loadConfig()
    const idx = config.engines.findIndex(e => e.id === engine.id)
    if (idx >= 0) {
      config.engines[idx] = engine
      saveConfig(config)
    }
    return config.engines
  })
}
