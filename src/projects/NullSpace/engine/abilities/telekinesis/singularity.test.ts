import { describe, it, expect } from 'vitest'
import { ABILITY_DEFINITIONS } from '..'
import { SINGULARITY, TELEKINESIS } from '../ability-data'
import { createEnemy } from '../../entities/entity-creator'
import { createAsteroid } from '../../calamities/asteroids'
import { createInitialUpgrades } from '../../upgrades'
import { distance } from '../../math/collision'
import { AbilityKind, AsteroidTier, EnemyKind } from '../../types'
import { UpgradeId } from '../../upgrade-ids'
import type { Ability, Asteroid, Enemy } from '../../types'
import type { HoldBag } from '../hold-runtime'

const singularity = ABILITY_DEFINITIONS[AbilityKind.singularity]

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...singularity.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

function bagWith(enemies: Enemy[], asteroids: Asteroid[] = []): HoldBag {
  return { enemies, particles: [], power: 100, killedEnemies: [], asteroids }
}

const CENTER = { x: 0, y: 0 }

describe('singularity', () => {
  it('is registered as the telekinesis ultimate and holds', () => {
    expect(singularity.ultimateOf).toBe(AbilityKind.telekinesis)
    expect(singularity.activation).toBe('hold')
    expect(singularity.hold).toBeDefined()
  })

  it('costs the telekinesis per-second cost × the multiplier', () => {
    expect(makeAbility().powerCost).toBe(TELEKINESIS.powerPerSec * SINGULARITY.costMultiplier)
  })

  it('pulls enemies toward the center (vs telekinesis push)', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 100, y: 0 }) // inside radius, outside core
    const before = distance(enemy.pos, CENTER)
    const result = singularity.hold!.onFrame!(bagWith([enemy]), makeAbility(), CENTER, 0.1)
    expect(distance(result.enemies[0].pos, CENTER)).toBeLessThan(before)
  })

  it('pulls an asteroid inward and returns it in the bag (loot-eligible)', () => {
    const asteroid = createAsteroid(AsteroidTier.medium, { x: 100, y: 0 }, { x: 0, y: 0 })
    const result = singularity.hold!.onFrame!(bagWith([], [asteroid]), makeAbility(), CENTER, 0.1)
    expect(result.asteroids).toHaveLength(1)
    expect(result.asteroids[0].vel.x).toBeLessThan(0) // drawn inward toward CENTER...
    expect(result.asteroids[0].pos.x).toBe(asteroid.pos.x) // ...via momentum, not a teleport
    expect(result.asteroids[0].playerInteracted).toBe(true)
  })

  it('a single enemy in the core takes no crushing damage', () => {
    const enemy = createEnemy(EnemyKind.tank, { x: 5, y: 0 })
    const result = singularity.hold!.onFrame!(bagWith([enemy]), makeAbility(), CENTER, 0.1)
    expect(result.enemies[0].hp).toBe(enemy.hp)
  })

  it('a cluster in the core takes damage that scales with the crowd', () => {
    const a = createEnemy(EnemyKind.tank, { x: 5, y: 0 })
    const b = createEnemy(EnemyKind.tank, { x: -5, y: 0 })
    const result = singularity.hold!.onFrame!(bagWith([a, b]), makeAbility(), CENTER, 0.1)
    for (const e of result.enemies) expect(e.hp).toBeLessThan(a.hp)
  })

  it('detonates the full AoE burst when held to max charge', () => {
    const enemy = createEnemy(EnemyKind.tank, CENTER)
    const result = singularity.hold!.onRelease!(
      bagWith([enemy]),
      makeAbility(),
      CENTER,
      SINGULARITY.maxChargeSeconds
    )
    expect(result.enemies[0].hp).toBe(enemy.hp - SINGULARITY.baseExplosionDamage)
  })

  it('scales the burst linearly with hold time (1/5 of max at 1/5 the charge time)', () => {
    const enemy = { ...createEnemy(EnemyKind.tank, CENTER), hp: 9999, maxHp: 9999 }
    const held = SINGULARITY.maxChargeSeconds / 5
    const result = singularity.hold!.onRelease!(bagWith([enemy]), makeAbility(), CENTER, held)
    expect(result.enemies[0].hp).toBe(9999 - SINGULARITY.baseExplosionDamage / 5)
  })

  it('a near-instant tap does no explosion damage', () => {
    const enemy = createEnemy(EnemyKind.tank, CENTER)
    const result = singularity.hold!.onRelease!(bagWith([enemy]), makeAbility(), CENTER, 0)
    expect(result.enemies[0].hp).toBe(enemy.hp)
    expect(result.killedEnemies).toHaveLength(0)
  })

  it('the Collapse upgrade raises the release explosion damage', () => {
    const upgrades = createInitialUpgrades()
    expect(singularity.applyUpgrades!(makeAbility(), upgrades).explosionDamage).toBe(
      SINGULARITY.baseExplosionDamage
    )
    upgrades[UpgradeId.singularityCollapse] = { currentTier: 1 }
    const patch = singularity.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.explosionDamage!).toBeGreaterThan(SINGULARITY.baseExplosionDamage)
  })

  it('inherits the telekinesis force upgrade', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.telekinesisForce] = { currentTier: 1 }
    const patch = singularity.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.force!).toBeGreaterThan(TELEKINESIS.force)
  })
})
