import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useViewportHeight } from './useViewportHeight'

const setViewport = (height: number) => {
  window.innerHeight = height
  window.dispatchEvent(new Event('resize'))
}

const original = window.innerHeight

afterEach(() => {
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

  it('follows an orientation change', () => {
    window.innerHeight = 812
    const { result } = renderHook(() => useViewportHeight())

    act(() => {
      window.innerHeight = 375
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(result.current).toBe(375)
  })

  it('stops listening once unmounted', () => {
    window.innerHeight = 900
    const { result, unmount } = renderHook(() => useViewportHeight())
    unmount()

    act(() => setViewport(300))
    expect(result.current).toBe(900)
  })
})
