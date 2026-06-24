import { useState } from 'react'
import { Combobox } from '../../../components/inputs/Combobox'
import { useCompanySearch } from '../useCompanySearch'
import type { TrendFilters } from '../api'

type CompanyFilterProps = {
  // The active filter set — the company facet's counts re-tally under these (its own selection is
  // dropped before the request).
  filters: TrendFilters
  value: string
  onChange: (value: string) => void
}

// Company has thousands of values, so it's a server-backed type-ahead rather than a fixed list: an
// empty query yields the busiest firms, typing searches all of them, and each suggestion shows its
// recall count under the other active filters.
export function CompanyFilter({ filters, value, onChange }: CompanyFilterProps) {
  const [query, setQuery] = useState('')
  const { companies, loading, error } = useCompanySearch(filters, query)
  const options = companies.map((company) => ({
    value: company.name,
    label: company.name,
    count: company.count,
  }))
  return (
    <Combobox
      value={value}
      options={options}
      // Clear the typed query on select so reopening shows the busiest-companies defaults, not the
      // last narrow search.
      onChange={(next) => {
        setQuery('')
        onChange(next)
      }}
      onInputChange={setQuery}
      loading={loading}
      error={Boolean(error)}
      ariaLabel="Company"
      placeholder="Search companies…"
      widthCh={36}
    />
  )
}
