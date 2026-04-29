import { Menu, type BrowserWindow } from 'electron'

export function buildAppMenu(win: BrowserWindow): Menu {
  const isMac = process.platform === 'darwin'

  const send = (channel: string) => () => {
    win.webContents.send(channel)
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS app menu
    ...(isMac ? [{
      role: 'appMenu' as const,
    }] : []),

    // File
    {
      label: 'File',
      submenu: [
        { label: 'New Flow', accelerator: 'CmdOrCtrl+N', click: send('menu:new') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: send('menu:open') },
        { type: 'separator' as const },
        { label: 'Add Folder to Workspace', click: send('menu:addFolder') },
        { label: 'Close Workspace', click: send('menu:closeWorkspace') },
        { type: 'separator' as const },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: send('menu:saveAs') },
        { type: 'separator' as const },
        ...(isMac ? [] : [
          { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: send('menu:settings') },
          { type: 'separator' as const },
          { role: 'quit' as const },
        ]),
      ],
    },

    // Edit
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: send('menu:undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: send('menu:redo') },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { type: 'separator' as const },
        { label: 'Find Node', accelerator: 'CmdOrCtrl+P', click: send('menu:find') },
        { type: 'separator' as const },
        { label: 'Delete Node', accelerator: 'Delete', click: send('menu:delete') },
        { label: 'Duplicate Node', accelerator: 'CmdOrCtrl+D', click: send('menu:duplicate') },
      ],
    },

    // Run
    {
      label: 'Run',
      submenu: [
        { label: 'Start Run', accelerator: 'F5', click: send('menu:runStart') },
        { label: 'Pause', accelerator: 'F6', click: send('menu:runPause') },
        { label: 'Stop', accelerator: 'Shift+F5', click: send('menu:runStop') },
      ],
    },

    // Window
    {
      label: 'Window',
      submenu: [
        { label: 'Canvas View', click: send('menu:viewCanvas') },
        { label: 'YAML View', click: send('menu:viewYaml') },
        { label: 'Split View', click: send('menu:viewSplit') },
        { type: 'separator' as const },
        { label: 'Toggle Chat Panel', accelerator: 'CmdOrCtrl+Shift+C', click: send('menu:toggleChat') },
        { label: 'Toggle Side Panel', accelerator: 'CmdOrCtrl+B', click: send('menu:toggleSidePanel') },
        { label: 'Toggle Trace Panel', accelerator: 'CmdOrCtrl+J', click: send('menu:toggleTrace') },
        { type: 'separator' as const },
        { role: 'minimize' as const },
        ...(isMac ? [{ role: 'zoom' as const }] : []),
        { role: 'togglefullscreen' as const },
      ],
    },

    // Help
    {
      label: 'Help',
      submenu: [
        { label: 'Welcome', click: send('menu:welcome') },
        { label: 'About AIP Lab', click: send('menu:about') },
        { type: 'separator' as const },
        { role: 'toggleDevTools' as const },
      ],
    },
  ]

  return Menu.buildFromTemplate(template)
}
