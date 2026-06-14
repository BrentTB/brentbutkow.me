import { describe, it, expect } from 'vitest'
import { checkCollision, distance, segmentIntersectsCircle } from './collision'
import { WORLD_SIZE } from '../../data'
import type { Entity } from '../types'

const W = WORLD_SIZE.x

function makeEntity(x: number, y: number, radius: number): Entity {
  return { id: 'test', pos: { x, y }, vel: { x: 0, y: 0 }, radius, hp: 1, maxHp: 1 }
}

describe('checkCollision', () => {
  it('detects overlapping circles', () => {
    const a = makeEntity(0, 0, 10)
    const b = makeEntity(15, 0, 10)
    expect(checkCollision(a, b)).toBe(true)
  })

  it('returns false for separated circles', () => {
    const a = makeEntity(0, 0, 10)
    const b = makeEntity(25, 0, 10)
    expect(checkCollision(a, b)).toBe(false)
  })

  it('detects touching circles as non-colliding (strict less-than)', () => {
    const a = makeEntity(0, 0, 10)
    const b = makeEntity(20, 0, 10)
    expect(checkCollision(a, b)).toBe(false)
  })

  it('detects overlap across the world seam', () => {
    // 5px inside opposite edges — a world apart by raw subtraction, 10px on the torus.
    const a = makeEntity(W - 5, 0, 10)
    const b = makeEntity(5, 0, 10)
    expect(checkCollision(a, b)).toBe(true)
  })
})

describe('distance', () => {
  it('computes euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })

  it('measures the short way across the seam', () => {
    expect(distance({ x: W - 5, y: 0 }, { x: 5, y: 0 })).toBeCloseTo(10, 6)
  })
})

describe('segmentIntersectsCircle', () => {
  it('returns true when segment passes through circle', () => {
    // horizontal segment passing through a circle at origin
    expect(segmentIntersectsCircle({ x: -20, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })

  it('returns false when segment misses circle entirely', () => {
    // segment far above the circle
    expect(segmentIntersectsCircle({ x: -20, y: 20 }, { x: 20, y: 20 }, { x: 0, y: 0 }, 5)).toBe(
      false
    )
  })

  it('returns true when endpoint is inside the circle', () => {
    // segment ends inside the circle
    expect(segmentIntersectsCircle({ x: -20, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })

  it('returns true when segment starts inside the circle', () => {
    expect(segmentIntersectsCircle({ x: 2, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })

  it('returns false when segment is too short to reach circle', () => {
    // segment goes from x=-20 to x=-10, circle at origin radius 5
    expect(segmentIntersectsCircle({ x: -20, y: 0 }, { x: -10, y: 0 }, { x: 0, y: 0 }, 5)).toBe(
      false
    )
  })

  it('returns true for degenerate segment (p1 === p2) inside circle', () => {
    expect(segmentIntersectsCircle({ x: 2, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 0 }, 5)).toBe(true)
  })

  it('returns false for degenerate segment outside circle', () => {
    expect(segmentIntersectsCircle({ x: 20, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 0 }, 5)).toBe(false)
  })

  it('regression: bullet at 2× speed no longer tunnels through thin enemy', () => {
    // At 1× dt, bullet moves 40px. At 2× dt it moves 80px in one step, skipping
    // over a 10px-radius enemy entirely. The swept check must catch this.
    const bulletPrev = { x: 0, y: 0 }
    const bulletCur = { x: 80, y: 0 } // 2× speed step
    const enemyPos = { x: 40, y: 0 }
    const collisionRadius = 10 + 4 // enemy.radius + projectile.radius

    // Old point check would miss (bullet.pos at 80, enemy at 40)
    expect(distance(bulletCur, enemyPos) < collisionRadius).toBe(false)
    // Swept check catches it
    expect(segmentIntersectsCircle(bulletPrev, bulletCur, enemyPos, collisionRadius)).toBe(true)
  })

  it('regression: a bullet crossing the world seam still hits an enemy over the edge', () => {
    // Collision runs before the position-wrap, so the segment stays unwrapped and
    // short (W-10 → W+30, stepping over the right seam at W). The enemy sits just
    // past the seam at x=10; its nearest image to the segment is x=W+10, so the
    // swept test hits it instead of missing a whole world away.
    const bulletPrev = { x: W - 10, y: 0 }
    const bulletCur = { x: W + 30, y: 0 }
    const enemyPos = { x: 10, y: 0 }
    expect(segmentIntersectsCircle(bulletPrev, bulletCur, enemyPos, 14)).toBe(true)
  })
})
