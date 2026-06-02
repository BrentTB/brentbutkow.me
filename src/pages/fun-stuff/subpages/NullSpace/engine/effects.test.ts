import { describe, it, expect, beforeEach } from 'vitest'
import {
  updateActiveEffects,
  applyShieldConstraints,
  createMeteoriteEffect,
  createBlackHoleEffect,
  createRocketEffect,
  createShieldEffect,
  createSunEffect,
} from './effects'
import { createShip, createEnemy, createProjectile, resetUid } from './entities'
import { EnemyKind, ProjectileOwner } from './types'
import { WORLD_SIZE, METEORITE_STRIKE, BLACK_HOLE, ROCKET, SHIELD, SUN } from '../data'

beforeEach(() => {
  resetUid()
})

describe('updateActiveEffects', () => {
  const ship = createShip(WORLD_SIZE)

  describe('meteor strikes', () => {
    it('keeps strike alive during delay phase', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const result = updateActiveEffects([strike], [], [], ship, 0.1)
      expect(result.activeEffects.length).toBe(1)
      expect(result.activeEffects[0].elapsed).toBeGreaterThan(0)
    })

    it('detonates and removes strike after delay', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const result = updateActiveEffects([strike], [], [], ship, METEORITE_STRIKE.delay + 0.1)
      expect(result.activeEffects.length).toBe(0)
      expect(result.particles.length).toBeGreaterThan(0)
    })

    it('damages enemies in AoE on detonation', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const enemy = createEnemy(EnemyKind.drone, { x: 110, y: 100 })
      const result = updateActiveEffects([strike], [enemy], [], ship, METEORITE_STRIKE.delay + 0.1)
      const surviving = result.enemies.find((e) => e.id === enemy.id)
      if (surviving) {
        expect(surviving.hp).toBeLessThan(enemy.hp)
      } else {
        expect(result.killedEnemies.length).toBeGreaterThan(0)
      }
    })

    it('awards score and reports kills (power now flows via collectible orbs)', () => {
      const strike = createMeteoriteEffect({ x: 100, y: 100 }, 9999, 200, 0.01)
      const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
      const result = updateActiveEffects([strike], [enemy], [], ship, 0.02)
      expect(result.scoreGained).toBeGreaterThan(0)
      expect(result.killedEnemies.length).toBe(1)
    })
  })

  describe('black holes', () => {
    it('pulls enemies toward center', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const enemy = createEnemy(EnemyKind.drone, { x: 550, y: 500 })
      const result = updateActiveEffects([hole], [enemy], [], ship, 0.1)
      expect(result.activeEffects.length).toBe(1)

      const movedEnemy = result.enemies.find((e) => e.id === enemy.id)
      if (movedEnemy) {
        const distBefore = Math.abs(enemy.pos.x - 500)
        const distAfter = Math.abs(movedEnemy.pos.x - 500)
        expect(distAfter).toBeLessThan(distBefore)
      }
    })

    it('expires after duration', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const result = updateActiveEffects([hole], [], [], ship, BLACK_HOLE.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
    })

    it('deals tick damage to enemies inside radius', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const enemy = createEnemy(EnemyKind.tank, { x: 520, y: 500 })
      const result = updateActiveEffects([hole], [enemy], [], ship, 0.5)
      const after = result.enemies.find((e) => e.id === enemy.id)
      if (after) {
        expect(after.hp).toBeLessThan(enemy.hp)
      }
    })

    it('ignores enemies outside radius', () => {
      const hole = createBlackHoleEffect(
        { x: 500, y: 500 },
        BLACK_HOLE.radius,
        BLACK_HOLE.pullStrength,
        BLACK_HOLE.damage,
        BLACK_HOLE.duration
      )
      const enemy = createEnemy(EnemyKind.drone, { x: 900, y: 500 })
      const result = updateActiveEffects([hole], [enemy], [], ship, 0.1)
      const after = result.enemies.find((e) => e.id === enemy.id)
      expect(after).toBeDefined()
      expect(after!.hp).toBe(enemy.hp)
    })
  })

  it('composes multiple effects — enemies flow between them', () => {
    const hole = createBlackHoleEffect({ x: 100, y: 100 }, 200, BLACK_HOLE.pullStrength, 0, 10)
    const strike = createMeteoriteEffect({ x: 100, y: 100 }, 9999, 200, 0.01)
    const enemy = createEnemy(EnemyKind.drone, { x: 110, y: 100 })

    const result = updateActiveEffects([hole, strike], [enemy], [], ship, 0.02)
    expect(result.killedEnemies.length).toBe(1)
  })

  describe('rockets', () => {
    it('flies toward the target — pos advances along the velocity vector', () => {
      const rocket = createRocketEffect(
        { x: 0, y: 0 },
        { x: 1000, y: 0 },
        ROCKET.damage,
        ROCKET.aoeRadius,
        ROCKET.speed
      )
      const startX = rocket.pos.x
      const result = updateActiveEffects([rocket], [], [], ship, 0.1)
      const moved = result.activeEffects[0]
      if (moved) {
        expect(moved.pos.x).toBeGreaterThan(startX)
      }
    })

    it('emits trail particles during flight', () => {
      // Long flight so we definitely see at least one trail tick fire.
      const rocket = createRocketEffect(
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        ROCKET.damage,
        ROCKET.aoeRadius,
        ROCKET.speed
      )
      // First tick will trigger the trail (trailTimer starts at 0).
      const result = updateActiveEffects([rocket], [], [], ship, 0.05)
      expect(result.particles.length).toBeGreaterThan(0)
    })

    it('detonates on arrival and damages enemies in the blast radius', () => {
      const target = { x: 500, y: 0 }
      const rocket = createRocketEffect(
        { x: 0, y: 0 },
        target,
        ROCKET.damage,
        ROCKET.aoeRadius,
        ROCKET.speed
      )
      const enemyAt = createEnemy(EnemyKind.tank, { x: 500, y: 0 })
      // Run a step bigger than the rocket's planned flight time to force detonation.
      const result = updateActiveEffects([rocket], [enemyAt], [], ship, rocket.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
      const after = result.enemies.find((e) => e.id === enemyAt.id)
      if (after) {
        expect(after.hp).toBeLessThan(enemyAt.hp)
      } else {
        expect(result.killedEnemies.length).toBe(1)
      }
    })
  })

  describe('shields', () => {
    it('does NOT damage enemies inside the dome — shield is a barrier, not a weapon', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const inside = createEnemy(EnemyKind.tank, { x: 20, y: 0 })
      const result = updateActiveEffects([shield], [inside], [], ship, 0.5)
      const after = result.enemies.find((e) => e.id === inside.id)
      expect(after?.hp).toBe(inside.hp)
    })

    it('snapshots grandfathered enemy IDs on first tick', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      expect(shield.grandfatheredEnemyIds).toBeNull()
      const inside = createEnemy(EnemyKind.tank, { x: 20, y: 0 })
      const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
      const result = updateActiveEffects([shield], [inside, outside], [], ship, 0.016)
      const ticked = result.activeEffects[0] as typeof shield
      expect(ticked.grandfatheredEnemyIds).toEqual([inside.id])
    })

    it('absorbs enemy projectiles inside the dome', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const enemyProj = createProjectile(
        { x: 30, y: 0 },
        { x: 100, y: 0 },
        ProjectileOwner.enemy,
        5
      )
      const result = updateActiveEffects([shield], [], [enemyProj], ship, 0.05)
      expect(result.projectiles.find((p) => p.id === enemyProj.id)).toBeUndefined()
    })

    it('does NOT absorb ship projectiles (only enemy ones)', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const shipProj = createProjectile({ x: 30, y: 0 }, { x: 100, y: 0 }, ProjectileOwner.ship, 5)
      const result = updateActiveEffects([shield], [], [shipProj], ship, 0.05)
      expect(result.projectiles.find((p) => p.id === shipProj.id)).toBeDefined()
    })

    it('expires after duration', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const result = updateActiveEffects([shield], [], [], ship, SHIELD.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
    })
  })

  describe('sun', () => {
    it('damages enemies inside its radius', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const inside = createEnemy(EnemyKind.tank, { x: 50, y: 0 })
      const result = updateActiveEffects([sun], [inside], [], ship, 1.0)
      const after = result.enemies.find((e) => e.id === inside.id)
      if (after) {
        expect(after.hp).toBeLessThan(inside.hp)
      }
    })

    it('does not damage enemies outside its radius', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
      const result = updateActiveEffects([sun], [outside], [], ship, 1.0)
      expect(result.enemies[0]?.hp).toBe(outside.hp)
    })

    it('does NOT move enemies (no attraction — pure stationary AoE)', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const inside = { ...createEnemy(EnemyKind.tank, { x: 50, y: 0 }), hp: 9999, maxHp: 9999 }
      const result = updateActiveEffects([sun], [inside], [], ship, 0.5)
      const after = result.enemies.find((e) => e.id === inside.id)
      expect(after?.pos).toEqual({ x: 50, y: 0 })
    })

    it('expires after duration', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const result = updateActiveEffects([sun], [], [], ship, SUN.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
    })
  })
})

describe('applyShieldConstraints', () => {
  it('no-op when there are no shields', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
    expect(applyShieldConstraints([], [enemy])).toEqual([enemy])
  })

  it('pushes non-grandfathered enemies inside a shield to the edge', () => {
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [], // empty — no one is grandfathered
    }
    const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
    const [pushed] = applyShieldConstraints([shield], [inside])
    // Snapped to the shield's right edge (radius=100 in +x direction)
    expect(pushed.pos.x).toBe(100)
    expect(pushed.pos.y).toBe(0)
  })

  it('leaves enemies outside the shield alone', () => {
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [],
    }
    const outside = createEnemy(EnemyKind.drone, { x: 200, y: 0 })
    const [unchanged] = applyShieldConstraints([shield], [outside])
    expect(unchanged.pos).toEqual({ x: 200, y: 0 })
  })

  it('leaves grandfathered enemies alone even when inside', () => {
    const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [inside.id],
    }
    const [free] = applyShieldConstraints([shield], [inside])
    expect(free.pos).toEqual({ x: 30, y: 0 })
  })

  it('skips shields whose grandfathered list has not initialized yet (null)', () => {
    const shield = createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration)
    // grandfatheredEnemyIds: null → applyShieldConstraints should not skip
    // pushing — the null is just "not yet snapshotted". Anyone inside is
    // treated as not-grandfathered.
    const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
    const [pushed] = applyShieldConstraints([shield], [inside])
    // Since grandfatheredEnemyIds?.includes returns undefined (falsy), the
    // enemy gets pushed.
    expect(pushed.pos.x).toBe(100)
  })

  it('reflects velocity for enemies bouncing OFF the shield (inward motion)', () => {
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [],
    }
    // Enemy on the +x side of the shield, moving inward (-x velocity).
    const inbound = {
      ...createEnemy(EnemyKind.tank, { x: 90, y: 0 }),
      vel: { x: -50, y: 0 },
    }
    const [bounced] = applyShieldConstraints([shield], [inbound])
    // Snapped to the edge AND velocity reflected outward.
    expect(bounced.pos.x).toBe(100)
    expect(bounced.vel.x).toBe(50)
  })

  it('does NOT reverse velocity if the enemy is already moving outward', () => {
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [],
    }
    // Enemy somehow inside but moving outward.
    const outbound = {
      ...createEnemy(EnemyKind.tank, { x: 50, y: 0 }),
      vel: { x: 30, y: 0 },
    }
    const [unchanged] = applyShieldConstraints([shield], [outbound])
    expect(unchanged.vel.x).toBe(30)
  })

  it('preserves the tangential component when bouncing — only the radial component flips', () => {
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [],
    }
    // Enemy on the +x edge with velocity purely tangential (along +y).
    const tangential = {
      ...createEnemy(EnemyKind.tank, { x: 90, y: 0 }),
      vel: { x: 0, y: 40 },
    }
    const [b] = applyShieldConstraints([shield], [tangential])
    // No inward velocity ⇒ no bounce.
    expect(b.vel).toEqual({ x: 0, y: 40 })

    // Now diagonal: -x (inward) and +y (tangential).
    const diagonal = {
      ...createEnemy(EnemyKind.tank, { x: 90, y: 0 }),
      vel: { x: -30, y: 40 },
    }
    const [d] = applyShieldConstraints([shield], [diagonal])
    expect(d.vel.x).toBe(30) // x flipped
    expect(d.vel.y).toBe(40) // y preserved
  })
})
