import { useApiResource, type ApiState } from './useApiResource'
import type { RecallStats } from './recall.types'

export function useRecallStats(): ApiState<RecallStats> {
  return useApiResource<RecallStats>('/recalls/stats')
}
