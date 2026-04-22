import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  yamlProposal?: string // If the assistant proposed YAML changes
  applied?: boolean     // Whether the proposal was applied
}

export interface ChatState {
  messages: ChatMessage[]
  loading: boolean
  error: string | null
}

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
}

type ChatAction =
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'UPDATE_LAST_ASSISTANT'; content: string; yamlProposal?: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'MARK_APPLIED'; messageId: string }
  | { type: 'CLEAR' }

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message], error: null }
    case 'UPDATE_LAST_ASSISTANT': {
      const msgs = [...state.messages]
      const last = msgs[msgs.length - 1]
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = {
          ...last,
          content: action.content,
          yamlProposal: action.yamlProposal ?? last.yamlProposal,
        }
      }
      return { ...state, messages: msgs }
    }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }
    case 'MARK_APPLIED': {
      const msgs = state.messages.map((m) =>
        m.id === action.messageId ? { ...m, applied: true } : m
      )
      return { ...state, messages: msgs }
    }
    case 'CLEAR':
      return initialState
    default:
      return state
  }
}

const ChatStateContext = createContext<ChatState>(initialState)
const ChatDispatchContext = createContext<Dispatch<ChatAction>>(() => {})

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState)
  return (
    <ChatStateContext.Provider value={state}>
      <ChatDispatchContext.Provider value={dispatch}>
        {children}
      </ChatDispatchContext.Provider>
    </ChatStateContext.Provider>
  )
}

export function useChatState() {
  return useContext(ChatStateContext)
}

export function useChatDispatch() {
  return useContext(ChatDispatchContext)
}
