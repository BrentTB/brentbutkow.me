import { describe, it, expect } from 'vitest'
import { homeTowardTarget } from './homing'

describe('homeTowardTarget', () => {
  it('moves the point toward the target', () => {
    const result = homeTowardTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 1)
    expect(result.pos.x).toBeCloseTo(50, 5)
    expect(result.pos.y).toBeCloseTo(0, 5)
  })

  it('velocity has magnitude equal to strength', () => {
    const result = homeTowardTarget({ x: 0, y: 0 }, { x: 30, y: 40 }, 100, 0.016)
    const speed = Math.sqrt(result.vel.x ** 2 + result.vel.y ** 2)
    expect(speed).toBeCloseTo(100, 5)
  })

  it('velocity points from source to target', () => {
    // Target is to the south-east; both vel components should be positive.
    const result = homeTowardTarget({ x: 0, y: 0 }, { x: 50, y: 50 }, 100, 0.016)
    expect(result.vel.x).toBeGreaterThan(0)
    expect(result.vel.y).toBeGreaterThan(0)
  })

  it('returns zero velocity when already at the target', () => {
    const result = homeTowardTarget({ x: 100, y: 100 }, { x: 100, y: 100 }, 50, 0.016)
    expect(result.vel.x).toBe(0)
    expect(result.vel.y).toBe(0)
    expect(result.pos.x).toBe(100)
    expect(result.pos.y).toBe(100)
  })

  it('does not mutate the input position', () => {
    const src = { x: 10, y: 20 }
    homeTowardTarget(src, { x: 100, y: 100 }, 50, 0.016)
    expect(src).toEqual({ x: 10, y: 20 })
  })
})
