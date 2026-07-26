import { describe, it, expect, afterEach } from 'vitest'
import { portalTarget } from './portalTarget'

/** jsdom has no full-screen support at all, so the property has to be defined before it can be set. */
function showFullscreen(element: Element | null) {
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => element,
  })
}

afterEach(() => {
  showFullscreen(null)
  document.body.innerHTML = ''
})

describe('portalTarget', () => {
  it('is the body when nothing is full screen', () => {
    expect(portalTarget()).toBe(document.body)
  })

  it('is the full-screen element while one is showing', () => {
    // The browser paints only the full-screen element and its descendants, so a menu sent to the body opens
    // into nothing and the control reads as broken. This is what makes a dropdown work in full screen.
    const stage = document.createElement('div')
    document.body.append(stage)
    showFullscreen(stage)

    expect(portalTarget()).toBe(stage)
  })

  it('falls back to the body for a full-screen element that is not an HTML element', () => {
    // An SVG going full screen is legal and is not somewhere React can portal into.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.append(svg)
    showFullscreen(svg)

    expect(portalTarget()).toBe(document.body)
  })
})
