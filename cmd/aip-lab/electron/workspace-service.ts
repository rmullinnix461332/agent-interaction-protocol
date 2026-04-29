import { app, ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

interface WorkspaceConfig {
  folders: string[]
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  gitStatus?: string | null
}

function workspacePath(): string {
  return path.join(app.getPath('userData'), 'workspace.json')
}

function loadWorkspace(): WorkspaceConfig {
  try {
    const data = fs.readFileSync(workspacePath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return { folders: [] }
  }
}

function saveWorkspace(config: WorkspaceConfig): void {
  const dir = path.dirname(workspacePath())
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(workspacePath(), JSON.stringify(config, null, 2))
}

function readTree(dirPath: string, depth: number = 0, maxDepth: number = 5): FileTreeNode[] {
  if (depth > maxDepth) return []

  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return []
  }

  // Sort: directories first, then files, alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1
    if (!a.isDirectory() && b.isDirectory()) return 1
    return a.name.localeCompare(b.name)
  })

  const nodes: FileTreeNode[] = []
  for (const entry of entries) {
    // Skip hidden files and common noise
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '__pycache__') continue

    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'directory',
        children: readTree(fullPath, depth + 1, maxDepth),
      })
    } else {
      nodes.push({
        name: entry.name,
        path: fullPath,
        type: 'file',
      })
    }
  }

  return nodes
}

function getGitStatuses(folderPath: string): Record<string, string> {
  const statuses: Record<string, string> = {}
  try {
    const output = execSync('git status --porcelain', {
      cwd: folderPath,
      encoding: 'utf-8',
      timeout: 5000,
    })
    for (const line of output.split('\n')) {
      if (line.length < 4) continue
      const code = line.substring(0, 2).trim()
      const filePath = line.substring(3)
      const fullPath = path.join(folderPath, filePath)

      if (code === '??' || code === 'A') statuses[fullPath] = 'added'
      else if (code === 'M' || code === 'MM') statuses[fullPath] = 'modified'
      else if (code === 'D') statuses[fullPath] = 'deleted'
      else statuses[fullPath] = 'modified'
    }
  } catch {
    // Not a git repo or git not available
  }
  return statuses
}

function applyGitStatuses(nodes: FileTreeNode[], statuses: Record<string, string>): void {
  for (const node of nodes) {
    if (node.type === 'file') {
      node.gitStatus = statuses[node.path] || null
    }
    if (node.children) {
      applyGitStatuses(node.children, statuses)
      // Directory is modified if any child is modified
      const hasChanges = node.children.some(c => c.gitStatus !== null && c.gitStatus !== undefined)
      if (hasChanges) node.gitStatus = 'modified'
    }
  }
}

export function registerWorkspaceHandlers(): void {
  ipcMain.handle('workspace:getFolders', () => {
    return loadWorkspace().folders
  })

  ipcMain.handle('workspace:addFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return null

    const folderPath = result.filePaths[0]
    const config = loadWorkspace()
    if (!config.folders.includes(folderPath)) {
      config.folders.push(folderPath)
      saveWorkspace(config)
    }
    return folderPath
  })

  ipcMain.handle('workspace:removeFolder', (_event, folderPath: string) => {
    const config = loadWorkspace()
    config.folders = config.folders.filter(f => f !== folderPath)
    saveWorkspace(config)
    return config.folders
  })

  ipcMain.handle('workspace:closeAll', () => {
    saveWorkspace({ folders: [] })
    return []
  })

  ipcMain.handle('workspace:getTree', (_event, folderPath: string) => {
    const tree = readTree(folderPath)
    const statuses = getGitStatuses(folderPath)
    applyGitStatuses(tree, statuses)
    return tree
  })

  ipcMain.handle('workspace:readFile', (_event, filePath: string) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      // Try to load companion display file for YAML
      let display: string | null = null
      if (/\.ya?ml$/i.test(filePath)) {
        const displayPath = filePath.replace(/\.ya?ml$/i, '.display.json')
        if (fs.existsSync(displayPath)) {
          display = fs.readFileSync(displayPath, 'utf-8')
        }
      }
      return { filePath, content, display }
    } catch (err) {
      return { error: String(err) }
    }
  })
}
