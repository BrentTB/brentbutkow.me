import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetPinchZoom } from './reset-pinch-zoom'

const ORIGINAL = 'width=device-width, initial-scale=1.0, viewport-fit=cover'
const content = () => document.querySelector('meta[name="viewport"]')?.getAttribute('content')

describe('resetPinchZoom', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.head.innerHTML = `<meta name="viewport" content="${ORIGINAL}">`
  })

  afterEach(() => {
    vi.useRealTimers()
    document.head.innerHTML = ''
  })

  it('clamps maximum-scale to 1 to snap zoom back, then restores the original', () => {
    resetPinchZoom()
    expect(content()).toContain('maximum-scale=1')
    vi.runAllTimers()
    expect(content()).toBe(ORIGINAL)
  })

  it('leaves an existing maximum-scale untouched (respects the page config)', () => {
    const pinned = 'width=device-width, maximum-scale=2'
    document.head.innerHTML = `<meta name="viewport" content="${pinned}">`
    resetPinchZoom()
    vi.runAllTimers()
    expect(content()).toBe(pinned)
  })

  it('is a no-op when there is no viewport meta', () => {
    document.head.innerHTML = ''
    expect(() => resetPinchZoom()).not.toThrow()
  })
})
