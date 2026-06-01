import { describe, it, expect } from 'vitest'
import { checkCollision, distance } from './collision'
import type { Entity } from './types'

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
})

describe('distance', () => {
  it('computes euclidean distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('returns 0 for same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })
})
