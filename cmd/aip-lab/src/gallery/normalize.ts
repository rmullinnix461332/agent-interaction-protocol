import type { GalleryEntry, RegistrySourceType } from '@/model/agent'

// normalizeEntry maps a raw catalog entry to the common GalleryEntry model.
// Handles variations in field names across different registry formats.
export function normalizeEntry(raw: Record<string, any>, sourceName: string, sourceType: RegistrySourceType): GalleryEntry {
  return {
    id: raw.id || raw.name || 'unknown',
    name: raw.name || raw.title || raw.id || 'Unnamed',
    description: raw.description || '',
    category: raw.category || raw.kind || 'agent',
    tags: toStringArray(raw.tags),
    capabilities: toStringArray(raw.capabilities),
    iconUrl: raw.iconUrl || raw.icon || undefined,
    docsUrl: raw.docsUrl || raw.docs || raw.homepage || undefined,
    sourceName,
    sourceType,
    kind: raw.kind || 'agent',
    version: raw.version,
    constraints: raw.constraints,
    metadata: raw.metadata,
  }
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter(v => typeof v === 'string')
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean)
  return []
}
