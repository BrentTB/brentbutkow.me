import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { usePseudoFullscreenChrome } from './usePseudoFullscreenChrome'

describe('usePseudoFullscreenChrome', () => {
  let scrollTo: ReturnType<typeof vi.fn>
  const PAGE_HEIGHT = 5000

  beforeEach(() => {
    vi.useFakeTimers()
    scrollTo = vi.fn()
    vi.stubGlobal('scrollTo', scrollTo)
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
    Object.defineProperty(document.body, 'scrollHeight', {
      configurable: true,
      value: PAGE_HEIGHT,
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    // The end-of-page case redefines these; reset them so a later test starts from the jsdom defaults.
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
  })

  it('does nothing while inactive', () => {
    renderHook(() => usePseudoFullscreenChrome(false))
    vi.advanceTimersByTime(1000)
    window.dispatchEvent(new Event('orientationchange'))
    vi.advanceTimersByTime(1000)
    expect(scrollTo).not.toHaveBeenCalled()
  })

  // Guards the substance of the fix: scroll to the page bottom (full scrollHeight),
  // not a 1px nudge — the newer Safari tab bar only auto-hides at the bottom.
  it('nudges Safari to the page bottom to hide its chrome on entry', () => {
    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(600)
    expect(scrollTo).toHaveBeenCalledWith(0, PAGE_HEIGHT)
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

  // The regression that made hiding the chrome by hand impossible. Safari's bars appearing or disappearing is
  // itself a viewport resize, so nudging on one put the hook in a loop with the user: a swipe to dismiss the
  // bars resized the viewport, which scrolled the page out from under the gesture. Safari hides its own bars
  // when the user scrolls, and the page's only job is to not fight it.
  //
  // Timers are run right out past the tail of the nudge first, or the pending 900ms entry nudge fires during
  // the assertion window and the test passes without a listener existing at all.
  it('ignores a bare viewport resize, which is the bars moving rather than a rotate', () => {
    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(2000)
    const afterEntry = scrollTo.mock.calls.length
    expect(afterEntry).toBeGreaterThan(0)

    window.dispatchEvent(new Event('resize'))
    window.visualViewport?.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(2000)

    expect(scrollTo.mock.calls.length).toBe(afterEntry)
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

  // Only ever downward. An earlier version jumped to the top first whenever the page was already at its end,
  // to guarantee somewhere to travel back down from, and that upward jump is what a swipe to dismiss the
  // chrome was fighting: the page moved the opposite way to the finger.
  //
  // The trade is deliberate. A rotate that leaves the page already at its end now gets no nudge and Safari's
  // bars can stay up, where before the hook forced them down. That is the lesser bug, because the user can
  // swipe them away themselves once nothing is scrolling against them.
  it('leaves the page alone when it is already at its end', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: PAGE_HEIGHT - 400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 })

    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(2000)
    window.dispatchEvent(new Event('orientationchange'))
    vi.advanceTimersByTime(2000)

    // Not one call, up or down. The entry case above covers the scroll actually happening when there is room
    // for it, so this is only here to pin down that there is no second, upward move.
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
