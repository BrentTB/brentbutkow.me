import { describe, it, expect } from 'vitest'
import { createShockwaveEffect, shockwaveEffect, shockwaveRadiusAt } from './shockwave'
import { createEnemy, createShip } from '../entities/entity-creator'
import { CALAMITY, WORLD_SIZE } from '../../data'
import { EffectKind, EnemyKind, ShipKind } from '../types'
import type { EffectTickContext } from '../systems/effect-definition'

const ctx: EffectTickContext = {
  enemies: [],
  projectiles: [],
  ship: createShip(ShipKind.fighter, WORLD_SIZE),
  worldSize: WORLD_SIZE,
  dt: 0.1,
}

describe('createShockwaveEffect', () => {
  it('creates a shockwave at the given position with the tuned lifetime', () => {
    const e = createShockwaveEffect({ x: 5, y: 6 })
    expect(e.kind).toBe(EffectKind.shockwave)
    expect(e.pos).toEqual({ x: 5, y: 6 })
    expect(e.duration).toBe(CALAMITY.shockwaveDelay + CALAMITY.shockwaveGrowDuration)
  })
})

describe('shockwaveRadiusAt', () => {
  const e = createShockwaveEffect({ x: 0, y: 0 })

  it('is 0 throughout the telegraph delay', () => {
    expect(shockwaveRadiusAt(e, e.delay * 0.5)).toBe(0)
  })

  it('grows from startRadius to maxRadius over growDuration', () => {
    expect(shockwaveRadiusAt(e, e.delay + 0.0001)).toBeCloseTo(e.startRadius, 0)
    expect(shockwaveRadiusAt(e, e.delay + e.growDuration)).toBe(e.maxRadius)
  })

  it('is monotonic — a later sample is never smaller', () => {
    expect(shockwaveRadiusAt(e, e.delay + 0.4)).toBeGreaterThan(shockwaveRadiusAt(e, e.delay + 0.2))
  })
})

describe('shockwave tick', () => {
  it('keeps the effect alive before its duration ends', () => {
    const e = createShockwaveEffect({ x: 0, y: 0 })
    expect(shockwaveEffect.tick({ ...e, elapsed: e.delay }, ctx).effect).not.toBeNull()
  })

  it('expires once elapsed reaches the duration', () => {
    const e = createShockwaveEffect({ x: 0, y: 0 })
    expect(shockwaveEffect.tick({ ...e, elapsed: e.duration }, ctx).effect).toBeNull()
  })

  it('deals no damage in its tick — that is the main loop calamity pass job', () => {
    const e = createShockwaveEffect({ x: 0, y: 0 })
    const enemy = createEnemy(EnemyKind.drone, { x: 0, y: 0 })
    const r = shockwaveEffect.tick({ ...e, elapsed: e.delay + 0.1 }, { ...ctx, enemies: [enemy] })
    expect(r.enemies).toEqual([enemy])
    expect(r.killedEnemies).toHaveLength(0)
  })
})
