import type { RecallCategory, RecallClass } from './recall.types'

const BASE = import.meta.env.VITE_RECALL_API_URL ?? ''

export async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return (await res.json()) as T
}

export type RecallFilters = {
  category?: RecallCategory
  classification?: RecallClass
  since?: string
  limit?: number
}

export function buildRecallsPath(filters: RecallFilters): string {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.classification) params.set('classification', filters.classification)
  if (filters.since) params.set('since', filters.since)
  params.set('limit', String(filters.limit ?? 50))
  return `/recalls?${params.toString()}`
}
