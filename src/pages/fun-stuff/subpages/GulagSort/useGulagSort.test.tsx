import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useGulagSort } from './useGulagSort'

describe('useGulagSort', () => {
  it('starts empty and idle', () => {
    const { result } = renderHook(() => useGulagSort())
    expect(result.current.gulags).toEqual([])
    expect(result.current.isAnimating).toBe(false)
  })

  it('reset clears the gulags and stops animating', () => {
    const { result } = renderHook(() => useGulagSort())
    act(() => result.current.reset())
    expect(result.current.gulags).toEqual([])
    expect(result.current.isAnimating).toBe(false)
  })

  it('animates to a single ascending gulag', async () => {
    const { result } = renderHook(() => useGulagSort())
    // speed 0 → each frame delay is 0ms, so the animation resolves promptly.
    await act(async () => {
      await result.current.start([5, 2, 4, 1, 3], 0)
    })
    await waitFor(() => expect(result.current.isAnimating).toBe(false))

    expect(result.current.gulags).toHaveLength(1)
    const values = result.current.gulags[0].filter((b) => !b.removed).map((b) => b.value)
    expect(values).toEqual([1, 2, 3, 4, 5])
  })
})
