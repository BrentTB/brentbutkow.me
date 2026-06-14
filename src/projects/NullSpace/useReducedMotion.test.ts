import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useReducedMotion } from './useReducedMotion'

type Listener = (e: MediaQueryListEvent) => void

// jsdom has no matchMedia — install a controllable fake that records its change
// listener so a test can flip the preference at runtime.
function mockMatchMedia(initial: boolean) {
  let listener: Listener | null = null
  const mql = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: (_: string, l: Listener) => {
      listener = l
    },
    removeEventListener: () => {
      listener = null
    },
  }
  const fn = vi.fn().mockReturnValue(mql)
  vi.stubGlobal('matchMedia', fn)
  window.matchMedia = fn as unknown as typeof window.matchMedia
  return {
    emit(matches: boolean) {
      mql.matches = matches
      listener?.({ matches } as MediaQueryListEvent)
    },
  }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useReducedMotion', () => {
  it('reflects the initial preference', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(true)
  })

  it('defaults to false when reduce-motion is off', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('updates live when the preference changes', () => {
    const mm = mockMatchMedia(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
    act(() => mm.emit(true))
    expect(result.current).toBe(true)
  })
})
