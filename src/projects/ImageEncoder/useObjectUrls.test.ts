import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useObjectUrls } from './useObjectUrls'

beforeEach(() => {
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useObjectUrls', () => {
  it('returns the url it tracks and revokes all on demand', () => {
    const { result } = renderHook(() => useObjectUrls())
    expect(result.current.track('blob:a')).toBe('blob:a')
    result.current.track('blob:b')
    result.current.revokeAll()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:a')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:b')
    // A second revoke is a no-op because the set was cleared.
    ;(URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear()
    result.current.revokeAll()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('revokes any leftover urls on unmount', () => {
    const { result, unmount } = renderHook(() => useObjectUrls())
    result.current.track('blob:c')
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:c')
  })
})
