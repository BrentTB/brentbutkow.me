import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFacets } from './useFacets'

const facets = {
  category: [{ label: 'allergen', count: 30 }],
  classification: [],
  severity: [],
  source: [],
  state: [],
  company: [],
  entity: [],
  topicCounts: {},
  eventCounts: {},
}

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useFacets', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches per-facet counts and forwards the active filters', async () => {
    const fetchMock = vi.fn(async () => mockRes(facets))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useFacets({ country: 'us', category: 'allergen' }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.category[0]).toEqual({ label: 'allergen', count: 30 })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/facets'),
      expect.anything()
    )
    // Filters ride along so the counts describe the same recalls as the list + trend.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('category=allergen'),
      expect.anything()
    )
  })

  it('surfaces an error and clears data when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes(null, 500))
    )
    const { result } = renderHook(() => useFacets({ country: 'us' }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeNull()
  })
})
