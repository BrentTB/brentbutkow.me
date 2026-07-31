import { act, cleanup, renderHook } from '@testing-library/react'
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

/** The observers created during a test, so one can be fired by hand the way a real resize would. */
let observers: {
  element: Element | undefined
  fire(
    size: { width: number; height: number } | null,
    rect?: { width: number; height: number }
  ): void
  disconnected: boolean
}[] = []

function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private callback: ResizeObserverCallback

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
      }

      observe(element: Element) {
        const record = {
          element,
          disconnected: false,
          fire: (
            size: { width: number; height: number } | null,
            rect?: { width: number; height: number }
          ) => {
            if (rect) element.getBoundingClientRect = () => rect as DOMRect
            this.callback(
              [
                {
                  target: element,
                  borderBoxSize: size
                    ? [{ inlineSize: size.width, blockSize: size.height }]
                    : undefined,
                } as unknown as ResizeObserverEntry,
              ],
              this as unknown as ResizeObserver
            )
          },
        }
        observers.push(record)
      }

      unobserve() {}

      disconnect() {
        for (const record of observers) record.disconnected = true
      }
    }
  )
}

/** The observer still attached: effects run more than once, and only the last one is live. */
const live = () => observers[observers.length - 1]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  observers = []
})

/**
 * A harness whose ref object is held still across renders, the way `useRef` gives it to a real caller. A
 * fresh object each render re-runs the effect and re-measures from the rect, which would paper over any
 * resize the test then fires.
 */
function mount(element: HTMLElement | null) {
  const ref = { current: element }
  return renderHook(() => useElementSize(ref))
}

describe('useElementSize', () => {
  it('reports zeroes when there is no element to measure', () => {
    const { result } = mount(null)
    expect(result.current).toEqual({ width: 0, height: 0 })
  })

  /** Anything fitting itself to a measured box needs an answer on the first render, not one frame late. */
  it('measures the element on mount', () => {
    stubResizeObserver()
    const { result } = mount(elementOf(640, 480))
    expect(result.current).toEqual({ width: 640, height: 480 })
  })

  it('observes the element it was given', () => {
    stubResizeObserver()
    const element = elementOf(640, 480)
    mount(element)

    expect(observers.length).toBeGreaterThan(0)
    expect(observers.every((record) => record.element === element)).toBe(true)
  })

  it('still measures once when ResizeObserver is missing', () => {
    vi.stubGlobal('ResizeObserver', undefined)
    const { result } = mount(elementOf(300, 200))
    expect(result.current).toEqual({ width: 300, height: 200 })
  })

  it('follows the element as it resizes', () => {
    stubResizeObserver()
    const { result } = mount(elementOf(100, 100))
    expect(result.current).toEqual({ width: 100, height: 100 })

    act(() => live().fire({ width: 250, height: 125 }))

    expect(result.current).toEqual({ width: 250, height: 125 })
  })

  /**
   * Border-box both times. `contentRect` is content-box, so reading that would drop a padded element by
   * its padding the moment the observer first fired, and the first measurement came from the border box.
   */
  it('follows the border box, so a padded element does not jump on the first fire', () => {
    stubResizeObserver()
    const { result } = mount(elementOf(300, 240))

    act(() => live().fire({ width: 260, height: 200 }))

    expect(result.current).toEqual({ width: 260, height: 200 })
  })

  /** Older browsers report no `borderBoxSize`; the box on screen is still a usable answer. */
  it('falls back to the rect when the entry carries no border box', () => {
    stubResizeObserver()
    const { result } = mount(elementOf(300, 240))

    act(() => live().fire(null, { width: 180, height: 90 }))

    expect(result.current).toEqual({ width: 180, height: 90 })
  })

  /**
   * A new object per tick would re-render every consumer on each frame of a resize, and a subpixel box
   * that measures the same twice is the common case.
   */
  it('hands back the same object when the measurement has not changed', () => {
    stubResizeObserver()
    const { result } = mount(elementOf(100, 100))
    const first = result.current

    act(() => live().fire({ width: 100, height: 100 }))

    expect(result.current).toBe(first)
  })

  it('disconnects the observer on unmount', () => {
    stubResizeObserver()
    const { unmount } = mount(elementOf(10, 10))

    unmount()

    expect(observers.every((record) => record.disconnected)).toBe(true)
  })
})
