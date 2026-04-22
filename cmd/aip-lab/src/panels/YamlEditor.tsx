import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Typography, Alert } from '@mui/material'
import { useFlowState, useFlowDispatch } from '../store/flow-context'
import { serializeFlow, parseFlow } from '../yaml/parser'

/**
 * YAML editor with bidirectional sync to the flow state.
 * Uses a plain textarea — Monaco can be swapped in later
 * without changing the sync logic.
 */
export default function YamlEditor() {
  const { flow } = useFlowState()
  const dispatch = useFlowDispatch()
  const [localYaml, setLocalYaml] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFlowRef = useRef<string>('')
  const editingRef = useRef(false)

  // Flow -> YAML: update local text when flow changes externally
  useEffect(() => {
    if (!flow) {
      setLocalYaml('')
      return
    }
    if (editingRef.current) return

    const yaml = serializeFlow(flow)
    if (yaml !== lastFlowRef.current) {
      lastFlowRef.current = yaml
      setLocalYaml(yaml)
      setParseError(null)
    }
  }, [flow])

  // YAML -> Flow: debounced parse on text change
  const handleChange = useCallback((value: string) => {
    setLocalYaml(value)
    editingRef.current = true

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      editingRef.current = false
      try {
        const parsed = parseFlow(value)
        const reserialized = serializeFlow(parsed)
        if (reserialized !== lastFlowRef.current) {
          lastFlowRef.current = reserialized
          setParseError(null)
          dispatch({ type: 'UPDATE_FLOW', flow: parsed })
        } else {
          setParseError(null)
        }
      } catch (err: any) {
        setParseError(err.message)
      }
    }, 600)
  }, [dispatch])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Ctrl+Shift+F to format
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
      e.preventDefault()
      try {
        const parsed = parseFlow(localYaml)
        const formatted = serializeFlow(parsed)
        setLocalYaml(formatted)
        lastFlowRef.current = formatted
        setParseError(null)
        dispatch({ type: 'UPDATE_FLOW', flow: parsed })
      } catch (err: any) {
        setParseError(err.message)
      }
    }
  }, [localYaml, dispatch])

  if (!flow) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography color="text.secondary">No flow loaded</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 1.5, py: 0.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" fontWeight={600}>YAML</Typography>
        <Typography variant="caption" color="text.secondary">
          {parseError ? 'Parse error' : 'Synced'} &middot; Cmd+Shift+F to format
        </Typography>
      </Box>
      {parseError && (
        <Alert severity="error" sx={{ borderRadius: 0, py: 0 }}>
          <Typography variant="caption">{parseError}</Typography>
        </Alert>
      )}
      <Box
        component="textarea"
        value={localYaml}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        sx={{
          flex: 1,
          resize: 'none',
          border: 'none',
          outline: 'none',
          p: 1.5,
          fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
          fontSize: 12,
          lineHeight: 1.6,
          bgcolor: 'background.default',
          color: 'text.primary',
          overflow: 'auto',
          tabSize: 2,
          whiteSpace: 'pre',
        }}
      />
    </Box>
  )
}
