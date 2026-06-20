import { HELPER, HELPER_FACTORY } from '../ability-data'
import { createHelperFactory } from '../../entities/entity-creator'
import { AbilityKind } from '../../types'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from '../ability-definition'
import { helper } from './helper'
import { IconName } from '../../../icon-names'

export const HELPER_FACTORY_UPGRADE_IDS = {
  helperFactorySpawnRate: 'helperFactorySpawnRate',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.helperFactory)

const spawnRateUpgrade = upgrade({
  id: HELPER_FACTORY_UPGRADE_IDS.helperFactorySpawnRate,
  label: 'Assembly Line',
  description: 'Factory builds helpers more frequently',
  tiers: [
    { cost: 80, value: 0.7 },
    { cost: 220, value: 0.9 },
    { cost: 500, value: 1.2 },
  ],
})

const factoryMaxHp = HELPER.hp * HELPER_FACTORY.hpMultiplier

export const helperFactory: AbilityDefinition = {
  kind: AbilityKind.helperFactory,
  ultimateOf: AbilityKind.helper,
  meta: { icon: IconName.helper, label: 'Helper Factory' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.helperFactory,
    cooldown: HELPER.cooldown,
    powerCost: HELPER.powerCost * HELPER_FACTORY.costMultiplier,
    // The factory itself never deals damage — only the helpers it builds do.
    damage: 0,
    aoeRadius: 0,
    maxHp: factoryMaxHp,
    spawnInterval: HELPER_FACTORY.spawnInterval,
  }),
  allyFactory: (pos, ability) =>
    createHelperFactory(
      pos,
      ability.maxHp ?? factoryMaxHp,
      ability.spawnInterval ?? HELPER_FACTORY.spawnInterval
    ),
  applyUpgrades: composeUltimateUpgrades(helper, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? HELPER.powerCost) * HELPER_FACTORY.costMultiplier,
    // Scale the helper's HP upgrades up to factory size; never deal damage.
    maxHp: (basePatch.maxHp ?? HELPER.hp) * HELPER_FACTORY.hpMultiplier,
    damage: 0,
    spawnInterval: Math.max(
      HELPER_FACTORY.minSpawnInterval,
      applyTierSum(HELPER_FACTORY.spawnInterval, upgrades, spawnRateUpgrade, -1)
    ),
  })),
  modifierUpgrades: [spawnRateUpgrade],
}
