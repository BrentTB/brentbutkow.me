import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  afterEach(() => vi.useRealTimers())

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('updates only after the delay elapses', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'b' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('a') // still debouncing

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('b')
  })

  it('collapses rapid changes into the last value', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    })

    rerender({ v: 'ab' })
    act(() => vi.advanceTimersByTime(150))
    rerender({ v: 'abc' })
    act(() => vi.advanceTimersByTime(150))
    expect(result.current).toBe('a') // timer reset by the second change

    act(() => vi.advanceTimersByTime(150))
    expect(result.current).toBe('abc')
  })
})
