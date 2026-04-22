import yaml from 'js-yaml'
import type { Flow } from '@/model/flow'

export function parseFlow(yamlContent: string): Flow {
  const doc = yaml.load(yamlContent) as Flow
  if (!doc || typeof doc !== 'object') {
    throw new Error('Invalid YAML: expected an object')
  }
  return doc
}

export function serializeFlow(flow: Flow, indent = 2): string {
  return yaml.dump(flow, {
    indent,
    lineWidth: 120,
    noRefs: true,
    sortKeys: (a: string, b: string) => {
      const order = [
        'apiVersion', 'kind', 'metadata', 'participants', 'artifacts',
        'steps', 'providerBinding',
      ]
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      if (ai >= 0 && bi >= 0) return ai - bi
      if (ai >= 0) return -1
      if (bi >= 0) return 1
      return a.localeCompare(b)
    },
  })
}
