import { describe, it, expect } from 'vitest'
import { nearestImage, toroidalDelta, toroidalDistance, wrapPosition } from './toroid'
import { WORLD_SIZE } from '../../data'

const { x: W, y: H } = WORLD_SIZE

describe('wrapPosition', () => {
  it('leaves an in-bounds position untouched', () => {
    expect(wrapPosition({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
  })

  it('wraps past the high edge back onto the low side', () => {
    expect(wrapPosition({ x: W + 30, y: H + 5 })).toEqual({ x: 30, y: 5 })
  })

  it('wraps a negative coordinate onto the high side', () => {
    expect(wrapPosition({ x: -10, y: -1 })).toEqual({ x: W - 10, y: H - 1 })
  })

  it('lands in [0, size) even for large multiples of the world', () => {
    const p = wrapPosition({ x: 3 * W + 7, y: -3 * H - 7 })
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x).toBeLessThan(W)
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y).toBeLessThan(H)
    expect(p.x).toBeCloseTo(7, 6)
    expect(p.y).toBeCloseTo(H - 7, 6)
  })
})

describe('toroidalDelta', () => {
  it('matches plain subtraction for nearby points', () => {
    expect(toroidalDelta({ x: 100, y: 100 }, { x: 140, y: 70 })).toEqual({ x: 40, y: -30 })
  })

  it('takes the short way across a seam, not the long way around', () => {
    // 50 → W-50 is +(W-100) the long way, but only -100 the short way.
    expect(toroidalDelta({ x: 50, y: 0 }, { x: W - 50, y: 0 }).x).toBeCloseTo(-100, 6)
  })

  it('is antisymmetric across the seam', () => {
    const a = { x: W - 50, y: 0 }
    const b = { x: 50, y: 0 }
    expect(toroidalDelta(a, b).x).toBeCloseTo(100, 6)
    expect(toroidalDelta(b, a).x).toBeCloseTo(-100, 6)
  })
})

describe('toroidalDistance', () => {
  it('is the short-way length across a seam', () => {
    // Straight subtraction would give ~W-100; the torus distance is 100.
    expect(toroidalDistance({ x: 40, y: 0 }, { x: W - 60, y: 0 })).toBeCloseTo(100, 6)
  })

  it('is symmetric', () => {
    const a = { x: 10, y: H - 10 }
    const b = { x: W - 5, y: 20 }
    expect(toroidalDistance(a, b)).toBeCloseTo(toroidalDistance(b, a), 6)
  })
})

describe('nearestImage', () => {
  it('returns the wrapped copy of pos that sits next to ref', () => {
    // ref hugs the low edge, pos hugs the high edge → the nearest image is just
    // left of ref (negative x), i.e. across the seam rather than a world away.
    const ref = { x: 20, y: 20 }
    const pos = { x: W - 30, y: 10 }
    const img = nearestImage(ref, pos)
    expect(img.x).toBeCloseTo(-30, 6) // ref.x(20) + delta(-50)
    expect(img.y).toBeCloseTo(10, 6)
    // Distance ref→image equals the toroidal distance ref→pos.
    expect(Math.hypot(img.x - ref.x, img.y - ref.y)).toBeCloseTo(toroidalDistance(ref, pos), 6)
  })
})
