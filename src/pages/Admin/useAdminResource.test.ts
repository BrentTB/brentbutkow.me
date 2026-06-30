import { describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAdminResource } from './useAdminResource'
import { AdminApiError } from './admin-auth'
import type { AdminRequest } from './useAdminAuth'

describe('useAdminResource', () => {
  it('resolves data and clears loading', async () => {
    const request = vi.fn(async () => ({ value: 42 })) as unknown as AdminRequest

    const { result } = renderHook(() => useAdminResource(request, '/admin/overview'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ value: 42 })
    expect(result.current.error).toBeNull()
  })

  it('surfaces an error when the request rejects (e.g. 401 after logout)', async () => {
    const request = vi.fn(async () => {
      throw new AdminApiError(401)
    }) as unknown as AdminRequest

    const { result } = renderHook(() => useAdminResource(request, '/admin/overview'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toContain('401')
  })

  it('setData splices a mutation result into loaded data without a refetch', async () => {
    type Page = { items: { id: string; status: string }[]; total: number }
    const request = vi.fn(async () => ({
      items: [{ id: 'a', status: 'active' }],
      total: 1,
    })) as unknown as AdminRequest

    const { result } = renderHook(() => useAdminResource<Page>(request, '/admin/subscriptions'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setData((prev) =>
        prev ? { ...prev, items: prev.items.map((s) => ({ ...s, status: 'paused' })) } : prev
      )
    })

    expect(result.current.data).toEqual({ items: [{ id: 'a', status: 'paused' }], total: 1 })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('ignores AbortError without flipping to an error', async () => {
    let reject!: (reason: unknown) => void
    const pending = new Promise<never>((_, rej) => {
      reject = rej
    })
    const request = vi.fn(() => pending) as unknown as AdminRequest

    const { result } = renderHook(() => useAdminResource(request, '/admin/overview'))

    // Await the same rejection the hook handles, so its `.catch` has definitely run before we assert.
    await act(async () => {
      reject(new DOMException('aborted', 'AbortError'))
      await pending.catch(() => {})
    })

    // Abort is silent: state stays in its loading/no-error shape, never flips to error.
    expect(result.current.error).toBeNull()
    expect(result.current.loading).toBe(true)
  })
})
