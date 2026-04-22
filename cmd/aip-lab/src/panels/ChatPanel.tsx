import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Box, TextField, IconButton, Typography, Paper, Button, CircularProgress, Alert,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useChatState, useChatDispatch, type ChatMessage } from '@/store/chat-context'
import { useFlowState, useFlowDispatch } from '@/store/flow-context'
import { useUIState } from '@/store/ui-context'
import { buildSystemPrompt, extractYaml } from '@/chat/prompt'
import { parseFlow } from '@/yaml/parser'

let msgCounter = 0

export default function ChatPanel() {
  const chatState = useChatState()
  const chatDispatch = useChatDispatch()
  const { flow } = useFlowState()
  const flowDispatch = useFlowDispatch()
  const { selectedNodeId } = useUIState()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatState.messages])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || chatState.loading) return

    setInput('')
    msgCounter++

    // Add user message
    const userMsg: ChatMessage = {
      id: `msg-${msgCounter}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    chatDispatch({ type: 'ADD_MESSAGE', message: userMsg })

    // Add placeholder assistant message
    msgCounter++
    const assistantMsg: ChatMessage = {
      id: `msg-${msgCounter}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    chatDispatch({ type: 'ADD_MESSAGE', message: assistantMsg })
    chatDispatch({ type: 'SET_LOADING', loading: true })

    try {
      const systemPrompt = buildSystemPrompt(flow, selectedNodeId)
      const history = chatState.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))

      const result = await window.electronAPI?.llmChat({
        systemPrompt,
        messages: [...history, { role: 'user', content: text }],
      })

      if (result?.error) {
        chatDispatch({ type: 'SET_ERROR', error: result.error })
        chatDispatch({ type: 'UPDATE_LAST_ASSISTANT', content: `Error: ${result.error}` })
        return
      }

      const content = result?.choices?.[0]?.message?.content || 'No response'
      const yamlProposal = extractYaml(content)

      chatDispatch({
        type: 'UPDATE_LAST_ASSISTANT',
        content,
        yamlProposal: yamlProposal || undefined,
      })
    } catch (err: any) {
      chatDispatch({ type: 'SET_ERROR', error: err.message })
      chatDispatch({ type: 'UPDATE_LAST_ASSISTANT', content: `Error: ${err.message}` })
    } finally {
      chatDispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [input, chatState, chatDispatch, flow, selectedNodeId])

  const applyYaml = useCallback((msg: ChatMessage) => {
    if (!msg.yamlProposal) return
    try {
      const newFlow = parseFlow(msg.yamlProposal)
      flowDispatch({ type: 'UPDATE_FLOW', flow: newFlow })
      chatDispatch({ type: 'MARK_APPLIED', messageId: msg.id })
    } catch (err: any) {
      chatDispatch({ type: 'SET_ERROR', error: `Failed to parse YAML: ${err.message}` })
    }
  }, [flowDispatch, chatDispatch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" fontWeight={600}>AI Chat</Typography>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1, py: 0.5 }}>
        {chatState.messages.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Ask me to create or modify a flow...
          </Typography>
        )}
        {chatState.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onApply={() => applyYaml(msg)} />
        ))}
        {chatState.loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
            <CircularProgress size={16} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {chatState.error && (
        <Alert severity="error" sx={{ mx: 1, mb: 0.5 }} onClose={() => chatDispatch({ type: 'SET_ERROR', error: null })}>
          <Typography variant="caption">{chatState.error}</Typography>
        </Alert>
      )}

      {/* Input */}
      <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 0.5 }}>
        <TextField
          size="small"
          fullWidth
          multiline
          maxRows={3}
          placeholder="Describe a flow..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={chatState.loading}
          sx={{ '& .MuiInputBase-root': { fontSize: 12 } }}
        />
        <IconButton size="small" onClick={sendMessage} disabled={!input.trim() || chatState.loading} color="primary">
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}

function MessageBubble({ message, onApply }: { message: ChatMessage; onApply: () => void }) {
  const isUser = message.role === 'user'

  return (
    <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <Paper
        elevation={0}
        sx={{
          px: 1.5, py: 1,
          maxWidth: '95%',
          bgcolor: isUser ? 'primary.main' : 'grey.100',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          borderRadius: 2,
        }}
      >
        <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block', lineHeight: 1.4 }}>
          {message.content || '...'}
        </Typography>
      </Paper>

      {/* Apply YAML button */}
      {message.yamlProposal && !message.applied && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<CheckIcon />}
          onClick={onApply}
          sx={{ mt: 0.5, fontSize: 10, py: 0.25 }}
        >
          Apply to flow
        </Button>
      )}
      {message.applied && (
        <Typography variant="caption" color="success.main" sx={{ mt: 0.25, fontSize: 10 }}>
          ✓ Applied
        </Typography>
      )}
    </Box>
  )
}
