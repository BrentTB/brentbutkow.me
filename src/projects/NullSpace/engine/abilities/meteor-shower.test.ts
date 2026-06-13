import { describe, it, expect } from 'vitest'
// Import via the registry (not the module directly) so the abilities index
// fully initialises first — importing an ability module as the test entry point
// trips the effects → entity-creator → index import cycle.
import { ABILITY_DEFINITIONS } from '.'
import { METEOR_SHOWER, METEOR_STRIKE } from './ability-data'
import { createShip } from '../entities/entity-creator'
import { createInitialUpgrades } from '../upgrades'
import { distance } from '../math/collision'
import { AbilityKind, EffectKind, ShipKind } from '../types'
import { UpgradeId } from '../upgrade-ids'
import type { Ability } from '../types'
import { WORLD_SIZE } from '../../data'

const meteorShower = ABILITY_DEFINITIONS[AbilityKind.meteorShower]
const ship = createShip(ShipKind.fighter, WORLD_SIZE)

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    ...meteorShower.base(),
    cooldownRemaining: 0,
    unlocked: true,
    unlockedAt: 0,
    ...overrides,
  }
}

describe('meteorShower', () => {
  it('costs the meteor cost × the shower multiplier', () => {
    expect(makeAbility().powerCost).toBe(METEOR_STRIKE.powerCost * METEOR_SHOWER.costMultiplier)
  })

  it('spawns a center + a base ring of meteors', () => {
    const effects = meteorShower.effectFactory!(makeAbility(), { x: 0, y: 0 }, ship)
    expect(effects.length).toBe(1 + METEOR_SHOWER.baseRingCount)
    expect(effects.every((e) => e.kind === EffectKind.meteorStrike)).toBe(true)
  })

  it('the center lands first; the ring lands together, later', () => {
    const pos = { x: 100, y: 200 }
    const effects = meteorShower.effectFactory!(makeAbility(), pos, ship)
    const center = effects[0] as { pos: { x: number; y: number }; delay: number }
    expect(center.pos).toEqual(pos)
    expect(center.delay).toBe(METEOR_STRIKE.delay)

    const ring = effects.slice(1) as { delay: number }[]
    const ringDelay = METEOR_STRIKE.delay + METEOR_SHOWER.ringDelay
    for (const r of ring) expect(r.delay).toBe(ringDelay)
    expect(ringDelay).toBeGreaterThan(center.delay)
  })

  it('places the ring meteors evenly on a circle around the aimed point', () => {
    const pos = { x: 100, y: 200 }
    const effects = meteorShower.effectFactory!(makeAbility(), pos, ship)
    const ring = effects.slice(1)
    for (const r of ring) {
      expect(distance(r.pos, pos)).toBeCloseTo(METEOR_SHOWER.ringRadius, 5)
    }
    // Distinct positions (no two meteors stacked).
    expect(new Set(ring.map((r) => `${r.pos.x.toFixed(2)},${r.pos.y.toFixed(2)}`)).size).toBe(
      ring.length
    )
  })

  it('the Meteor Count upgrade adds a ring meteor (+1 per tier)', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.meteorShowerCount] = { currentTier: 1 }
    const patch = meteorShower.applyUpgrades!(makeAbility(), upgrades)
    expect(patch.count).toBe(METEOR_SHOWER.baseRingCount + 1)
    const effects = meteorShower.effectFactory!(
      makeAbility({ count: patch.count }),
      { x: 0, y: 0 },
      ship
    )
    // center + (baseRing + 1)
    expect(effects.length).toBe(1 + METEOR_SHOWER.baseRingCount + 1)
  })

  it('damage/radius track meteor upgrades but it does NOT inherit `unlocked`', () => {
    const upgrades = createInitialUpgrades()
    upgrades[UpgradeId.meteorDamage] = { currentTier: 1 }
    const patch = meteorShower.applyUpgrades!(makeAbility(), upgrades)
    // Meteor damage tier 1 adds +10 onto the base 60.
    expect(patch.damage).toBe(METEOR_STRIKE.damage + 10)
    expect(patch.unlocked).toBeUndefined()
  })

  it('is registered as the meteor ultimate', () => {
    expect(meteorShower.ultimateOf).toBe(AbilityKind.meteor)
  })
})
