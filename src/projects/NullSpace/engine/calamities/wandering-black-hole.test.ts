import { describe, it, expect } from 'vitest'
import {
  applyWanderingHoles,
  createWanderingBlackHole,
  wanderingBlackHoleEffect,
  wanderingRadiusAt,
} from './wandering-black-hole'
import { createAsteroid } from './asteroids'
import { createEnemy, createShip } from '../entities/entity-creator'
import { CALAMITY, SLINGSHOT, WORLD_SIZE } from '../../data'
import { AsteroidTier, EffectKind, EnemyKind, ShipKind } from '../types'
import type { EffectTickContext } from '../systems/effect-definition'

const center = { x: 1000, y: 1000 }
const activeWell = () => ({
  ...createWanderingBlackHole(center, { x: 0, y: 0 }),
  elapsed: CALAMITY.wellGrowDuration + 0.5, // fully grown
})

describe('createWanderingBlackHole', () => {
  it('builds a drifting well from the CALAMITY config', () => {
    const w = createWanderingBlackHole({ x: 5, y: 6 }, { x: 1, y: 2 })
    expect(w.kind).toBe(EffectKind.wanderingBlackHole)
    expect(w.startRadius).toBe(CALAMITY.wellStartRadius)
    expect(w.maxRadius).toBe(CALAMITY.wellMaxRadius)
    expect(w.duration).toBe(CALAMITY.wellDuration)
  })
})

describe('wanderingRadiusAt', () => {
  it('swells from startRadius to maxRadius over growDuration, then holds', () => {
    const w = createWanderingBlackHole(center, { x: 0, y: 0 })
    expect(wanderingRadiusAt(w, 0)).toBeCloseTo(CALAMITY.wellStartRadius, 5)
    expect(wanderingRadiusAt(w, CALAMITY.wellGrowDuration)).toBeCloseTo(CALAMITY.wellMaxRadius, 5)
    expect(wanderingRadiusAt(w, CALAMITY.wellGrowDuration + 5)).toBe(CALAMITY.wellMaxRadius)
  })
})

describe('wanderingBlackHoleEffect tick', () => {
  const ctx: EffectTickContext = {
    enemies: [],
    projectiles: [],
    ship: createShip(ShipKind.fighter, WORLD_SIZE),
    worldSize: WORLD_SIZE,
    dt: 0.1,
  }

  it('drifts while alive and expires at its duration', () => {
    const w = createWanderingBlackHole({ x: 100, y: 100 }, { x: 50, y: 0 })
    const alive = wanderingBlackHoleEffect.tick({ ...w, elapsed: 1 }, ctx)
    expect(alive.effect).not.toBeNull()
    expect(alive.effect?.pos.x).toBeCloseTo(105, 4) // drifted +50 * 0.1
    expect(wanderingBlackHoleEffect.tick({ ...w, elapsed: w.duration }, ctx).effect).toBeNull()
  })
})

describe('applyWanderingHoles', () => {
  it('drags the ship + enemy toward it and burns the core', () => {
    const ship = {
      ...createShip(ShipKind.fighter, WORLD_SIZE),
      pos: { x: center.x + 100, y: center.y },
    }
    const enemy = createEnemy(EnemyKind.drone, { x: center.x + 120, y: center.y })
    const r = applyWanderingHoles([activeWell()], ship, [enemy], [], [], [], 0.1)
    expect(r.ship.pos.x).toBeLessThan(ship.pos.x) // pulled inward (−x)
    expect(r.enemies[0].pos.x).toBeLessThan(enemy.pos.x)
    expect(r.ship.shield + r.ship.hp).toBeLessThan(ship.shield + ship.hp) // core burn
  })

  it('damages asteroids but leaves them un-engaged (neutral → no loot)', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 0, y: 0 } } // far away
    const a = createAsteroid(AsteroidTier.large, { ...center }, { x: 0, y: 0 })
    const r = applyWanderingHoles([activeWell()], ship, [], [], [a], [], 0.1)
    expect(r.asteroids[0].hp).toBeLessThan(a.hp)
    expect(r.asteroids[0].playerInteracted).toBe(false)
  })

  it('gives a caught asteroid momentum, so it keeps drifting after the well moves on', () => {
    const ship = { ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 0, y: 0 } } // far away
    const a = createAsteroid(AsteroidTier.large, { x: center.x + 100, y: center.y }, { x: 0, y: 0 })
    const r = applyWanderingHoles([activeWell()], ship, [], [], [a], [], 0.1)
    expect(r.asteroids[0].vel).not.toEqual({ x: 0, y: 0 }) // momentum imparted, not just a nudge
    expect(r.asteroids[0].vel.x).toBeLessThan(0) // drawn toward the well (−x)
  })

  it('keeps the pull escapable — weaker than a slingshot fling', () => {
    expect(CALAMITY.wellPullStrength).toBeLessThan(SLINGSHOT.baseSpeed)
  })
})
