import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useStickyHeader } from './useStickyHeader'

// jsdom doesn't scroll, so drive scrollY directly and flush the hook's coalescing rAF by hand.
const setScroll = (y: number) =>
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })

let rafCallbacks: Array<((time: number) => void) | undefined> = []
const flushRaf = () => {
  const pending = rafCallbacks
  rafCallbacks = []
  pending.forEach((cb) => cb?.(0))
}

beforeEach(() => {
  rafCallbacks = []
  // push returns the new length — used as the frame id, so cancel can null the right slot.
  vi.stubGlobal('requestAnimationFrame', (cb: (time: number) => void) => rafCallbacks.push(cb))
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks[id - 1] = undefined
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  setScroll(0)
})

describe('useStickyHeader', () => {
  it('collapses and hides the navbar past the threshold, then restores both at the top', () => {
    const { result, unmount } = renderHook(() => useStickyHeader())
    expect(result.current).toEqual({ collapsed: false, navHidden: false })

    act(() => {
      setScroll(100)
      window.dispatchEvent(new Event('scroll'))
      flushRaf()
    })
    expect(result.current).toEqual({ collapsed: true, navHidden: true })

    // Returning to the top reveals the navbar again — direction-independent, only the top restores it.
    act(() => {
      setScroll(0)
      window.dispatchEvent(new Event('scroll'))
      flushRaf()
    })
    expect(result.current).toEqual({ collapsed: false, navHidden: false })

    unmount()
  })

  it('removes the scroll listener and cancels a pending frame when the last subscriber unmounts', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const cancelSpy = vi.fn()
    vi.stubGlobal('cancelAnimationFrame', cancelSpy)

    const { unmount } = renderHook(() => useStickyHeader())
    act(() => {
      setScroll(100)
      // Scheduled but left unflushed, so a frame is still pending at unmount.
      window.dispatchEvent(new Event('scroll'))
    })
    unmount()

    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(cancelSpy).toHaveBeenCalled()
    removeSpy.mockRestore()
  })
})
