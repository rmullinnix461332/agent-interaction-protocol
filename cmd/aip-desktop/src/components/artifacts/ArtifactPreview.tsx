import { Box, Typography } from '@mui/material'
import type { RuntimeArtifact } from '@/api/types'

interface ArtifactPreviewProps {
  artifact: RuntimeArtifact
}

export function ArtifactPreview({ artifact }: ArtifactPreviewProps) {
  const decoded = decodeContent(artifact.content)

  if (!decoded) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        No content available (stored at {artifact.contentPath || 'unknown path'})
      </Typography>
    )
  }

  const contentType = artifact.contentType || ''

  // JSON preview
  if (contentType.includes('json') || looksLikeJSON(decoded)) {
    return <JsonPreview content={decoded} />
  }

  // Markdown preview (render as preformatted text for now)
  if (contentType.includes('markdown')) {
    return <TextPreview content={decoded} />
  }

  // Plain text / fallback
  return <TextPreview content={decoded} />
}

function JsonPreview({ content }: { content: string }) {
  let formatted: string
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    formatted = content
  }

  return (
    <Box
      component="pre"
      sx={{
        bgcolor: 'background.default',
        p: 1.5,
        borderRadius: 1,
        overflow: 'auto',
        maxHeight: 300,
        fontSize: 12,
        fontFamily: 'monospace',
        m: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {formatted}
    </Box>
  )
}

function TextPreview({ content }: { content: string }) {
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: 'background.default',
        p: 1.5,
        borderRadius: 1,
        overflow: 'auto',
        maxHeight: 300,
        fontSize: 12,
        fontFamily: 'monospace',
        m: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {content}
    </Box>
  )
}

function decodeContent(content?: string): string | null {
  if (!content) return null
  try {
    return atob(content)
  } catch {
    // Not base64, return as-is
    return content
  }
}

function looksLikeJSON(s: string): boolean {
  const trimmed = s.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'))
}
