import { CHAIN_LIGHTNING, ION_STORM } from '../ability-data'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from '../ability-definition'
import { chainLightning, createChainArcEffect } from './chain-lightning'
import { IconName } from '../../../icon-names'

export const ION_STORM_UPGRADE_IDS = {
  ionStormJumps: 'ionStormJumps',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.ionStorm)

const overloadUpgrade = upgrade({
  id: ION_STORM_UPGRADE_IDS.ionStormJumps,
  label: 'Overload',
  description: 'The storm forks through even more enemies',
  tiers: [
    { cost: 90, value: 1 },
    { cost: 260, value: 2 },
  ],
})

export const ionStorm: AbilityDefinition = {
  kind: AbilityKind.ionStorm,
  ultimateOf: AbilityKind.chainLightning,
  meta: { icon: IconName.chainLightning, label: 'Ion Storm' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.ionStorm,
    cooldown: CHAIN_LIGHTNING.cooldown,
    powerCost: CHAIN_LIGHTNING.powerCost * ION_STORM.costMultiplier,
    damage: CHAIN_LIGHTNING.damage,
    aoeRadius: ION_STORM.jumpRange,
    count: ION_STORM.maxJumps,
  }),
  effectFactory: (ability, pos) => [
    createChainArcEffect(
      pos,
      ability.damage,
      ability.aoeRadius,
      ability.count ?? ION_STORM.maxJumps,
      ION_STORM.forks,
      ION_STORM.falloff,
      ION_STORM.arcDuration
    ),
  ],
  // Inherits Chain Lightning's damage tier (same first-hit), plus its range/jump
  // tiers folded onto Ion Storm's larger base; Overload adds extra jumps.
  applyUpgrades: composeUltimateUpgrades(chainLightning, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? CHAIN_LIGHTNING.powerCost) * ION_STORM.costMultiplier,
    aoeRadius:
      (basePatch.aoeRadius ?? CHAIN_LIGHTNING.jumpRange) +
      (ION_STORM.jumpRange - CHAIN_LIGHTNING.jumpRange),
    count:
      (basePatch.count ?? CHAIN_LIGHTNING.maxJumps) +
      (ION_STORM.maxJumps - CHAIN_LIGHTNING.maxJumps) +
      applyTierSum(0, upgrades, overloadUpgrade),
  })),
  modifierUpgrades: [overloadUpgrade],
}
