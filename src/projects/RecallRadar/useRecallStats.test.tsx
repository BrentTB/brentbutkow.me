import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRecallStats } from './useRecallStats'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useRecallStats', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads stats from /recalls/stats', async () => {
    const fetchMock = vi.fn(async () =>
      mockRes({
        total: 5,
        byCategory: [],
        byMonth: [],
        byClassification: [],
        byState: [],
        byCompany: [],
        bySource: [],
        lastIngestAt: null,
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useRecallStats())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.total).toBe(5)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/stats'),
      expect.anything()
    )
  })

  it('rejects a malformed payload missing required arrays', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ total: 5, byCategory: [] }))
    )

    const { result } = renderHook(() => useRecallStats())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
