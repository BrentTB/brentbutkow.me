import { describe, it, expect, beforeEach } from 'vitest'
// Import via the registry (not the module directly) so the abilities index
// fully initialises first — see comet-shower.test.ts for the cycle note.
import { ABILITY_DEFINITIONS } from '..'
import { updateActiveEffects } from '../../systems/effects'
import { FIREWORKS, ROCKET } from '../ability-data'
import { createShip } from '../../entities/entity-creator'
import { createInitialUpgrades } from '../../upgrades'
import { AbilityKind, EffectKind, ShipKind } from '../../types'
import { UpgradeId } from '../../upgrade-ids'
import type { Ability, ActiveEffect, RocketEffect } from '../../types'
import { WORLD_SIZE } from '../../../data'
import { rng } from '../../math/random'

const fireworks = ABILITY_DEFINITIONS[AbilityKind.fireworks]
const ship = createShip(ShipKind.fighter, WORLD_SIZE)

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return { ...fireworks.base(), cooldownRemaining: 0, unlocked: true, unlockedAt: 0, ...overrides }
}

// Detonate a rocket effect in one big step and return the surviving effects
// (its children, via spawnedEffects).
function detonate(effect: ActiveEffect): RocketEffect[] {
  const r = updateActiveEffects([effect], [], [], ship, WORLD_SIZE, effect.duration + 1)
  return r.activeEffects as RocketEffect[]
}

beforeEach(() => {
  rng.reseed(42)
})

describe('fireworks', () => {
  it('is registered as the rocket ultimate', () => {
    expect(fireworks.ultimateOf).toBe(AbilityKind.rocket)
  })

  it('costs the rocket cost × the fireworks multiplier', () => {
    expect(makeAbility().powerCost).toBe(ROCKET.powerCost * FIREWORKS.costMultiplier)
  })

  it('launches one rocket tagged with the full split schedule', () => {
    const effects = fireworks.effectFactory!(makeAbility(), { x: 400, y: 400 }, ship)
    expect(effects.length).toBe(1)
    const rocket = effects[0] as RocketEffect
    expect(rocket.kind).toBe(EffectKind.rocket)
    expect(rocket.fireworks).toEqual({
      splits: [FIREWORKS.firstSplit, FIREWORKS.baseFinalCount],
      damageFalloff: FIREWORKS.damageFalloff,
    })
  })

  it('bursts into firstSplit children, each carrying the remaining schedule at 1/falloff damage', () => {
    const [launched] = fireworks.effectFactory!(
      makeAbility(),
      { x: 50, y: 0 },
      ship
    ) as RocketEffect[]
    const children = detonate(launched)
    expect(children.length).toBe(FIREWORKS.firstSplit)
    for (const child of children) {
      expect(child.kind).toBe(EffectKind.rocket)
      expect(child.fireworks!.splits).toEqual([FIREWORKS.baseFinalCount])
      expect(child.damage).toBeCloseTo(launched.damage / FIREWORKS.damageFalloff, 5)
    }
  })

  it('the second wave bursts into `count` terminal rockets at 1/falloff² damage', () => {
    const [launched] = fireworks.effectFactory!(
      makeAbility(),
      { x: 50, y: 0 },
      ship
    ) as RocketEffect[]
    const firstWave = detonate(launched)
    const secondWave = detonate(firstWave[0])
    expect(secondWave.length).toBe(FIREWORKS.baseFinalCount)
    for (const child of secondWave) {
      expect(child.fireworks!.splits).toEqual([]) // terminal — bursts no further
      expect(child.damage).toBeCloseTo(
        launched.damage / (FIREWORKS.damageFalloff * FIREWORKS.damageFalloff),
        5
      )
    }
    // A terminal rocket just explodes — no further children.
    expect(detonate(secondWave[0]).length).toBe(0)
  })

  it('the Finale upgrade raises the final-wave count (+1 per tier)', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.fireworksFinale] = { currentTier: 2 }
    const patch = fireworks.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.count).toBe(FIREWORKS.baseFinalCount + 2)
    const [launched] = fireworks.effectFactory!(
      makeAbility({ count: patch.count }),
      { x: 50, y: 0 },
      ship
    ) as RocketEffect[]
    expect(detonate(detonate(launched)[0]).length).toBe(FIREWORKS.baseFinalCount + 2)
  })

  it('damage tracks the base rocket damage upgrades', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.rocketDamage] = { currentTier: 1 }
    const patch = fireworks.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.damage).toBe(ROCKET.damage + 10) // rocket damage tier 1 = +10
  })
})
