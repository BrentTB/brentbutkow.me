import { METEOR_STRIKE } from './ability-data'
import { createMeteorEffect } from './meteor-strike'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
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
    { cost: 40, value: 15 },
    { cost: 140, value: 20 },
    { cost: 280, value: 25 },
    { cost: 560, value: 35 },
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
    { cost: 48, value: 5 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.meteorRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteor,
  label: 'Blast Radius',
  description: 'Increase meteor blast radius',
  tiers: [
    { cost: 12, value: 20 },
    { cost: 48, value: 30 },
    { cost: 192, value: 40 },
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
  effectFactory: (ability, pos) => [
    createMeteorEffect(pos, ability.damage, ability.aoeRadius, METEOR_STRIKE.delay),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockMeteor].currentTier > 0,
    damage: applyTierSum(METEOR_STRIKE.damage, upgrades, damageUpgrade),
    powerCost: applyCostReduction(METEOR_STRIKE.powerCost, upgrades, costUpgrade),
    aoeRadius: applyTierSum(METEOR_STRIKE.aoeRadius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, costUpgrade, radiusUpgrade],
  ultimate: {
    kind: AbilityKind.meteorShower,
    label: 'Meteor Shower',
    description: 'A center strike plus a ring of meteors around it (upgrade to add more).',
    cost: { stardust: 400, spaceMetal: 15 },
  },
}
