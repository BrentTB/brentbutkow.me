import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyEffectsToAsteroids,
  createAsteroid,
  damageAsteroid,
  markInteracted,
  resolveAsteroidContacts,
  seedAsteroidField,
  splitAsteroid,
  updateAsteroids,
} from './asteroids'
import { createBlackHoleEffect } from '../abilities/blackHole/black-hole'
import { createMeteoriteEffect } from '../abilities/meteors/meteor-strike'
import { ASTEROID, WORLD_SIZE } from '../../data'
import { createEnemy, createShip } from '../entities/entity-creator'
import { AsteroidTier, EnemyKind, ShipKind } from '../types'
import { toroidalDistance } from '../math/toroid'
import { rng } from '../math/random'

beforeEach(() => rng.reseed(7))

describe('createAsteroid', () => {
  it('takes radius + hp from its tier config and starts un-interacted', () => {
    const a = createAsteroid(AsteroidTier.large, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(a.radius).toBe(ASTEROID.tiers.large.radius)
    expect(a.hp).toBe(ASTEROID.tiers.large.hp)
    expect(a.maxHp).toBe(ASTEROID.tiers.large.hp)
    expect(a.playerInteracted).toBe(false)
  })
})

describe('seedAsteroidField', () => {
  const center = { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y / 2 }
  it('seeds asteroids clear of the ship spawn', () => {
    const field = seedAsteroidField(WORLD_SIZE, center)
    expect(field.length).toBeGreaterThan(0)
    expect(field.length).toBeLessThanOrEqual(ASTEROID.seedCount)
    for (const a of field) {
      expect(toroidalDistance(a.pos, center)).toBeGreaterThanOrEqual(ASTEROID.forwardMargin)
    }
  })
})

describe('updateAsteroids', () => {
  it('drifts by velocity and advances the spin', () => {
    const a = {
      ...createAsteroid(AsteroidTier.medium, { x: 1000, y: 1000 }, { x: 100, y: 0 }),
      spin: 0,
      spinVel: 1,
    }
    const [moved] = updateAsteroids([a], 0.1)
    expect(moved.pos.x).toBeCloseTo(1010, 4)
    expect(moved.spin).toBeCloseTo(0.1, 4)
  })

  it('bounces two overlapping asteroids apart', () => {
    const a = createAsteroid(AsteroidTier.medium, { x: 1000, y: 1000 }, { x: 60, y: 0 })
    const b = createAsteroid(
      AsteroidTier.medium,
      { x: 1000 + ASTEROID.tiers.medium.radius, y: 1000 },
      { x: -60, y: 0 }
    )
    const before = toroidalDistance(a.pos, b.pos)
    const [na, nb] = updateAsteroids([a, b], 0.016)
    expect(na.vel.x).toBeLessThan(60) // a's rightward momentum reflected
    expect(nb.vel.x).toBeGreaterThan(-60) // b's leftward momentum reflected
    expect(toroidalDistance(na.pos, nb.pos)).toBeGreaterThan(before) // shoved apart
  })
})

describe('splitAsteroid', () => {
  it('splits a large asteroid into two mediums carrying the loot flag', () => {
    const a = {
      ...createAsteroid(AsteroidTier.large, { x: 0, y: 0 }, { x: 50, y: 0 }),
      playerInteracted: true,
    }
    const frags = splitAsteroid(a)
    expect(frags).toHaveLength(ASTEROID.splitCount)
    expect(frags.every((f) => f.tier === AsteroidTier.medium)).toBe(true)
    expect(frags.every((f) => f.playerInteracted)).toBe(true)
  })

  it('a small asteroid splits into nothing', () => {
    expect(
      splitAsteroid(createAsteroid(AsteroidTier.small, { x: 0, y: 0 }, { x: 0, y: 0 }))
    ).toHaveLength(0)
  })
})

describe('damageAsteroid + markInteracted', () => {
  it('subtracts hp and latches the player flag when byPlayer', () => {
    const a = createAsteroid(AsteroidTier.large, { x: 0, y: 0 }, { x: 0, y: 0 })
    const hit = damageAsteroid(a, 40, true)
    expect(hit.hp).toBe(a.hp - 40)
    expect(hit.playerInteracted).toBe(true)
  })

  it('leaves the flag untouched on non-player damage', () => {
    const a = createAsteroid(AsteroidTier.large, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(damageAsteroid(a, 40, false).playerInteracted).toBe(false)
  })

  it('markInteracted latches the flag without changing hp', () => {
    const a = createAsteroid(AsteroidTier.large, { x: 0, y: 0 }, { x: 0, y: 0 })
    const m = markInteracted(a)
    expect(m.playerInteracted).toBe(true)
    expect(m.hp).toBe(a.hp)
  })
})

describe('resolveAsteroidContacts', () => {
  const center = { x: 1000, y: 1000 }

  it('damages a touching ship and starts the asteroid cooldown', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
    const a = createAsteroid(AsteroidTier.large, { ...center }, { x: 0, y: 0 })
    const r = resolveAsteroidContacts([a], ship, [], [])
    expect(r.ship.shield + r.ship.hp).toBe(
      ship.shield + ship.hp - ASTEROID.tiers.large.contactDamage
    )
    expect(r.asteroids[0].hitCooldown).toBeGreaterThan(0)
  })

  it('does nothing while the asteroid is on cooldown', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
    const a = {
      ...createAsteroid(AsteroidTier.large, { ...center }, { x: 0, y: 0 }),
      hitCooldown: 0.5,
    }
    expect(resolveAsteroidContacts([a], ship, [], []).ship).toBe(ship)
  })

  it('kills a touched enemy and returns it for the death pipeline', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 0, y: 0 } } // far away
    const enemy = { ...createEnemy(EnemyKind.drone, { ...center }), hp: 5 }
    const a = createAsteroid(AsteroidTier.large, { ...center }, { x: 0, y: 0 })
    const r = resolveAsteroidContacts([a], ship, [enemy], [])
    expect(r.enemies).toHaveLength(0)
    expect(r.killedEnemies).toHaveLength(1)
  })

  it('wears the asteroid down too — a bump chips its own hp', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
    const a = createAsteroid(AsteroidTier.large, { ...center }, { x: 0, y: 0 })
    const r = resolveAsteroidContacts([a], ship, [], [])
    expect(r.asteroids[0].hp).toBe(a.hp - ASTEROID.bumpSelfDamage)
  })

  it('shatters a low-hp rock on a bump and returns it as a non-loot kill', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { ...center } }
    const a = {
      ...createAsteroid(AsteroidTier.small, { ...center }, { x: 0, y: 0 }),
      hp: ASTEROID.bumpSelfDamage,
    }
    const r = resolveAsteroidContacts([a], ship, [], [])
    expect(r.asteroids).toHaveLength(0) // destroyed — no longer live
    expect(r.killedAsteroids).toHaveLength(1)
    expect(r.killedAsteroids[0].playerInteracted).toBe(false) // bump damage is non-player → no loot
  })
})

describe('applyEffectsToAsteroids', () => {
  it('a black hole gives asteroids momentum + burns them in range (loot-eligible)', () => {
    const a = createAsteroid(AsteroidTier.large, { x: 1100, y: 1000 }, { x: 0, y: 0 })
    const well = createBlackHoleEffect({ x: 1000, y: 1000 }, 300, 200, 20, 5)
    const r = applyEffectsToAsteroids([well], [a], 0.1)
    expect(r.asteroids[0].vel.x).toBeLessThan(0) // gains momentum toward the well (−x)...
    expect(r.asteroids[0].pos.x).toBe(a.pos.x) // ...velocity-driven now, not teleported this frame
    expect(r.asteroids[0].hp).toBeLessThan(a.hp) // burned by the core
    expect(r.asteroids[0].playerInteracted).toBe(true) // a player ability → loot-eligible
  })

  it('a meteorite blast destroys an asteroid on its impact frame', () => {
    const a = { ...createAsteroid(AsteroidTier.small, { x: 1000, y: 1000 }, { x: 0, y: 0 }), hp: 5 }
    // Pre-tick elapsed just below the delay; +dt crosses it → impact this frame.
    const strike = { ...createMeteoriteEffect({ x: 1000, y: 1000 }, 50, 80, 0.5), elapsed: 0.45 }
    expect(applyEffectsToAsteroids([strike], [a], 0.1).killedAsteroids).toHaveLength(1)
  })
})
