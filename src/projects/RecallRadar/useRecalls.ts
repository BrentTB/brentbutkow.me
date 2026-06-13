import { buildRecallsPath, type RecallFilters } from './api'
import { useApiResource, type ApiState } from './useApiResource'
import type { RecallListResult } from './recall.types'

export function useRecalls(filters: RecallFilters = {}): ApiState<RecallListResult> {
  return useApiResource<RecallListResult>(buildRecallsPath(filters))
}
