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
