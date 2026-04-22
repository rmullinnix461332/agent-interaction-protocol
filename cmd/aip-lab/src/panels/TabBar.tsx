import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useFlowState, useFlowDispatch } from '../store/flow-context'

export default function TabBar() {
  const { tabs, activeTabId } = useFlowState()
  const dispatch = useFlowDispatch()

  if (tabs.length <= 1) return null

  return (
    <Box
      sx={{
        display: 'flex',
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'auto',
        minHeight: 32,
        '&::-webkit-scrollbar': { height: 0 },
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const label = tab.flow.metadata.title || tab.flow.metadata.name || 'untitled'
        return (
          <Box
            key={tab.id}
            onClick={() => dispatch({ type: 'SWITCH_TAB', tabId: tab.id })}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              cursor: 'pointer',
              borderRight: 1,
              borderColor: 'divider',
              bgcolor: isActive ? 'background.default' : 'transparent',
              borderBottom: isActive ? '2px solid' : '2px solid transparent',
              borderBottomColor: isActive ? 'primary.main' : 'transparent',
              '&:hover': { bgcolor: isActive ? 'background.default' : 'action.hover' },
              minWidth: 0,
              maxWidth: 200,
            }}
          >
            <Typography
              variant="caption"
              noWrap
              sx={{ fontSize: 11, fontWeight: isActive ? 600 : 400, flex: 1 }}
            >
              {label}{tab.dirty ? ' \u2022' : ''}
            </Typography>
            <Tooltip title="Close tab">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  dispatch({ type: 'CLOSE_TAB', tabId: tab.id })
                }}
                sx={{ p: 0.25, '& svg': { fontSize: 14 } }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )
      })}
    </Box>
  )
}
