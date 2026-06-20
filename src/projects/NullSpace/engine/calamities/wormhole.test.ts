import { describe, it, expect, beforeEach } from 'vitest'
import { applyWormholes, createWormhole, wormholeEffect, wormholeRadiusAt } from './wormhole'
import { createEnemy, createProjectile, createShip } from '../entities/entity-creator'
import { WORMHOLE, WORLD_SIZE } from '../../data'
import { EffectKind, EnemyKind, ProjectileOwner, ShipKind } from '../types'
import { toroidalDistance } from '../math/toroid'
import { rng } from '../math/random'
import type { EffectTickContext } from '../systems/effect-definition'

beforeEach(() => rng.reseed(7))

const A = { x: 1000, y: 1000 }
const B = { x: 1600, y: 1000 } // 600 apart, mid-world (clear of the wrap seams)
const grown = () => ({
  ...createWormhole(A, B, { x: 0, y: 0 }),
  elapsed: WORMHOLE.growDuration + 1,
})
const farShip = () => ({ ...createShip(ShipKind.fighter, WORLD_SIZE), pos: { x: 300, y: 300 } })

describe('createWormhole', () => {
  it('builds a two-mouthed effect from the WORMHOLE config', () => {
    const w = createWormhole({ x: 5, y: 6 }, { x: 7, y: 8 }, { x: 1, y: 2 })
    expect(w.kind).toBe(EffectKind.wormhole)
    expect(w.pos).toEqual({ x: 5, y: 6 })
    expect(w.posB).toEqual({ x: 7, y: 8 })
    expect(w.duration).toBe(WORMHOLE.duration)
    expect(w.maxRadius).toBe(WORMHOLE.maxRadius)
  })
})

describe('wormholeRadiusAt', () => {
  it('grows start→max over growDuration, then holds', () => {
    const w = createWormhole(A, B, { x: 0, y: 0 })
    expect(wormholeRadiusAt(w, 0)).toBeCloseTo(WORMHOLE.startRadius, 5)
    expect(wormholeRadiusAt(w, WORMHOLE.growDuration)).toBeCloseTo(WORMHOLE.maxRadius, 5)
    expect(wormholeRadiusAt(w, WORMHOLE.growDuration + 99)).toBe(WORMHOLE.maxRadius)
  })
})

describe('wormholeEffect tick', () => {
  const ctx: EffectTickContext = {
    enemies: [],
    projectiles: [],
    ship: createShip(ShipKind.fighter, WORLD_SIZE),
    worldSize: WORLD_SIZE,
    dt: 0.1,
  }

  it('drifts both mouths while alive and expires at its duration', () => {
    const w = createWormhole({ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 50, y: 0 })
    const alive = wormholeEffect.tick({ ...w, elapsed: 1 }, ctx)
    expect(alive.effect).not.toBeNull()
    if (alive.effect?.kind === EffectKind.wormhole) {
      expect(alive.effect.pos.x).toBeCloseTo(105, 4) // 100 + 50 * 0.1
      expect(alive.effect.posB.x).toBeCloseTo(505, 4) // both mouths drift together
    }
    expect(wormholeEffect.tick({ ...w, elapsed: w.duration }, ctx).effect).toBeNull()
  })
})

describe('applyWormholes', () => {
  it('teleports a body crossing mouth A to just beyond mouth B, velocity preserved', () => {
    const enemy = { ...createEnemy(EnemyKind.drone, { ...A }), vel: { x: 100, y: 0 } }
    const r = applyWormholes([grown()], farShip(), [enemy], [], [], [])
    const out = r.enemies[0]
    // Landed near mouth B, but OUTSIDE its radius (exit-offset → can't instantly re-loop).
    const distB = toroidalDistance(out.pos, B)
    expect(distB).toBeGreaterThan(WORMHOLE.maxRadius)
    expect(distB).toBeCloseTo(WORMHOLE.maxRadius + WORMHOLE.exitMargin, 3)
    expect(out.vel).toEqual({ x: 100, y: 0 }) // momentum carries through
    expect(out.hp).toBe(enemy.hp) // no damage — displacement only
  })

  it('leaves a body clear of both mouths untouched', () => {
    const enemy = { ...createEnemy(EnemyKind.drone, { x: 300, y: 300 }), vel: { x: 0, y: 0 } }
    const r = applyWormholes([grown()], farShip(), [enemy], [], [], [])
    expect(r.enemies[0].pos).toEqual({ x: 300, y: 300 })
  })

  it('resets a teleported projectile’s prevPos so its swept segment never spans the map', () => {
    const proj = {
      ...createProjectile({ ...A }, { x: 1100, y: 1000 }, ProjectileOwner.ship, 10),
      vel: { x: 100, y: 0 },
      prevPos: { x: 980, y: 1000 },
    }
    const r = applyWormholes([grown()], farShip(), [], [], [], [proj])
    const out = r.projectiles[0]
    expect(toroidalDistance(out.pos, A)).toBeGreaterThan(WORMHOLE.maxRadius) // it moved (to B)
    expect(out.prevPos).toEqual(out.pos) // prevPos snapped to the exit
  })

  it('does nothing when there is no wormhole', () => {
    const enemy = { ...createEnemy(EnemyKind.drone, { ...A }), vel: { x: 100, y: 0 } }
    const r = applyWormholes([], farShip(), [enemy], [], [], [])
    expect(r.enemies[0].pos).toEqual(A)
  })
})
