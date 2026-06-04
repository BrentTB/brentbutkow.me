import { ROCKET } from './abilityData'
import { createRocketEffect } from '../effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

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
    { cost: 20, value: 15 },
    { cost: 35, value: 25 },
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
    { cost: 24, value: 25 },
  ],
}

export const rocket: AbilityDefinition = {
  kind: AbilityKind.rocket,
  meta: { icon: '🚀', label: 'Rocket' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.rocket,
    cooldown: ROCKET.cooldown,
    powerCost: ROCKET.powerCost,
    damage: ROCKET.damage,
    aoeRadius: ROCKET.aoeRadius,
  }),
  effectFactory: (ability, pos, ship) =>
    createRocketEffect(ship.pos, pos, ability.damage, ability.aoeRadius, ROCKET.speed),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockRocket].currentTier > 0,
    damage: applyTierSum(ROCKET.damage, upgrades, damageUpgrade),
    aoeRadius: applyTierSum(ROCKET.aoeRadius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, radiusUpgrade],
}
