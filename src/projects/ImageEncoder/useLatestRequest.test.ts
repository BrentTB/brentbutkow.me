import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useLatestRequest } from './useLatestRequest'

describe('useLatestRequest', () => {
  it('is current right after begin', () => {
    const { result } = renderHook(() => useLatestRequest())
    const isStale = result.current()
    expect(isStale()).toBe(false)
  })

  it('supersedes an earlier request when a newer one begins', () => {
    const { result } = renderHook(() => useLatestRequest())
    const first = result.current()
    const second = result.current()
    expect(first()).toBe(true)
    expect(second()).toBe(false)
  })

  it('marks every request stale once unmounted', () => {
    const { result, unmount } = renderHook(() => useLatestRequest())
    const isStale = result.current()
    expect(isStale()).toBe(false)
    unmount()
    expect(isStale()).toBe(true)
  })
})
