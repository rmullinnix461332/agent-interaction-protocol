import type { GalleryEntry, AgentRegistry } from '@/model/agent'

// RegistryAdapter fetches and normalizes entries from a registry source
export interface RegistryAdapter {
  fetch(registry: AgentRegistry): Promise<GalleryEntry[]>
}
