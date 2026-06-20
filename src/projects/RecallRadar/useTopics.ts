import { apiRoutes } from '../../api/api'
import { useApiResource, type ApiState } from '../../api/useApiResource'
import { isTopicOutArray, type TopicOut } from './recall.types'

// The themes (NMF topics) discovered across the whole corpus, built offline by build_analytics.
// Global — not country-scoped — so it fetches once regardless of the active filters.
export function useTopics(): ApiState<TopicOut[]> {
  return useApiResource<TopicOut[]>(apiRoutes.recalls.topics, isTopicOutArray)
}
