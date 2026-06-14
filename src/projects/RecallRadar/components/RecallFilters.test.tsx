import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecallFilters } from './RecallFilters'
import type { RecallFilterValues } from '../recall.types'

const empty: RecallFilterValues = {
  category: '',
  classification: '',
  state: '',
  company: '',
  source: '',
  search: '',
}

const noop = () => {}

const renderFilters = (props: Partial<Parameters<typeof RecallFilters>[0]> = {}) =>
  render(
    <RecallFilters
      filters={empty}
      country="us"
      stateOptions={[]}
      companyOptions={[]}
      onChange={noop}
      onClear={noop}
      {...props}
    />
  )

describe('RecallFilters', () => {
  afterEach(cleanup)

  it('reports typed search text through onChange', () => {
    const onChange = vi.fn()
    renderFilters({ onChange })
    fireEvent.change(screen.getByPlaceholderText('Search product, reason, or company…'), {
      target: { value: 'listeria' },
    })
    expect(onChange).toHaveBeenCalledWith({ search: 'listeria' })
  })

  it('reports a chosen source through the Select', () => {
    const onChange = vi.fn()
    renderFilters({ onChange })
    fireEvent.click(screen.getByLabelText('Source')) // open the source dropdown
    fireEvent.click(screen.getByText('USDA FSIS'))
    expect(onChange).toHaveBeenCalledWith({ source: 'usda' })
  })

  it('shows UK classifications and hides the source filter for the UK', () => {
    renderFilters({ country: 'uk' })
    expect(screen.queryByLabelText('Source')).toBeNull() // single UK source → no source filter
    fireEvent.click(screen.getByLabelText('Classification'))
    expect(screen.getByText('Allergy Alert')).toBeTruthy() // a UK option
    expect(screen.queryByText('Class I')).toBeNull() // US classes don't bleed in
  })

  it('shows the clear button when only a search is active', () => {
    renderFilters({ filters: { ...empty, search: 'peanut' } })
    expect(screen.getByText('Clear filters')).toBeTruthy()
  })
})
