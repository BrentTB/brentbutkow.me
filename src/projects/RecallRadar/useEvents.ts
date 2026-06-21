import { apiRoutes } from '../../api/api'
import { useApiResource, type ApiState } from '../../api/useApiResource'
import { isEventOutArray, type EventOut, type RecallCountry } from './recall.types'

// The event/outbreak clusters for a country, built offline by build_events. Clustering is
// per-country (it reuses the per-country similarity graph), so this refetches on country change.
// Returns every cluster, outbreaks first; the dashboard headlines the outbreaks and maps the rest.
export function useEvents(country: RecallCountry): ApiState<EventOut[]> {
  const params = new URLSearchParams({ country })
  return useApiResource<EventOut[]>(
    `${apiRoutes.recalls.events}?${params.toString()}`,
    isEventOutArray
  )
}
