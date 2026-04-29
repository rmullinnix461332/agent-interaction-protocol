import { Box, Typography, Button, IconButton, Tooltip, Divider } from '@mui/material'
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import CloseIcon from '@mui/icons-material/Close'
import { useWorkspace, useWorkspaceActions } from '@/store/workspace-context'
import { useFlowDispatch } from '@/store/flow-context'
import { parseFlow } from '@/yaml/parser'
import FileTree from '@/components/FileTree'
import { useFlowState } from '@/store/flow-context'

export default function ExplorerPanel() {
  const { folders, trees } = useWorkspace()
  const { addFolder, removeFolder, refreshFolder } = useWorkspaceActions()
  const flowDispatch = useFlowDispatch()
  const flowState = useFlowState()

  const handleFileClick = async (filePath: string) => {
    if (!/\.ya?ml$/i.test(filePath) && !/\.json$/i.test(filePath)) return

    const result = await window.electronAPI?.workspaceReadFile(filePath)
    if (!result || 'error' in result) return

    try {
      const flow = parseFlow(result.content)
      const display = result.display ? JSON.parse(result.display) : null
      flowDispatch({ type: 'LOAD_FLOW', flow, filePath: result.filePath, display })
    } catch (err) {
      console.error('Failed to parse flow:', err)
    }
  }

  if (folders.length === 0) {
    return (
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No folders in workspace
        </Typography>
        <Button variant="outlined" size="small" startIcon={<CreateNewFolderOutlinedIcon />} onClick={addFolder}>
          Add Folder to Workspace
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {folders.map((folder, idx) => {
        const folderName = folder.split('/').pop() || folder
        const tree = trees[folder] || []

        return (
          <Box key={folder}>
            {idx > 0 && <Divider />}
            {/* Folder header */}
            <Box sx={{ display: 'flex', alignItems: 'center', px: 1, py: 0.5 }}>
              <Typography variant="caption" fontWeight={700} letterSpacing={0.5} sx={{ flex: 1, textTransform: 'uppercase' }} noWrap>
                {folderName}
              </Typography>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => refreshFolder(folder)} sx={{ p: 0.25 }}>
                  <RefreshIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove folder">
                <IconButton size="small" onClick={() => removeFolder(folder)} sx={{ p: 0.25 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
            {/* File tree */}
            <Box sx={{ px: 0.5 }}>
              <FileTree
                nodes={tree}
                onFileClick={handleFileClick}
                activeFilePath={flowState.filePath}
              />
            </Box>
          </Box>
        )
      })}

      <Box sx={{ mt: 'auto', p: 1, borderTop: 1, borderColor: 'divider' }}>
        <Button size="small" fullWidth startIcon={<CreateNewFolderOutlinedIcon />} onClick={addFolder}>
          Add Folder
        </Button>
      </Box>
    </Box>
  )
}
