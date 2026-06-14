import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWarmApi } from './useWarmApi'

const okRes = () => ({ ok: true, status: 200, json: async () => ({ status: 'ok' }) }) as Response

describe('useWarmApi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('pings /health on mount when the API base is configured', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3000')
    const fetchMock = vi.fn(async () => okRes())
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useWarmApi())

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.anything())
  })

  it('does nothing when the API base is not configured', () => {
    vi.stubEnv('VITE_API_URL', '')
    const fetchMock = vi.fn(async () => okRes())
    vi.stubGlobal('fetch', fetchMock)

    renderHook(() => useWarmApi())

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
