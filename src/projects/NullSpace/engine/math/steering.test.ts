import { describe, it, expect } from 'vitest'
import { driftWithWeave } from './steering'

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
