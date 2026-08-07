import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_FLIP_SPEED, FLIP_SPEED_KEY, useFlipSpeed } from './useFlipSpeed'
import { FlipSpeed } from './othello.types'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('useFlipSpeed', () => {
  it('defaults to fast when nothing is stored', () => {
    const { result } = renderHook(() => useFlipSpeed())
    expect(result.current.flipSpeed).toBe(DEFAULT_FLIP_SPEED)
  })

  it('reads a stored preference', () => {
    localStorage.setItem(FLIP_SPEED_KEY, FlipSpeed.slow)
    const { result } = renderHook(() => useFlipSpeed())
    expect(result.current.flipSpeed).toBe(FlipSpeed.slow)
  })

  it('persists a chosen preference', () => {
    const { result } = renderHook(() => useFlipSpeed())
    act(() => result.current.choose(FlipSpeed.slow))
    expect(result.current.flipSpeed).toBe(FlipSpeed.slow)
    expect(localStorage.getItem(FLIP_SPEED_KEY)).toBe(FlipSpeed.slow)
  })

  it('ignores a junk stored value', () => {
    localStorage.setItem(FLIP_SPEED_KEY, 'warp-speed')
    const { result } = renderHook(() => useFlipSpeed())
    expect(result.current.flipSpeed).toBe(DEFAULT_FLIP_SPEED)
  })
})
