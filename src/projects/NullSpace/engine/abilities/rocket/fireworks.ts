import { FIREWORKS, ROCKET } from '../ability-data'
import { createRocketEffect, rocket } from './rocket'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { IconName } from '../../../icon-names'

export const FIREWORKS_UPGRADE_IDS = {
  fireworksFinale: 'fireworksFinale',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.fireworks)

const finaleUpgrade = upgrade({
  id: FIREWORKS_UPGRADE_IDS.fireworksFinale,
  label: 'Finale',
  description: 'Each second-wave rocket bursts into one more',
  tiers: [
    { cost: 90, value: 1 },
    { cost: 240, value: 1 },
    { cost: 520, value: 1 },
  ],
})

// Rocket ultimate. One rocket flies as normal, then bursts into `firstSplit`
// rockets, each of which bursts into `count` (baseFinalCount + Finale tiers).
// Damage tracks Rocket's upgrades and divides by `damageFalloff` per generation.
export const fireworks: AbilityDefinition = {
  kind: AbilityKind.fireworks,
  ultimateOf: AbilityKind.rocket,
  meta: { icon: IconName.rocket, label: 'Fireworks' },
  activation: AbilityActivation.click,
  base: () => ({
    kind: AbilityKind.fireworks,
    cooldown: ROCKET.cooldown,
    powerCost: ROCKET.powerCost * FIREWORKS.costMultiplier,
    damage: ROCKET.damage,
    aoeRadius: ROCKET.aoeRadius,
    count: FIREWORKS.baseFinalCount,
  }),
  effectFactory: (ability, pos, ship) => {
    const finalCount = ability.count ?? FIREWORKS.baseFinalCount
    return [
      {
        ...createRocketEffect(ship.pos, pos, ability.damage, ability.aoeRadius, ROCKET.speed),
        fireworks: {
          splits: [FIREWORKS.firstSplit, finalCount],
          damageFalloff: FIREWORKS.damageFalloff,
        },
      },
    ]
  },
  applyUpgrades: composeUltimateUpgrades(rocket, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? ROCKET.powerCost) * FIREWORKS.costMultiplier,
    count: applyTierSum(FIREWORKS.baseFinalCount, upgrades, finaleUpgrade),
  })),
  modifierUpgrades: [finaleUpgrade],
}
