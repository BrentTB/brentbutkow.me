import { METEOR_STRIKE } from './ability-data'
import { createMeteorEffect } from '../systems/effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockMeteor,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteor,
  label: 'Unlock Meteor',
  description: 'Unlock the devastating Meteor strike',
  tiers: [{ cost: 15, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.meteorDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteor,
  label: 'Damage',
  description: 'Increase meteor strike damage',
  tiers: [
    { cost: 10, value: 10 },
    { cost: 20, value: 15 },
    { cost: 35, value: 20 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.meteorCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteor,
  label: 'Efficiency',
  description: 'Reduce meteor power cost',
  tiers: [
    { cost: 12, value: 5 },
    { cost: 24, value: 5 },
  ],
}

export const meteor: AbilityDefinition = {
  kind: AbilityKind.meteor,
  meta: { icon: IconName.meteor, label: 'Meteor' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.meteor,
    cooldown: METEOR_STRIKE.cooldown,
    powerCost: METEOR_STRIKE.powerCost,
    damage: METEOR_STRIKE.damage,
    aoeRadius: METEOR_STRIKE.aoeRadius,
  }),
  effectFactory: (ability, pos) =>
    createMeteorEffect(pos, ability.damage, ability.aoeRadius, METEOR_STRIKE.delay),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockMeteor].currentTier > 0,
    damage: applyTierSum(METEOR_STRIKE.damage, upgrades, damageUpgrade),
    powerCost: Math.max(1, applyTierSum(METEOR_STRIKE.powerCost, upgrades, costUpgrade, -1)),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, costUpgrade],
}
