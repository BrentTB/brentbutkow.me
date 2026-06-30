import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
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

  it('ignores AbortError without flipping to an error', async () => {
    const request = vi.fn(async () => {
      throw new DOMException('aborted', 'AbortError')
    }) as unknown as AdminRequest

    const { result } = renderHook(() => useAdminResource(request, '/admin/overview'))

    // Give the rejected promise a tick to settle; state must remain in its loading/no-error shape.
    await Promise.resolve()
    expect(result.current.error).toBeNull()
  })
})
