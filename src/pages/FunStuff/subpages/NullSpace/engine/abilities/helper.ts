import { HELPER } from './ability-data'
import { createAlly } from '../entities/entity-creator'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockHelper,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.helper,
  label: 'Unlock Helper',
  description: 'Summon a ranged ally to fight alongside your ship',
  tiers: [{ cost: 30, value: 1 }],
}

const maxHpUpgrade: UpgradeDefinition = {
  id: UpgradeId.helperMaxHp,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.helper,
  label: 'Max Health',
  description: 'Increase ally maximum health',
  tiers: [
    { cost: 20, value: 10 },
    { cost: 70, value: 20 },
    { cost: 200, value: 30 },
  ],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.helperDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.helper,
  label: 'Damage',
  description: 'Increase ally attack damage',
  tiers: [
    { cost: 25, value: 1 },
    { cost: 80, value: 2 },
    { cost: 200, value: 3 },
    { cost: 400, value: 4 },
    { cost: 800, value: 5 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.helperCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.helper,
  label: 'Efficiency',
  description: 'Reduce helper power cost',
  tiers: [
    { cost: 15, value: 8 },
    { cost: 60, value: 10 },
  ],
}

export const helper: AbilityDefinition = {
  kind: AbilityKind.helper,
  meta: { icon: IconName.helper, label: 'Helper' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.helper,
    cooldown: HELPER.cooldown,
    powerCost: HELPER.powerCost,
    damage: HELPER.damage,
    aoeRadius: 0,
    maxHp: HELPER.hp,
  }),
  allyFactory: (pos, ability) => createAlly(pos, ability.maxHp ?? HELPER.hp, ability.damage),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockHelper].currentTier > 0,
    maxHp: applyTierSum(HELPER.hp, upgrades, maxHpUpgrade),
    damage: applyTierSum(HELPER.damage, upgrades, damageUpgrade),
    powerCost: Math.max(1, applyTierSum(HELPER.powerCost, upgrades, costUpgrade, -1)),
  }),
  unlockUpgrade,
  modifierUpgrades: [maxHpUpgrade, damageUpgrade, costUpgrade],
}
