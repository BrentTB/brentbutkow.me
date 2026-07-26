import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAnchoredPosition } from './useAnchoredPosition'

// A ref to a real element whose getBoundingClientRect returns the given box.
function anchorAt(rect: Partial<DOMRect>) {
  const el = document.createElement('div')
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect
  return { current: el }
}

function menuOfHeight(height: number) {
  const el = document.createElement('ul')
  Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true })
  return { current: el }
}

describe('useAnchoredPosition', () => {
  it('returns null while closed', () => {
    const anchor = anchorAt({})
    const menu = menuOfHeight(0)
    const { result } = renderHook(() => useAnchoredPosition(anchor, menu, false))
    expect(result.current).toBeNull()
  })

  it('places the menu just below the anchor when there is room', () => {
    const anchor = anchorAt({ top: 100, bottom: 130, left: 20, width: 200 })
    const menu = menuOfHeight(0)
    const { result } = renderHook(() => useAnchoredPosition(anchor, menu, true))
    expect(result.current).toEqual({ top: 134, left: 20, width: 200, maxHeight: 630 })
  })

  it('flips above the anchor when there is no room below', () => {
    // jsdom window.innerHeight defaults to 768; anchor near the bottom leaves little room below.
    const anchor = anchorAt({ top: 700, bottom: 730, left: 10, width: 120 })
    const menu = menuOfHeight(400)
    const { result } = renderHook(() => useAnchoredPosition(anchor, menu, true))
    expect(result.current).toEqual({ top: 700 - 400 - 4, left: 10, width: 120, maxHeight: 692 })
  })

  it('re-measures on resize and removes listeners on close', () => {
    let box = { top: 100, bottom: 130, left: 20, width: 200 }
    const el = document.createElement('div')
    el.getBoundingClientRect = () =>
      ({ ...box, right: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    const anchor = { current: el }
    const menu = menuOfHeight(0)
    const remove = vi.spyOn(window, 'removeEventListener')

    const { result, rerender } = renderHook(({ open }) => useAnchoredPosition(anchor, menu, open), {
      initialProps: { open: true },
    })
    expect(result.current).toEqual({ top: 134, left: 20, width: 200, maxHeight: 630 })

    box = { top: 50, bottom: 80, left: 10, width: 120 }
    act(() => window.dispatchEvent(new Event('resize')))
    // 768 tall less the anchor's bottom at 80, less the gap either side.
    expect(result.current).toEqual({ top: 84, left: 10, width: 120, maxHeight: 680 })

    rerender({ open: false })
    expect(result.current).toBeNull()
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true)
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('caps the menu to the room it has on a screen too short for either side', () => {
    // A phone held sideways is about 390px tall. A five-option menu fits neither above nor below an anchor
    // near the middle, and without a cap its last options sat off the edge with no way to scroll to them.
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 390 })
    const anchor = anchorAt({ top: 300, bottom: 330, left: 10, width: 150 })
    const menu = menuOfHeight(260)

    const { result } = renderHook(() => useAnchoredPosition(anchor, menu, true))

    // More room above than below, so it flips — and is held to what is up there.
    expect(result.current?.maxHeight).toBeLessThanOrEqual(300)
    expect(result.current?.top).toBeGreaterThanOrEqual(0)
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
  })

  it('never places the menu off the top of the screen', () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 390 })
    const anchor = anchorAt({ top: 120, bottom: 150, left: 10, width: 150 })
    const menu = menuOfHeight(600)

    const { result } = renderHook(() => useAnchoredPosition(anchor, menu, true))

    expect(result.current?.top).toBeGreaterThanOrEqual(0)
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 })
  })
})
