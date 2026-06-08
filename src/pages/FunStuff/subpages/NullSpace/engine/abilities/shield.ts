import { SHIELD } from './ability-data'
import { createShieldEffect } from '../systems/effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockShield,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Unlock Shield',
  description: 'Unlock the Shield barrier',
  tiers: [{ cost: 30, value: 1 }],
}

const durationUpgrade: UpgradeDefinition = {
  id: UpgradeId.shieldDuration,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Duration',
  description: 'Increase shield duration',
  tiers: [
    { cost: 12, value: 1.5 },
    { cost: 48, value: 2.5 },
    { cost: 192, value: 3.5 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.shieldRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Size',
  description: 'Increase shield radius',
  tiers: [
    { cost: 10, value: 15 },
    { cost: 40, value: 25 },
    { cost: 140, value: 40 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.shieldCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Efficiency',
  description: 'Reduce shield power cost',
  tiers: [
    { cost: 12, value: 5 },
    { cost: 48, value: 5 },
  ],
}

export const shield: AbilityDefinition = {
  kind: AbilityKind.shield,
  meta: { icon: IconName.shield, label: 'Shield' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.shield,
    cooldown: SHIELD.cooldown,
    powerCost: SHIELD.powerCost,
    // Shield is a movement barrier, not a damage dealer.
    damage: 0,
    aoeRadius: SHIELD.radius,
    duration: SHIELD.duration,
  }),
  effectFactory: (ability, pos) =>
    createShieldEffect(pos, ability.aoeRadius, ability.duration ?? SHIELD.duration),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockShield].currentTier > 0,
    aoeRadius: applyTierSum(SHIELD.radius, upgrades, radiusUpgrade),
    duration: applyTierSum(SHIELD.duration, upgrades, durationUpgrade),
    powerCost: applyCostReduction(SHIELD.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [durationUpgrade, radiusUpgrade, costUpgrade],
}
