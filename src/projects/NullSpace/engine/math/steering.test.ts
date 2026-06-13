import { describe, it, expect } from 'vitest'
import { driftWithWeave, softTether1D } from './steering'

describe('driftWithWeave', () => {
  it('advances purely along forward when amplitude is 0', () => {
    const r = driftWithWeave({ x: 0, y: 0 }, { x: 0, y: 1 }, 100, { amplitude: 0, phase: 0 }, 0.1)
    expect(r.vel.x).toBeCloseTo(0, 6)
    expect(r.vel.y).toBeCloseTo(100, 6)
    expect(r.pos.x).toBeCloseTo(0, 6)
    expect(r.pos.y).toBeCloseTo(10, 6)
  })

  it('adds a perpendicular weave whose sign flips across the phase', () => {
    const dir = { x: 0, y: 1 }
    const a = driftWithWeave({ x: 0, y: 0 }, dir, 100, { amplitude: 50, phase: 0 }, 0.1)
    const b = driftWithWeave({ x: 0, y: 0 }, dir, 100, { amplitude: 50, phase: 0.5 }, 0.1)
    expect(a.vel.x).not.toBeCloseTo(0, 6)
    expect(Math.sign(a.vel.x)).toBe(-Math.sign(b.vel.x))
    // Weave is perpendicular — the forward (y) component is unaffected.
    expect(a.vel.y).toBeCloseTo(100, 6)
  })

  it('does not mutate the input position', () => {
    const pos = { x: 5, y: 5 }
    driftWithWeave(pos, { x: 0, y: 1 }, 100, { amplitude: 50, phase: 0.2 }, 0.1)
    expect(pos).toEqual({ x: 5, y: 5 })
  })
})

describe('softTether1D', () => {
  it('returns 0 inside the bounds', () => {
    expect(softTether1D(50, 0, 100, 4)).toBe(0)
  })

  it('restores inward, scaled by overshoot and strength', () => {
    expect(softTether1D(-10, 0, 100, 4)).toBeCloseTo(40, 6)
    expect(softTether1D(110, 0, 100, 4)).toBeCloseTo(-40, 6)
  })

  it('grows with overshoot distance', () => {
    expect(Math.abs(softTether1D(120, 0, 100, 4))).toBeGreaterThan(
      Math.abs(softTether1D(110, 0, 100, 4))
    )
  })

  // Regression: a soft fling that dies pinned against the wall used to be flung
  // back at a depth-proportional (huge) speed. The cap eases it back instead.
  it('clamps the restoring velocity to maxReturn', () => {
    // Deep past the bound: uncapped this is (120 - 0) * 4 = 480.
    expect(softTether1D(0, 120, 1280, 4)).toBeCloseTo(480, 6)
    expect(softTether1D(0, 120, 1280, 4, 80)).toBe(80)
    // Symmetric past the upper bound.
    expect(softTether1D(1400, 120, 1280, 4, 80)).toBe(-80)
    // Still 0 inside, cap or not.
    expect(softTether1D(700, 120, 1280, 4, 80)).toBe(0)
  })
})
