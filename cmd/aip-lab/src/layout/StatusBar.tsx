import { Box, Typography, Chip, Tooltip } from '@mui/material'
import CommitIcon from '@mui/icons-material/Commit'
import { useUIState } from '@/store/ui-context'
import { useFlowState } from '@/store/flow-context'
import ValidationPanel from '@/panels/ValidationPanel'

interface StatusBarProps {
  gitBranch: string | null
  gitDirty: boolean
  onGitCommit: () => void
}

export default function StatusBar({ gitBranch, gitDirty, onGitCommit }: StatusBarProps) {
  const { viewMode } = useUIState()
  const flowState = useFlowState()
  const flowTitle = flowState.flow ? (flowState.flow.metadata.title || flowState.flow.metadata.name) : ''

  return (
    <Box
      sx={{
        px: 2,
        py: 0.5,
        borderTop: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: 'background.paper',
        minHeight: 24,
      }}
    >
      <ValidationPanel />
      <Box sx={{ flex: 1 }} />
      {gitBranch && (
        <Tooltip title="Git commit">
          <Chip
            size="small"
            icon={<CommitIcon sx={{ fontSize: 14 }} />}
            label={`${gitBranch}${gitDirty ? ' \u2022' : ''}`}
            onClick={onGitCommit}
            variant="outlined"
            sx={{ height: 22, fontSize: 11, cursor: 'pointer' }}
          />
        </Tooltip>
      )}
      {flowState.flow && (
        <Typography variant="caption" color="text.secondary">
          {flowTitle}{flowState.dirty ? ' \u2022' : ''}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">{viewMode}</Typography>
      {flowState.filePath && (
        <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 300 }}>
          {flowState.filePath}
        </Typography>
      )}
    </Box>
  )
}
