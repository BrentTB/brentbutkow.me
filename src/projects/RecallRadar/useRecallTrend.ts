import { useApiResource, type ApiState } from '../../api/useApiResource'
import { buildTrendPath, type RecallFilters } from './api'
import { isTrendResult, type TrendGroup, type TrendResult } from './recall.types'

export function useRecallTrend(filters: RecallFilters, group: TrendGroup): ApiState<TrendResult> {
  return useApiResource<TrendResult>(buildTrendPath(filters, group), isTrendResult)
}
