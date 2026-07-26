import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { usePreventPinchZoom } from './usePreventPinchZoom'

// Dispatches a cancelable event on document with optional faked props, returns
// whether a listener called preventDefault.
function fire(type: string, props: Record<string, unknown> = {}): boolean {
  const e = new Event(type, { cancelable: true, bubbles: true })
  Object.assign(e, props)
  document.dispatchEvent(e)
  return e.defaultPrevented
}

afterEach(cleanup)

describe('usePreventPinchZoom', () => {
  it('prevents iOS pinch gesture events', () => {
    renderHook(() => usePreventPinchZoom())
    expect(fire('gesturestart')).toBe(true)
    expect(fire('gesturechange')).toBe(true)
    expect(fire('gestureend')).toBe(true)
  })

  it('prevents two-finger touchmove but leaves single-finger drags alone', () => {
    renderHook(() => usePreventPinchZoom())
    expect(fire('touchmove', { touches: { length: 2 } })).toBe(true)
    expect(fire('touchmove', { touches: { length: 1 } })).toBe(false)
  })

  it('removes its listeners on unmount (zoom works again elsewhere)', () => {
    const { unmount } = renderHook(() => usePreventPinchZoom())
    unmount()
    expect(fire('gesturestart')).toBe(false)
    expect(fire('touchmove', { touches: { length: 2 } })).toBe(false)
  })
})
