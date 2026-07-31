import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useViewportHeight } from './useViewportHeight'

const setViewport = (height: number) => {
  window.innerHeight = height
  window.dispatchEvent(new Event('resize'))
}

/** Runs whatever the hook queued for the frame after a rotation. */
const nextFrame = () => act(() => vi.advanceTimersByTime(32))

const original = window.innerHeight

beforeEach(() => {
  // Fake timers so the post-rotation frame can be run on demand; jsdom maps rAF onto timers.
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  window.innerHeight = original
})

describe('useViewportHeight', () => {
  it('starts at the current window height', () => {
    window.innerHeight = 900
    const { result } = renderHook(() => useViewportHeight())
    expect(result.current).toBe(900)
  })

  it('follows the window as it resizes', () => {
    window.innerHeight = 900
    const { result } = renderHook(() => useViewportHeight())

    act(() => setViewport(640))
    expect(result.current).toBe(640)
  })

  /**
   * Regression: iOS Safari fires `orientationchange` before `innerHeight` reports the new orientation, so
   * measuring in the handler stored the height from before the rotation — leaving the board sized for a
   * portrait viewport on a landscape screen until something else happened to resize.
   */
  it('waits a frame after an orientation change before measuring', () => {
    window.innerHeight = 812
    const { result } = renderHook(() => useViewportHeight())

    act(() => {
      // The event arrives while the old height is still being reported.
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(result.current).toBe(812)

    // By the next frame the new orientation is in place.
    window.innerHeight = 375
    nextFrame()
    expect(result.current).toBe(375)
  })

  it('stops listening once unmounted', () => {
    window.innerHeight = 900
    const { result, unmount } = renderHook(() => useViewportHeight())
    unmount()

    act(() => setViewport(300))
    expect(result.current).toBe(900)
  })

  /** A rotation still in flight when the page moves on must not measure into an unmounted hook. */
  it('drops a pending rotation measurement on unmount', () => {
    window.innerHeight = 812
    const { result, unmount } = renderHook(() => useViewportHeight())

    act(() => window.dispatchEvent(new Event('orientationchange')))
    unmount()

    window.innerHeight = 375
    nextFrame()
    expect(result.current).toBe(812)
  })
})
