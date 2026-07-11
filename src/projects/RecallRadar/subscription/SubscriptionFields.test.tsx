import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SubscriptionFields, type FilterFieldsValue } from './SubscriptionFields'
import { RecallCountry } from '../recall.types'

// CompanyFilter fetches suggestions on mount; stub fetch so these stay offline.
const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

const EMPTY: FilterFieldsValue = {
  countries: [],
  affectedCountries: [],
  entities: [],
  companies: [],
  categories: [],
  minSeverity: '',
}

function renderFields(value: Partial<FilterFieldsValue>, setField = vi.fn()) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => mockRes([]))
  )
  render(<SubscriptionFields value={{ ...EMPTY, ...value }} setField={setField} />)
  return setField
}

describe('SubscriptionFields — EU member-state narrowing', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('hides the EU-countries field until EU is among the chosen countries', () => {
    renderFields({ countries: [RecallCountry.us] })
    expect(screen.queryByText('EU countries')).toBeNull()
  })

  it('reveals the EU-countries field once EU is selected', () => {
    renderFields({ countries: [RecallCountry.eu] })
    expect(screen.getByText('EU countries')).toBeTruthy()
    // Placeholder signals the default: no narrowing = all EU.
    expect(screen.getByPlaceholderText('All EU countries')).toBeTruthy()
  })

  it('renders chosen member states as named chips (not raw ISO codes)', () => {
    renderFields({ countries: [RecallCountry.eu], affectedCountries: ['DE'] })
    expect(screen.getByRole('button', { name: 'Remove Germany' })).toBeTruthy()
  })

  it('clears the member-state narrowing when EU is unchecked', () => {
    const setField = renderFields({
      countries: [RecallCountry.eu],
      affectedCountries: ['DE'],
    })
    // The checkbox carries the full country name from the config, not the code.
    fireEvent.click(screen.getByRole('checkbox', { name: /European Union/ }))
    // Two setField calls fire; the narrowing one resets affectedCountries to [].
    expect(setField).toHaveBeenCalledWith('affectedCountries', [])
  })
})
