import { describe, it, expect } from 'vitest'
import { enemyFacing, updateEnemyMovement } from './enemy'
import { createEnemy, createShip } from './entity-creator'
import { EnemyKind, HazardKind, MovementBehavior, ShipKind } from '../types'
import type { Hazard } from '../types'
import { HAZARD, WORLD_SIZE } from '../../data'

const ship = createShip(ShipKind.fighter, WORLD_SIZE)

describe('enemyFacing', () => {
  it('faces its velocity while moving', () => {
    const enemy = { ...createEnemy(EnemyKind.drone, { x: 100, y: 100 }), vel: { x: 0, y: 7 } }
    expect(enemyFacing(enemy, ship, [])).toEqual({ x: 0, y: 7 })
  })

  // Regression: a parked shooter used to draw at a fixed heading (looked like it
  // faced "down" regardless of the ship) while still firing at the ship.
  it('faces the nearest target when stationary', () => {
    const enemy = {
      ...createEnemy(EnemyKind.shooter, { x: ship.pos.x, y: ship.pos.y + 300 }),
      vel: { x: 0, y: 0 },
    }
    const f = enemyFacing(enemy, ship, [])
    // Ship sits straight up (−y) from the enemy.
    expect(f.x).toBeCloseTo(0, 6)
    expect(f.y).toBeLessThan(0)
  })
})

describe('updateEnemyMovement — knockback coast', () => {
  // Regression: a Force Field bump sets an outward velocity, but keepRange /
  // stationary enemies used to hard-reset vel to 0 the next frame, cancelling the
  // knockback (only chasers, which blend velocity, got flung). Now they coast.
  it('lets a stationary enemy coast out from a bump instead of stopping dead', () => {
    const enemy = {
      ...createEnemy(EnemyKind.drone, { x: 500, y: 500 }),
      movementBehavior: MovementBehavior.stationary,
      vel: { x: 200, y: 0 },
    }
    const [moved] = updateEnemyMovement([enemy], ship, [], [], 0.1)
    expect(moved.pos.x).toBeGreaterThan(500) // coasted outward
    expect(Math.abs(moved.vel.x)).toBeLessThan(200) // impulse decaying
    expect(moved.vel.x).toBeGreaterThan(0) // still heading out
  })

  it('parks a stationary enemy with no residual velocity', () => {
    const enemy = {
      ...createEnemy(EnemyKind.drone, { x: 500, y: 500 }),
      movementBehavior: MovementBehavior.stationary,
      vel: { x: 0, y: 0 },
    }
    const [moved] = updateEnemyMovement([enemy], ship, [], [], 0.1)
    expect(moved.pos).toEqual({ x: 500, y: 500 })
    expect(moved.vel).toEqual({ x: 0, y: 0 })
  })
})

describe('updateEnemyMovement — mine avoidance', () => {
  // A chasing enemy with a mine directly in its path should arc around it (gain a
  // sideways velocity) rather than drive straight through or settle into an orbit.
  it('curves a chasing enemy around a mine in its path', () => {
    const enemy = {
      ...createEnemy(EnemyKind.drone, { x: 400, y: 500 }),
      movementBehavior: MovementBehavior.chase,
    }
    const target = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 600, y: 500 } }
    const mine: Hazard = {
      id: 'm',
      kind: HazardKind.mine,
      pos: { x: 500, y: 500 },
      radius: HAZARD.mineRadius,
      damage: HAZARD.mineDamage,
    }
    const [withMine] = updateEnemyMovement([enemy], target, [], [mine], 0.1)
    const [noMine] = updateEnemyMovement([enemy], target, [], [], 0.1)
    // Without the mine it heads straight along x; the mine bends it off that line.
    expect(Math.abs(noMine.vel.y)).toBeLessThan(0.01)
    expect(Math.abs(withMine.vel.y)).toBeGreaterThan(1)
    expect(withMine.vel.x).toBeGreaterThan(0) // still advancing toward the target
  })
})
