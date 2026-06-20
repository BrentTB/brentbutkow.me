import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTopics } from './useTopics'
import { RecallCountry } from './recall.types'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useTopics', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads themes from /recalls/topics', async () => {
    const topics = [
      { id: 0, label: 'listeria · deli · meat', topTerms: ['listeria', 'deli', 'meat'], size: 9 },
    ]
    const fetchMock = vi.fn(async () => mockRes(topics))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useTopics('us'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(topics)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/topics?country=us'),
      expect.anything()
    )
  })

  it('refetches when the country changes', async () => {
    const fetchMock = vi.fn(async () => mockRes([]))
    vi.stubGlobal('fetch', fetchMock)

    const initialProps: { country: RecallCountry } = { country: RecallCountry.us }
    const { result, rerender } = renderHook(({ country }) => useTopics(country), { initialProps })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/recalls/topics?country=us'),
      expect.anything()
    )

    rerender({ country: RecallCountry.uk })
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/recalls/topics?country=uk'),
        expect.anything()
      )
    )
  })

  it('rejects a malformed payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([{ id: 'nope' }]))
    )
    const { result } = renderHook(() => useTopics('us'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
