import { COMET_SHOWER, METEORITE_STRIKE } from '../ability-data'
import { createMeteoriteEffect } from './meteor-strike'
import { rng } from '../../math/random'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from '../ability-definition'
import { meteorite } from './meteorite'
import { IconName } from '../../../icon-names'

export const COMET_SHOWER_UPGRADE_IDS = {
  cometShowerCount: 'cometShowerCount',
  cometShowerStagger: 'cometShowerStagger',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.cometShower)

const countUpgrade = upgrade({
  id: COMET_SHOWER_UPGRADE_IDS.cometShowerCount,
  label: 'Comet Count',
  description: 'Drop more comets per shower',
  tiers: [
    { cost: 60, value: 2 },
    { cost: 180, value: 2 },
    { cost: 420, value: 2 },
  ],
})

// Reduces staggerStep (the gap between comets landing). Tier values subtract
// from the base 0.1, bottoming out at COMET_SHOWER.minStaggerStep (0.03).
const staggerUpgrade = upgrade({
  id: COMET_SHOWER_UPGRADE_IDS.cometShowerStagger,
  label: 'Comet Cadence',
  description: 'Comets fall in quicker succession',
  tiers: [
    { cost: 50, value: 0.03 },
    { cost: 150, value: 0.02 },
    { cost: 400, value: 0.02 },
  ],
})

// Meteorite ultimate. One meteorite hits the aimed spot; the rest scatter
// nearby and fall staggered. Damage tracks Meteorite's upgrades; cost is the
// upgraded meteorite cost × the shower multiplier.
export const cometShower: AbilityDefinition = {
  kind: AbilityKind.cometShower,
  ultimateOf: AbilityKind.meteorite,
  meta: { icon: IconName.meteorite, label: 'Comet Shower' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.cometShower,
    cooldown: METEORITE_STRIKE.cooldown,
    powerCost: METEORITE_STRIKE.powerCost * COMET_SHOWER.costMultiplier,
    damage: METEORITE_STRIKE.damage,
    aoeRadius: METEORITE_STRIKE.aoeRadius,
    count: COMET_SHOWER.baseCount,
    staggerStep: COMET_SHOWER.staggerStep,
  }),
  effectFactory: (ability, pos) => {
    const count = ability.count ?? COMET_SHOWER.baseCount
    const staggerStep = ability.staggerStep ?? COMET_SHOWER.staggerStep
    // Index 0 is the guaranteed dead-center hit at the base delay.
    const effects = [
      createMeteoriteEffect(pos, ability.damage, ability.aoeRadius, METEORITE_STRIKE.delay),
    ]
    for (let i = 1; i < count; i++) {
      const angle = rng.next() * Math.PI * 2
      const dist = Math.sqrt(rng.next()) * COMET_SHOWER.scatterRadius
      const scatterPos = { x: pos.x + Math.cos(angle) * dist, y: pos.y + Math.sin(angle) * dist }
      const delay =
        METEORITE_STRIKE.delay + i * staggerStep + rng.next() * COMET_SHOWER.staggerJitter
      effects.push(createMeteoriteEffect(scatterPos, ability.damage, ability.aoeRadius, delay))
    }
    return effects
  },
  applyUpgrades: composeUltimateUpgrades(meteorite, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? METEORITE_STRIKE.powerCost) * COMET_SHOWER.costMultiplier,
    count: applyTierSum(COMET_SHOWER.baseCount, upgrades, countUpgrade),
    staggerStep: Math.max(
      COMET_SHOWER.minStaggerStep,
      applyTierSum(COMET_SHOWER.staggerStep, upgrades, staggerUpgrade, -1)
    ),
  })),
  modifierUpgrades: [countUpgrade, staggerUpgrade],
}
