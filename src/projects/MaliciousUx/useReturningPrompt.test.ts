import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HOSTILITY } from './data'
import { useReturningPrompt } from './useReturningPrompt'

const DELAY = HOSTILITY.bannerReviveMs

describe('useReturningPrompt', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts visible', () => {
    const { result } = renderHook(() => useReturningPrompt(DELAY))
    expect(result.current.visible).toBe(true)
  })

  it('comes back on its own after a plain dismissal', () => {
    const { result } = renderHook(() => useReturningPrompt(DELAY))

    act(() => result.current.dismiss(false))
    expect(result.current.visible).toBe(false)

    act(() => vi.advanceTimersByTime(DELAY))
    expect(result.current.visible).toBe(true)
    expect(result.current.returns).toBe(1)
  })

  it('counts down the seconds while it waits', () => {
    const { result } = renderHook(() => useReturningPrompt(DELAY))

    act(() => result.current.dismiss(false))
    expect(result.current.secondsLeft).toBe(DELAY / 1000)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.secondsLeft).toBe(DELAY / 1000 - 1)
  })

  it('stays gone when dismissed for good', () => {
    const { result } = renderHook(() => useReturningPrompt(DELAY))

    act(() => result.current.dismiss(true))
    act(() => vi.advanceTimersByTime(DELAY * 3))

    expect(result.current.visible).toBe(false)
    expect(result.current.gone).toBe(true)
    expect(result.current.returns).toBe(0)
  })

  it('keeps coming back, once per wait', () => {
    const { result } = renderHook(() => useReturningPrompt(DELAY))

    act(() => result.current.dismiss(false))
    act(() => vi.advanceTimersByTime(DELAY))
    act(() => result.current.dismiss(false))
    act(() => vi.advanceTimersByTime(DELAY))

    expect(result.current.returns).toBe(2)
  })

  it('resets to a clean slate', () => {
    const { result } = renderHook(() => useReturningPrompt(DELAY))

    act(() => result.current.dismiss(true))
    act(() => result.current.reset())

    expect(result.current).toMatchObject({
      visible: true,
      gone: false,
      returns: 0,
      secondsLeft: null,
    })
  })

  it('clears its timers on unmount', () => {
    const { result, unmount } = renderHook(() => useReturningPrompt(DELAY))

    act(() => result.current.dismiss(false))
    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
