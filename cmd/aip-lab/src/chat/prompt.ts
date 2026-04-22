import type { Flow } from '@/model/flow'
import { serializeFlow } from '@/yaml/parser'

const SCHEMA_SUMMARY = `
AIP (Agent Interaction Protocol) defines flows with:
- apiVersion: "aip/v0.1", kind: "Flow"
- metadata: { name, title, version, description }
- participants: [{ id, kind (agent|service|human|subflow), title, description, flowRef? }]
- artifacts: [{ ref (aip://artifact/...), contentType, producer, consumers, title }]
- steps: [{ id, type, title, dependsOn, participantRef, consumes, produces, ... }]

Step types:
- action: executes a participant. Requires participantRef.
- fanOut: parallel fork. Has steps[] listing child step IDs.
- fanIn: join. Has condition (allSuccess|anySuccess|allComplete), optional operator.
- decision: conditional branch. Has decision.cases[{when, next}] and decision.default.
- await: pause for external input. Has awaitInput {ref, sourceParticipantRef}.
- exit: terminal. Has exit {status (success|failure|cancelled|blocked), message}.

Iteration: any step can have iteration {mode (forEach|while|bounded), maxIterations, scope {type, ref}}.
Operators on fanIn: summarize, rank, merge, filter, await.
Artifact refs use format: aip://artifact/<name>
`

export function buildSystemPrompt(flow: Flow | null, selectedStepId: string | null): string {
  let prompt = `You are an AIP flow design assistant. You help users create and modify Agent Interaction Protocol flow YAML files.

${SCHEMA_SUMMARY}

IMPORTANT RULES:
1. When the user asks you to create or modify a flow, respond with the complete YAML inside a \`\`\`yaml code block.
2. When explaining, be concise and reference step IDs.
3. Always produce valid AIP YAML that conforms to the schema.
4. Use descriptive step IDs (kebab-case), meaningful titles, and proper artifact refs.
5. When modifying, preserve existing structure and only change what's requested.
`

  if (flow) {
    const yaml = serializeFlow(flow)
    prompt += `\nCurrent flow YAML:\n\`\`\`yaml\n${yaml}\`\`\`\n`

    if (selectedStepId) {
      const step = flow.steps.find((s) => s.id === selectedStepId)
      if (step) {
        prompt += `\nThe user has selected step "${step.id}" (${step.type}${step.title ? `: ${step.title}` : ''}).\n`
      }
    }
  } else {
    prompt += '\nNo flow is currently loaded. The user may ask you to create one from scratch.\n'
  }

  return prompt
}

/** Extract YAML from a markdown code block in the assistant response */
export function extractYaml(content: string): string | null {
  const match = content.match(/```ya?ml\n([\s\S]*?)```/)
  return match ? match[1].trim() : null
}
