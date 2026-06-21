import { describe, it, expect } from 'vitest'
import { detonateExpiredEnemies } from './enemy-lifetime'
import { createEnemy, createShip } from '../entities/entity-creator'
import { EnemyKind, ShipKind } from '../types'
import { WORLD_SIZE } from '../../data'

const ship = createShip(ShipKind.fighter, WORLD_SIZE)

describe('detonateExpiredEnemies', () => {
  it('leaves timer-less enemies untouched', () => {
    const e = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
    const r = detonateExpiredEnemies([e], ship, [], 0.1)
    expect(r.enemies).toHaveLength(1)
    expect(r.enemies[0]).toBe(e) // same reference — no work done
    expect(r.particles).toHaveLength(0)
  })

  it('ticks a live timer down without popping', () => {
    const e = { ...createEnemy(EnemyKind.swarm, { x: 100, y: 100 }), expiresIn: 1 }
    const r = detonateExpiredEnemies([e], ship, [], 0.1)
    expect(r.enemies).toHaveLength(1)
    expect(r.enemies[0].expiresIn).toBeCloseTo(0.9)
    expect(r.particles).toHaveLength(0)
  })

  it('pops an expired enemy, removing it and blasting a ship on top of it', () => {
    const e = {
      ...createEnemy(EnemyKind.swarm, { ...ship.pos }),
      expiresIn: 0.05,
      expireBlast: { radius: 60, damage: 8 },
    }
    const r = detonateExpiredEnemies([e], ship, [], 0.1)
    expect(r.enemies).toHaveLength(0) // despawned, capping the count
    expect(r.particles.length).toBeGreaterThan(0) // popped
    expect(r.ship.shield).toBeLessThan(ship.shield) // took the blast
  })

  it('pops without hurting a ship outside the blast radius', () => {
    const e = {
      ...createEnemy(EnemyKind.swarm, { x: ship.pos.x + 500, y: ship.pos.y }),
      expiresIn: 0.05,
      expireBlast: { radius: 60, damage: 8 },
    }
    const r = detonateExpiredEnemies([e], ship, [], 0.1)
    expect(r.enemies).toHaveLength(0)
    expect(r.ship.shield).toBe(ship.shield) // out of range — unharmed
    expect(r.ship.hp).toBe(ship.hp)
  })
})
