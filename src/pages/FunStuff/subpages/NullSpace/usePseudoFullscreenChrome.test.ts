import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { usePseudoFullscreenChrome } from './usePseudoFullscreenChrome'

describe('usePseudoFullscreenChrome', () => {
  let scrollTo: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('does nothing while inactive', () => {
    renderHook(() => usePseudoFullscreenChrome(false))
    vi.advanceTimersByTime(1000)
    window.dispatchEvent(new Event('orientationchange'))
    vi.advanceTimersByTime(1000)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('nudges Safari to hide its chrome on entry', () => {
    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(600)
    expect(scrollTo).toHaveBeenCalledWith(0, expect.any(Number))
  })

  // Regression: rotating the phone re-shows Safari's URL/tab bar, but the entry
  // nudge fired only once. Without an orientationchange listener the bar stays
  // visible after a rotate — the exact bug this hook fixes.
  it('re-nudges after an orientation change', () => {
    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(600)
    const afterEntry = scrollTo.mock.calls.length
    expect(afterEntry).toBeGreaterThan(0)

    window.dispatchEvent(new Event('orientationchange'))
    vi.advanceTimersByTime(600)
    expect(scrollTo.mock.calls.length).toBeGreaterThan(afterEntry)
  })

  // Regression: orientationchange is unreliable on iOS — Safari re-shows its
  // chrome on the viewport resize that follows a rotate, so the hook also
  // listens for resize.
  it('re-nudges after a viewport resize', () => {
    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(600)
    const afterEntry = scrollTo.mock.calls.length

    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(600)
    expect(scrollTo.mock.calls.length).toBeGreaterThan(afterEntry)
  })

  it('stops nudging after unmount', () => {
    const { unmount } = renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(600)
    unmount()
    const afterUnmount = scrollTo.mock.calls.length

    window.dispatchEvent(new Event('orientationchange'))
    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(600)
    expect(scrollTo.mock.calls.length).toBe(afterUnmount)
  })
})
