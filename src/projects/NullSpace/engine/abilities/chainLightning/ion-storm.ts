import { CHAIN_LIGHTNING, ION_STORM } from '../ability-data'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { chainLightning, createChainArcEffect } from './chain-lightning'
import { IconName } from '../../../icon-names'

export const ION_STORM_UPGRADE_IDS = {
  ionStormForks: 'ionStormForks',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.ionStorm)

const overloadUpgrade = upgrade({
  id: ION_STORM_UPGRADE_IDS.ionStormForks,
  label: 'Overload',
  description: 'The storm splits into another chain — more zaps across the swarm',
  tiers: [
    { cost: 90, value: 1 },
    { cost: 260, value: 1 },
  ],
})

export const ionStorm: AbilityDefinition = {
  kind: AbilityKind.ionStorm,
  ultimateOf: AbilityKind.chainLightning,
  meta: { icon: IconName.chainLightning, label: 'Ion Storm' },
  activation: AbilityActivation.click,
  base: () => ({
    kind: AbilityKind.ionStorm,
    cooldown: CHAIN_LIGHTNING.cooldown,
    powerCost: CHAIN_LIGHTNING.powerCost * ION_STORM.costMultiplier,
    damage: ION_STORM.damage,
    aoeRadius: ION_STORM.jumpRange,
    count: ION_STORM.depth,
    forks: ION_STORM.forks,
  }),
  effectFactory: (ability, pos) => [
    createChainArcEffect(
      pos,
      ability.damage,
      ability.aoeRadius,
      ability.count ?? ION_STORM.depth,
      ability.forks ?? ION_STORM.forks,
      ION_STORM.falloff,
      ION_STORM.arcDuration
    ),
  ],
  // Inherits Chain Lightning's damage/range/depth UPGRADE tiers, layered onto Ion
  // Storm's own higher base; Overload adds parallel chains (forks) — the kill-scaler.
  applyUpgrades: composeUltimateUpgrades(chainLightning, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? CHAIN_LIGHTNING.powerCost) * ION_STORM.costMultiplier,
    damage:
      (basePatch.damage ?? CHAIN_LIGHTNING.damage) + (ION_STORM.damage - CHAIN_LIGHTNING.damage),
    aoeRadius:
      (basePatch.aoeRadius ?? CHAIN_LIGHTNING.jumpRange) +
      (ION_STORM.jumpRange - CHAIN_LIGHTNING.jumpRange),
    count: (basePatch.count ?? CHAIN_LIGHTNING.depth) + (ION_STORM.depth - CHAIN_LIGHTNING.depth),
    forks: ION_STORM.forks + applyTierSum(0, upgrades, overloadUpgrade),
  })),
  modifierUpgrades: [overloadUpgrade],
}
