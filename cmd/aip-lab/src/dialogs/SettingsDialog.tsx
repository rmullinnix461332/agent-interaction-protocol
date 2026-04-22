import { useState, useEffect } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Switch, FormControlLabel, Tabs, Tab, Box, Typography,
  IconButton, Paper, Chip, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { useUIDispatch } from '../store/ui-context'
import type { AppSettings } from '../model/settings'
import { DEFAULT_SETTINGS } from '../model/settings'

interface Props {
  open: boolean
  onClose: () => void
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

export default function SettingsDialog({ open, onClose }: Props) {
  const uiDispatch = useUIDispatch()
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [tab, setTab] = useState(0)

  useEffect(() => {
    if (!open) return
    window.electronAPI?.loadSettings().then((saved) => {
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved } as AppSettings)
    })
  }, [open])

  const save = async () => {
    await window.electronAPI?.saveSettings(settings)
    // Apply LLM config
    await window.electronAPI?.llmConfigure({
      provider: settings.llm.provider,
      apiKey: settings.llm.apiKey || undefined,
      model: settings.llm.model,
      endpoint: settings.llm.endpoint || undefined,
    })
    // Apply CLI config
    await window.electronAPI?.cliConfigure(settings.cli.aipBinaryPath)
    // Apply theme
    uiDispatch({ type: 'SET_THEME', mode: settings.appearance.theme })
    // Connect MCP servers
    for (const server of settings.mcp?.servers || []) {
      if (server.name && server.command) {
        const envObj: Record<string, string> = {}
        if (server.env) {
          for (const pair of server.env.split(',')) {
            const [k, v] = pair.trim().split('=')
            if (k && v) envObj[k] = v
          }
        }
        window.electronAPI?.mcpConnect({
          name: server.name,
          command: server.command,
          args: server.args ? server.args.split(' ') : [],
          env: Object.keys(envObj).length > 0 ? envObj : undefined,
        })
      }
    }
    onClose()
  }

  const update = <K extends keyof AppSettings>(section: K, values: Partial<AppSettings[K]>) => {
    setSettings((s) => ({ ...s, [section]: { ...s[section], ...values } }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="LLM" />
          <Tab label="Git" />
          <Tab label="Appearance" />
          <Tab label="Editor" />
          <Tab label="CLI" />
          <Tab label="MCP Servers" />
        </Tabs>

        {/* LLM */}
        <TabPanel value={tab} index={0}>
          <FormControl size="small" fullWidth margin="dense">
            <InputLabel>Provider</InputLabel>
            <Select
              value={settings.llm.provider}
              label="Provider"
              onChange={(e) => update('llm', { provider: e.target.value as AppSettings['llm']['provider'] })}
            >
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="anthropic">Anthropic</MenuItem>
              <MenuItem value="ollama">Ollama (local)</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="API Key"
            type="password"
            value={settings.llm.apiKey}
            size="small" fullWidth margin="dense"
            onChange={(e) => update('llm', { apiKey: e.target.value })}
            helperText={settings.llm.provider === 'ollama' ? 'Not required for Ollama' : ''}
          />
          <TextField
            label="Model"
            value={settings.llm.model}
            size="small" fullWidth margin="dense"
            onChange={(e) => update('llm', { model: e.target.value })}
          />
          <TextField
            label="Endpoint URL (optional)"
            value={settings.llm.endpoint}
            size="small" fullWidth margin="dense"
            placeholder={settings.llm.provider === 'ollama' ? 'http://localhost:11434' : ''}
            onChange={(e) => update('llm', { endpoint: e.target.value })}
          />
        </TabPanel>

        {/* Git */}
        <TabPanel value={tab} index={1}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.git.autoCommitOnSave}
                onChange={(e) => update('git', { autoCommitOnSave: e.target.checked })}
              />
            }
            label="Auto-commit on save"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Git operations use the repository containing the open flow file.
          </Typography>
        </TabPanel>

        {/* Appearance */}
        <TabPanel value={tab} index={2}>
          <FormControl size="small" fullWidth margin="dense">
            <InputLabel>Theme</InputLabel>
            <Select
              value={settings.appearance.theme}
              label="Theme"
              onChange={(e) => update('appearance', { theme: e.target.value as AppSettings['appearance']['theme'] })}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={settings.appearance.showGrid}
                onChange={(e) => update('appearance', { showGrid: e.target.checked })}
              />
            }
            label="Show canvas grid"
          />
        </TabPanel>

        {/* Editor */}
        <TabPanel value={tab} index={3}>
          <FormControl size="small" fullWidth margin="dense">
            <InputLabel>Indent</InputLabel>
            <Select
              value={settings.editor.indent}
              label="Indent"
              onChange={(e) => update('editor', { indent: Number(e.target.value) as 2 | 4 })}
            >
              <MenuItem value={2}>2 spaces</MenuItem>
              <MenuItem value={4}>4 spaces</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={settings.editor.autoValidate}
                onChange={(e) => update('editor', { autoValidate: e.target.checked })}
              />
            }
            label="Auto-validate on change"
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.editor.autoLayoutNewNodes}
                onChange={(e) => update('editor', { autoLayoutNewNodes: e.target.checked })}
              />
            }
            label="Auto-layout new nodes"
          />
        </TabPanel>

        {/* CLI */}
        <TabPanel value={tab} index={4}>
          <TextField
            label="AIP binary path"
            value={settings.cli.aipBinaryPath}
            size="small" fullWidth margin="dense"
            helperText="Path to the aip CLI binary (e.g. /usr/local/bin/aip)"
            onChange={(e) => update('cli', { aipBinaryPath: e.target.value })}
          />
        </TabPanel>

        {/* MCP Servers */}
        <TabPanel value={tab} index={5}>
          {(settings.mcp?.servers || []).map((server, i) => (
            <Paper key={i} elevation={0} sx={{ p: 1.5, mb: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>{server.name || `Server ${i + 1}`}</Typography>
                <Tooltip title="Remove">
                  <IconButton size="small" onClick={() => {
                    const servers = [...(settings.mcp?.servers || [])]
                    servers.splice(i, 1)
                    update('mcp', { servers })
                  }}><DeleteIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <TextField label="Name" value={server.name} size="small" fullWidth margin="dense"
                onChange={(e) => {
                  const servers = [...(settings.mcp?.servers || [])]
                  servers[i] = { ...servers[i], name: e.target.value }
                  update('mcp', { servers })
                }} />
              <TextField label="Command" value={server.command} size="small" fullWidth margin="dense" placeholder="uvx"
                onChange={(e) => {
                  const servers = [...(settings.mcp?.servers || [])]
                  servers[i] = { ...servers[i], command: e.target.value }
                  update('mcp', { servers })
                }} />
              <TextField label="Args" value={server.args} size="small" fullWidth margin="dense" placeholder="agent-registry-mcp-server@latest"
                onChange={(e) => {
                  const servers = [...(settings.mcp?.servers || [])]
                  servers[i] = { ...servers[i], args: e.target.value }
                  update('mcp', { servers })
                }} />
              <TextField label="Env (KEY=VALUE, comma-separated)" value={server.env || ''} size="small" fullWidth margin="dense"
                onChange={(e) => {
                  const servers = [...(settings.mcp?.servers || [])]
                  servers[i] = { ...servers[i], env: e.target.value }
                  update('mcp', { servers })
                }} />
            </Paper>
          ))}
          <Button size="small" startIcon={<AddIcon />} onClick={() => {
            const servers = [...(settings.mcp?.servers || []), { name: '', command: 'uvx', args: '', env: '' }]
            update('mcp', { servers })
          }}>
            Add MCP Server
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            MCP servers provide agent discovery for the Agent Gallery. Servers are connected on save.
          </Typography>
        </TabPanel>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
