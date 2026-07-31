import { afterEach, describe, expect, it } from 'vitest'
import { anchorScrollTop } from './anchor-scroll'

/** An element `top` pixels below the top of the current view. */
function elementAt(top: number) {
  const element = document.createElement('div')
  element.getBoundingClientRect = () => ({ top }) as DOMRect
  return element
}

const original = window.scrollY

afterEach(() => {
  window.scrollY = original
})

describe('anchorScrollTop', () => {
  it('is the element position on the page when nothing is in the way', () => {
    window.scrollY = 0
    expect(anchorScrollTop(elementAt(300))).toBe(300)
  })

  it('leaves room for whatever is pinned above it', () => {
    window.scrollY = 0
    expect(anchorScrollTop(elementAt(300), 106)).toBe(194)
  })

  it('accounts for how far the page is already scrolled', () => {
    window.scrollY = 500
    expect(anchorScrollTop(elementAt(-200), 100)).toBe(200)
  })

  /** Asking the page to scroll above its own top does nothing useful, so it is clamped. */
  it('never asks for a negative position', () => {
    window.scrollY = 0
    expect(anchorScrollTop(elementAt(10), 400)).toBe(0)
  })
})
