import { apiRoutes } from '../../api/api'
import type { RecallCategory, RecallClass } from './recall.types'

export type RecallFilters = {
  category?: RecallCategory
  classification?: RecallClass
  state?: string
  company?: string
  search?: string
  limit?: number
}

export function buildRecallsPath(filters: RecallFilters): string {
  const params = new URLSearchParams()
  if (filters.category) params.set('category', filters.category)
  if (filters.classification) params.set('classification', filters.classification)
  if (filters.state) params.set('state', filters.state)
  if (filters.company) params.set('company', filters.company)
  if (filters.search) params.set('search', filters.search)
  params.set('limit', String(filters.limit ?? 50))
  return `${apiRoutes.recalls.list}?${params.toString()}`
}
