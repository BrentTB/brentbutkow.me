import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useScrollIntoViewOnChange } from './useScrollIntoViewOnChange'

/** An element `top` pixels below the top of the viewport, with a sticky-header offset. */
function elementAt(top: number, scrollMarginTop = '0px') {
  const element = document.createElement('div')
  element.style.scrollMarginTop = scrollMarginTop
  element.getBoundingClientRect = () => ({
    top,
    bottom: top + 50,
    left: 0,
    right: 0,
    width: 0,
    height: 50,
    x: 0,
    y: top,
    toJSON: () => ({}),
  })
  document.body.append(element)
  return element
}

let scrollTo: ReturnType<typeof vi.fn>

beforeEach(() => {
  scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  window.scrollY = 0
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('useScrollIntoViewOnChange', () => {
  it('leaves the first render alone', () => {
    renderHook(() => useScrollIntoViewOnChange({ current: elementAt(300) }, 'orbit'))
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('stays put while the trigger holds steady', () => {
    const element = elementAt(300)
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'orbit' })
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('scrolls the element to the top of the view when the trigger changes', () => {
    const element = elementAt(300)
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'fanned' })
    expect(scrollTo).toHaveBeenCalledWith({ top: 300, behavior: 'auto' })
  })

  /**
   * Guards the no-op: `scrollIntoView` declines to move an element that is already visible, which is
   * exactly this case — visible, but in the wrong place after the panel changed height.
   */
  it('still scrolls an element that is already on screen but in the wrong place', () => {
    const element = elementAt(263)
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'fanned' })
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo.mock.calls[0][0].top).toBe(263)
  })

  it('keeps the element clear of a sticky header via scroll-margin-top', () => {
    const element = elementAt(300, '106px')
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'fanned' })
    expect(scrollTo.mock.calls[0][0].top).toBe(194)
  })

  it('accounts for how far the page is already scrolled', () => {
    window.scrollY = 500
    const element = elementAt(-200, '100px')
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'fanned' })
    expect(scrollTo.mock.calls[0][0].top).toBe(200)
  })

  it('never asks for a negative scroll position', () => {
    const element = elementAt(10, '400px')
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'fanned' })
    expect(scrollTo.mock.calls[0][0].top).toBe(0)
  })

  /** Smooth programmatic scrolling is quietly ignored in some environments, so it is never asked for. */
  it('always jumps, never asks for a smooth scroll', () => {
    const element = elementAt(300)
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: element }, t), {
      initialProps: { t: 'orbit' },
    })

    rerender({ t: 'fanned' })
    expect(scrollTo.mock.calls[0][0].behavior).toBe('auto')
  })

  it('does nothing when there is no element yet', () => {
    const { rerender } = renderHook(({ t }) => useScrollIntoViewOnChange({ current: null }, t), {
      initialProps: { t: 'a' },
    })
    expect(() => rerender({ t: 'b' })).not.toThrow()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
