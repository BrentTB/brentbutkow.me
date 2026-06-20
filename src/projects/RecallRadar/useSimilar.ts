import { useApiResource, type ApiState } from '../../api/useApiResource'
import { buildSimilarPath } from './api'
import { isSimilarRecallArray, type RecallSource, type SimilarRecall } from './recall.types'

// A recall's nearest neighbours by reason/product text (precomputed cosine similarity). Intended to
// be called from a component mounted only when a feed row expands, so similar recalls load on demand
// rather than for every row on the page — useApiResource aborts the fetch if the row collapses.
export function useSimilar(
  source: RecallSource,
  recallNumber: string,
  limit = 6
): ApiState<SimilarRecall[]> {
  return useApiResource<SimilarRecall[]>(
    buildSimilarPath(source, recallNumber, limit),
    isSimilarRecallArray
  )
}
