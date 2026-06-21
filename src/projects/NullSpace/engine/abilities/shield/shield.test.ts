import { describe, it, expect } from 'vitest'
// Import via the registry so the abilities index initialises first.
import '..'
import { applyShieldConstraints, createShieldEffect } from './shield'
import { createForceFieldEffect } from './force-field'
import { FORCE_FIELD, SHIELD } from '../ability-data'
import { createAsteroid } from '../../calamities/asteroids'
import { AsteroidTier } from '../../types'

const DT = 0.1

describe('applyShieldConstraints — asteroids', () => {
  it('reflects an asteroid off a base shield, snaps it to the edge, marks it interacted, deals no damage', () => {
    const dome = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
    const asteroid = createAsteroid(AsteroidTier.medium, { x: 10, y: 0 }, { x: -100, y: 0 })
    const res = applyShieldConstraints([dome], [], DT, [asteroid])

    const a = res.asteroids[0]
    expect(a.pos.x).toBeCloseTo(SHIELD.radius, 5) // snapped out to the rim
    expect(a.vel.x).toBeCloseTo(100, 5) // inward (−100) reflected outward
    expect(a.playerInteracted).toBe(true) // a deflected rock stays loot-eligible
    expect(a.hp).toBe(asteroid.hp) // a base shield never damages
  })

  it('hurls an asteroid out at the knockback speed through a force field', () => {
    const field = createForceFieldEffect(
      { x: 0, y: 0 },
      SHIELD.radius,
      FORCE_FIELD.growDuration,
      FORCE_FIELD.bumpDamage,
      FORCE_FIELD.knockback
    )
    const asteroid = createAsteroid(AsteroidTier.medium, { x: 10, y: 0 }, { x: -100, y: 0 })
    const res = applyShieldConstraints([field], [], DT, [asteroid])

    const a = res.asteroids[0]
    expect(a.pos.x).toBeCloseTo(SHIELD.radius, 5)
    expect(a.vel.x).toBeCloseTo(FORCE_FIELD.knockback, 5) // flung straight out
    expect(a.playerInteracted).toBe(true)
  })

  it('leaves an asteroid outside every dome untouched (same reference)', () => {
    const dome = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
    const asteroid = createAsteroid(
      AsteroidTier.medium,
      { x: SHIELD.radius + 500, y: 0 },
      { x: 0, y: 0 }
    )
    const res = applyShieldConstraints([dome], [], DT, [asteroid])
    expect(res.asteroids[0]).toBe(asteroid) // no bump → original object, not a copy
  })
})
