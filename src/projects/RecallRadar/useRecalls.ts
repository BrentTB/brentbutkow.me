import { useApiResource, type ApiState } from '../../api/useApiResource'
import { buildRecallsPath, type RecallFilters } from './api'
import { isRecallListResult, type RecallListResult } from './recall.types'

export function useRecalls(filters: RecallFilters = {}): ApiState<RecallListResult> {
  return useApiResource<RecallListResult>(buildRecallsPath(filters), isRecallListResult)
}
