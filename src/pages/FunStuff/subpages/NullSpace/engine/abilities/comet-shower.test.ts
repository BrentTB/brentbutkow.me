import { describe, it, expect, beforeEach } from 'vitest'
// Import via the registry (not the module directly) so the abilities index
// fully initialises first — importing an ability module as the test entry point
// trips the effects → entity-creator → index import cycle.
import { ABILITY_DEFINITIONS } from '.'
import { COMET_SHOWER, METEORITE_STRIKE } from './ability-data'
import { createShip } from '../entities/entity-creator'
import { createInitialUpgrades } from '../upgrades'
import { distance } from '../math/collision'
import { AbilityKind, EffectKind, ShipKind, UpgradeId } from '../types'
import type { Ability } from '../types'
import { WORLD_SIZE } from '../../data'
import { rng } from '../math/random'

const cometShower = ABILITY_DEFINITIONS[AbilityKind.cometShower]
const ship = createShip(ShipKind.fighter, WORLD_SIZE)

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...cometShower.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

beforeEach(() => {
  rng.reseed(42)
})

describe('cometShower', () => {
  it('costs the meteorite cost × the shower multiplier', () => {
    expect(makeAbility().powerCost).toBe(METEORITE_STRIKE.powerCost * COMET_SHOWER.costMultiplier)
  })

  it('spawns `count` meteorite strikes (base count)', () => {
    const effects = cometShower.effectFactory!(makeAbility(), { x: 100, y: 200 }, ship)
    expect(effects.length).toBe(COMET_SHOWER.baseCount)
    expect(effects.every((e) => e.kind === EffectKind.meteoriteStrike)).toBe(true)
  })

  it('the first strike hits the aimed spot dead-center at the base delay', () => {
    const pos = { x: 100, y: 200 }
    const effects = cometShower.effectFactory!(makeAbility(), pos, ship)
    expect(effects[0].pos).toEqual(pos)
    expect((effects[0] as { delay: number }).delay).toBe(METEORITE_STRIKE.delay)
  })

  it('the remaining strikes scatter within the scatter radius and fall staggered', () => {
    const pos = { x: 100, y: 200 }
    const effects = cometShower.effectFactory!(makeAbility(), pos, ship)
    const scattered = effects.slice(1)
    for (const e of scattered) {
      expect(distance(e.pos, pos)).toBeLessThanOrEqual(COMET_SHOWER.scatterRadius + 0.001)
      expect((e as { delay: number }).delay).toBeGreaterThan(METEORITE_STRIKE.delay)
    }
    // Delays differ — they don't all land at once.
    const delays = scattered.map((e) => (e as { delay: number }).delay)
    expect(new Set(delays).size).toBeGreaterThan(1)
  })

  it('the count upgrade adds meteorites (+2 per tier)', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.cometShowerCount] = { currentTier: 1 }
    const patch = cometShower.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.count).toBe(COMET_SHOWER.baseCount + 2)
    const effects = cometShower.effectFactory!(
      makeAbility({ count: patch.count }),
      { x: 0, y: 0 },
      ship
    )
    expect(effects.length).toBe(COMET_SHOWER.baseCount + 2)
  })

  it('the Comet Cadence upgrade reduces staggerStep, flooring at minStaggerStep', () => {
    const upgrades = createInitialUpgrades()
    expect(cometShower.applyUpgrades!(makeAbility(), upgrades).staggerStep).toBe(
      COMET_SHOWER.staggerStep
    )
    // Max every tier of the cadence upgrade.
    upgrades[UpgradeId.cometShowerStagger] = { currentTier: 3 }
    expect(cometShower.applyUpgrades!(makeAbility(), upgrades).staggerStep).toBeCloseTo(
      COMET_SHOWER.minStaggerStep,
      5
    )
  })

  it('per-strike damage tracks the base meteorite damage upgrades', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.meteoriteDamage] = { currentTier: 1 }
    const patch = cometShower.applyUpgrades!(makeAbility(), upgrades)
    // Meteorite damage tier 1 adds +5 onto the base 10.
    expect(patch.damage).toBe(METEORITE_STRIKE.damage + 5)
  })

  it('is registered as the meteorite ultimate', () => {
    expect(cometShower.ultimateOf).toBe(AbilityKind.meteorite)
  })
})
