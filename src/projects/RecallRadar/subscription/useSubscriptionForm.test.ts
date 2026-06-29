import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as fc from 'fast-check'
import { useSubscriptionForm } from './useSubscriptionForm'
import { RecallCategory, RecallCountry, SeverityLabel } from '../recall.types'
import type { RecallFilterValues } from '../recall.types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

/** Minimal valid fields that pass all local validation */
const validFields = () => ({
  email: 'test@example.com',
  countries: [RecallCountry.us],
  entities: ['peanut'],
  company: '',
  categories: [] as RecallCategory[],
  minSeverity: '' as SeverityLabel | '',
})

afterEach(() => vi.unstubAllGlobals())

// Property-based: the form pre-populates from arbitrary dashboard filter values.
describe('useSubscriptionForm — pre-population from dashboard filters', () => {
  it('pre-populates fields from arbitrary RecallFilterValues', () => {
    const categoryValues = Object.values(RecallCategory) as RecallCategory[]
    const severityValues = Object.values(SeverityLabel) as SeverityLabel[]

    const filterArb = fc.record<RecallFilterValues>({
      category: fc.oneof(
        fc.constantFrom(...categoryValues),
        fc.constant('' as RecallCategory | '')
      ),
      classification: fc.constant(''),
      severity: fc.oneof(fc.constantFrom(...severityValues), fc.constant('' as SeverityLabel | '')),
      topic: fc.constant(''),
      event: fc.constant(''),
      state: fc.constant(''),
      company: fc.oneof(fc.string({ maxLength: 50 }), fc.constant('')),
      source: fc.constant(''),
      entity: fc.oneof(fc.string({ minLength: 1, maxLength: 50 }), fc.constant('')),
      search: fc.constant(''),
      since: fc.constant(''),
      until: fc.constant(''),
    })

    fc.assert(
      fc.property(filterArb, (filters) => {
        const { result } = renderHook(() => useSubscriptionForm(filters))
        const fields = result.current.fields

        // entities: contains filters.entity when non-empty
        if (filters.entity && filters.entity.trim().length > 0) {
          expect(fields.entities).toContain(filters.entity)
        }

        // company: equals filters.company
        expect(fields.company).toBe(filters.company ?? '')

        // categories: contains filters.category when non-empty
        if (filters.category && filters.category.length > 0) {
          expect(fields.categories).toContain(filters.category as RecallCategory)
        }

        // minSeverity: equals filters.severity when it's a valid SeverityLabel
        if (filters.severity && (severityValues as string[]).includes(filters.severity)) {
          expect(fields.minSeverity).toBe(filters.severity)
        }
      }),
      { numRuns: 100 }
    )
  })
})

describe('useSubscriptionForm — country seeding', () => {
  it('pre-selects the provided initial countries', () => {
    const { result } = renderHook(() => useSubscriptionForm(undefined, [RecallCountry.za]))
    expect(result.current.fields.countries).toEqual([RecallCountry.za])
  })

  it('defaults to no selected countries when none are provided', () => {
    const { result } = renderHook(() => useSubscriptionForm())
    expect(result.current.fields.countries).toEqual([])
  })
})

describe('useSubscriptionForm — validation', () => {
  it('1. invalid email sets fieldErrors.email and does NOT call fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSubscriptionForm())

    act(() => {
      result.current.setField('email', 'not-an-email')
      result.current.setField('countries', [RecallCountry.us])
      result.current.setField('entities', ['peanut'])
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.fieldErrors.email).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('2. empty countries array sets fieldErrors.countries', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSubscriptionForm())

    act(() => {
      result.current.setField('email', 'test@example.com')
      result.current.setField('countries', [])
      result.current.setField('entities', ['peanut'])
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.fieldErrors.countries).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('3. all filters empty sets errorMessage and does NOT call fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useSubscriptionForm())

    act(() => {
      result.current.setField('email', 'test@example.com')
      result.current.setField('countries', [RecallCountry.us])
      result.current.setField('entities', [])
      result.current.setField('company', '')
      result.current.setField('categories', [])
      result.current.setField('minSeverity', '')
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.errorMessage).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('useSubscriptionForm — HTTP response mapping', () => {
  it('4. HTTP 409 sets status to "duplicate"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes(null, 409))
    )

    const { result } = renderHook(() => useSubscriptionForm())

    act(() => {
      result.current.setField('email', validFields().email)
      result.current.setField('countries', validFields().countries)
      result.current.setField('entities', validFields().entities)
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('duplicate')
  })

  it('5. HTTP 422 with detail array maps to fieldErrors', async () => {
    const body = {
      detail: [{ loc: ['body', 'email'], msg: 'bad email', type: 'value_error' }],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes(body, 422))
    )

    const { result } = renderHook(() => useSubscriptionForm())

    act(() => {
      result.current.setField('email', 'test@example.com')
      result.current.setField('countries', [RecallCountry.us])
      result.current.setField('entities', ['peanut'])
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.fieldErrors.email).toBe('bad email')
  })

  it('6. network error sets status to "error" and errorMessage non-null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network failure')))
    )

    const { result } = renderHook(() => useSubscriptionForm())

    act(() => {
      result.current.setField('email', validFields().email)
      result.current.setField('countries', validFields().countries)
      result.current.setField('entities', validFields().entities)
    })

    await act(async () => {
      await result.current.submit()
    })

    expect(result.current.status).toBe('error')
    expect(result.current.errorMessage).not.toBeNull()
  })
})
