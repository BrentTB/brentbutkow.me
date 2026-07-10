import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BreakdownList, Breakdowns } from './Breakdowns'
import type { RecallFacets, RecallFilterValues } from '../recall.types'

const NO_FILTERS: RecallFilterValues = {
  category: '',
  classification: '',
  severity: '',
  topic: '',
  event: '',
  state: '',
  affectedCountry: '',
  company: '',
  source: '',
  entity: '',
  search: '',
  since: '',
  until: '',
}

const rows = [
  { label: 'All states', value: '', count: 10 },
  { label: 'California', value: 'CA', count: 7 },
]

const facets = (over: Partial<RecallFacets>): RecallFacets => ({
  category: [{ label: 'allergen', count: 5 }],
  classification: [],
  severity: [],
  source: [],
  state: [],
  company: [{ label: 'Acme Foods', count: 4 }],
  entity: [],
  topicCounts: {},
  eventCounts: {},
  ...over,
})

describe('BreakdownList', () => {
  afterEach(cleanup)

  it('marks no row active when the active value is empty, even if a row carries an empty value', () => {
    // Regression: with no filter set (activeValue ''), a row whose value is '' must not light up
    // the whole list via '' === ''. Guarded by `activeValue !== '' && row.value === activeValue`.
    render(<BreakdownList title="Top states" rows={rows} activeValue="" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /All states/ }).getAttribute('aria-pressed')).toBe(
      'false'
    )
    expect(screen.getByRole('button', { name: /California/ }).getAttribute('aria-pressed')).toBe(
      'false'
    )
  })

  it('marks only the matching row active when a non-empty value is selected', () => {
    render(<BreakdownList title="Top states" rows={rows} activeValue="CA" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /California/ }).getAttribute('aria-pressed')).toBe(
      'true'
    )
    expect(screen.getByRole('button', { name: /All states/ }).getAttribute('aria-pressed')).toBe(
      'false'
    )
  })

  it('toggles the filter off when an already-active row is re-clicked', () => {
    const onSelect = vi.fn()
    render(<BreakdownList title="Top states" rows={rows} activeValue="CA" onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /California/ }))
    expect(onSelect).toHaveBeenCalledWith('')
  })
})

describe('Breakdowns', () => {
  afterEach(cleanup)

  it('hides the Top companies card when the country has no company data (Canada)', () => {
    render(
      <Breakdowns
        facets={facets({ company: [] })}
        filters={NO_FILTERS}
        hasCompanies={false}
        onSelect={vi.fn()}
      />
    )
    expect(screen.queryByText('Top companies')).toBeNull()
  })

  it('keeps the Top companies card when the country has companies, even if a filter leaves none', () => {
    // hasCompanies is the unfiltered base signal; an empty filtered facet must not hide the card.
    render(
      <Breakdowns
        facets={facets({ company: [] })}
        filters={NO_FILTERS}
        hasCompanies={true}
        onSelect={vi.fn()}
      />
    )
    expect(screen.getByText('Top companies')).toBeTruthy()
  })

  it('shows Top affected countries only when the facet has entries (EU), named not coded', () => {
    const onSelect = vi.fn()
    const { unmount } = render(
      <Breakdowns
        facets={facets({ affectedCountry: [{ label: 'DE', count: 12 }] })}
        filters={NO_FILTERS}
        hasCompanies={false}
        onSelect={onSelect}
      />
    )
    expect(screen.getByText('Top affected countries')).toBeTruthy()
    // Rows render the country name but filter by the ISO code the backend expects.
    fireEvent.click(screen.getByRole('button', { name: /Germany/ }))
    expect(onSelect).toHaveBeenCalledWith({ affectedCountry: 'DE' })
    unmount()

    // Absent (a backend predating the facet) or empty → the card hides.
    render(
      <Breakdowns
        facets={facets({})}
        filters={NO_FILTERS}
        hasCompanies={false}
        onSelect={onSelect}
      />
    )
    expect(screen.queryByText('Top affected countries')).toBeNull()
  })
})
