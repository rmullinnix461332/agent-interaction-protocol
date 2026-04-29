import { useState } from 'react'
import { Box, Typography, IconButton, Collapse } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'

const gitColors: Record<string, string> = {
  added: '#4caf50',
  modified: '#ff9800',
  deleted: '#f44336',
  untracked: '#9e9e9e',
}

interface FileTreeProps {
  nodes: FileTreeNode[]
  onFileClick: (filePath: string) => void
  activeFilePath?: string | null
  indent?: number
}

export default function FileTree({ nodes, onFileClick, activeFilePath, indent = 0 }: FileTreeProps) {
  return (
    <Box>
      {nodes.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          onFileClick={onFileClick}
          activeFilePath={activeFilePath}
          indent={indent}
        />
      ))}
    </Box>
  )
}

function FileTreeItem({ node, onFileClick, activeFilePath, indent }: {
  node: FileTreeNode
  onFileClick: (filePath: string) => void
  activeFilePath?: string | null
  indent: number
}) {
  const [expanded, setExpanded] = useState(indent < 1) // Auto-expand first level
  const isActive = node.path === activeFilePath
  const isYaml = /\.ya?ml$/i.test(node.name)
  const gitColor = node.gitStatus ? gitColors[node.gitStatus] : undefined

  if (node.type === 'directory') {
    return (
      <Box>
        <Box
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            pl: indent * 1.5 + 0.5,
            pr: 1,
            py: 0.25,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            borderRadius: 0.5,
          }}
        >
          {expanded ? (
            <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.25 }} />
          ) : (
            <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.25 }} />
          )}
          {expanded ? (
            <FolderOpenOutlinedIcon sx={{ fontSize: 16, color: gitColor || '#90a4ae', mr: 0.75 }} />
          ) : (
            <FolderOutlinedIcon sx={{ fontSize: 16, color: gitColor || '#90a4ae', mr: 0.75 }} />
          )}
          <Typography
            variant="body2"
            noWrap
            sx={{ fontSize: 13, fontWeight: 500, color: gitColor || 'text.primary' }}
          >
            {node.name}
          </Typography>
        </Box>
        <Collapse in={expanded}>
          {node.children && (
            <FileTree
              nodes={node.children}
              onFileClick={onFileClick}
              activeFilePath={activeFilePath}
              indent={indent + 1}
            />
          )}
        </Collapse>
      </Box>
    )
  }

  // File
  return (
    <Box
      onClick={() => onFileClick(node.path)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        pl: indent * 1.5 + 2.5,
        pr: 1,
        py: 0.25,
        cursor: 'pointer',
        bgcolor: isActive ? 'action.selected' : undefined,
        '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
        borderRadius: 0.5,
      }}
    >
      {isYaml ? (
        <DescriptionOutlinedIcon sx={{ fontSize: 16, color: gitColor || '#42a5f5', mr: 0.75 }} />
      ) : (
        <InsertDriveFileOutlinedIcon sx={{ fontSize: 16, color: gitColor || '#78909c', mr: 0.75 }} />
      )}
      <Typography
        variant="body2"
        noWrap
        sx={{
          fontSize: 13,
          color: gitColor || 'text.primary',
          fontWeight: isActive ? 600 : 400,
        }}
      >
        {node.name}
      </Typography>
      {node.gitStatus && (
        <Typography
          variant="caption"
          sx={{ ml: 'auto', fontSize: 10, color: gitColor, fontWeight: 600 }}
        >
          {node.gitStatus === 'added' ? 'A' : node.gitStatus === 'modified' ? 'M' : node.gitStatus === 'deleted' ? 'D' : 'U'}
        </Typography>
      )}
    </Box>
  )
}
