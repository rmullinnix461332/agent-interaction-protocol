import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { EngineConfig, EngineStatus } from '@/api/types'
import { EngineClient } from '@/api/client'

interface EngineContextValue {
  engines: EngineStatus[]
  activeEngineId: string | null
  activeEngine: EngineStatus | null
  setActiveEngineId: (id: string | null) => void
  addEngine: (engine: EngineConfig) => Promise<void>
  removeEngine: (id: string) => Promise<void>
  refreshEngines: () => Promise<void>
}

const EngineContext = createContext<EngineContextValue | null>(null)

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engines, setEngines] = useState<EngineStatus[]>([])
  const [activeEngineId, setActiveEngineId] = useState<string | null>(null)

  const activeEngine = engines.find(e => e.config.id === activeEngineId) ?? null

  // Load engines from config on mount
  const loadEngines = useCallback(async () => {
    const configs: EngineConfig[] = await window.electronAPI.getEngines()
    setEngines(prev => {
      // Preserve existing status for known engines, add new ones
      const statusMap = new Map(prev.map(e => [e.config.id, e]))
      return configs.map(config => statusMap.get(config.id) ?? {
        config,
        online: false,
        lastChecked: 0,
      })
    })
    // Auto-select first engine if none selected
    if (!activeEngineId && configs.length > 0) {
      setActiveEngineId(configs[0].id)
    }
  }, [activeEngineId])

  useEffect(() => {
    loadEngines()
  }, [loadEngines])

  // Poll health for all engines
  useEffect(() => {
    if (engines.length === 0) return

    const checkHealth = async () => {
      const updated = await Promise.all(
        engines.map(async (engine) => {
          const client = new EngineClient(engine.config.endpoint)
          try {
            const [health, info, capabilities] = await Promise.all([
              client.health(),
              client.info(),
              client.capabilities(),
            ])
            return { ...engine, online: true, health, info, capabilities, lastChecked: Date.now(), error: undefined }
          } catch (err) {
            return { ...engine, online: false, lastChecked: Date.now(), error: String(err) }
          }
        })
      )
      setEngines(updated)
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10_000)
    return () => clearInterval(interval)
  }, [engines.length]) // Re-setup when engine count changes

  const addEngine = useCallback(async (config: EngineConfig) => {
    await window.electronAPI.addEngine(config)
    await loadEngines()
  }, [loadEngines])

  const removeEngine = useCallback(async (id: string) => {
    await window.electronAPI.removeEngine(id)
    if (activeEngineId === id) {
      setActiveEngineId(null)
    }
    await loadEngines()
  }, [activeEngineId, loadEngines])

  return (
    <EngineContext.Provider value={{
      engines,
      activeEngineId,
      activeEngine,
      setActiveEngineId,
      addEngine,
      removeEngine,
      refreshEngines: loadEngines,
    }}>
      {children}
    </EngineContext.Provider>
  )
}

export function useEngines(): EngineContextValue {
  const ctx = useContext(EngineContext)
  if (!ctx) throw new Error('useEngines must be used within EngineProvider')
  return ctx
}
