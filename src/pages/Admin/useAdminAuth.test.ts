import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAdminAuth } from './useAdminAuth'

const future = () => new Date(Date.now() + 60_000).toISOString()

function jsonRes(status: number, body: unknown): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

describe('useAdminAuth', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => {
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('stores the token and resets to idle on a successful login', async () => {
    const session = { token: 'tok-123', expiresAt: future() }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes(200, session))
    )

    const { result } = renderHook(() => useAdminAuth())
    await act(async () => {
      await result.current.login('hunter2')
    })

    expect(result.current.token).toBe('tok-123')
    expect(result.current.status).toBe('idle')
    expect(sessionStorage.getItem('admin-session')).toContain('tok-123')
  })

  it('flags a wrong password (401) and stores no token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes(401, {}))
    )

    const { result } = renderHook(() => useAdminAuth())
    await act(async () => {
      await result.current.login('nope')
    })

    expect(result.current.status).toBe('wrongPassword')
    expect(result.current.token).toBeNull()
    expect(sessionStorage.getItem('admin-session')).toBeNull()
  })

  it('flags rate limiting on 429', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes(429, {}))
    )

    const { result } = renderHook(() => useAdminAuth())
    await act(async () => {
      await result.current.login('x')
    })

    expect(result.current.status).toBe('rateLimited')
  })

  it('logout clears the token and sessionStorage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonRes(200, { token: 't', expiresAt: future() }))
    )

    const { result } = renderHook(() => useAdminAuth())
    await act(async () => {
      await result.current.login('x')
    })
    act(() => result.current.logout())

    expect(result.current.token).toBeNull()
    expect(sessionStorage.getItem('admin-session')).toBeNull()
  })

  it('request attaches the Bearer header', async () => {
    const fetchMock = vi.fn(async () => jsonRes(200, { token: 'tok', expiresAt: future() }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAdminAuth())
    await act(async () => {
      await result.current.login('x')
    })
    await act(async () => {
      await result.current.request('/admin/overview')
    })

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const headers = calls[calls.length - 1][1].headers as Record<string, string>
    expect(headers.Authorization).toMatch(/^Bearer /)
  })

  it('request logs out and throws on 401', async () => {
    const fetchMock = vi
      .fn(async () => jsonRes(200, { token: 't', expiresAt: future() }))
      .mockImplementationOnce(async () => jsonRes(200, { token: 't', expiresAt: future() }))
      .mockImplementationOnce(async () => jsonRes(401, {}))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useAdminAuth())
    await act(async () => {
      await result.current.login('x')
    })

    await act(async () => {
      await expect(result.current.request('/admin/overview')).rejects.toMatchObject({ status: 401 })
    })

    expect(result.current.token).toBeNull()
    expect(sessionStorage.getItem('admin-session')).toBeNull()
  })
})
