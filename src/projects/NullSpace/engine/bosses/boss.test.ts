import { describe, it, expect, beforeEach } from 'vitest'
import { createEnemy, createProjectile, createShip } from '../entities/entity-creator'
import { updateEnemyMovement } from '../entities/enemy'
import { updateBossAI } from './boss-ai'
import { BOSS_KINDS, getBossDefinition } from './index'
import { DREADNOUGHT_BOSS } from './dreadnought'
import { resolveProjectileEnemyCollisions, updateProjectiles } from '../systems/combat'
import { damageEnemiesInRadiusFlat } from '../math/aoe'
import { distance } from '../math/collision'
import { EnemyKind, ProjectileOwner, ShipKind } from '../types'
import { WORLD_SIZE } from '../../data'
import { rng } from '../math/random'

// Builds a shielded boss (one live generator) plus that generator.
function shieldedBoss(bossPos = CENTER, genPos = { x: CENTER.x + 90, y: CENTER.y }) {
  const gen = createEnemy(EnemyKind.shieldGenerator, genPos)
  const boss = createEnemy(EnemyKind.dreadnought, bossPos)
  boss.boss = { ...boss.boss!, linkedIds: [gen.id], hasSpawned: true }
  return { boss, gen }
}

beforeEach(() => {
  rng.reseed(42)
})

const CENTER = { x: 1500, y: 1500 }
// Ship parked far away — the dreadnought's hooks don't read it, so any fixed
// position keeps these suites focused on linked-entity behavior.
const CTX = { shipPos: { x: 9999, y: 9999 }, worldSize: WORLD_SIZE }

describe('createEnemy — dreadnought boss initialises runtime state', () => {
  it('populates boss field with phase 1, empty linkedIds, hasSpawned false', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    expect(boss.boss).toBeDefined()
    expect(boss.boss!.phase).toBe(1)
    expect(boss.boss!.linkedIds).toHaveLength(0)
    expect(boss.boss!.hasSpawned).toBe(false)
  })

  it('does not set boss field on regular enemies', () => {
    const drone = createEnemy(EnemyKind.drone, CENTER)
    expect(drone.boss).toBeUndefined()
  })
})

describe('updateBossAI — onSpawn fires once', () => {
  it('spawns 3 shield generators on first tick and marks hasSpawned', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const result = updateBossAI([boss], 0.016, CTX)

    const updatedBoss = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)
    expect(updatedBoss).toBeDefined()
    expect(updatedBoss!.boss!.hasSpawned).toBe(true)
    expect(updatedBoss!.boss!.linkedIds).toHaveLength(3)
    expect(result.newEnemies).toHaveLength(3)
    expect(result.newEnemies.every((e) => e.kind === EnemyKind.shieldGenerator)).toBe(true)
  })

  it('does not re-fire onSpawn on subsequent ticks', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const first = updateBossAI([boss], 0.016, CTX)
    const updatedBoss = first.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    const second = updateBossAI([updatedBoss], 0.016, CTX)
    expect(second.newEnemies.filter((e) => e.kind === EnemyKind.shieldGenerator)).toHaveLength(0)
  })
})

describe('updateBossAI — phase advance', () => {
  it('stays phase 1 above 50% HP', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const result = updateBossAI([boss], 0.016, CTX)
    const updated = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    expect(updated.boss!.phase).toBe(1)
  })

  it('advances to phase 2 when HP drops to or below 50%', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    // Simulate taking damage to exactly 50% HP
    const damagedBoss = { ...boss, hp: Math.floor(boss.maxHp * 0.5) }
    const result = updateBossAI([damagedBoss], 0.016, CTX)
    const updated = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    expect(updated.boss!.phase).toBe(2)
  })
})

describe('Dreadnought canTakeDamage gate', () => {
  it('returns false while at least one linked generator is alive', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const gen = createEnemy(EnemyKind.shieldGenerator, CENTER)
    const bossWithLinks = {
      ...boss,
      boss: { ...boss.boss!, linkedIds: [gen.id], hasSpawned: true },
    }
    const def = getBossDefinition(EnemyKind.dreadnought)!
    expect(def.canTakeDamage!(bossWithLinks, [bossWithLinks, gen])).toBe(false)
  })

  it('returns true when all linked generators are destroyed', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const gen = createEnemy(EnemyKind.shieldGenerator, CENTER)
    const bossWithLinks = {
      ...boss,
      boss: { ...boss.boss!, linkedIds: [gen.id], hasSpawned: true },
    }
    const deadGen = { ...gen, hp: 0 }
    const def = getBossDefinition(EnemyKind.dreadnought)!
    // Dead generator (hp=0) still present in array — boss becomes damageable.
    expect(def.canTakeDamage!(bossWithLinks, [bossWithLinks, deadGen])).toBe(true)
  })
})

describe('resolveProjectileEnemyCollisions — boss damage gate', () => {
  // Projectile segment straddles CENTER so segmentIntersectsCircle always fires.
  function makeSweepingProjectile() {
    const proj = createProjectile(
      { x: CENTER.x - 50, y: CENTER.y },
      CENTER,
      ProjectileOwner.ship,
      50
    )
    return {
      ...proj,
      prevPos: { x: CENTER.x - 50, y: CENTER.y },
      pos: { x: CENTER.x + 50, y: CENTER.y },
    }
  }

  it('projectile is consumed but boss HP unchanged while shield generators alive', () => {
    rng.reseed(42)
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const gen = createEnemy(EnemyKind.shieldGenerator, { x: CENTER.x + 90, y: CENTER.y })
    const bossWithLinks = {
      ...boss,
      boss: { ...boss.boss!, linkedIds: [gen.id], hasSpawned: true },
    }

    const result = resolveProjectileEnemyCollisions(
      [makeSweepingProjectile()],
      [bossWithLinks, gen]
    )
    const updatedBoss = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    expect(updatedBoss.hp).toBe(boss.hp)
    expect(result.projectiles).toHaveLength(0)
  })

  it('boss takes damage once all generators are destroyed', () => {
    rng.reseed(42)
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const unshieldedBoss = { ...boss, boss: { ...boss.boss!, linkedIds: [], hasSpawned: true } }

    const result = resolveProjectileEnemyCollisions([makeSweepingProjectile()], [unshieldedBoss])
    const updatedBoss = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    expect(updatedBoss.hp).toBe(boss.hp - 50)
    expect(result.projectiles).toHaveLength(0)
  })
})

// Regression: the boss originally spawned stationary, so the player's ship —
// which only patrols — could never reach it and the fight was untestable. The
// boss must pursue the player when far, and hold at its standoff once close.
describe('Dreadnought movement — approach then hold', () => {
  it('moves toward the ship when farther than its standoff distance', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const ship = {
      ...createShip(ShipKind.fighter, WORLD_SIZE),
      pos: { x: CENTER.x + 1000, y: CENTER.y },
    }
    const before = distance(boss.pos, ship.pos)
    const [moved] = updateEnemyMovement([boss], ship, [], [], 0.1)
    expect(distance(moved.pos, ship.pos)).toBeLessThan(before)
  })

  it('holds position (zero velocity) once within its standoff distance', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    // Ship 100px away — inside the 220 standoff.
    const ship = {
      ...createShip(ShipKind.fighter, WORLD_SIZE),
      pos: { x: CENTER.x + 100, y: CENTER.y },
    }
    const [moved] = updateEnemyMovement([boss], ship, [], [], 0.1)
    expect(moved.vel.x).toBe(0)
    expect(moved.vel.y).toBe(0)
    expect(moved.pos).toEqual(CENTER)
  })
})

describe('updateBossAI — shield generators hold a fixed ring distance', () => {
  it('snaps a generator that has drifted inward back out to the ring distance', () => {
    // Generator sitting too close — would overlap the boss / hide inside its shield.
    const gen = createEnemy(EnemyKind.shieldGenerator, { x: CENTER.x + 20, y: CENTER.y })
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    boss.boss = { ...boss.boss!, linkedIds: [gen.id], hasSpawned: true }

    const result = updateBossAI([boss, gen], 0.1, CTX)
    const pinned = result.enemies.find((e) => e.id === gen.id)!
    // Pinned to the 90px ring along its current direction (+x).
    expect(pinned.pos.x).toBeCloseTo(CENTER.x + 90)
    expect(pinned.pos.y).toBeCloseTo(CENTER.y)
  })

  it('repels near-overlapping generators apart while keeping them on the ring', () => {
    // Two generators stacked on nearly the same ring spot — they must spread.
    const g1 = createEnemy(EnemyKind.shieldGenerator, { x: CENTER.x + 90, y: CENTER.y })
    const g2 = createEnemy(EnemyKind.shieldGenerator, { x: CENTER.x + 90, y: CENTER.y + 2 })
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    boss.boss = { ...boss.boss!, linkedIds: [g1.id, g2.id], hasSpawned: true }

    const result = updateBossAI([boss, g1, g2], 0.1, CTX)
    const p1 = result.enemies.find((e) => e.id === g1.id)!
    const p2 = result.enemies.find((e) => e.id === g2.id)!
    const ringDist = (p: typeof p1) => Math.hypot(p.pos.x - CENTER.x, p.pos.y - CENTER.y)

    // Both held at the 90px ring distance...
    expect(ringDist(p1)).toBeCloseTo(90)
    expect(ringDist(p2)).toBeCloseTo(90)
    // ...and pushed further apart than the 2px they started with.
    expect(Math.hypot(p1.pos.x - p2.pos.x, p1.pos.y - p2.pos.y)).toBeGreaterThan(2)
  })

  // Regression: the angle-preserving pin dragged every generator toward the rear
  // as the boss moved, collapsing the ring onto one point. Repulsion must keep
  // them spread no matter how far the boss travels.
  it('keeps the ring spread as the boss travels instead of clustering', () => {
    const boss = createEnemy(EnemyKind.dreadnought, { ...CENTER })
    // First tick spawns the 3 generators.
    const spawnTick = updateBossAI([boss], 0.016, CTX)
    let enemies = [...spawnTick.enemies, ...spawnTick.newEnemies]
    expect(enemies.filter((e) => e.kind === EnemyKind.shieldGenerator)).toHaveLength(3)

    // Steadily drive the boss in +x, re-pinning the ring each tick — mirrors the
    // game loop's move-then-pin sequence over ~5 seconds.
    const dt = 0.016
    for (let i = 0; i < 300; i++) {
      enemies = enemies.map((e) =>
        e.boss ? { ...e, pos: { x: e.pos.x + 50 * dt, y: e.pos.y } } : e
      )
      enemies = updateBossAI(enemies, dt, CTX).enemies
    }

    const bossNow = enemies.find((e) => e.boss)!
    const gens = enemies.filter((e) => e.kind === EnemyKind.shieldGenerator)
    expect(gens).toHaveLength(3)
    // Each still on the ring.
    for (const g of gens) {
      expect(Math.hypot(g.pos.x - bossNow.pos.x, g.pos.y - bossNow.pos.y)).toBeCloseTo(90, 0)
    }
    // Closest pair stays well apart — clustering would drive this toward 0.
    let minPair = Infinity
    for (let a = 0; a < gens.length; a++) {
      for (let b = a + 1; b < gens.length; b++) {
        minPair = Math.min(
          minPair,
          Math.hypot(gens[a].pos.x - gens[b].pos.x, gens[a].pos.y - gens[b].pos.y)
        )
      }
    }
    expect(minPair).toBeGreaterThan(60)
  })
})

describe('updateBossAI — phase-2 shield regeneration', () => {
  it('regenerates 5 generators and re-points linkedIds when crossing 50% HP', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    // All phase-1 generators destroyed, boss whittled to 50%.
    boss.boss = { ...boss.boss!, phase: 1, linkedIds: [], hasSpawned: true }
    boss.hp = Math.floor(boss.maxHp * 0.5)

    const result = updateBossAI([boss], 0.016, CTX)
    const updatedBoss = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    const regen = result.newEnemies.filter((e) => e.kind === EnemyKind.shieldGenerator)

    expect(regen).toHaveLength(5)
    expect(updatedBoss.boss!.phase).toBe(2)
    expect(updatedBoss.boss!.linkedIds.slice().sort()).toEqual(regen.map((e) => e.id).sort())
  })

  it('does not regenerate again once already in phase 2', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    boss.boss = { ...boss.boss!, phase: 2, linkedIds: [], hasSpawned: true }
    boss.hp = Math.floor(boss.maxHp * 0.3)

    const result = updateBossAI([boss], 0.016, CTX)
    const regen = result.newEnemies.filter((e) => e.kind === EnemyKind.shieldGenerator)
    expect(regen).toHaveLength(0)
  })
})

describe('DREADNOUGHT_BOSS onDeath', () => {
  it('drops 1–4 space metal collectibles', () => {
    const boss = createEnemy(EnemyKind.dreadnought, CENTER)
    const drops = DREADNOUGHT_BOSS.onDeath!(boss)
    expect(drops.length).toBeGreaterThanOrEqual(1)
    expect(drops.length).toBeLessThanOrEqual(4)
    // All drops have a position and velocity.
    for (const d of drops) {
      expect(typeof d.pos.x).toBe('number')
      expect(typeof d.vel.x).toBe('number')
    }
  })
})

// A shielded boss can't be damaged or targeted — every damage and targeting
// path must respect that (not just direct projectile hits).
describe('invincibility is respected by targeting + AoE', () => {
  it('homing missile retargets to a damageable enemy instead of the nearer shielded boss', () => {
    const { boss, gen } = shieldedBoss({ x: 100, y: 0 }, { x: 5000, y: 0 })
    const drone = createEnemy(EnemyKind.drone, { x: 0, y: 200 })
    const missile = {
      ...createProjectile({ x: 0, y: 0 }, { x: 1, y: 0 }, ProjectileOwner.ship, 10),
      homing: true,
      pos: { x: 0, y: 0 },
      vel: { x: 400, y: 0 },
    }
    const [moved] = updateProjectiles([missile], [boss, gen, drone], 0.05)
    // Steered toward the drone (+y), away from the nearer boss (+x).
    expect(moved.vel.y).toBeGreaterThan(0)
  })

  it('AoE blast damages the generator but not the shielded boss', () => {
    const { boss, gen } = shieldedBoss()
    const result = damageEnemiesInRadiusFlat([boss, gen], CENTER, 300, 500)
    const bossAfter = result.enemies.find((e) => e.kind === EnemyKind.dreadnought)!
    expect(bossAfter.hp).toBe(boss.hp) // boss unharmed behind its shield
    expect(result.killedEnemies.some((e) => e.id === gen.id)).toBe(true) // generator destroyed
  })
})

describe('boss warnings', () => {
  it('gives every boss a non-empty pre-boss warning that never names it', () => {
    for (const kind of BOSS_KINDS) {
      const def = getBossDefinition(kind)
      const warning = def?.warning ?? ''
      expect(warning.length).toBeGreaterThan(0)
      // Mysterious by design: the clue must not spell out the boss's own name, so a
      // newcomer still has to go and see what's coming.
      for (const word of (def?.hpBarLabel ?? '').toUpperCase().split(' ')) {
        expect(warning.toUpperCase()).not.toContain(word)
      }
    }
  })
})
