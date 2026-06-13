import { describe, it, expect } from 'vitest'
import { ABILITY_DEFINITIONS } from '.'
import { SOLAR_FLARE, SOLAR_PLAGUE } from './ability-data'
import { updateBurningEnemies } from '../systems/burning'
import { createEnemy } from '../entities/entity-creator'
import { createInitialUpgrades } from '../upgrades'
import { AbilityKind, EnemyKind } from '../types'
import { UpgradeId } from '../upgrade-ids'
import type { Ability, Enemy } from '../types'
import type { HoldBag } from './hold-runtime'

const solarPlague = ABILITY_DEFINITIONS[AbilityKind.solarPlague]

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...solarPlague.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

function bagWith(enemies: Enemy[]): HoldBag {
  return { enemies, particles: [], power: 100, killedEnemies: [] }
}

describe('solarPlague', () => {
  it('is registered as the solar flare ultimate, and holds (no direct cooldown)', () => {
    expect(solarPlague.ultimateOf).toBe(AbilityKind.solarFlare)
    expect(solarPlague.activation).toBe('hold')
    expect(solarPlague.hold).toBeDefined()
  })

  it('costs the solar flare per-second cost × the multiplier', () => {
    expect(makeAbility().powerCost).toBe(SOLAR_FLARE.powerPerSec * SOLAR_PLAGUE.costMultiplier)
  })

  it('ignites enemies in the beam — burning carries the derived dps and spread range', () => {
    const ability = makeAbility()
    const enemy = createEnemy(EnemyKind.tank, { x: 0, y: 0 })
    const result = solarPlague.hold!.onTick!(bagWith([enemy]), ability, { x: 0, y: 0 })
    const lit = result.enemies[0]
    expect(lit.burning).toBeDefined()
    expect(lit.burning!.dps).toBeCloseTo(
      (ability.damage / SOLAR_FLARE.drainInterval) * SOLAR_PLAGUE.dpsMultiplier,
      5
    )
    expect(lit.burning!.spreadRange).toBe(SOLAR_PLAGUE.baseSpreadRange)
    expect(lit.burning!.remaining).toBe(SOLAR_PLAGUE.burnDuration)
  })

  it('deals Solar Flare’s direct damage per tick, with fire stacked on top (≈150% held)', () => {
    const ability = makeAbility()
    const enemy = { ...createEnemy(EnemyKind.tank, { x: 0, y: 0 }), hp: 1000, maxHp: 1000 }
    const lit = solarPlague.hold!.onTick!(bagWith([enemy]), ability, { x: 0, y: 0 }).enemies[0]
    // Direct hit per tick is exactly Solar Flare's (ability.damage).
    expect(lit.hp).toBe(1000 - ability.damage)
    // Held DPS = direct beam rate + fire = 150% of Solar Flare's rate.
    const flareDps = ability.damage / SOLAR_FLARE.drainInterval
    expect((flareDps + lit.burning!.dps) / flareDps).toBeCloseTo(1 + SOLAR_PLAGUE.dpsMultiplier, 5)
  })

  it('does not ignite enemies outside the beam', () => {
    const enemy = createEnemy(EnemyKind.drone, { x: 1000, y: 0 })
    const result = solarPlague.hold!.onTick!(bagWith([enemy]), makeAbility(), { x: 0, y: 0 })
    expect(result.enemies[0].burning).toBeUndefined()
  })

  it('the Wildfire upgrade widens the spread range', () => {
    const upgrades = createInitialUpgrades()
    expect(solarPlague.applyUpgrades!(makeAbility(), upgrades).spreadRange).toBe(
      SOLAR_PLAGUE.baseSpreadRange
    )
    upgrades[UpgradeId.solarPlagueSpread] = { currentTier: 1 }
    const patch = solarPlague.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.spreadRange!).toBeGreaterThan(SOLAR_PLAGUE.baseSpreadRange)
  })

  it('burn damage tracks the base solar flare damage upgrade', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.solarFlareDamage] = { currentTier: 1 }
    const patch = solarPlague.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.damage).toBe(SOLAR_FLARE.damagePerTick + 4) // flare damage tier 1 = +4
  })

  // Keeping the beam on an enemy reignites it every tick, so its fire never
  // expires — it takes more total damage than an enemy ignited once and left to
  // burn out. Both share the same per-tick DOT; the difference is duration.
  it('an enemy held under the beam takes more damage than one left to burn out', () => {
    const ability = makeAbility()
    const at = { x: 0, y: 0 }
    const dt = 0.1
    // Run well past burnDuration so the un-refreshed fire goes out partway.
    const frames = Math.round((SOLAR_PLAGUE.burnDuration + 2) / dt)
    const fresh = (): Enemy => ({ ...createEnemy(EnemyKind.tank, at), hp: 1e6, maxHp: 1e6 })

    // Left to burn: ignited once, then the beam moves on.
    let burning = solarPlague.hold!.onTick!(bagWith([fresh()]), ability, at).enemies[0]
    for (let i = 0; i < frames; i++) burning = updateBurningEnemies([burning], dt).enemies[0]
    const burnOnlyDamage = 1e6 - burning.hp

    // Held under the beam: re-ignited every frame, so it burns the whole time.
    let beamed = fresh()
    for (let i = 0; i < frames; i++) {
      beamed = solarPlague.hold!.onTick!(bagWith([beamed]), ability, at).enemies[0]
      beamed = updateBurningEnemies([beamed], dt).enemies[0]
    }
    const beamedDamage = 1e6 - beamed.hp

    expect(burnOnlyDamage).toBeGreaterThan(0)
    expect(beamedDamage).toBeGreaterThan(burnOnlyDamage)
  })
})
