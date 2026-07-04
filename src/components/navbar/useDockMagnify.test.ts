import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { dockScale, useDockMagnify, DOCK_RADIUS, DOCK_BOOST } from './useDockMagnify'

describe('dockScale', () => {
  it('is largest right at the pointer', () => {
    expect(dockScale(0)).toBeCloseTo(1 + DOCK_BOOST)
  })

  it('returns to 1 at and beyond the radius', () => {
    expect(dockScale(DOCK_RADIUS)).toBe(1)
    expect(dockScale(DOCK_RADIUS + 50)).toBe(1)
  })

  it('decreases smoothly with distance and is symmetric', () => {
    const near = dockScale(20)
    const far = dockScale(80)
    expect(near).toBeGreaterThan(far)
    expect(far).toBeGreaterThan(1)
    expect(dockScale(-40)).toBeCloseTo(dockScale(40))
  })

  // Guards the "no cliff" property the hook relies on for vertical exit (it feeds Math.hypot(dx, dy)
  // into this curve): every step away from the pointer shrinks the scale a little, never a jump.
  it('decays monotonically from peak to 1 with no discontinuity', () => {
    let previous = dockScale(0)
    for (let d = 1; d <= DOCK_RADIUS; d++) {
      const current = dockScale(d)
      expect(current).toBeLessThanOrEqual(previous)
      expect(previous - current).toBeLessThan(0.02) // no single-pixel jump
      previous = current
    }
    expect(previous).toBe(1)
  })
})

describe('useDockMagnify', () => {
  it('no-ops without throwing when the ref is empty', () => {
    expect(() => renderHook(() => useDockMagnify({ current: null }, true))).not.toThrow()
  })

  it('no-ops when disabled', () => {
    const nav = document.createElement('nav')
    expect(() => renderHook(() => useDockMagnify({ current: nav }, false))).not.toThrow()
  })
})
