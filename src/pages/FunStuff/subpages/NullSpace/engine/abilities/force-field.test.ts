import { describe, it, expect } from 'vitest'
// Import via the registry so the abilities index initialises first.
import { ABILITY_DEFINITIONS } from '.'
import { applyShieldConstraints, createShieldEffect } from './shield'
import { createForceFieldEffect, getForceFieldCurrentRadius } from './force-field'
import { FORCE_FIELD, SHIELD } from './ability-data'
import { createEnemy } from '../entities/entity-creator'
import { createInitialUpgrades } from '../upgrades'
import { AbilityKind, EnemyKind } from '../types'
import { UpgradeId } from '../upgrade-ids'
import type { Ability } from '../types'

const forceField = ABILITY_DEFINITIONS[AbilityKind.forceField]

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...forceField.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

const DT = 0.1

describe('forceField', () => {
  it('is registered as the shield ultimate', () => {
    expect(forceField.ultimateOf).toBe(AbilityKind.shield)
  })

  it('costs the shield cost × the force-field multiplier', () => {
    expect(makeAbility().powerCost).toBe(SHIELD.powerCost * FORCE_FIELD.costMultiplier)
  })

  it('grows from the start radius to 2× then caps', () => {
    const field = createForceFieldEffect(
      { x: 0, y: 0 },
      SHIELD.radius,
      FORCE_FIELD.growDuration,
      FORCE_FIELD.bumpDamage,
      FORCE_FIELD.knockback
    )
    expect(getForceFieldCurrentRadius({ ...field, elapsed: 0 })).toBe(SHIELD.radius)
    expect(getForceFieldCurrentRadius({ ...field, elapsed: FORCE_FIELD.growDuration })).toBeCloseTo(
      SHIELD.radius * FORCE_FIELD.maxRadiusScale,
      5
    )
    // Past the grow duration the radius is capped, not unbounded.
    expect(
      getForceFieldCurrentRadius({ ...field, elapsed: FORCE_FIELD.growDuration * 2 })
    ).toBeCloseTo(SHIELD.radius * FORCE_FIELD.maxRadiusScale, 5)
  })

  it('flings a bumped enemy out hard and burns it on contact', () => {
    const field = createForceFieldEffect(
      { x: 0, y: 0 },
      SHIELD.radius,
      FORCE_FIELD.growDuration,
      FORCE_FIELD.bumpDamage,
      FORCE_FIELD.knockback
    )
    const enemy = { ...createEnemy(EnemyKind.drone, { x: 10, y: 0 }), vel: { x: -100, y: 0 } }
    const res = applyShieldConstraints([field], [enemy], DT)

    expect(res.enemies.length).toBe(1)
    const e = res.enemies[0]
    // Snapped to the edge and hurled straight out at the knockback speed.
    expect(e.pos.x).toBeCloseTo(SHIELD.radius, 5)
    expect(e.vel.x).toBeCloseTo(FORCE_FIELD.knockback, 5)
    // Burned by contact (base shield never damages).
    expect(e.hp).toBeCloseTo(enemy.hp - FORCE_FIELD.bumpDamage * DT, 5)
  })

  it('kills a weak enemy on contact and awards its score', () => {
    const field = createForceFieldEffect(
      { x: 0, y: 0 },
      SHIELD.radius,
      FORCE_FIELD.growDuration,
      FORCE_FIELD.bumpDamage,
      FORCE_FIELD.knockback
    )
    const enemy = {
      ...createEnemy(EnemyKind.drone, { x: 10, y: 0 }),
      hp: 1,
      vel: { x: -100, y: 0 },
    }
    const res = applyShieldConstraints([field], [enemy], DT)

    expect(res.enemies.length).toBe(0)
    expect(res.killedEnemies.length).toBe(1)
    expect(res.scoreGained).toBe(enemy.scoreValue)
  })

  it('the Repulsor upgrade raises knockback', () => {
    const upgrades = createInitialUpgrades()
    expect(forceField.applyUpgrades!(makeAbility(), upgrades).force).toBe(FORCE_FIELD.knockback)
    upgrades[UpgradeId.forceFieldKnockback] = { currentTier: 1 }
    const patch = forceField.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.force).toBeGreaterThan(FORCE_FIELD.knockback)
  })

  // Regression: the base shield must keep reflecting and dealing zero damage —
  // generalising applyShieldConstraints for the force field must not change it.
  it('leaves the base shield behaviour unchanged (reflect, no damage)', () => {
    const dome = createShieldEffect({ x: 0, y: 0 }, SHIELD.radius, SHIELD.duration)
    const enemy = { ...createEnemy(EnemyKind.drone, { x: 10, y: 0 }), vel: { x: -100, y: 0 } }
    const res = applyShieldConstraints([dome], [enemy], DT)

    expect(res.killedEnemies.length).toBe(0)
    expect(res.scoreGained).toBe(0)
    expect(res.particles.length).toBe(0)
    const e = res.enemies[0]
    expect(e.hp).toBe(enemy.hp)
    expect(e.pos.x).toBeCloseTo(SHIELD.radius, 5)
    // Inward velocity (−100) reflected to outward (+100).
    expect(e.vel.x).toBeCloseTo(100, 5)
  })
})
