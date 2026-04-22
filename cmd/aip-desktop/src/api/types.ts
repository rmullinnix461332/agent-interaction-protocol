// Engine config (mirrors electron/config-store.ts)
export interface EngineConfig {
  id: string
  name: string
  endpoint: string
  type: 'local' | 'remote'
}

// API response types (mirrors aip-engine handler types)

export interface HealthResponse {
  status: string
  uptime: string
  version: string
}

export interface InfoResponse {
  name: string
  version: string
  type: string
  uptime: string
  startedAt: string
}

export interface CapabilitiesResponse {
  await: boolean
  subflows: boolean
  iteration: boolean
  operators: string[]
  mockScenarios: boolean
  artifactPreview: boolean
}

export interface FlowSummary {
  id: string
  name: string
  title?: string
  version?: string
  status: string
  installedAt: string
  lastRunAt?: string
  runCount: number
}

export interface FlowListResponse {
  flows: FlowSummary[]
}

export interface RunSummary {
  id: string
  flowId: string
  flowName: string
  status: string
  startedAt: string
  completedAt?: string
  duration?: string
}

export interface RunListResponse {
  runs: RunSummary[]
}

export interface Run {
  id: string
  flowId: string
  flowName: string
  status: string
  startedAt: string
  completedAt?: string
  currentStep?: string
  awaitState?: {
    stepId: string
    awaitInputRef: string
  }
  stepStatuses: Record<string, {
    status: string
    startedAt?: string
    completedAt?: string
    error?: string
  }>
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
}

export interface StartRunResponse {
  runId: string
  flowId: string
  status: string
  startedAt: string
}

export interface ConnectedFlow {
  apiVersion: string
  kind: string
  metadata: { name: string; title?: string; version?: string; description?: string }
  participants: { id: string; kind: string; title?: string }[]
  artifacts: { ref: string; title?: string; contentType?: string }[]
  steps: { id: string; type: string; participantRef?: string; dependsOn?: string[] }[]
  installedAt: string
  lastRunAt?: string
  runCount: number
  status: string
}

export interface DiagnosticsResponse {
  engine: {
    status: string
    uptime: string
    goroutines: number
    memAllocMB: number
  }
  flows: number
  runs: number
  activeRuns: number
  awaitingRuns: number
  failedRuns: number
  completedRuns: number
  recentErrors?: {
    runId: string
    flowId: string
    error: string
    occurredAt?: string
  }[]
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface Event {
  id: string
  runId: string
  type: string
  stepId?: string
  timestamp: string
  message?: string
  data?: Record<string, unknown>
}

export interface EventListResponse {
  runId: string
  events: Event[]
}

export interface RuntimeArtifact {
  ref: string
  contentType?: string
  title?: string
  description?: string
  runId: string
  stepId?: string
  content?: string  // base64 encoded
  contentPath?: string
  createdAt: string
  size: number
}

export interface ArtifactListResponse {
  runId: string
  artifacts: RuntimeArtifact[]
}

export interface LogEntry {
  timestamp: string
  level: string
  runId?: string
  stepId?: string
  message: string
  fields?: Record<string, unknown>
}

export interface LogsResponse {
  logs: LogEntry[]
  offset: number
  limit: number
  total: number
  hasMore: boolean
}

export interface ParticipantBinding {
  participantRef: string
  providerTarget: string
  config?: Record<string, unknown>
}

export interface ParticipantListResponse {
  participants: ParticipantBinding[] | null
}

// Aggregate engine state used by the UI
export interface EngineStatus {
  config: EngineConfig
  online: boolean
  health?: HealthResponse
  info?: InfoResponse
  capabilities?: CapabilitiesResponse
  lastChecked: number
  error?: string
}
