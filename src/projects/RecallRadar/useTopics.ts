import { apiRoutes } from '../../api/api'
import { useApiResource, type ApiState } from '../../api/useApiResource'
import { isTopicOutArray, type RecallCountry, type TopicOut } from './recall.types'

// The themes (NMF topics) for a country, built offline by build_analytics. Themes are per-country —
// US and UK recall structures differ — so this refetches when the country changes.
export function useTopics(country: RecallCountry): ApiState<TopicOut[]> {
  const params = new URLSearchParams({ country })
  return useApiResource<TopicOut[]>(
    `${apiRoutes.recalls.topics}?${params.toString()}`,
    isTopicOutArray
  )
}
