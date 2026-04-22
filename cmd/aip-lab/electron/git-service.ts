import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import path from 'path'

function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message))
      else resolve(stdout.trim())
    })
  })
}

export function registerGitHandlers() {
  ipcMain.handle('git:status', async (_event, filePath: string) => {
    try {
      const cwd = path.dirname(filePath)
      const branch = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
      const status = await git(cwd, ['status', '--porcelain', '--', path.basename(filePath)])
      return { branch, dirty: status.length > 0, error: null }
    } catch (err: any) {
      return { branch: null, dirty: false, error: err.message }
    }
  })

  ipcMain.handle('git:commit', async (_event, { filePath, message }: { filePath: string; message: string }) => {
    try {
      const cwd = path.dirname(filePath)
      const file = path.basename(filePath)
      const displayFile = file.replace(/\.ya?ml$/, '.display.json')
      await git(cwd, ['add', file])
      // Also stage display file if it exists
      try { await git(cwd, ['add', displayFile]) } catch {}
      await git(cwd, ['commit', '-m', message])
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('git:log', async (_event, filePath: string) => {
    try {
      const cwd = path.dirname(filePath)
      const file = path.basename(filePath)
      const log = await git(cwd, ['log', '--oneline', '-10', '--', file])
      return { entries: log.split('\n').filter(Boolean), error: null }
    } catch (err: any) {
      return { entries: [], error: err.message }
    }
  })

  ipcMain.handle('git:diff', async (_event, filePath: string) => {
    try {
      const cwd = path.dirname(filePath)
      const file = path.basename(filePath)
      const diff = await git(cwd, ['diff', '--', file])
      return { diff, error: null }
    } catch (err: any) {
      return { diff: '', error: err.message }
    }
  })

  ipcMain.handle('git:branches', async (_event, filePath: string) => {
    try {
      const cwd = path.dirname(filePath)
      const current = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
      const all = await git(cwd, ['branch', '--format=%(refname:short)'])
      return { current, branches: all.split('\n').filter(Boolean), error: null }
    } catch (err: any) {
      return { current: null, branches: [], error: err.message }
    }
  })

  ipcMain.handle('git:checkout', async (_event, { filePath, branch }: { filePath: string; branch: string }) => {
    try {
      const cwd = path.dirname(filePath)
      await git(cwd, ['checkout', branch])
      return { success: true, error: null }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
