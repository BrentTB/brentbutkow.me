import { apiRoutes } from '../../api/api'
import type {
  RecallCategory,
  RecallClass,
  RecallCountry,
  RecallSource,
  TrendGroup,
} from './recall.types'

export type RecallFilters = {
  country?: RecallCountry
  category?: RecallCategory
  classification?: RecallClass
  state?: string
  company?: string
  source?: RecallSource
  entity?: string
  search?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

// The filter params the recall list and the trend chart share, so both scope to the same recalls.
function appendRecallFilters(params: URLSearchParams, filters: RecallFilters): void {
  if (filters.country) params.set('country', filters.country)
  if (filters.category) params.set('category', filters.category)
  if (filters.classification) params.set('classification', filters.classification)
  if (filters.state) params.set('state', filters.state)
  if (filters.company) params.set('company', filters.company)
  if (filters.source) params.set('source', filters.source)
  if (filters.entity) params.set('entity', filters.entity)
  if (filters.search) params.set('search', filters.search)
  if (filters.since) params.set('since', filters.since)
  if (filters.until) params.set('until', filters.until)
}

export function buildRecallsPath(filters: RecallFilters): string {
  const params = new URLSearchParams()
  appendRecallFilters(params, filters)
  params.set('limit', String(filters.limit ?? 50))
  if (filters.offset) params.set('offset', String(filters.offset))
  return `${apiRoutes.recalls.list}?${params.toString()}`
}

export function buildTrendPath(filters: RecallFilters, group: TrendGroup): string {
  const params = new URLSearchParams()
  params.set('group', group)
  appendRecallFilters(params, filters)
  return `${apiRoutes.recalls.trend}?${params.toString()}`
}
