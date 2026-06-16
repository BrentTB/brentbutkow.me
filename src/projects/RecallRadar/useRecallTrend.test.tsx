import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useRecallTrend } from './useRecallTrend'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useRecallTrend', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('fetches the monthly trend grouped by the given dimension', async () => {
    const fetchMock = vi.fn(async () => mockRes({ group: 'category', buckets: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useRecallTrend('us', 'category'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.group).toBe('category')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('group=category'),
      expect.anything()
    )
  })
})
