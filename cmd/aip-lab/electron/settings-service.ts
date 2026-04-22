import { ipcMain, app } from 'electron'
import fs from 'fs'
import path from 'path'

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

export function registerSettingsHandlers() {
  ipcMain.handle('settings:load', () => {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'))
      }
    } catch {}
    return null
  })

  ipcMain.handle('settings:save', (_event, settings: object) => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
    return true
  })
}
