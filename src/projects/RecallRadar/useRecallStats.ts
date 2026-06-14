import { apiRoutes } from '../../api/api'
import { useApiResource, type ApiState } from '../../api/useApiResource'
import type { RecallStats } from './recall.types'

export function useRecallStats(): ApiState<RecallStats> {
  return useApiResource<RecallStats>(apiRoutes.recalls.stats)
}
