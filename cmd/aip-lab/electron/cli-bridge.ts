import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import path from 'path'

let aipBinaryPath = 'aip'

export function registerCLIHandlers() {
  ipcMain.handle('cli:configure', (_event, binaryPath: string) => {
    aipBinaryPath = binaryPath || 'aip'
    return true
  })

  ipcMain.handle('cli:run', async (_event, { command, filePath, schemaPath }: {
    command: string
    filePath: string
    schemaPath?: string
  }) => {
    const args = [command, filePath]
    if (schemaPath) {
      args.push('--schema', schemaPath)
    }

    return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      execFile(aipBinaryPath, args, {
        cwd: path.dirname(filePath),
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      }, (err, stdout, stderr) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: err ? (err as any).code || 1 : 0,
        })
      })
    })
  })
}
