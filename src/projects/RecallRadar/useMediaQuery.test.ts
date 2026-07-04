import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useMediaQuery } from './useMediaQuery'

type Listener = (e: MediaQueryListEvent) => void

// jsdom has no matchMedia — install a controllable fake that records its change listener so a test
// can flip the match state at runtime.
function mockMatchMedia(initial: boolean) {
  let listener: Listener | null = null
  const mql = {
    matches: initial,
    media: '(max-width: 720px)',
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

describe('useMediaQuery', () => {
  it('reflects a matching query', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useMediaQuery('(max-width: 720px)'))
    expect(result.current).toBe(true)
  })

  it('defaults to false when the query does not match', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 720px)'))
    expect(result.current).toBe(false)
  })

  it('updates live when the query crosses its breakpoint', () => {
    const mm = mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery('(max-width: 720px)'))
    expect(result.current).toBe(false)
    act(() => mm.emit(true))
    expect(result.current).toBe(true)
  })

  it('returns false and does not throw where matchMedia is unavailable (SSR / old runtimes)', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useMediaQuery('(max-width: 720px)'))
    expect(result.current).toBe(false)
  })
})
