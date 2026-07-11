import { apiRoutes } from '../../api/api'
import { routePaths } from '../../routes/routes.paths'
import { RecallView } from './recall.types'
import type {
  RecallCategory,
  RecallClass,
  RecallCountry,
  RecallSort,
  RecallSource,
  SeverityLabel,
  TrendGroup,
} from './recall.types'

export type RecallFilters = {
  country?: RecallCountry
  category?: RecallCategory
  classification?: RecallClass
  severity?: SeverityLabel
  topic?: string
  event?: string
  state?: string
  affectedCountry?: string
  company?: string
  source?: RecallSource
  entity?: string
  search?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
  sort?: RecallSort
}

// The trend chart scopes to the same recalls but isn't paginated, and has no ordering — so it can't
// accept limit/offset/sort.
export type TrendFilters = Omit<RecallFilters, 'limit' | 'offset' | 'sort'>

// The filter params the recall list and the trend chart share, so both scope to the same recalls.
function appendRecallFilters(params: URLSearchParams, filters: RecallFilters): void {
  if (filters.country) params.set('country', filters.country)
  if (filters.category) params.set('category', filters.category)
  if (filters.classification) params.set('classification', filters.classification)
  if (filters.severity) params.set('severity', filters.severity)
  if (filters.topic) params.set('topic', filters.topic)
  if (filters.event) params.set('event', filters.event)
  if (filters.state) params.set('state', filters.state)
  if (filters.affectedCountry) params.set('affectedCountry', filters.affectedCountry)
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
  if (filters.sort) params.set('sort', filters.sort)
  return `${apiRoutes.recalls.list}?${params.toString()}`
}

export function buildTrendPath(filters: TrendFilters, group: TrendGroup): string {
  const params = new URLSearchParams()
  params.set('group', group)
  appendRecallFilters(params, filters)
  return `${apiRoutes.recalls.trend}?${params.toString()}`
}

// Facet option counts under the current filters (same filter set as the list/trend, no paging/sort).
export function buildFacetsPath(filters: TrendFilters): string {
  const params = new URLSearchParams()
  appendRecallFilters(params, filters)
  return `${apiRoutes.recalls.facets}?${params.toString()}`
}

// Company type-ahead with counts under the other filters. Company is the facet's own dimension, so
// the current selection is dropped — its counts don't (and shouldn't) depend on it, and omitting it
// keeps the suggestion list from refetching when only the selection changes.
export function buildCompaniesPath(filters: TrendFilters, q: string): string {
  const params = new URLSearchParams()
  appendRecallFilters(params, { ...filters, company: undefined })
  if (q) params.set('q', q)
  return `${apiRoutes.recalls.companies}?${params.toString()}`
}

// A recall's nearest-neighbour path. Segments are encoded — FDA recall numbers can carry slashes.
export function buildSimilarPath(source: RecallSource, recallNumber: string, limit = 6): string {
  const recall = `${encodeURIComponent(source)}/${encodeURIComponent(recallNumber)}`
  return `${apiRoutes.recalls.list}/${recall}/similar?limit=${limit}`
}

// A single recall's API path (the detail page). Encoded like buildSimilarPath.
export function buildRecallDetailPath(source: RecallSource, recallNumber: string): string {
  return `${apiRoutes.recalls.list}/${encodeURIComponent(source)}/${encodeURIComponent(recallNumber)}`
}

export function recallDetailRoute(source: RecallSource, recallNumber: string): string {
  return `${routePaths.recallRadar}/${encodeURIComponent(source)}/${encodeURIComponent(recallNumber)}`
}

// In-app route to a single filter preset — the detail page's theme/outbreak chips link here.
// Lands on the Recalls list (not the dashboard) so you see the members of that theme/outbreak right
// away rather than the aggregate overview. Includes the country, since themes and events are
// per-country and the slug only resolves under the right one.
export function recallRadarFilterRoute(
  country: RecallCountry,
  param: 'topic' | 'event',
  slug: string
): string {
  const query = new URLSearchParams({
    location: country,
    view: RecallView.recalls,
    [param]: slug,
  })
  return `${routePaths.recallRadar}?${query.toString()}`
}
