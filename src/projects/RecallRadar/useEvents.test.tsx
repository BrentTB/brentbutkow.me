import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEvents } from './useEvents'
import { RecallCountry } from './recall.types'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

const event = {
  id: 0,
  slug: 'listeria-2026-03',
  label: 'Listeria · 7 recalls',
  isOutbreak: true,
  dominantEntity: 'Listeria',
  recallCount: 7,
  companyCount: 3,
  stateCount: 4,
  firstDate: '2026-03-01',
  lastDate: '2026-03-18',
  severityMax: 92,
}

describe('useEvents', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('loads clusters from /recalls/events', async () => {
    const fetchMock = vi.fn(async () => mockRes([event]))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useEvents('us'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual([event])
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/recalls/events?country=us'),
      expect.anything()
    )
  })

  it('refetches when the country changes', async () => {
    const fetchMock = vi.fn(async () => mockRes([]))
    vi.stubGlobal('fetch', fetchMock)

    const initialProps: { country: RecallCountry } = { country: RecallCountry.us }
    const { result, rerender } = renderHook(({ country }) => useEvents(country), { initialProps })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/recalls/events?country=us'),
      expect.anything()
    )

    rerender({ country: RecallCountry.uk })
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('/recalls/events?country=uk'),
        expect.anything()
      )
    )
  })

  it('rejects a malformed payload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes([{ id: 'nope' }]))
    )
    const { result } = renderHook(() => useEvents('us'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })
})
