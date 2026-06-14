import { apiRoutes } from '../../api/api'
import type { RecallCategory, RecallClass } from './recall.types'

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
  return `${apiRoutes.recalls.list}?${params.toString()}`
}
