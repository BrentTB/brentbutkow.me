import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCopiedFlag } from './useCopiedFlag'

describe('useCopiedFlag', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('flashes copied on a successful action, then clears after the duration', async () => {
    const { result } = renderHook(() => useCopiedFlag(1000))
    expect(result.current[0]).toBe(false)

    await act(async () => {
      await result.current[1](() => Promise.resolve(true))
    })
    expect(result.current[0]).toBe(true)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current[0]).toBe(false)
  })

  it('stays unflashed when the action reports failure', async () => {
    const { result } = renderHook(() => useCopiedFlag())
    await act(async () => {
      await result.current[1](() => Promise.resolve(false))
    })
    expect(result.current[0]).toBe(false)
  })

  it('cancels a pending timer on unmount', async () => {
    const { result, unmount } = renderHook(() => useCopiedFlag(1000))
    await act(async () => {
      await result.current[1](() => Promise.resolve(true))
    })
    expect(result.current[0]).toBe(true)
    unmount()
    // Advancing past the duration must not fire a setState on the unmounted hook.
    act(() => vi.advanceTimersByTime(1000))
  })

  it('resets the timer when copied again before it clears', async () => {
    const { result } = renderHook(() => useCopiedFlag(1000))
    await act(async () => {
      await result.current[1](() => Promise.resolve(true))
    })
    act(() => vi.advanceTimersByTime(600))
    await act(async () => {
      await result.current[1](() => Promise.resolve(true))
    })
    act(() => vi.advanceTimersByTime(600))
    expect(result.current[0]).toBe(true) // first timer would have fired at 1000
    act(() => vi.advanceTimersByTime(400))
    expect(result.current[0]).toBe(false)
  })
})
