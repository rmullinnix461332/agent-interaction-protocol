import { useState } from 'react'
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Collapse, Box,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import DownloadIcon from '@mui/icons-material/Download'
import type { RuntimeArtifact } from '@/api/types'
import { ArtifactPreview } from './ArtifactPreview'

interface ArtifactListProps {
  artifacts: RuntimeArtifact[]
}

export function ArtifactList({ artifacts }: ArtifactListProps) {
  const [expandedRef, setExpandedRef] = useState<string | null>(null)

  const handleExport = (artifact: RuntimeArtifact) => {
    const content = decodeContent(artifact.content)
    if (!content) return
    const blob = new Blob([content], { type: artifact.contentType || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = refToFilename(artifact.ref)
    a.click()
    URL.revokeObjectURL(url)
  }

  if (artifacts.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Box sx={{ color: 'text.secondary' }}>No artifacts</Box>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell width={40} />
            <TableCell>Ref</TableCell>
            <TableCell>Step</TableCell>
            <TableCell>Content Type</TableCell>
            <TableCell>Size</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {artifacts.map(art => {
            const isExpanded = expandedRef === art.ref
            return (
              <>
                <TableRow key={art.ref} hover>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => setExpandedRef(isExpanded ? null : art.ref)}
                    >
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>{art.ref}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{art.stepId || '—'}</TableCell>
                  <TableCell>{art.contentType || '—'}</TableCell>
                  <TableCell>{formatSize(art.size)}</TableCell>
                  <TableCell>{new Date(art.createdAt).toLocaleTimeString()}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Export">
                      <IconButton size="small" onClick={() => handleExport(art)}>
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow key={art.ref + '-preview'}>
                  <TableCell colSpan={7} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                    <Collapse in={isExpanded}>
                      <Box sx={{ py: 1 }}>
                        <ArtifactPreview artifact={art} />
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function decodeContent(content?: string): string | null {
  if (!content) return null
  try {
    return atob(content)
  } catch {
    return content
  }
}

function refToFilename(ref: string): string {
  return ref.replace(/^aip:\/\//, '').replace(/\//g, '_') + '.json'
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
