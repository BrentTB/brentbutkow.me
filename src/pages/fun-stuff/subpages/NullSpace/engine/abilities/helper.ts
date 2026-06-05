import { HELPER } from './abilityData'
import { createAlly } from '../entities/entityCreator'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockHelper,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.helper,
  label: 'Unlock Helper',
  description: 'Summon a ranged ally to fight alongside your ship',
  tiers: [{ cost: 30, value: 1 }],
}

const durationUpgrade: UpgradeDefinition = {
  id: UpgradeId.helperDuration,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.helper,
  label: 'Duration',
  description: 'Increase ally lifetime',
  tiers: [
    { cost: 20, value: 5 },
    { cost: 35, value: 10 },
    { cost: 50, value: 15 },
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
  meta: { icon: '👾', label: 'Helper' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.helper,
    cooldown: HELPER.cooldown,
    powerCost: HELPER.powerCost,
    damage: HELPER.damage,
    aoeRadius: 0,
    duration: HELPER.duration,
  }),
  allyFactory: (pos) => createAlly(pos),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockHelper].currentTier > 0,
    duration: applyTierSum(HELPER.duration, upgrades, durationUpgrade),
    damage: applyTierSum(HELPER.damage, upgrades, damageUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [durationUpgrade, damageUpgrade],
}
