import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useGeo } from './useGeo'

const mockRes = (body: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => body }) as Response

describe('useGeo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("returns 'us' when the API responds with country 'us'", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ country: 'us' }))
    )

    const { result } = renderHook(() => useGeo())
    await waitFor(() => expect(result.current).not.toBeNull())

    expect(result.current).toBe('us')
  })

  it("returns 'uk' when the API responds with country 'uk'", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ country: 'uk' }))
    )

    const { result } = renderHook(() => useGeo())
    await waitFor(() => expect(result.current).not.toBeNull())

    expect(result.current).toBe('uk')
  })

  it("returns 'za' when the API responds with country 'za'", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ country: 'za' }))
    )

    const { result } = renderHook(() => useGeo())
    await waitFor(() => expect(result.current).not.toBeNull())

    expect(result.current).toBe('za')
  })

  it('returns null for an unknown country code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes({ country: 'FR' }))
    )

    const { result } = renderHook(() => useGeo())
    // Give the hook time to settle; it should stay null
    await new Promise((r) => setTimeout(r, 50))

    expect(result.current).toBeNull()
  })

  it('returns null on a network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      })
    )

    const { result } = renderHook(() => useGeo())
    await new Promise((r) => setTimeout(r, 50))

    expect(result.current).toBeNull()
  })

  it('returns null on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => mockRes(null, 500))
    )

    const { result } = renderHook(() => useGeo())
    await new Promise((r) => setTimeout(r, 50))

    expect(result.current).toBeNull()
  })
})
