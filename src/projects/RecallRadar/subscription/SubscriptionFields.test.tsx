import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  AFFECTED_COUNTRIES_ALL,
  AFFECTED_COUNTRIES_LABEL,
  SubscriptionFields,
  type FilterFieldsValue,
} from './SubscriptionFields'
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

describe('SubscriptionFields — affected-country narrowing', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('hides the affected-countries field until EU is among the chosen countries', () => {
    renderFields({ countries: [RecallCountry.us] })
    expect(screen.queryByText(AFFECTED_COUNTRIES_LABEL)).toBeNull()
  })

  it('reveals the affected-countries field once EU is selected', () => {
    renderFields({ countries: [RecallCountry.eu] })
    expect(screen.getByText(AFFECTED_COUNTRIES_LABEL)).toBeTruthy()
    // Placeholder signals the default: no narrowing = all European countries.
    expect(screen.getByPlaceholderText(AFFECTED_COUNTRIES_ALL)).toBeTruthy()
  })

  it('renders chosen countries as named chips (not raw ISO codes)', () => {
    renderFields({ countries: [RecallCountry.eu], affectedCountries: ['DE'] })
    expect(screen.getByRole('button', { name: 'Remove Germany' })).toBeTruthy()
  })

  it('adds a picked country code to the narrowing', () => {
    const setField = renderFields({ countries: [RecallCountry.eu] })
    fireEvent.click(screen.getByRole('combobox', { name: 'Add a European country' }))
    fireEvent.mouseDown(screen.getByRole('option', { name: 'France' }))
    expect(setField).toHaveBeenCalledWith('affectedCountries', ['FR'])
  })

  it('does not offer a country that is already chosen', () => {
    renderFields({ countries: [RecallCountry.eu], affectedCountries: ['FR'] })
    fireEvent.click(screen.getByRole('combobox', { name: 'Add a European country' }))
    expect(screen.queryByRole('option', { name: 'France' })).toBeNull()
  })

  it('removes a chosen country when its chip is dismissed', () => {
    const setField = renderFields({
      countries: [RecallCountry.eu],
      affectedCountries: ['DE', 'FR'],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Germany' }))
    expect(setField).toHaveBeenCalledWith('affectedCountries', ['FR'])
  })

  it('clears the narrowing when EU is unchecked', () => {
    const setField = renderFields({
      countries: [RecallCountry.eu],
      affectedCountries: ['DE'],
    })
    // The checkbox carries the full country name from the config, not the code.
    fireEvent.click(screen.getByRole('checkbox', { name: /Europe/ }))
    // Two setField calls fire; the narrowing one resets affectedCountries to [].
    expect(setField).toHaveBeenCalledWith('affectedCountries', [])
  })
})
