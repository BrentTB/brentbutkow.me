import { useState } from 'react'
import { Combobox } from '../../../components/inputs/Combobox'
import { useCompanySearch } from '../useCompanySearch'
import type { RecallCountry } from '../recall.types'

type CompanyFilterProps = {
  country: RecallCountry
  value: string
  onChange: (value: string) => void
}

// Company has thousands of values, so it's a server-backed type-ahead rather than a fixed list:
// an empty query yields the busiest firms; typing searches all of them.
export function CompanyFilter({ country, value, onChange }: CompanyFilterProps) {
  const [query, setQuery] = useState('')
  const options = useCompanySearch(country, query).map((name) => ({ value: name, label: name }))
  return (
    <Combobox
      value={value}
      options={options}
      onChange={onChange}
      onInputChange={setQuery}
      ariaLabel="Company"
      placeholder="Search companies…"
      widthCh={36}
    />
  )
}
