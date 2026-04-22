// TypeScript types mirroring aip-core.json.schema

export interface Flow {
  apiVersion: string
  kind: 'Flow'
  metadata: Metadata
  participants: Participant[]
  artifacts: Artifact[]
  steps: Step[]
  providerBinding?: Record<string, unknown>
}

export interface Metadata {
  name: string
  title?: string
  version?: string
  description?: string
  labels?: Record<string, string>
}

export interface Participant {
  id: string
  kind: 'agent' | 'service' | 'human' | 'subflow'
  title?: string
  description?: string
  flowRef?: string
  version?: string
  capabilities?: string[]
  constraints?: Record<string, unknown>
}

export interface Artifact {
  ref: string
  contentType?: string
  contractRef?: string
  title?: string
  description?: string
  producer?: string
  consumers?: string[]
  required?: boolean
  metadata?: Record<string, unknown>
}

export type StepType = 'action' | 'fanOut' | 'fanIn' | 'decision' | 'await' | 'exit'

export interface Step {
  id: string
  type: StepType
  title?: string
  description?: string
  participantRef?: string
  dependsOn?: string[]
  consumes?: string[]
  produces?: string[]
  steps?: string[]
  condition?: 'allSuccess' | 'anySuccess' | 'allComplete'
  operator?: Operator
  decision?: Decision
  iteration?: Iteration
  awaitInput?: AwaitInput
  exit?: Exit
  extensions?: Record<string, unknown>
}

export interface Operator {
  type: 'summarize' | 'rank' | 'merge' | 'filter' | 'await'
  mode?: string
  criteriaRef?: string
  topN?: number
  config?: Record<string, unknown>
}

export interface Decision {
  cases: DecisionCase[]
  default?: DecisionNext
}

export interface DecisionCase {
  when: Record<string, unknown>
  next: DecisionNext
}

export interface DecisionNext {
  nextStep?: string
  nextSteps?: string[]
}

export interface Iteration {
  mode: 'forEach' | 'while' | 'bounded'
  collectionRef?: string
  condition?: Record<string, unknown>
  strategy?: 'serial' | 'parallel'
  outputMode?: 'append' | 'replace' | 'merge'
  onItemFailure?: 'stop' | 'continue' | 'collect'
  maxIterations?: number
  timeout?: string
  scope?: { type: 'step' | 'subflow'; ref: string }
}

export interface AwaitInput {
  ref: string
  contentType?: string
  contractRef?: string
  sourceParticipantRef?: string
  description?: string
}

export interface Exit {
  status: 'success' | 'failure' | 'cancelled' | 'blocked'
  code?: string
  message?: string
}
