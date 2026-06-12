import { describe, it, expect } from 'vitest'
// Import via the registry so the abilities index initialises first (see
// comet-shower.test.ts — importing an ability module directly trips the
// effects → entity-creator → index import cycle).
import { ABILITY_DEFINITIONS } from '.'
import { HELPER, HELPER_FACTORY } from './ability-data'
import { createShip } from '../entities/entity-creator'
import { updateAllies } from '../entities/ally'
import { createInitialUpgrades } from '../upgrades'
import { AbilityKind, ShipKind } from '../types'
import { UpgradeId } from '../upgrade-ids'
import type { Ability } from '../types'
import { WORLD_SIZE } from '../../data'

const helperFactory = ABILITY_DEFINITIONS[AbilityKind.helperFactory]
const ship = createShip(ShipKind.fighter, WORLD_SIZE)

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...helperFactory.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

describe('helperFactory', () => {
  it('is registered as the helper ultimate', () => {
    expect(helperFactory.ultimateOf).toBe(AbilityKind.helper)
  })

  it('costs the helper cost × the factory multiplier', () => {
    expect(makeAbility().powerCost).toBe(HELPER.powerCost * HELPER_FACTORY.costMultiplier)
  })

  it('spawns a tanky ally that deals no damage', () => {
    const ally = helperFactory.allyFactory!({ x: 100, y: 200 }, makeAbility())
    expect(ally.damage).toBe(0)
    expect(ally.maxHp).toBe(HELPER.hp * HELPER_FACTORY.hpMultiplier)
    expect(ally.spawnInterval).toBe(HELPER_FACTORY.spawnInterval)
    expect(ally.radius).toBeGreaterThan(HELPER.radius)
  })

  it('the Assembly Line upgrade shortens the spawn interval, flooring at the min', () => {
    const upgrades = createInitialUpgrades()
    expect(helperFactory.applyUpgrades!(makeAbility(), upgrades).spawnInterval).toBe(
      HELPER_FACTORY.spawnInterval
    )
    upgrades[UpgradeId.helperFactorySpawnRate] = { currentTier: 3 }
    expect(helperFactory.applyUpgrades!(makeAbility(), upgrades).spawnInterval).toBe(
      HELPER_FACTORY.minSpawnInterval
    )
  })

  it('builds a helper once the spawn interval elapses, and never shoots', () => {
    const factory = helperFactory.allyFactory!({ x: 0, y: 0 }, makeAbility())
    // Big step pushes the spawn timer past 0 — a fresh helper appears, and no
    // projectile is fired even with the factory present.
    const dt = HELPER_FACTORY.spawnInterval + 0.1
    const result = updateAllies([factory], [], ship, [], dt)
    expect(result.projectiles.length).toBe(0)
    const spawnedHelpers = result.allies.filter((a) => a.spawnInterval === undefined)
    expect(spawnedHelpers.length).toBe(1)
    expect(spawnedHelpers[0].damage).toBe(HELPER.damage)
  })
})
