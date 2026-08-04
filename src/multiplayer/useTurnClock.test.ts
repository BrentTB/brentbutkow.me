import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatClock, useTurnClock } from './useTurnClock'

const NOW = Date.parse('2030-01-01T00:00:00.000Z')
const inSeconds = (seconds: number) => new Date(NOW + seconds * 1000).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => vi.useRealTimers())

describe('useTurnClock', () => {
  it('has nothing to count when there is no clock', () => {
    const { result } = renderHook(() => useTurnClock(null))
    expect(result.current).toBeNull()
  })

  it('starts from the seconds left on the deadline', () => {
    const { result } = renderHook(() => useTurnClock(inSeconds(30)))
    expect(result.current).toBe(30)
  })

  it('counts down as time passes', () => {
    const { result } = renderHook(() => useTurnClock(inSeconds(10)))
    act(() => void vi.advanceTimersByTime(3000))
    expect(result.current).toBe(7)
  })

  it('stops at zero rather than going negative', () => {
    const { result } = renderHook(() => useTurnClock(inSeconds(2)))
    act(() => void vi.advanceTimersByTime(10_000))
    expect(result.current).toBe(0)
  })

  it('restarts when the turn changes', () => {
    const { result, rerender } = renderHook(({ ends }) => useTurnClock(ends), {
      initialProps: { ends: inSeconds(30) },
    })
    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current).toBe(25)

    // The opponent moved, so the room hands back a fresh deadline.
    rerender({ ends: new Date(NOW + 5000 + 30_000).toISOString() })
    expect(result.current).toBe(30)
  })

  it('ignores a deadline it cannot read', () => {
    const { result } = renderHook(() => useTurnClock('not-a-date'))
    expect(result.current).toBeNull()
  })

  it('goes back to nothing when the clock stops, which is how a game finishing looks', () => {
    // The live transition: the room reports no deadline once nobody is on turn, and the countdown has
    // to come off the screen rather than freeze on its last number.
    const { result, rerender } = renderHook(
      ({ ends }: { ends: string | null }) => useTurnClock(ends),
      {
        initialProps: { ends: inSeconds(30) as string | null },
      }
    )
    expect(result.current).toBe(30)

    rerender({ ends: null })
    expect(result.current).toBeNull()
  })

  it('ticks on the deadline second rather than drifting off its own start', () => {
    // Started 400ms into a second: an unaligned interval would show 30 at t=600 and again at t=1400,
    // then skip 29 altogether.
    vi.setSystemTime(NOW + 400)
    const { result } = renderHook(() => useTurnClock(new Date(NOW + 30_400).toISOString()))
    expect(result.current).toBe(30)

    act(() => void vi.advanceTimersByTime(400))
    expect(result.current).toBe(30)
    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current).toBe(29)
    act(() => void vi.advanceTimersByTime(1000))
    expect(result.current).toBe(28)
  })

  it('stops ticking once there is nothing left to count', () => {
    const { result } = renderHook(() => useTurnClock(inSeconds(2)))
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current).toBe(0)
    // Nothing is still pending: the server decides the timeout from here.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('leaves no timer running after it unmounts', () => {
    const { unmount } = renderHook(() => useTurnClock(inSeconds(30)))
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('formatClock', () => {
  it('reads as minutes and seconds', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(9)).toBe('0:09')
    expect(formatClock(60)).toBe('1:00')
    expect(formatClock(97)).toBe('1:37')
    expect(formatClock(600)).toBe('10:00')
  })
})
