import { useApiResource, type ApiState } from '../../api/useApiResource'
import { buildFacetsPath, type TrendFilters } from './api'
import { isRecallFacets, type RecallFacets } from './recall.types'

// Per-facet option counts under the current filters. Refetches whenever the filter set changes (the
// path is the cache key), so the dropdowns always show counts for the live query. Degrades to no
// counts (the controls still work) while loading or on error.
export function useFacets(filters: TrendFilters): ApiState<RecallFacets> {
  return useApiResource<RecallFacets>(buildFacetsPath(filters), isRecallFacets)
}
