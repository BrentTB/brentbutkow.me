import { apiRoutes } from '../../api/api'
import { useApiResource } from '../../api/useApiResource'
import { useDebouncedValue } from '../../api/useDebouncedValue'
import type { RecallCountry } from './recall.types'

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')

export type CompanySearch = {
  companies: string[]
  loading: boolean
  error: string | null
}

// Debounced company-name suggestions for the country + query, from the backend search endpoint.
// An empty query returns the busiest companies, so the dropdown has sensible defaults before typing.
// Surfaces loading/error so the dropdown distinguishes "fetching" and "failed" from "no matches".
export function useCompanySearch(country: RecallCountry, query: string): CompanySearch {
  const debounced = useDebouncedValue(query.trim(), 250)
  const params = new URLSearchParams({ country, q: debounced })
  const { data, loading, error } = useApiResource<string[]>(
    `${apiRoutes.recalls.companies}?${params.toString()}`,
    isStringArray
  )
  return { companies: data ?? [], loading, error }
}
