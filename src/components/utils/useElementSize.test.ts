import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useElementSize } from './useElementSize'

function elementOf(width: number, height: number) {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  return element
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useElementSize', () => {
  it('reports zeroes when there is no element to measure', () => {
    const { result } = renderHook(() => useElementSize({ current: null }))
    expect(result.current).toEqual({ width: 0, height: 0 })
  })

  it('measures the element on mount', () => {
    const ref = { current: elementOf(640, 480) }
    const { result } = renderHook(() => useElementSize(ref))
    expect(result.current).toEqual({ width: 640, height: 480 })
  })

  it('still measures once when ResizeObserver is missing', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const ref = { current: elementOf(300, 200) }
    const { result } = renderHook(() => useElementSize(ref))
    expect(result.current).toEqual({ width: 300, height: 200 })
  })

  it('follows the element as it resizes', () => {
    const observers: (() => void)[] = []
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observers.push(callback)
        }
        observe() {}
        disconnect() {}
      }
    )

    const element = elementOf(100, 100)
    const { result, rerender } = renderHook(() => useElementSize({ current: element }))
    expect(result.current).toEqual({ width: 100, height: 100 })

    element.getBoundingClientRect = () => ({
      width: 250,
      height: 125,
      top: 0,
      left: 0,
      right: 250,
      bottom: 125,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })
    observers.forEach((notify) => notify())
    rerender()

    expect(result.current).toEqual({ width: 250, height: 125 })
  })

  it('disconnects the observer on unmount', () => {
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect = disconnect
      }
    )

    const { unmount } = renderHook(() => useElementSize({ current: elementOf(10, 10) }))
    unmount()
    expect(disconnect).toHaveBeenCalled()
  })
})
