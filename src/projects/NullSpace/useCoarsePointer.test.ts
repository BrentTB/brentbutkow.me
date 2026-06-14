import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'
import { useCoarsePointer } from './useCoarsePointer'

type Listener = (e: MediaQueryListEvent) => void

// jsdom has no matchMedia — install a controllable fake that records its change
// listener so a test can flip the pointer type at runtime.
function mockMatchMedia(initial: boolean) {
  let listener: Listener | null = null
  const mql = {
    matches: initial,
    media: '(pointer: coarse)',
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

describe('useCoarsePointer', () => {
  it('reflects a coarse pointer', () => {
    mockMatchMedia(true)
    const { result } = renderHook(() => useCoarsePointer())
    expect(result.current).toBe(true)
  })

  it('defaults to false for a fine pointer', () => {
    mockMatchMedia(false)
    const { result } = renderHook(() => useCoarsePointer())
    expect(result.current).toBe(false)
  })

  it('updates live when the pointer type changes', () => {
    const mm = mockMatchMedia(false)
    const { result } = renderHook(() => useCoarsePointer())
    expect(result.current).toBe(false)
    act(() => mm.emit(true))
    expect(result.current).toBe(true)
  })

  it('returns false and does not throw where matchMedia is unavailable (SSR / old runtimes)', () => {
    vi.stubGlobal('matchMedia', undefined)
    const { result } = renderHook(() => useCoarsePointer())
    expect(result.current).toBe(false)
  })
})
