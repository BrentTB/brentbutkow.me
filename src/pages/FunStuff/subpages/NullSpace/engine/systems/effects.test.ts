import { describe, it, expect } from 'vitest'
import { updateActiveEffects } from './effects'
import { createMeteoriteEffect } from '../abilities/meteor-strike'
import { createBlackHoleEffect } from '../abilities/black-hole'
import { createRocketEffect } from '../abilities/rocket'
import { applyShieldConstraints, createShieldEffect } from '../abilities/shield'
import { createSunEffect } from '../abilities/sun'
import { createShip, createEnemy, createProjectile } from '../entities/entity-creator'
import { EnemyKind, ProjectileOwner, ShipKind } from '../types'
import type { ActiveEffect } from '../types'
import { WORLD_SIZE } from '../../data'
import { METEORITE_STRIKE, BLACK_HOLE, ROCKET, SHIELD, SUN } from '../abilities/ability-data'

describe('updateActiveEffects', () => {
  const ship = createShip(ShipKind.fighter, WORLD_SIZE)

  describe('meteor strikes', () => {
    it('keeps strike alive during delay phase', () => {
      const strike = createMeteoriteEffect(
        { x: 100, y: 100 },
        METEORITE_STRIKE.damage,
        METEORITE_STRIKE.aoeRadius,
        METEORITE_STRIKE.delay
      )
      const result = updateActiveEffects([strike], [], [], ship, WORLD_SIZE, 0.1)
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
      const result = updateActiveEffects(
        [strike],
        [],
        [],
        ship,
        WORLD_SIZE,
        METEORITE_STRIKE.delay + 0.1
      )
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
      const result = updateActiveEffects(
        [strike],
        [enemy],
        [],
        ship,
        WORLD_SIZE,
        METEORITE_STRIKE.delay + 0.1
      )
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
      const result = updateActiveEffects([strike], [enemy], [], ship, WORLD_SIZE, 0.02)
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
      const result = updateActiveEffects([hole], [enemy], [], ship, WORLD_SIZE, 0.1)
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
      const result = updateActiveEffects(
        [hole],
        [],
        [],
        ship,
        WORLD_SIZE,
        BLACK_HOLE.duration + 0.1
      )
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
      const result = updateActiveEffects([hole], [enemy], [], ship, WORLD_SIZE, 0.5)
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
      const result = updateActiveEffects([hole], [enemy], [], ship, WORLD_SIZE, 0.1)
      const after = result.enemies.find((e) => e.id === enemy.id)
      expect(after).toBeDefined()
      expect(after!.hp).toBe(enemy.hp)
    })
  })

  it('composes multiple effects — enemies flow between them', () => {
    const hole = createBlackHoleEffect({ x: 100, y: 100 }, 200, BLACK_HOLE.pullStrength, 0, 10)
    const strike = createMeteoriteEffect({ x: 100, y: 100 }, 9999, 200, 0.01)
    const enemy = createEnemy(EnemyKind.drone, { x: 110, y: 100 })

    const result = updateActiveEffects([hole, strike], [enemy], [], ship, WORLD_SIZE, 0.02)
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
      const result = updateActiveEffects([rocket], [], [], ship, WORLD_SIZE, 0.1)
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
      const result = updateActiveEffects([rocket], [], [], ship, WORLD_SIZE, 0.05)
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
      const result = updateActiveEffects(
        [rocket],
        [enemyAt],
        [],
        ship,
        WORLD_SIZE,
        rocket.duration + 0.1
      )
      expect(result.activeEffects.length).toBe(0)
      const after = result.enemies.find((e) => e.id === enemyAt.id)
      if (after) {
        expect(after.hp).toBeLessThan(enemyAt.hp)
      } else {
        expect(result.killedEnemies.length).toBe(1)
      }
    })

    it('detonates on contact with an enemy DURING flight (not just at the target)', () => {
      // Rocket aimed at a far point (way beyond the enemy) so the only way it
      // damages this enemy is via in-flight contact detection.
      const target = { x: 5000, y: 0 }
      const rocket = createRocketEffect(
        { x: 0, y: 0 },
        target,
        ROCKET.damage,
        ROCKET.aoeRadius,
        ROCKET.speed
      )
      // Enemy is between launch and target — rocket should hit it on the way.
      const enemyInPath = createEnemy(EnemyKind.tank, { x: 200, y: 0 })

      // Tick enough to reach the enemy but FAR less than `rocket.duration`
      // (which is dist/speed = 5000/250 = 20s). 200/250 = 0.8s → 9 ticks at 0.1.
      let state = [rocket] as ActiveEffect[]
      let enemies = [enemyInPath]
      for (let i = 0; i < 12; i++) {
        const r = updateActiveEffects(state, enemies, [], ship, WORLD_SIZE, 0.1)
        state = r.activeEffects
        enemies = r.enemies
        if (state.length === 0) break
      }

      // The rocket should have detonated (state empty) and the enemy should be
      // either damaged or dead — NOT untouched while the rocket sails on.
      expect(state.length).toBe(0)
      const after = enemies.find((e) => e.id === enemyInPath.id)
      if (after) {
        expect(after.hp).toBeLessThan(enemyInPath.hp)
      }
    })
  })

  describe('shields', () => {
    it('does NOT damage enemies inside the dome — shield is a barrier, not a weapon', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const inside = createEnemy(EnemyKind.tank, { x: 20, y: 0 })
      const result = updateActiveEffects([shield], [inside], [], ship, WORLD_SIZE, 0.5)
      const after = result.enemies.find((e) => e.id === inside.id)
      expect(after?.hp).toBe(inside.hp)
    })

    it('snapshots grandfathered enemy IDs on first tick', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      expect(shield.grandfatheredEnemyIds).toBeNull()
      const inside = createEnemy(EnemyKind.tank, { x: 20, y: 0 })
      const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
      const result = updateActiveEffects([shield], [inside, outside], [], ship, WORLD_SIZE, 0.016)
      const ticked = result.activeEffects[0] as typeof shield
      expect(ticked.grandfatheredEnemyIds).toEqual([inside.id])
    })

    it('drops grandfathered status when the enemy leaves the shield', () => {
      // Tick 1: shield initialized with `inside` (at x=20) grandfathered.
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const inside = createEnemy(EnemyKind.tank, { x: 20, y: 0 })
      const r1 = updateActiveEffects([shield], [inside], [], ship, WORLD_SIZE, 0.016)
      expect((r1.activeEffects[0] as typeof shield).grandfatheredEnemyIds).toEqual([inside.id])

      // Tick 2: same enemy is now WELL outside the shield. The list should drop them.
      const moved = { ...inside, pos: { x: 500, y: 0 } }
      const r2 = updateActiveEffects(r1.activeEffects, [moved], [], ship, WORLD_SIZE, 0.016)
      expect((r2.activeEffects[0] as typeof shield).grandfatheredEnemyIds).toEqual([])
    })

    it('a previously-grandfathered enemy gets pushed out if it tries to re-enter', () => {
      // Tick 1: grandfather an enemy.
      const shield = createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration)
      const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
      const r1 = updateActiveEffects([shield], [inside], [], ship, WORLD_SIZE, 0.016)

      // Tick 2: enemy steps outside; grandfathered list now empty.
      const stepped = { ...inside, pos: { x: 200, y: 0 } }
      const r2 = updateActiveEffects(r1.activeEffects, [stepped], [], ship, WORLD_SIZE, 0.016)

      // Now the enemy moves back inside — apply the shield constraint.
      const reentry = { ...inside, pos: { x: 30, y: 0 } }
      const {
        enemies: [pushed],
      } = applyShieldConstraints(r2.activeEffects, [reentry], 0.016)
      // Snapped to the edge (radius 100 in +x direction).
      expect(pushed.pos.x).toBe(100)
    })

    it('other enemies of the same type are pushed out even with a grandfathered sibling', () => {
      // Shield with one drone (A) grandfathered inside.
      const shield = createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration)
      const droneA = createEnemy(EnemyKind.drone, { x: 30, y: 0 })
      const r1 = updateActiveEffects([shield], [droneA], [], ship, WORLD_SIZE, 0.016)
      expect((r1.activeEffects[0] as typeof shield).grandfatheredEnemyIds).toEqual([droneA.id])

      // Now a DIFFERENT drone (B) walks into the shield (different ID, same kind).
      const droneB = createEnemy(EnemyKind.drone, { x: 40, y: 0 })
      const {
        enemies: [aAfter, bAfter],
      } = applyShieldConstraints(r1.activeEffects, [droneA, droneB], 0.016)
      // A stays put (grandfathered); B gets pushed.
      expect(aAfter.pos).toEqual({ x: 30, y: 0 })
      expect(bAfter.pos.x).toBe(100)
    })

    it('absorbs enemy projectiles inside the dome', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const enemyProj = createProjectile(
        { x: 30, y: 0 },
        { x: 100, y: 0 },
        ProjectileOwner.enemy,
        5
      )
      const result = updateActiveEffects([shield], [], [enemyProj], ship, WORLD_SIZE, 0.05)
      expect(result.projectiles.find((p) => p.id === enemyProj.id)).toBeUndefined()
    })

    it('does NOT absorb ship projectiles (only enemy ones)', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const shipProj = createProjectile({ x: 30, y: 0 }, { x: 100, y: 0 }, ProjectileOwner.ship, 5)
      const result = updateActiveEffects([shield], [], [shipProj], ship, WORLD_SIZE, 0.05)
      expect(result.projectiles.find((p) => p.id === shipProj.id)).toBeDefined()
    })

    it('expires after duration', () => {
      const shield = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
      const result = updateActiveEffects([shield], [], [], ship, WORLD_SIZE, SHIELD.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
    })
  })

  describe('sun', () => {
    it('damages enemies inside its radius', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const inside = createEnemy(EnemyKind.tank, { x: 50, y: 0 })
      const result = updateActiveEffects([sun], [inside], [], ship, WORLD_SIZE, 1.0)
      const after = result.enemies.find((e) => e.id === inside.id)
      if (after) {
        expect(after.hp).toBeLessThan(inside.hp)
      }
    })

    it('does not damage enemies outside its radius', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
      const result = updateActiveEffects([sun], [outside], [], ship, WORLD_SIZE, 1.0)
      expect(result.enemies[0]?.hp).toBe(outside.hp)
    })

    it('does NOT move enemies (no attraction — pure stationary AoE)', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const inside = { ...createEnemy(EnemyKind.tank, { x: 50, y: 0 }), hp: 9999, maxHp: 9999 }
      const result = updateActiveEffects([sun], [inside], [], ship, WORLD_SIZE, 0.5)
      const after = result.enemies.find((e) => e.id === inside.id)
      expect(after?.pos).toEqual({ x: 50, y: 0 })
    })

    it('expires after duration', () => {
      const sun = createSunEffect({ x: 0, y: 0 }, SUN.radius, SUN.damagePerSec, SUN.duration)
      const result = updateActiveEffects([sun], [], [], ship, WORLD_SIZE, SUN.duration + 0.1)
      expect(result.activeEffects.length).toBe(0)
    })
  })

  // Nuke leaves a lingering DOT zone — grows from 0 to peakRadius over
  // growDuration, then linearly shrinks back to 0 over the remainder.
  describe('nuclearWaste', () => {
    it('damages enemies inside its peak radius at full extent', async () => {
      const { createNuclearWasteEffect } = await import('../ship/nuke')
      // Grow phase 0.4s → past 0.5s elapsed it's at full peakRadius.
      const waste = createNuclearWasteEffect({ x: 0, y: 0 }, 100, 5, 4, 0.4)
      // Run a couple ticks to reach peak.
      let state: ActiveEffect[] = [waste]
      const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
      let enemies = [inside]
      for (let i = 0; i < 3; i++) {
        const r = updateActiveEffects(state, enemies, [], ship, WORLD_SIZE, 0.2)
        state = r.activeEffects
        enemies = r.enemies
      }
      const after = enemies.find((e) => e.id === inside.id)
      if (after) {
        expect(after.hp).toBeLessThan(inside.hp)
      }
    })

    it('does not damage enemies outside the current radius (grow then shrink)', async () => {
      const { createNuclearWasteEffect, getNuclearWasteCurrentRadius } =
        await import('../ship/nuke')
      const waste = createNuclearWasteEffect({ x: 0, y: 0 }, 100, 5, 4, 0.5)
      // At elapsed=0 the radius is 0, so even an enemy at the center isn't
      // damaged by the very first tick of the very first frame (radius below the enemy).
      expect(getNuclearWasteCurrentRadius({ ...waste, elapsed: 0 })).toBe(0)
      // Around the grow midpoint, radius is ~half of peak.
      const half = getNuclearWasteCurrentRadius({ ...waste, elapsed: 0.25 })
      expect(half).toBeGreaterThan(40)
      expect(half).toBeLessThan(60)
      // At peak (just past growDuration), it's at full radius.
      const peak = getNuclearWasteCurrentRadius({ ...waste, elapsed: 0.51 })
      expect(peak).toBeGreaterThan(98)
      // Late in the shrink phase, radius is small again.
      const late = getNuclearWasteCurrentRadius({ ...waste, elapsed: 3.5 })
      expect(late).toBeLessThan(20)
    })

    it('does not damage enemies outside its full radius', async () => {
      const { createNuclearWasteEffect } = await import('../ship/nuke')
      const waste = createNuclearWasteEffect({ x: 0, y: 0 }, 100, 5, 4, 0.4)
      const outside = createEnemy(EnemyKind.drone, { x: 500, y: 0 })
      const result = updateActiveEffects([waste], [outside], [], ship, WORLD_SIZE, 1.0)
      expect(result.enemies[0]?.hp).toBe(outside.hp)
    })

    it('expires after duration', async () => {
      const { createNuclearWasteEffect } = await import('../ship/nuke')
      const waste = createNuclearWasteEffect({ x: 0, y: 0 }, 100, 5, 2, 0.3)
      const result = updateActiveEffects([waste], [], [], ship, WORLD_SIZE, 2.5)
      expect(result.activeEffects.length).toBe(0)
    })
  })
})

describe('applyShieldConstraints', () => {
  it('no-op when there are no shields', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 100 })
    expect(applyShieldConstraints([], [enemy], 0.016).enemies).toEqual([enemy])
  })

  it('pushes non-grandfathered enemies inside a shield to the edge', () => {
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [], // empty — no one is grandfathered
    }
    const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
    const {
      enemies: [pushed],
    } = applyShieldConstraints([shield], [inside], 0.016)
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
    const {
      enemies: [unchanged],
    } = applyShieldConstraints([shield], [outside], 0.016)
    expect(unchanged.pos).toEqual({ x: 200, y: 0 })
  })

  it('leaves grandfathered enemies alone even when inside', () => {
    const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
    const shield = {
      ...createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration),
      grandfatheredEnemyIds: [inside.id],
    }
    const {
      enemies: [free],
    } = applyShieldConstraints([shield], [inside], 0.016)
    expect(free.pos).toEqual({ x: 30, y: 0 })
  })

  it('skips shields whose grandfathered list has not initialized yet (null)', () => {
    const shield = createShieldEffect({ x: 0, y: 0 }, 100, SHIELD.duration)
    // grandfatheredEnemyIds: null → applyShieldConstraints should not skip
    // pushing — the null is just "not yet snapshotted". Anyone inside is
    // treated as not-grandfathered.
    const inside = createEnemy(EnemyKind.tank, { x: 30, y: 0 })
    const {
      enemies: [pushed],
    } = applyShieldConstraints([shield], [inside], 0.016)
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
    const {
      enemies: [bounced],
    } = applyShieldConstraints([shield], [inbound], 0.016)
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
    const {
      enemies: [unchanged],
    } = applyShieldConstraints([shield], [outbound], 0.016)
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
    const {
      enemies: [b],
    } = applyShieldConstraints([shield], [tangential], 0.016)
    // No inward velocity ⇒ no bounce.
    expect(b.vel).toEqual({ x: 0, y: 40 })

    // Now diagonal: -x (inward) and +y (tangential).
    const diagonal = {
      ...createEnemy(EnemyKind.tank, { x: 90, y: 0 }),
      vel: { x: -30, y: 40 },
    }
    const {
      enemies: [d],
    } = applyShieldConstraints([shield], [diagonal], 0.016)
    expect(d.vel.x).toBe(30) // x flipped
    expect(d.vel.y).toBe(40) // y preserved
  })
})
