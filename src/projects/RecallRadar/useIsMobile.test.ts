import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useIsMobile } from './useIsMobile'

type Listener = (e: MediaQueryListEvent) => void

// jsdom has no matchMedia — install a controllable fake that records its change listener so a test
// can flip the viewport width at runtime.
function mockMatchMedia(initial: boolean) {
  let listener: Listener | null = null
  const mql = {
    matches: initial,
    media: '(max-width: 600px)',
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

describe('useIsMobile', () => {
  it('reflects a phone-width viewport', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('defaults to false on a wide viewport', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates live when the viewport crosses the breakpoint', () => {
    const mm = mockMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => mm.emit(true))
    expect(result.current).toBe(true)
  })

  it('returns false and does not throw where matchMedia is unavailable (SSR / old runtimes)', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
