import { useApiResource } from '../../api/useApiResource'
import { useDebouncedValue } from '../../api/useDebouncedValue'
import { buildCompaniesPath, type TrendFilters } from './api'
import { isLabelCountArray } from './recall.types'

export type CompanyOption = { name: string; count: number }

export type CompanySearch = {
  companies: CompanyOption[]
  loading: boolean
  error: string | null
}

// Debounced company-name suggestions for the query, each with its recall count under the other
// active filters (company is a facet too). An empty query returns the busiest matching firms, so the
// dropdown has sensible defaults before typing. Surfaces loading/error so the dropdown can tell
// "fetching" and "failed" apart from "no matches".
export function useCompanySearch(filters: TrendFilters, query: string): CompanySearch {
  const debounced = useDebouncedValue(query.trim(), 250)
  const { data, loading, error } = useApiResource(
    buildCompaniesPath(filters, debounced),
    isLabelCountArray
  )
  return {
    companies: (data ?? []).map((entry) => ({ name: entry.label, count: entry.count })),
    loading,
    error,
  }
}
