import { useState, useEffect, useCallback } from 'react'
import {
  Box, Typography, TextField, Button, Divider, Chip,
  List, ListItemButton, ListItemText, ListItemIcon, Alert,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material'
import CommitIcon from '@mui/icons-material/Commit'
import DiffIcon from '@mui/icons-material/Difference'
import { useFlowState } from '@/store/flow-context'

export default function SCMPanel() {
  const { filePath } = useFlowState()
  const [branch, setBranch] = useState<string | null>(null)
  const [branches, setBranches] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [diff, setDiff] = useState<string | null>(null)
  const [commitMsg, setCommitMsg] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)

  // Poll git status
  useEffect(() => {
    if (!filePath) { setBranch(null); return }
    const poll = () => {
      window.electronAPI?.gitStatus(filePath).then(r => {
        if (!r.error) { setBranch(r.branch); setDirty(r.dirty) }
      })
      window.electronAPI?.gitBranches(filePath).then(r => {
        if (!r.error) { setBranches(r.branches); if (r.current) setBranch(r.current) }
      })
    }
    poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [filePath])

  const handleShowDiff = useCallback(async () => {
    if (!filePath) return
    const r = await window.electronAPI?.gitDiff(filePath)
    setDiff(r?.diff || '(no changes)')
  }, [filePath])

  const handleCommit = useCallback(async () => {
    if (!filePath || !commitMsg.trim()) return
    setError(null)
    setCommitting(true)
    const result = await window.electronAPI?.gitCommit({ filePath, message: commitMsg.trim() })
    setCommitting(false)
    if (result?.success) {
      setCommitMsg('')
      setDiff(null)
      setDirty(false)
    } else {
      setError(result?.error || 'Commit failed')
    }
  }, [filePath, commitMsg])

  const handleCheckout = useCallback(async (branchName: string) => {
    if (!filePath) return
    await window.electronAPI?.gitCheckout({ filePath, branch: branchName })
    setBranch(branchName)
  }, [filePath])

  if (!filePath) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Open a file to see source control.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Branch */}
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          BRANCH
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<CommitIcon sx={{ fontSize: 14 }} />}
            label={branch || 'unknown'}
            size="small"
            variant="outlined"
          />
          {dirty && <Chip label="modified" size="small" color="warning" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
        </Box>
        {branches.length > 1 && (
          <FormControl size="small" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Switch branch</InputLabel>
            <Select
              value={branch || ''}
              onChange={e => handleCheckout(e.target.value)}
              label="Switch branch"
            >
              {branches.map(b => (
                <MenuItem key={b} value={b}>{b}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      <Divider />

      {/* Commit */}
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          COMMIT
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 1, py: 0 }}>{error}</Alert>}
        <TextField
          size="small"
          placeholder="Commit message"
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          fullWidth
          multiline
          rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleCommit() } }}
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size="small" variant="contained" fullWidth
            onClick={handleCommit}
            disabled={!commitMsg.trim() || committing || !dirty}
          >
            {committing ? 'Committing...' : 'Commit'}
          </Button>
        </Box>
      </Box>

      <Divider />

      {/* Diff */}
      <Box>
        <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          CHANGES
        </Typography>
        <Button
          size="small" variant="outlined" fullWidth
          startIcon={<DiffIcon />}
          onClick={handleShowDiff}
          disabled={!dirty}
        >
          Show Diff
        </Button>
        {diff && (
          <Box
            component="pre"
            sx={{
              mt: 1, p: 1, fontSize: 10, fontFamily: 'monospace',
              bgcolor: 'background.default', borderRadius: 1,
              overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap',
              border: 1, borderColor: 'divider',
            }}
          >
            {diff}
          </Box>
        )}
      </Box>
    </Box>
  )
}
