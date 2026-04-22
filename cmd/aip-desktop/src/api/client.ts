import type {
  HealthResponse,
  InfoResponse,
  CapabilitiesResponse,
  FlowListResponse,
  FlowSummary,
  ConnectedFlow,
  RunListResponse,
  Run,
  StartRunResponse,
  DiagnosticsResponse,
  EventListResponse,
  ArtifactListResponse,
  LogsResponse,
  ParticipantListResponse,
} from './types'

export class EngineClient {
  private baseUrl: string

  constructor(endpoint: string) {
    this.baseUrl = endpoint.replace(/\/+$/, '') + '/api/v1/admin'
  }

  // Identity
  async health(): Promise<HealthResponse> {
    return this.get('/health')
  }

  async info(): Promise<InfoResponse> {
    return this.get('/info')
  }

  async capabilities(): Promise<CapabilitiesResponse> {
    return this.get('/capabilities')
  }

  // Flows
  async listFlows(): Promise<FlowListResponse> {
    return this.get('/flows')
  }

  async getFlow(flowId: string): Promise<ConnectedFlow> {
    return this.get(`/flows/${encodeURIComponent(flowId)}`)
  }

  async connectFlow(flow: unknown): Promise<FlowSummary> {
    return this.post('/flows', { flow })
  }

  async disconnectFlow(flowId: string): Promise<void> {
    await this.del(`/flows/${encodeURIComponent(flowId)}`)
  }

  // Runs
  async listRuns(filter?: { flowId?: string; status?: string }): Promise<RunListResponse> {
    const params = new URLSearchParams()
    if (filter?.flowId) params.set('flowId', filter.flowId)
    if (filter?.status) params.set('status', filter.status)
    const qs = params.toString()
    return this.get('/runs' + (qs ? '?' + qs : ''))
  }

  async getRun(runId: string): Promise<Run> {
    return this.get(`/runs/${encodeURIComponent(runId)}`)
  }

  async startRun(flowId: string, input?: Record<string, unknown>): Promise<StartRunResponse> {
    return this.post(`/runs/${encodeURIComponent(flowId)}/start`, { input })
  }

  async stopRun(runId: string): Promise<void> {
    await this.post(`/runs/${encodeURIComponent(runId)}/stop`, {})
  }

  async resumeRun(runId: string, payload: { ref: string; contentType?: string; value?: unknown }): Promise<void> {
    await this.post(`/runs/${encodeURIComponent(runId)}/resume`, payload)
  }

  // Events
  async runEvents(runId: string): Promise<EventListResponse> {
    return this.get(`/runs/${encodeURIComponent(runId)}/events`)
  }

  // Artifacts
  async listArtifacts(runId: string): Promise<ArtifactListResponse> {
    return this.get(`/runs/${encodeURIComponent(runId)}/artifacts`)
  }

  // Diagnostics
  async diagnostics(): Promise<DiagnosticsResponse> {
    return this.get('/diagnostics')
  }

  async logs(query?: { runId?: string; level?: string; offset?: number; limit?: number }): Promise<LogsResponse> {
    const params = new URLSearchParams()
    if (query?.runId) params.set('runId', query.runId)
    if (query?.level) params.set('level', query.level)
    if (query?.offset !== undefined) params.set('offset', String(query.offset))
    if (query?.limit !== undefined) params.set('limit', String(query.limit))
    const qs = params.toString()
    return this.get('/logs' + (qs ? '?' + qs : ''))
  }

  // Participants
  async listParticipants(): Promise<ParticipantListResponse> {
    return this.get('/participants')
  }

  // HTTP helpers
  private async get<T>(path: string): Promise<T> {
    const response = await fetch(this.baseUrl + path)
    if (!response.ok) {
      const body = await response.text()
      throw new Error(`${response.status}: ${body}`)
    }
    return response.json()
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(this.baseUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`${response.status}: ${text}`)
    }
    if (response.status === 204) return undefined as T
    return response.json()
  }

  private async del(path: string): Promise<void> {
    const response = await fetch(this.baseUrl + path, { method: 'DELETE' })
    if (!response.ok && response.status !== 204) {
      const body = await response.text()
      throw new Error(`${response.status}: ${body}`)
    }
  }
}
