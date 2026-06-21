import { describe, it, expect } from 'vitest'
// Import via the registry (not ./rocket directly) so the abilities index fully
// initialises first — see fireworks.test.ts / comet-shower.test.ts for the cycle note.
import { ABILITY_DEFINITIONS } from '..'
import { ROCKET } from '../ability-data'
import { createShip } from '../../entities/entity-creator'
import { AbilityKind, ShipKind } from '../../types'
import type { RocketEffect } from '../../types'
import { WORLD_SIZE } from '../../../data'

describe('rocket ability aim', () => {
  it('aims the short way across a world seam, not the long way around', () => {
    // Ship near the right edge, target near the left edge: the short path wraps
    // forward (+x, ~20px) across the seam; the long way would be -x across the
    // whole world. Regression: the rocket used a raw (non-wrapped) aim delta.
    const def = ABILITY_DEFINITIONS[AbilityKind.rocket]
    const ability = { ...def.base(), cooldownRemaining: 0, unlocked: true, unlockedAt: 1 }
    const ship = {
      ...createShip(ShipKind.fighter, WORLD_SIZE),
      pos: { x: WORLD_SIZE.x - 10, y: 100 },
    }
    const targetPos = { x: 10, y: 100 }

    const [effect] = def.effectFactory!(ability, targetPos, ship) as RocketEffect[]

    expect(effect.vel.x).toBeGreaterThan(0)
    expect(effect.vel.y).toBeCloseTo(0, 5)
    // Short hop across the seam, not a world-spanning trek.
    expect(effect.duration).toBeLessThan(WORLD_SIZE.x / 2 / ROCKET.speed)
  })
})
