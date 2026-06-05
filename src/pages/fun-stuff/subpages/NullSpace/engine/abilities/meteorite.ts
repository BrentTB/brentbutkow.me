import { METEORITE_STRIKE } from './abilityData'
import { createMeteoriteEffect } from '../systems/effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.meteoriteDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteorite,
  label: 'Damage',
  description: 'Increase meteorite strike damage',
  tiers: [
    { cost: 5, value: 5 },
    { cost: 10, value: 5 },
    { cost: 20, value: 10 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.meteoriteCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteorite,
  label: 'Efficiency',
  description: 'Reduce meteorite power cost',
  tiers: [
    { cost: 8, value: 1 },
    { cost: 16, value: 1 },
  ],
}

export const meteorite: AbilityDefinition = {
  kind: AbilityKind.meteorite,
  meta: { icon: '☄', label: 'Meteorite' },
  activation: 'click',
  startsUnlocked: true,
  base: () => ({
    kind: AbilityKind.meteorite,
    cooldown: METEORITE_STRIKE.cooldown,
    powerCost: METEORITE_STRIKE.powerCost,
    damage: METEORITE_STRIKE.damage,
    aoeRadius: METEORITE_STRIKE.aoeRadius,
  }),
  effectFactory: (ability, pos) =>
    createMeteoriteEffect(pos, ability.damage, ability.aoeRadius, METEORITE_STRIKE.delay),
  applyUpgrades: (_ability, upgrades) => ({
    damage: applyTierSum(METEORITE_STRIKE.damage, upgrades, damageUpgrade),
    powerCost: Math.max(1, applyTierSum(METEORITE_STRIKE.powerCost, upgrades, costUpgrade, -1)),
  }),
  modifierUpgrades: [damageUpgrade, costUpgrade],
}
