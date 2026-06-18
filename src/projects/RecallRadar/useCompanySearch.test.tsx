import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompanySearch } from './useCompanySearch'
import { RecallCountry } from './recall.types'

const mockRes = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response

describe('useCompanySearch', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches company suggestions for the country + query', async () => {
    let calledUrl = ''
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        calledUrl = String(url)
        return mockRes(['Acme Foods', 'Acme Bakery'])
      })
    )

    const { result } = renderHook(() => useCompanySearch('us', 'acme'))
    await waitFor(() => expect(result.current.companies).toEqual(['Acme Foods', 'Acme Bakery']))
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()

    expect(calledUrl).toContain('/recalls/companies')
    expect(calledUrl).toContain('q=acme')
    expect(calledUrl).toContain('country=us')
  })

  it('reports loading with an empty list until results arrive', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    )
    const { result } = renderHook(() => useCompanySearch('uk', ''))
    expect(result.current.companies).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('refetches when the country changes', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL) => {
        urls.push(String(url))
        return mockRes([])
      })
    )

    const { rerender } = renderHook(
      ({ country }: { country: RecallCountry }) => useCompanySearch(country, ''),
      { initialProps: { country: RecallCountry.us as RecallCountry } }
    )
    await waitFor(() => expect(urls.some((u) => u.includes('country=us'))).toBe(true))

    rerender({ country: RecallCountry.uk })
    await waitFor(() => expect(urls.some((u) => u.includes('country=uk'))).toBe(true))
  })

  it('surfaces an error when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, json: async () => null }) as Response)
    )
    const { result } = renderHook(() => useCompanySearch('us', 'acme'))
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.companies).toEqual([])
    expect(result.current.loading).toBe(false)
  })
})
