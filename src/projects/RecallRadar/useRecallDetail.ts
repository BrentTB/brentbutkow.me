import { useApiResource, type ApiState } from '../../api/useApiResource'
import { buildRecallDetailPath } from './api'
import { isRecall, type Recall, type RecallSource } from './recall.types'

// One recall by its (source, recallNumber) identity — backs the dedicated recall page. Validates
// the untrusted payload with the shared `isRecall` guard, like every other resource hook.
export function useRecallDetail(source: RecallSource, recallNumber: string): ApiState<Recall> {
  return useApiResource<Recall>(buildRecallDetailPath(source, recallNumber), isRecall)
}
