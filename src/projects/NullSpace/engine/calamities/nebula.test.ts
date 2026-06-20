import { describe, it, expect } from 'vitest'
import { createNebula, fogNebulasOf, nebulaAlphaAt, nebulaEffect } from './nebula'
import { NEBULA, WORLD_SIZE } from '../../data'
import { EffectKind, NebulaVariant, ShipKind } from '../types'
import { createShip } from '../entities/entity-creator'
import type { EffectTickContext } from '../systems/effect-definition'

const ctx: EffectTickContext = {
  enemies: [],
  projectiles: [],
  ship: createShip(ShipKind.fighter, WORLD_SIZE),
  worldSize: WORLD_SIZE,
  dt: 0.1,
}

describe('createNebula', () => {
  it('builds a drifting zone of the given variant from the NEBULA config', () => {
    const n = createNebula(NebulaVariant.slow, { x: 5, y: 6 }, { x: 1, y: 2 })
    expect(n.kind).toBe(EffectKind.nebula)
    expect(n.variant).toBe(NebulaVariant.slow)
    expect(n.duration).toBe(NEBULA.duration)
    expect(n.maxRadius).toBe(NEBULA.maxRadius)
  })
})

describe('nebulaEffect tick', () => {
  it('drifts while alive and expires at its duration', () => {
    const n = createNebula(NebulaVariant.fog, { x: 100, y: 100 }, { x: 40, y: 0 })
    const alive = nebulaEffect.tick({ ...n, elapsed: 1 }, ctx)
    expect(alive.effect).not.toBeNull()
    expect(alive.effect?.pos.x).toBeCloseTo(104, 4) // drifted +40 * 0.1
    expect(nebulaEffect.tick({ ...n, elapsed: n.duration }, ctx).effect).toBeNull()
  })

  it('never damages — a tick leaves enemies, score, and particles untouched', () => {
    const r = nebulaEffect.tick(
      { ...createNebula(NebulaVariant.haze, ctx.ship.pos, { x: 0, y: 0 }), elapsed: 1 },
      ctx
    )
    expect(r.killedEnemies).toHaveLength(0)
    expect(r.scoreGained).toBe(0)
    expect(r.particles).toHaveLength(0)
  })
})

describe('fogNebulasOf', () => {
  it('picks out only the fog nebulas (the ones drawn over entities)', () => {
    const at = { x: 0, y: 0 }
    const effects = [
      createNebula(NebulaVariant.fog, at, { x: 0, y: 0 }),
      createNebula(NebulaVariant.slow, at, { x: 0, y: 0 }),
      createNebula(NebulaVariant.haze, at, { x: 0, y: 0 }),
      createNebula(NebulaVariant.fog, at, { x: 0, y: 0 }),
    ]
    const fogs = fogNebulasOf(effects)
    expect(fogs).toHaveLength(2)
    expect(fogs.every((n) => n.variant === NebulaVariant.fog)).toBe(true)
  })
})

describe('nebulaAlphaAt', () => {
  it('fades in over growDuration and out over the final second', () => {
    const n = createNebula(NebulaVariant.fog, { x: 0, y: 0 }, { x: 0, y: 0 })
    expect(nebulaAlphaAt(n, 0)).toBeCloseTo(0, 5)
    expect(nebulaAlphaAt(n, NEBULA.growDuration)).toBeCloseTo(1, 5)
    expect(nebulaAlphaAt(n, n.duration)).toBeCloseTo(0, 5)
  })
})
