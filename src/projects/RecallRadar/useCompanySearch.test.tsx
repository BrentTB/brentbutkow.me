import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompanySearch } from './useCompanySearch'
import type { TrendFilters } from './api'

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('useCompanySearch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches company suggestions with counts, forwarding the other filters', async () => {
    let calledUrl = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return mockRes([
          { label: 'Acme Foods', count: 3 },
          { label: 'Acme Bakery', count: 1 },
        ])
      })
    )

    const { result } = renderHook(() =>
      // company is the facet's own dimension, so it must be dropped from its own request.
      useCompanySearch(
        { country: 'us', category: 'allergen', company: 'should-be-dropped' },
        'acme'
      )
    )
    await waitFor(() =>
      expect(result.current.companies).toEqual([
        { name: 'Acme Foods', count: 3 },
        { name: 'Acme Bakery', count: 1 },
      ])
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()

    expect(calledUrl).toContain('/recalls/companies')
    expect(calledUrl).toContain('q=acme')
    expect(calledUrl).toContain('country=us')
    expect(calledUrl).toContain('category=allergen') // other filters scope the counts
    expect(calledUrl).not.toContain('company=') // ...but never company itself
  })

  it('reports loading with an empty list until results arrive', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    )
    const { result } = renderHook(() => useCompanySearch({ country: 'uk' }, ''))
    expect(result.current.companies).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('refetches when the filters change', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(String(url))
        return mockRes([])
      })
    )

    const { rerender } = renderHook(
      ({ filters }: { filters: TrendFilters }) => useCompanySearch(filters, ''),
      { initialProps: { filters: { country: 'us' } as TrendFilters } }
    )
    await waitFor(() => expect(urls.some((u) => u.includes('country=us'))).toBe(true))

    rerender({ filters: { country: 'us', severity: 'severe' } })
    await waitFor(() => expect(urls.some((u) => u.includes('severity=severe'))).toBe(true))
  })

  it('surfaces an error when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => null }) as Response)
    )
    const { result } = renderHook(() => useCompanySearch({ country: 'us' }, 'acme'))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.companies).toEqual([])
    expect(result.current.loading).toBe(false)
  })
})
