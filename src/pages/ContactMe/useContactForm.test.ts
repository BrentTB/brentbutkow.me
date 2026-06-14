import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useContactForm } from './useContactForm'

const okRes = { ok: true, status: 200, json: async () => ({ status: 'ok' }) } as Response

describe('useContactForm', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('posts the message with client context and resolves to success', async () => {
    const fetchMock = vi.fn(async () => okRes)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useContactForm())
    await act(async () => {
      await result.current.submit({ name: 'A', email: 'a@b.com', message: 'hi', website: '' })
    })

    expect(result.current.status).toBe('success')
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const body = JSON.parse(String(calls[0][1].body))
    expect(body.message).toBe('hi')
    expect(typeof body.timezone).toBe('string') // client context attached
    expect(typeof body.elapsedMs).toBe('number') // time-trap signal attached
    expect(body.website).toBeUndefined() // empty honeypot dropped
  })

  it('resets the elapsed clock after a successful send', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => okRes)
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useContactForm())

    vi.advanceTimersByTime(5000)
    await act(async () => {
      await result.current.submit({ name: '', email: '', message: 'a', website: '' })
    })
    vi.advanceTimersByTime(100)
    await act(async () => {
      await result.current.submit({ name: '', email: '', message: 'b', website: '' })
    })

    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>
    const first = JSON.parse(String(calls[0][1].body))
    const second = JSON.parse(String(calls[1][1].body))
    expect(first.elapsedMs).toBeGreaterThanOrEqual(5000) // measured from mount
    expect(second.elapsedMs).toBeLessThan(1000) // clock reset on the first success
  })

  it('reports an error when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500 }) as Response)
    )
    const { result } = renderHook(() => useContactForm())
    await act(async () => {
      await result.current.submit({ name: '', email: '', message: 'x', website: '' })
    })
    expect(result.current.status).toBe('error')
  })
})
