import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, cleanup, act } from '@testing-library/react'
import { useElementHeight } from './useElementHeight'

/** The observers created during a test, so one can be fired by hand the way a real resize would. */
let observers: { element: Element; fire(height: number): void; disconnected: boolean }[] = []

function stubResizeObserver() {
  class Stub {
    private callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(element: Element) {
      const record = {
        element,
        disconnected: false,
        fire: (height: number) => {
          this.callback(
            [{ target: element, contentRect: { height } } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver
          )
        },
      }
      observers.push(record)
    }

    unobserve() {}

    disconnect() {
      for (const record of observers) {
        if (record.element !== undefined) record.disconnected = true
      }
    }
  }

  vi.stubGlobal('ResizeObserver', Stub)
}

/**
 * A hook harness over a real element with a fixed measured height. The ref object is held still across
 * renders, the way `useRef` gives it to a real caller: a fresh one each render re-runs the effect and
 * re-measures, which would hide any resize the test then fires.
 */
function mount(initial: number) {
  const element = document.createElement('div')
  document.body.append(element)
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ height: initial } as DOMRect)

  const ref = { current: element }
  const view = renderHook(() => useElementHeight(ref))
  return { ...view, element }
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  observers = []
  document.body.innerHTML = ''
})

describe('useElementHeight', () => {
  it('measures the element it is given straight away', () => {
    stubResizeObserver()

    const { result } = mount(240)

    // Something fitting itself to the canvas needs an answer on the first render, not one frame late.
    expect(result.current).toBe(240)
  })

  it('follows the element as it resizes', () => {
    stubResizeObserver()
    const { result } = mount(240)

    act(() => observers[0].fire(180))

    expect(result.current).toBe(180)
  })

  it('gives 0 for an element that is not there', () => {
    stubResizeObserver()

    const { result } = renderHook(() => useElementHeight({ current: null }))

    expect(result.current).toBe(0)
  })

  it('still measures once where there is no ResizeObserver at all', () => {
    // jsdom and older browsers: one measurement is still a usable answer, and the hook must not throw.
    vi.stubGlobal('ResizeObserver', undefined)

    const { result } = mount(300)

    expect(result.current).toBe(300)
  })

  it('lets go of the observer when it unmounts', () => {
    stubResizeObserver()
    const { unmount } = mount(240)

    unmount()

    expect(observers[0].disconnected).toBe(true)
  })
})
