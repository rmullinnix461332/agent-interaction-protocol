import type { Flow } from '../model/flow'
import type { MockScenario, ParticipantMock } from '../model/mock'

/** Generate a happy-path mock scenario from a flow */
export function generateHappyPath(flow: Flow): MockScenario {
  const participants: Record<string, ParticipantMock> = {}

  for (const p of flow.participants) {
    if (p.kind === 'subflow') continue
    const outputs: Record<string, { contentType?: string; content: unknown }> = {}

    // Find artifacts this participant produces
    for (const a of flow.artifacts) {
      if (a.producer === p.id) {
        outputs[a.ref] = {
          contentType: a.contentType || 'text/markdown',
          content: `Mock output from ${p.title || p.id}`,
        }
      }
    }

    participants[p.id] = {
      participantId: p.id,
      kind: p.kind === 'human' ? 'human' : p.kind === 'service' ? 'service' : 'agent',
      responses: [{
        match: 'default',
        status: 'success',
        delay: 300,
        outputs: Object.keys(outputs).length > 0 ? outputs : undefined,
      }],
    }
  }

  return {
    name: 'Happy Path',
    participants,
    operators: {},
  }
}

/** Generate a failure-injection scenario */
export function generateFailureScenario(flow: Flow, failureRate = 0.3): MockScenario {
  const happy = generateHappyPath(flow)
  const ids = Object.keys(happy.participants)
  const failCount = Math.max(1, Math.floor(ids.length * failureRate))

  // Randomly pick participants to fail
  const shuffled = [...ids].sort(() => Math.random() - 0.5)
  for (let i = 0; i < failCount && i < shuffled.length; i++) {
    const p = happy.participants[shuffled[i]]
    p.responses = [{
      match: 'default',
      status: 'failure',
      delay: 100,
      outputs: undefined,
    }]
  }

  return { ...happy, name: `Failure Injection (${Math.round(failureRate * 100)}%)` }
}
