import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { RecallFilters } from './RecallFilters'
import type { RecallFilterValues } from '../recall.types'
import { emptyFacets } from '../test-fixtures'

// CompanyFilter fetches company suggestions on mount; stub it so these tests stay offline.
const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

const empty: RecallFilterValues = {
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

const noop = () => {}

const renderFilters = (props: Partial<Parameters<typeof RecallFilters>[0]> = {}) =>
  render(
    <RecallFilters
      filters={empty}
      country="us"
      stateOptions={[]}
      affectedCountryOptions={[]}
      hasCompanies={true}
      activeFilters={{ country: 'us' }}
      onChange={noop}
      onClear={noop}
      {...props}
    />
  )

describe('RecallFilters', () => {
  beforeEach(() =>
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([]))
    )
  )
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('reports typed search text through onChange', () => {
    const onChange = vi.fn()
    renderFilters({ onChange })
    fireEvent.change(screen.getByPlaceholderText('Search product, reason, or company…'), {
      target: { value: 'listeria' },
    })
    expect(onChange).toHaveBeenCalledWith({ search: 'listeria' })
  })

  it('keeps advanced filters behind a "More filters" disclosure', () => {
    renderFilters()
    expect(screen.queryByLabelText('Source')).toBeNull() // hidden until expanded
    fireEvent.click(screen.getByRole('button', { name: /More filters/i }))
    expect(screen.getByLabelText('Source')).toBeTruthy()
  })

  it('shows the company type-ahead when the country has companies', () => {
    renderFilters({ hasCompanies: true })
    fireEvent.click(screen.getByRole('button', { name: /More filters/i }))
    expect(screen.getByText('Company')).toBeTruthy()
  })

  it('hides the company type-ahead when the country has no companies (Canada)', () => {
    renderFilters({ hasCompanies: false })
    fireEvent.click(screen.getByRole('button', { name: /More filters/i }))
    expect(screen.queryByText('Company')).toBeNull()
  })

  it('annotates options with facet counts and sorts zero-result ones last, disabled', () => {
    renderFilters({
      facets: {
        ...emptyFacets,
        category: [
          { label: 'allergen', count: 30 },
          { label: 'pathogen', count: 0 },
        ],
      },
    })
    fireEvent.click(screen.getByLabelText('Cause')) // the cause/category control
    const options = screen.getAllByRole('option')
    expect(options[0].textContent).toContain('All') // All always leads, uncounted

    const allergen = screen.getByRole('option', { name: /allergen/i })
    expect(allergen.textContent).toContain('30') // live count shown
    const pathogen = screen.getByRole('option', { name: /pathogen/i })
    expect(pathogen.getAttribute('aria-disabled')).toBe('true') // zero results → disabled
    // available options sort ahead of the dead ends
    expect(options.indexOf(allergen)).toBeLessThan(options.indexOf(pathogen))
  })

  it('reports a chosen source through the Select', () => {
    const onChange = vi.fn()
    renderFilters({ onChange })
    fireEvent.click(screen.getByRole('button', { name: /More filters/i })) // source lives behind More
    fireEvent.click(screen.getByLabelText('Source')) // open the source dropdown
    fireEvent.click(screen.getByText('USDA FSIS'))
    expect(onChange).toHaveBeenCalledWith({ source: 'usda' })
  })

  it('reports a chosen severity band through the Select', () => {
    const onChange = vi.fn()
    renderFilters({ onChange })
    fireEvent.click(screen.getByLabelText('Severity')) // open the severity dropdown
    fireEvent.click(screen.getByText('Severe'))
    expect(onChange).toHaveBeenCalledWith({ severity: 'severe' })
  })

  it('shows UK classifications and hides the source filter for the UK', () => {
    renderFilters({ country: 'uk' })
    expect(screen.queryByLabelText('Source')).toBeNull() // single UK source → no source filter
    fireEvent.click(screen.getByLabelText('Class'))
    expect(screen.getByText('Allergy Alert')).toBeTruthy() // a UK option
    expect(screen.queryByText('Class I')).toBeNull() // US classes don't bleed in
  })

  it('gets the EU facet set: no class, no source, no company, an affected-country filter', () => {
    renderFilters({
      country: 'eu',
      hasCompanies: false,
      stateOptions: [],
      affectedCountryOptions: ['DE', 'IE'],
    })
    // RASFF has no class ladder (classesByCountry.eu is empty) and a single source.
    expect(screen.queryByLabelText('Class')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /More filters/i }))
    expect(screen.queryByLabelText('Source')).toBeNull()
    expect(screen.queryByText('Company')).toBeNull()
    // The affected-country combobox renders ISO codes as country names.
    fireEvent.click(screen.getByLabelText('Affected country'))
    expect(screen.getByText('Germany')).toBeTruthy()
    expect(screen.getByText('Ireland')).toBeTruthy()
  })

  it('hides the affected-country filter when there are no affected countries (US)', () => {
    renderFilters({ affectedCountryOptions: [] })
    fireEvent.click(screen.getByRole('button', { name: /More filters/i }))
    expect(screen.queryByLabelText('Affected country')).toBeNull()
  })

  it('keeps the affected-country chip removable even where the control is hidden', () => {
    // A shared ?affectedCountry= URL opened on a country without the control (the company-chip
    // lesson): the chip must still render and clear the filter.
    const onChange = vi.fn()
    renderFilters({
      filters: { ...empty, affectedCountry: 'DE' },
      affectedCountryOptions: [],
      onChange,
    })
    const chip = screen.getByRole('button', { name: 'Remove the affected country filter' })
    expect(chip.textContent).toContain('Germany')
    fireEvent.click(chip)
    expect(onChange).toHaveBeenCalledWith({ affectedCountry: '' })
  })

  it('reports a chosen From date through onChange', () => {
    const onChange = vi.fn()
    renderFilters({ onChange })
    fireEvent.click(screen.getByRole('button', { name: /More filters/i })) // dates live behind More
    fireEvent.change(screen.getByLabelText('Recalls reported on or after'), {
      target: { value: '2025-01-01' },
    })
    expect(onChange).toHaveBeenCalledWith({ since: '2025-01-01' })
  })

  it('renders a removable chip per active filter, plus clear-all', () => {
    const onChange = vi.fn()
    renderFilters({ filters: { ...empty, search: 'peanut', state: 'CA' }, onChange })
    expect(screen.getByText('Clear all')).toBeTruthy()
    expect(screen.getByText('“peanut”')).toBeTruthy()
    // A chip clears only its own filter.
    fireEvent.click(screen.getByRole('button', { name: 'Remove CA filter' }))
    expect(onChange).toHaveBeenCalledWith({ state: '' })
  })

  it('shows a removable theme chip from the resolved topic label', () => {
    const onChange = vi.fn()
    renderFilters({
      filters: { ...empty, topic: 'listeria-deli-meat' },
      topicLabel: 'listeria · deli · meat',
      onChange,
    })
    expect(screen.getByText('Theme: listeria · deli · meat')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove the theme filter' }))
    expect(onChange).toHaveBeenCalledWith({ topic: '' })
  })

  it('shows a removable outbreak chip from the resolved event label', () => {
    const onChange = vi.fn()
    renderFilters({
      filters: { ...empty, event: 'listeria-2026-03' },
      eventLabel: 'Listeria · 7 recalls',
      onChange,
    })
    expect(screen.getByText('Outbreak: Listeria · 7 recalls')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove the outbreak filter' }))
    expect(onChange).toHaveBeenCalledWith({ event: '' })
  })
})
