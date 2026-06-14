import { apiRoutes } from '../../api/api'
import { useApiResource, type ApiState } from '../../api/useApiResource'
import { isRecallStats, type RecallCountry, type RecallStats } from './recall.types'

export function useRecallStats(country?: RecallCountry): ApiState<RecallStats> {
  const path = country ? `${apiRoutes.recalls.stats}?country=${country}` : apiRoutes.recalls.stats
  return useApiResource<RecallStats>(path, isRecallStats)
}
