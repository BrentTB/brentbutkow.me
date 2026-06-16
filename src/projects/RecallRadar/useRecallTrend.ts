import { apiRoutes } from '../../api/api'
import { useApiResource, type ApiState } from '../../api/useApiResource'
import {
  isTrendResult,
  type RecallCountry,
  type TrendGroup,
  type TrendResult,
} from './recall.types'

export function useRecallTrend(country: RecallCountry, group: TrendGroup): ApiState<TrendResult> {
  const path = `${apiRoutes.recalls.trend}?country=${country}&group=${group}`
  return useApiResource<TrendResult>(path, isTrendResult)
}
