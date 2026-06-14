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

describe('RecallFilters', () => {
  afterEach(cleanup)

  it('reports typed search text through onChange', () => {
    const onChange = vi.fn()
    render(
      <RecallFilters
        filters={empty}
        stateOptions={[]}
        companyOptions={[]}
        onChange={onChange}
        onClear={noop}
      />
    )
    fireEvent.change(screen.getByPlaceholderText('Search product, reason, or company…'), {
      target: { value: 'listeria' },
    })
    expect(onChange).toHaveBeenCalledWith({ search: 'listeria' })
  })

  it('reports a chosen source through onChange', () => {
    const onChange = vi.fn()
    render(
      <RecallFilters
        filters={empty}
        stateOptions={[]}
        companyOptions={[]}
        onChange={onChange}
        onClear={noop}
      />
    )
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'usda' } })
    expect(onChange).toHaveBeenCalledWith({ source: 'usda' })
  })

  it('shows the clear button when only a search is active', () => {
    render(
      <RecallFilters
        filters={{ ...empty, search: 'peanut' }}
        stateOptions={[]}
        companyOptions={[]}
        onChange={noop}
        onClear={noop}
      />
    )
    expect(screen.getByText('Clear filters')).toBeTruthy()
  })
})
