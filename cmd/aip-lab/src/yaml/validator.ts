import Ajv from 'ajv'
import type { Flow } from '@/model/flow'

// Schema will be loaded at runtime from the schema directory
let schemaValidator: ReturnType<Ajv['compile']> | null = null

export function initValidator(schema: object) {
  const ajv = new Ajv({ allErrors: true, strict: false })
  schemaValidator = ajv.compile(schema)
}

export interface ValidationError {
  path: string
  message: string
}

export function validateSchema(flow: Flow): ValidationError[] {
  if (!schemaValidator) return []
  const valid = schemaValidator(flow)
  if (valid) return []
  return (schemaValidator.errors || []).map((e) => ({
    path: e.instancePath || '/',
    message: e.message || 'unknown error',
  }))
}

export function validateSemantic(flow: Flow): ValidationError[] {
  const errors: ValidationError[] = []
  const participantIds = new Set(flow.participants.map((p) => p.id))
  const stepIds = new Set(flow.steps.map((s) => s.id))

  for (const step of flow.steps) {
    if (step.participantRef && !participantIds.has(step.participantRef)) {
      errors.push({
        path: `/steps/${step.id}/participantRef`,
        message: `references unknown participant "${step.participantRef}"`,
      })
    }
    for (const dep of step.dependsOn || []) {
      if (!stepIds.has(dep)) {
        errors.push({
          path: `/steps/${step.id}/dependsOn`,
          message: `depends on unknown step "${dep}"`,
        })
      }
    }
    for (const sub of step.steps || []) {
      if (!stepIds.has(sub)) {
        errors.push({
          path: `/steps/${step.id}/steps`,
          message: `references unknown sub-step "${sub}"`,
        })
      }
    }
  }
  return errors
}
