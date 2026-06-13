import { describe, it, expect } from 'vitest'
// Import via the registry so the abilities index initialises first.
import { ABILITY_DEFINITIONS } from '.'
import { createSupernovaEffect, getSupernovaState } from './supernova'
import { SUN, SUPERNOVA } from './ability-data'
import { createShip } from '../entities/entity-creator'
import { createInitialUpgrades } from '../upgrades'
import { AbilityKind, EffectKind, ShipKind } from '../types'
import { UpgradeId } from '../upgrade-ids'
import type { Ability } from '../types'
import { WORLD_SIZE } from '../../data'

const supernova = ABILITY_DEFINITIONS[AbilityKind.supernova]
const ship = createShip(ShipKind.fighter, WORLD_SIZE)

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...supernova.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

describe('supernova', () => {
  it('is registered as the sun ultimate', () => {
    expect(supernova.ultimateOf).toBe(AbilityKind.sun)
  })

  it('costs the sun cost × the supernova multiplier', () => {
    expect(makeAbility().powerCost).toBe(SUN.powerCost * SUPERNOVA.costMultiplier)
  })

  it('spawns a single supernova effect', () => {
    const effects = supernova.effectFactory!(makeAbility(), { x: 0, y: 0 }, ship)
    expect(effects.length).toBe(1)
    expect(effects[0].kind).toBe(EffectKind.supernova)
  })

  it('holds at full size, collapses at base damage, then bursts at 5× damage', () => {
    const effect = createSupernovaEffect(
      { x: 0, y: 0 },
      SUN.radius,
      SUN.damagePerSec,
      SUN.duration,
      SUPERNOVA.burstRadiusScale
    )
    const collapseEndTime = effect.duration - effect.burstDuration
    const holdEndTime = collapseEndTime - effect.collapseDuration

    // HOLD: stays at full size and base damage for most of the duration.
    const hold = getSupernovaState({ ...effect, elapsed: holdEndTime / 2 })
    expect(hold.phase).toBe('hold')
    expect(hold.radius).toBe(SUN.radius)
    expect(hold.damagePerSec).toBe(SUN.damagePerSec)

    // COLLAPSE: shrunk well below full size near the end, still base damage.
    const collapse = getSupernovaState({ ...effect, elapsed: collapseEndTime - 0.001 })
    expect(collapse.phase).toBe('collapse')
    expect(collapse.radius).toBeLessThan(SUN.radius * 0.5)
    expect(collapse.damagePerSec).toBe(SUN.damagePerSec)

    // BURST: expands well past the collapsed size at 5× damage.
    const burst = getSupernovaState({
      ...effect,
      elapsed: collapseEndTime + effect.burstDuration / 2,
    })
    expect(burst.phase).toBe('burst')
    expect(burst.damagePerSec).toBe(SUN.damagePerSec * SUPERNOVA.burstDamageMultiplier)
    expect(burst.radius).toBeGreaterThan(SUN.radius * SUPERNOVA.collapseMinScale)
  })

  it('the Critical Mass upgrade widens the burst', () => {
    const upgrades = createInitialUpgrades()
    expect(supernova.applyUpgrades!(makeAbility(), upgrades).burstScale).toBe(
      SUPERNOVA.burstRadiusScale
    )
    upgrades[UpgradeId.supernovaBurst] = { currentTier: 1 }
    const patch = supernova.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.burstScale).toBeGreaterThan(SUPERNOVA.burstRadiusScale)
  })
})
