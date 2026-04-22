import { ipcMain } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'

interface ManagedProcess {
  engineId: string
  process: ChildProcess
  port: number
  status: 'running' | 'stopped' | 'error'
  error?: string
}

const processes = new Map<string, ManagedProcess>()

export function registerEngineManagerHandlers(): void {
  ipcMain.handle('engine:start', async (_event, opts: {
    engineId: string
    binaryPath: string
    port: number
    dataDir: string
    logLevel?: string
  }) => {
    // Don't start if already running
    const existing = processes.get(opts.engineId)
    if (existing?.status === 'running') {
      return { status: 'running', port: existing.port }
    }

    const args = [
      '--port', String(opts.port),
      '--data-dir', opts.dataDir,
      '--log-level', opts.logLevel || 'info',
    ]

    try {
      const child = spawn(opts.binaryPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      })

      const managed: ManagedProcess = {
        engineId: opts.engineId,
        process: child,
        port: opts.port,
        status: 'running',
      }

      child.on('exit', (code) => {
        managed.status = 'stopped'
        if (code !== 0 && code !== null) {
          managed.status = 'error'
          managed.error = `Process exited with code ${code}`
        }
      })

      child.on('error', (err) => {
        managed.status = 'error'
        managed.error = err.message
      })

      processes.set(opts.engineId, managed)
      return { status: 'running', port: opts.port }
    } catch (err) {
      return { status: 'error', error: String(err) }
    }
  })

  ipcMain.handle('engine:stop', async (_event, engineId: string) => {
    const managed = processes.get(engineId)
    if (!managed || managed.status !== 'running') {
      return { status: 'not_running' }
    }

    managed.process.kill('SIGTERM')

    // Wait up to 5 seconds for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (managed.status === 'running') {
          managed.process.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      managed.process.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    managed.status = 'stopped'
    return { status: 'stopped' }
  })

  ipcMain.handle('engine:status', async (_event, engineId: string) => {
    const managed = processes.get(engineId)
    if (!managed) {
      return { status: 'not_managed' }
    }
    return { status: managed.status, port: managed.port, error: managed.error }
  })
}

export function stopAllEngines(): void {
  for (const [id, managed] of processes) {
    if (managed.status === 'running') {
      managed.process.kill('SIGTERM')
    }
  }
}
