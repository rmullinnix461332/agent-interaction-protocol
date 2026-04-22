import type { Flow, Step } from '../model/flow'
import type { MockScenario, StepTrace, ExecutionTrace, StepStatus } from '../model/mock'

type StepCallback = (stepId: string, status: StepStatus, trace?: Partial<StepTrace>) => void
type AwaitCallback = (stepId: string) => Promise<void>

/** Resolve effective dependencies including fanOut/fanIn */
function resolveDeps(flow: Flow): Map<string, string[]> {
  const stepMap = new Map(flow.steps.map((s) => [s.id, s]))
  const deps = new Map<string, string[]>()
  for (const s of flow.steps) {
    const resolved: string[] = []
    for (const dep of s.dependsOn || []) {
      const depStep = stepMap.get(dep)
      if (depStep?.type === 'fanOut' && s.type === 'fanIn') {
        resolved.push(...(depStep.steps || []))
      } else {
        resolved.push(dep)
      }
    }
    deps.set(s.id, resolved)
  }
  for (const s of flow.steps) {
    if (s.type === 'fanOut') {
      for (const childId of s.steps || []) {
        const existing = deps.get(childId) || []
        deps.set(childId, [...existing, s.id])
      }
    }
  }
  return deps
}

/** Topological sort into parallel stages */
function topoSort(flow: Flow): string[][] {
  const deps = resolveDeps(flow)
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const s of flow.steps) {
    if (!inDegree.has(s.id)) inDegree.set(s.id, 0)
    for (const dep of deps.get(s.id) || []) {
      inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1)
      const d = dependents.get(dep) || []
      d.push(s.id)
      dependents.set(dep, d)
    }
  }

  const stages: string[][] = []
  while (inDegree.size > 0) {
    const ready: string[] = []
    for (const [id, deg] of inDegree) {
      if (deg === 0) ready.push(id)
    }
    if (ready.length === 0) throw new Error('Cycle detected')
    stages.push(ready)
    for (const id of ready) {
      inDegree.delete(id)
      for (const dep of dependents.get(id) || []) {
        inDegree.set(dep, (inDegree.get(dep) || 0) - 1)
      }
    }
  }
  return stages
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class FlowEngine {
  private flow: Flow
  private scenario: MockScenario
  private onStep: StepCallback
  private onAwait: AwaitCallback
  private artifacts: Record<string, unknown> = {}
  private stepResults: Map<string, StepTrace> = new Map()
  private aborted = false
  private paused = false
  private pauseResolve: (() => void) | null = null

  constructor(
    flow: Flow,
    scenario: MockScenario,
    onStep: StepCallback,
    onAwait: AwaitCallback,
  ) {
    this.flow = flow
    this.scenario = scenario
    this.onStep = onStep
    this.onAwait = onAwait
  }

  abort() { this.aborted = true; if (this.pauseResolve) this.pauseResolve() }

  pause() { this.paused = true }

  resume() {
    this.paused = false
    if (this.pauseResolve) { this.pauseResolve(); this.pauseResolve = null }
  }

  private async waitIfPaused() {
    if (this.paused) {
      await new Promise<void>((r) => { this.pauseResolve = r })
    }
  }

  async run(): Promise<ExecutionTrace> {
    const stages = topoSort(this.flow)
    const stepMap = new Map(this.flow.steps.map((s) => [s.id, s]))
    const trace: ExecutionTrace = {
      id: `run-${Date.now()}`,
      scenarioName: this.scenario.name,
      startTime: Date.now(),
      steps: [],
      artifacts: {},
      status: 'running',
    }

    for (const stage of stages) {
      if (this.aborted) break
      await this.waitIfPaused()

      // Execute all steps in stage in parallel
      const promises = stage.map((stepId) => this.executeStep(stepMap.get(stepId)!, trace))
      await Promise.all(promises)
    }

    trace.endTime = Date.now()
    trace.artifacts = { ...this.artifacts }
    trace.status = this.aborted ? 'failed' : (trace.steps.some((s) => s.status === 'failure') ? 'failed' : 'completed')
    return trace
  }

  /** Step through one stage at a time */
  async stepThrough(): Promise<{ stages: string[][]; executeStage: (index: number) => Promise<void>; getTrace: () => ExecutionTrace }> {
    const stages = topoSort(this.flow)
    const stepMap = new Map(this.flow.steps.map((s) => [s.id, s]))
    const trace: ExecutionTrace = {
      id: `run-${Date.now()}`,
      scenarioName: this.scenario.name,
      startTime: Date.now(),
      steps: [],
      artifacts: {},
      status: 'running',
    }

    return {
      stages,
      executeStage: async (index: number) => {
        const stage = stages[index]
        if (!stage) return
        const promises = stage.map((stepId) => this.executeStep(stepMap.get(stepId)!, trace))
        await Promise.all(promises)
      },
      getTrace: () => ({ ...trace, artifacts: { ...this.artifacts } }),
    }
  }

  private async executeStep(step: Step, trace: ExecutionTrace): Promise<void> {
    if (this.aborted) return

    const st: StepTrace = {
      stepId: step.id,
      status: 'running',
      startTime: Date.now(),
      inputs: {},
      outputs: {},
    }
    this.onStep(step.id, 'running', st)

    try {
      // Gather inputs
      for (const ref of step.consumes || []) {
        if (this.artifacts[ref] !== undefined) {
          st.inputs[ref] = this.artifacts[ref]
        }
      }

      // Execute based on type
      switch (step.type) {
        case 'action':
          await this.executeAction(step, st)
          break
        case 'fanOut':
          st.status = 'success' // fanOut itself just gates children
          break
        case 'fanIn':
          await this.executeFanIn(step, st)
          break
        case 'decision':
          await this.executeDecision(step, st)
          break
        case 'await':
          await this.executeAwait(step, st)
          break
        case 'exit':
          st.status = (step.exit?.status === 'failure') ? 'failure' : 'success'
          break
      }

      // Handle iteration
      if (step.iteration && st.status === 'success') {
        await this.executeIteration(step, st)
      }
    } catch (err: any) {
      st.status = 'failure'
      st.error = err.message
    }

    st.endTime = Date.now()
    st.duration = st.endTime - st.startTime
    trace.steps.push(st)
    this.stepResults.set(step.id, st)
    this.onStep(step.id, st.status, st)
  }

  private async executeAction(step: Step, st: StepTrace) {
    const mock = this.scenario.participants[step.participantRef || '']
    if (!mock) {
      // Default pass-through
      st.status = 'success'
      st.mockUsed = 'default-passthrough'
      for (const ref of step.produces || []) {
        this.artifacts[ref] = { mock: true, stepId: step.id }
        st.outputs[ref] = this.artifacts[ref]
      }
      return
    }

    // Find matching response
    const response = mock.responses.find((r) => r.match === 'default') || mock.responses[0]
    if (!response) { st.status = 'success'; return }

    st.mockUsed = mock.participantId

    if (response.delay) await delay(response.delay)

    st.status = response.status
    if (response.outputs) {
      for (const [ref, data] of Object.entries(response.outputs)) {
        this.artifacts[ref] = data.content
        st.outputs[ref] = data.content
      }
    } else {
      for (const ref of step.produces || []) {
        this.artifacts[ref] = { mock: true, participant: mock.participantId }
        st.outputs[ref] = this.artifacts[ref]
      }
    }
  }

  private async executeFanIn(step: Step, st: StepTrace) {
    const opMock = this.scenario.operators[step.id]
    st.status = 'success'
    st.mockUsed = opMock ? `operator:${opMock.type}` : 'default-fanin'
  }

  private async executeDecision(step: Step, st: StepTrace) {
    // Pick first case or default
    const cases = step.decision?.cases || []
    if (cases.length > 0) {
      st.decisionBranch = cases[0].next.nextStep || cases[0].next.nextSteps?.[0] || 'unknown'
    } else if (step.decision?.default) {
      st.decisionBranch = step.decision.default.nextStep || 'default'
    }
    st.status = 'success'
  }

  private async executeAwait(step: Step, st: StepTrace) {
    this.onStep(step.id, 'awaiting', st)
    await this.onAwait(step.id)
    st.status = 'success'
    // Produce mock input artifact
    if (step.awaitInput?.ref) {
      this.artifacts[step.awaitInput.ref] = { mock: true, awaited: true }
      st.outputs[step.awaitInput.ref] = this.artifacts[step.awaitInput.ref]
    }
  }

  private async executeIteration(step: Step, st: StepTrace) {
    const max = step.iteration?.maxIterations || 3
    st.iterationCount = 0
    for (let i = 0; i < max; i++) {
      if (this.aborted) break
      st.iterationCount = i + 1
      this.onStep(step.id, 'iterating', { ...st, iterationCount: i + 1 })
      await delay(200) // Simulate iteration work
    }
  }
}
