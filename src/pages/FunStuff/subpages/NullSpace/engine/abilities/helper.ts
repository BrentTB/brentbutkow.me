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
    { cost: 35, value: 20 },
    { cost: 50, value: 30 },
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
    { cost: 40, value: 2 },
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
  }),
  unlockUpgrade,
  modifierUpgrades: [maxHpUpgrade, damageUpgrade],
}
