import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCompanySearch } from './useCompanySearch'

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
    await waitFor(() => expect(result.current).toEqual(['Acme Foods', 'Acme Bakery']))

    expect(calledUrl).toContain('/recalls/companies')
    expect(calledUrl).toContain('q=acme')
    expect(calledUrl).toContain('country=us')
  })

  it('returns an empty list until results arrive', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    )
    const { result } = renderHook(() => useCompanySearch('uk', ''))
    expect(result.current).toEqual([])
  })
})
