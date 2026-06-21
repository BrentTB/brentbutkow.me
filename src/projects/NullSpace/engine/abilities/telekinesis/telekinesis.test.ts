import { describe, it, expect } from 'vitest'
import { ABILITY_DEFINITIONS } from '..'
import { TELEKINESIS } from '../ability-data'
import { createEnemy } from '../../entities/entity-creator'
import { createAsteroid } from '../../calamities/asteroids'
import { createInitialUpgrades } from '../../upgrades'
import { AbilityKind, AsteroidTier, EnemyKind } from '../../types'
import { UpgradeId } from '../../upgrade-ids'
import type { Ability, Asteroid, Enemy } from '../../types'
import type { HoldBag } from '../hold-runtime'

const telekinesis = ABILITY_DEFINITIONS[AbilityKind.telekinesis]

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...telekinesis.base(),
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

describe('telekinesis', () => {
  it('is a hold ability', () => {
    expect(telekinesis.activation).toBe('hold')
    expect(telekinesis.hold).toBeDefined()
  })

  it('pushes enemies away from the center (vs singularity pull)', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 40, y: 0 }) // inside radius
    const result = telekinesis.hold!.onFrame!(bagWith([enemy]), makeAbility(), CENTER, 0.1)
    expect(result.enemies[0].pos.x).toBeGreaterThan(enemy.pos.x)
  })

  it('flings an asteroid outward and returns it in the bag (loot-eligible)', () => {
    const asteroid = createAsteroid(AsteroidTier.medium, { x: 40, y: 0 }, { x: 0, y: 0 })
    const result = telekinesis.hold!.onFrame!(bagWith([], [asteroid]), makeAbility(), CENTER, 0.1)
    expect(result.asteroids).toHaveLength(1)
    expect(result.asteroids[0].vel.x).toBeGreaterThan(0) // shoved outward...
    expect(result.asteroids[0].pos.x).toBe(asteroid.pos.x) // ...via momentum, not a teleport
    expect(result.asteroids[0].playerInteracted).toBe(true)
  })

  it('the Force upgrade raises push strength', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.telekinesisForce] = { currentTier: 1 }
    const patch = telekinesis.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.force!).toBeGreaterThan(TELEKINESIS.force)
  })
})
