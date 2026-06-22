import { describe, it, expect } from 'vitest'
import { nearestEnemyWhere, enemiesWithinWhere, isCharmable } from './enemy-query'
import { createEnemy } from './entity-creator'
import { EnemyKind } from '../types'

// A fully-materialised enemy (spawnIn 0) at a position — the warp-in timer is
// cleared so charm/targeting predicates see a live enemy.
const enemyAt = (kind: EnemyKind, x: number, y: number) => ({
  ...createEnemy(kind, { x, y }),
  spawnIn: 0,
})

describe('nearestEnemyWhere', () => {
  it('returns the nearest enemy within range satisfying the predicate', () => {
    const near = enemyAt(EnemyKind.drone, 30, 0)
    const far = enemyAt(EnemyKind.drone, 120, 0)
    expect(nearestEnemyWhere({ x: 0, y: 0 }, [far, near], 200, () => true)).toBe(near)
  })

  it('returns null when nothing is within range', () => {
    const e = enemyAt(EnemyKind.drone, 500, 0)
    expect(nearestEnemyWhere({ x: 0, y: 0 }, [e], 100, () => true)).toBeNull()
  })

  it('skips enemies failing the predicate', () => {
    const skip = enemyAt(EnemyKind.drone, 20, 0)
    const ok = enemyAt(EnemyKind.tank, 60, 0)
    expect(
      nearestEnemyWhere({ x: 0, y: 0 }, [skip, ok], 200, (e) => e.kind === EnemyKind.tank)
    ).toBe(ok)
  })
})

describe('enemiesWithinWhere', () => {
  it('returns all matching enemies within range, nearest first', () => {
    const a = enemyAt(EnemyKind.drone, 90, 0)
    const b = enemyAt(EnemyKind.drone, 30, 0)
    const out = enemyAt(EnemyKind.drone, 300, 0)
    expect(enemiesWithinWhere({ x: 0, y: 0 }, [a, b, out], 150, () => true)).toEqual([b, a])
  })
})

describe('isCharmable', () => {
  it('accepts a normal, materialised enemy', () => {
    const drone = enemyAt(EnemyKind.drone, 0, 0)
    expect(isCharmable([drone])(drone)).toBe(true)
  })

  it('rejects bosses', () => {
    const boss = enemyAt(EnemyKind.phaseShifter, 0, 0)
    expect(isCharmable([boss])(boss)).toBe(false)
  })

  it('rejects boss-structural parts (shield generator, worm segment)', () => {
    const gen = enemyAt(EnemyKind.shieldGenerator, 0, 0)
    const seg = enemyAt(EnemyKind.wormSegment, 0, 0)
    expect(isCharmable([gen])(gen)).toBe(false)
    expect(isCharmable([seg])(seg)).toBe(false)
  })

  it('rejects an enemy still warping in (spawnIn > 0)', () => {
    const warping = createEnemy(EnemyKind.drone, { x: 0, y: 0 }) // spawnIn > 0 by default
    expect(isCharmable([warping])(warping)).toBe(false)
  })
})
