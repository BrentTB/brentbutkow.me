import { ROCKET } from './ability-data'
import { createRocketEffect } from '../systems/effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockRocket,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Unlock Rocket',
  description: 'Unlock the homing Rocket strike',
  tiers: [{ cost: 25, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.rocketDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Damage',
  description: 'Increase rocket explosion damage',
  tiers: [
    { cost: 10, value: 10 },
    { cost: 40, value: 15 },
    { cost: 140, value: 25 },
    { cost: 280, value: 30 },
    { cost: 560, value: 40 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.rocketRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Blast Radius',
  description: 'Increase rocket explosion radius',
  tiers: [
    { cost: 12, value: 15 },
    { cost: 48, value: 25 },
    { cost: 192, value: 35 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.rocketCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.rocket,
  label: 'Efficiency',
  description: 'Reduce rocket power cost',
  tiers: [
    { cost: 12, value: 4 },
    { cost: 48, value: 5 },
  ],
}

export const rocket: AbilityDefinition = {
  kind: AbilityKind.rocket,
  meta: { icon: IconName.rocket, label: 'Rocket' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.rocket,
    cooldown: ROCKET.cooldown,
    powerCost: ROCKET.powerCost,
    damage: ROCKET.damage,
    aoeRadius: ROCKET.aoeRadius,
  }),
  effectFactory: (ability, pos, ship) => [
    createRocketEffect(ship.pos, pos, ability.damage, ability.aoeRadius, ROCKET.speed),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockRocket].currentTier > 0,
    damage: applyTierSum(ROCKET.damage, upgrades, damageUpgrade),
    aoeRadius: applyTierSum(ROCKET.aoeRadius, upgrades, radiusUpgrade),
    powerCost: applyCostReduction(ROCKET.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, radiusUpgrade, costUpgrade],
}
