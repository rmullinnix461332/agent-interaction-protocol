import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { MockScenario, ExecutionTrace, StepStatus } from '../model/mock'

export interface LabState {
  scenario: MockScenario | null
  trace: ExecutionTrace | null
  nodeStates: Record<string, StepStatus>
  running: boolean
  paused: boolean
  awaitingStepId: string | null
}

const initialState: LabState = {
  scenario: null,
  trace: null,
  nodeStates: {},
  running: false,
  paused: false,
  awaitingStepId: null,
}

type LabAction =
  | { type: 'SET_SCENARIO'; scenario: MockScenario }
  | { type: 'START_RUN' }
  | { type: 'STOP_RUN' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SET_NODE_STATE'; stepId: string; status: StepStatus }
  | { type: 'SET_TRACE'; trace: ExecutionTrace }
  | { type: 'SET_AWAITING'; stepId: string | null }
  | { type: 'RESET' }

function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case 'SET_SCENARIO':
      return { ...state, scenario: action.scenario }
    case 'START_RUN':
      return { ...state, running: true, paused: false, nodeStates: {}, trace: null, awaitingStepId: null }
    case 'STOP_RUN':
      return { ...state, running: false, paused: false, awaitingStepId: null }
    case 'PAUSE':
      return { ...state, paused: true }
    case 'RESUME':
      return { ...state, paused: false }
    case 'SET_NODE_STATE':
      return { ...state, nodeStates: { ...state.nodeStates, [action.stepId]: action.status } }
    case 'SET_TRACE':
      return { ...state, trace: action.trace, running: false }
    case 'SET_AWAITING':
      return { ...state, awaitingStepId: action.stepId }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const LabStateContext = createContext<LabState>(initialState)
const LabDispatchContext = createContext<Dispatch<LabAction>>(() => {})

export function LabProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(labReducer, initialState)
  return (
    <LabStateContext.Provider value={state}>
      <LabDispatchContext.Provider value={dispatch}>
        {children}
      </LabDispatchContext.Provider>
    </LabStateContext.Provider>
  )
}

export function useLabState() { return useContext(LabStateContext) }
export function useLabDispatch() { return useContext(LabDispatchContext) }
