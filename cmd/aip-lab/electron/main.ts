import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { registerLLMHandlers } from './llm-service'
import { registerSettingsHandlers } from './settings-service'
import { registerGitHandlers } from './git-service'
import { registerCLIHandlers } from './cli-bridge'
import { registerMCPHandlers } from './mcp-service'
import { registerWorkspaceHandlers } from './workspace-service'
import { buildAppMenu } from './menu'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Set application menu
  const menu = buildAppMenu(mainWindow)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(() => {
  registerLLMHandlers()
  registerSettingsHandlers()
  registerGitHandlers()
  registerCLIHandlers()
  registerMCPHandlers()
  registerWorkspaceHandlers()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// --- File I/O IPC ---

ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')

  // Try to load companion display file
  const displayPath = filePath.replace(/\.ya?ml$/, '.display.json')
  let display: string | null = null
  if (fs.existsSync(displayPath)) {
    display = fs.readFileSync(displayPath, 'utf-8')
  }

  return { filePath, content, display }
})

ipcMain.handle('file:save', async (_event, { filePath, content, display }) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  if (display) {
    const displayPath = filePath.replace(/\.ya?ml$/, '.display.json')
    fs.writeFileSync(displayPath, display, 'utf-8')
  }
  return true
})

ipcMain.handle('file:saveAs', async (_event, { content, display }) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }],
  })
  if (result.canceled || !result.filePath) return null
  fs.writeFileSync(result.filePath, content, 'utf-8')
  if (display) {
    const displayPath = result.filePath.replace(/\.ya?ml$/, '.display.json')
    fs.writeFileSync(displayPath, display, 'utf-8')
  }
  return result.filePath
})
