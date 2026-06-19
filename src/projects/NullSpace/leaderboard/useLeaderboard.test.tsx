import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLeaderboard } from './useLeaderboard'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useLeaderboard', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads the top scores from /nullspace/leaderboard', async () => {
    const fetchMock = vi.fn(async () => mockRes([{ id: 1, name: 'ACE', score: 1000, wave: 9 }]))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useLeaderboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data?.[0].name).toBe('ACE')
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/nullspace/leaderboard'),
      expect.anything()
    )
  })

  it('rejects a malformed payload (a row missing required fields)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([{ id: 1, name: 'ACE' }]))
    )

    const { result } = renderHook(() => useLeaderboard())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
