import { describe, it, expect } from 'vitest'
import { createGravityLureEffect, gravityLureEffect } from './gravity-lure'
import { updateEnemyMovement, updateEnemyShooting } from '../../entities/enemy'
import { createEnemy, createShip } from '../../entities/entity-creator'
import { EnemyKind, ShipKind } from '../../types'
import type { GravityLureEffect } from '../../types'
import type { EffectTickContext } from '../../systems/effect-definition'
import { WORLD_SIZE } from '../../../data'

function ctx(enemies = [] as ReturnType<typeof createEnemy>[]): EffectTickContext {
  return {
    enemies,
    projectiles: [],
    ship: createShip(ShipKind.fighter, WORLD_SIZE),
    worldSize: WORLD_SIZE,
    dt: 0.016,
  }
}

describe('gravityLureEffect.tick', () => {
  it('drains HP from enemies engaging it, without damaging them', () => {
    const beacon = createGravityLureEffect({ x: 1000, y: 1000 }, 300, 100)
    const enemy = createEnemy(EnemyKind.drone, { x: 1000, y: 1000 })
    const result = gravityLureEffect.tick(beacon, ctx([enemy]))
    expect(result.effect).not.toBeNull()
    expect((result.effect as GravityLureEffect).hp).toBeLessThan(100)
    expect(result.enemies[0].hp).toBe(enemy.hp) // the lure never hurts enemies
    expect(result.killedEnemies).toHaveLength(0)
  })

  it('bleeds HP on its own with no enemies, and dies only when it runs out', () => {
    const fresh = createGravityLureEffect({ x: 1000, y: 1000 }, 300, 100)
    const after = gravityLureEffect.tick(fresh, ctx([]))
    expect(after.effect).not.toBeNull()
    expect((after.effect as GravityLureEffect).hp).toBeLessThan(100) // self-decay
    const spent = createGravityLureEffect({ x: 1000, y: 1000 }, 300, 0.05)
    expect(gravityLureEffect.tick(spent, ctx([])).effect).toBeNull()
  })

  it('a base beacon vanishes (no detonation) once its HP is gone', () => {
    const beacon = createGravityLureEffect({ x: 1000, y: 1000 }, 300, 0.05)
    const enemy = createEnemy(EnemyKind.drone, { x: 1020, y: 1000 })
    const result = gravityLureEffect.tick(beacon, ctx([enemy]))
    expect(result.effect).toBeNull()
    expect(result.killedEnemies).toHaveLength(0)
  })

  it('a Collapsar detonates when it dies, damaging enemies in radius', () => {
    const beacon = createGravityLureEffect({ x: 1000, y: 1000 }, 300, 0.05, {
      damage: 100,
      radius: 180,
    })
    const near = createEnemy(EnemyKind.drone, { x: 1020, y: 1000 })
    const result = gravityLureEffect.tick(beacon, ctx([near]))
    expect(result.effect).toBeNull()
    expect(result.killedEnemies.map((e) => e.id)).toEqual([near.id])
    expect(result.scoreGained).toBeGreaterThan(0)
  })
})

describe('gravity lure — enemy AI redirect', () => {
  const decoy = (pos: { x: number; y: number }, radius = 350) => [{ pos, radius }]

  it('a beacon in range pulls a non-boss enemy toward it, even past a closer ship', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    ship.pos = { x: 1450, y: 1000 } // closer (+x of the enemy)
    const enemy = createEnemy(EnemyKind.drone, { x: 1300, y: 1000 })
    const beaconPos = { x: 1000, y: 1000 } // farther (-x), but it taunts
    const [moved] = updateEnemyMovement([enemy], ship, [], [], 0.1, 1, undefined, decoy(beaconPos))
    expect(moved.vel.x).toBeLessThan(0) // steering toward the beacon, not the ship
  })

  it('ignores a beacon outside its lure radius and targets the ship', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    ship.pos = { x: 1600, y: 1000 } // +x of the enemy
    const enemy = createEnemy(EnemyKind.drone, { x: 1300, y: 1000 })
    const farBeacon = { x: 1300, y: 2100 } // ~1100 away, outside radius 350
    const [moved] = updateEnemyMovement([enemy], ship, [], [], 0.1, 1, undefined, decoy(farBeacon))
    expect(moved.vel.x).toBeGreaterThan(0) // chasing the ship
  })

  it('a lured keep-range shooter rushes the beacon instead of holding its standoff', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    ship.pos = { x: 1500, y: 1000 } // +x of the shooter
    const shooter = createEnemy(EnemyKind.shooter, { x: 1300, y: 1000 })
    const beaconPos = { x: 1000, y: 1000 } // -x, within lure
    const [moved] = updateEnemyMovement(
      [shooter],
      ship,
      [],
      [],
      0.1,
      1,
      undefined,
      decoy(beaconPos)
    )
    expect(moved.vel.x).toBeLessThan(0) // committing to the beacon, not its keep-range standoff
  })

  it('a lured shooter holds fire (no stray shots), but fires normally when not lured', () => {
    const ship = createShip(ShipKind.fighter, WORLD_SIZE)
    ship.pos = { x: 1360, y: 1000 } // within fire range of the shooter
    const shooter = createEnemy(EnemyKind.shooter, { x: 1300, y: 1000 })
    const lured = updateEnemyShooting(
      [shooter],
      ship,
      [],
      [],
      0.5,
      undefined,
      decoy({ x: 1300, y: 1000 })
    )
    expect(lured.projectiles).toHaveLength(0)
    const free = updateEnemyShooting([shooter], ship, [], [], 0.5)
    expect(free.projectiles.length).toBeGreaterThan(0)
  })
})
