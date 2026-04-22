export interface MockResponse {
  match: 'default' | Record<string, unknown>
  status: 'success' | 'failure'
  delay?: number // ms
  outputs?: Record<string, { contentType?: string; content: unknown }>
}

export interface ParticipantMock {
  participantId: string
  kind?: 'agent' | 'service' | 'human'
  responses: MockResponse[]
}

export interface OperatorMock {
  type: string
  behavior: 'concatenate' | 'pass-through' | 'first' | 'reverse'
}

export interface MockScenario {
  name: string
  participants: Record<string, ParticipantMock>
  operators: Record<string, OperatorMock>
}

export type StepStatus = 'pending' | 'running' | 'success' | 'failure' | 'awaiting' | 'iterating' | 'skipped'

export interface StepTrace {
  stepId: string
  status: StepStatus
  startTime: number
  endTime?: number
  duration?: number
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  mockUsed?: string
  iterationCount?: number
  decisionBranch?: string
  error?: string
}

export interface ExecutionTrace {
  id: string
  scenarioName: string
  startTime: number
  endTime?: number
  steps: StepTrace[]
  artifacts: Record<string, unknown>
  status: 'running' | 'completed' | 'failed' | 'paused'
}
