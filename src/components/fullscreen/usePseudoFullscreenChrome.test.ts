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

  // The bug this hook was reported as still having: rotate to landscape and Safari's bars come back and stay.
  // A landscape rotate shortens the page and the viewport, so the page is often already at its end — and the
  // old guard read "already at the bottom" as "bars already hidden" and skipped the scroll entirely.
  it('still scrolls after a rotate that leaves the page already at its end', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: PAGE_HEIGHT - 400 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 400 })

    renderHook(() => usePseudoFullscreenChrome(true))
    vi.advanceTimersByTime(1000)

    // Top first, so there is somewhere to travel down from, then back to the end.
    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    expect(scrollTo).toHaveBeenLastCalledWith(0, PAGE_HEIGHT)
  })

  it('listens to the visual viewport, which is the signal iOS reports for a rotate', () => {
    const add = vi.fn()
    const remove = vi.fn()
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: { addEventListener: add, removeEventListener: remove },
    })

    const view = renderHook(() => usePseudoFullscreenChrome(true))
    expect(add).toHaveBeenCalledWith('resize', expect.any(Function))

    view.unmount()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })
})
