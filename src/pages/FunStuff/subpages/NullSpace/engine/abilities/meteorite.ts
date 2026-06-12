import { COMET_SHOWER, METEORITE_STRIKE } from './ability-data'
import { createMeteoriteEffect } from './meteor-strike'
import { AbilityKind, UpgradeCategory } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'

export const METEORITE_UPGRADE_IDS = {
  meteoriteDamage: 'meteoriteDamage',
  meteoriteCostReduction: 'meteoriteCostReduction',
} as const

const damageUpgrade: UpgradeDefinition = {
  id: METEORITE_UPGRADE_IDS.meteoriteDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteorite,
  label: 'Damage',
  description: 'Increase meteorite strike damage',
  tiers: [
    { cost: 5, value: 5 },
    { cost: 20, value: 5 },
    { cost: 80, value: 10 },
    { cost: 160, value: 15 },
    { cost: 320, value: 25 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: METEORITE_UPGRADE_IDS.meteoriteCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.meteorite,
  label: 'Efficiency',
  description: 'Reduce meteorite power cost',
  tiers: [
    { cost: 8, value: 1 },
    { cost: 32, value: 1 },
    { cost: 128, value: 1 },
  ],
}

export const meteorite: AbilityDefinition = {
  kind: AbilityKind.meteorite,
  meta: { icon: IconName.meteorite, label: 'Meteorite' },
  activation: 'click',
  startsUnlocked: true,
  base: () => ({
    kind: AbilityKind.meteorite,
    cooldown: METEORITE_STRIKE.cooldown,
    powerCost: METEORITE_STRIKE.powerCost,
    damage: METEORITE_STRIKE.damage,
    aoeRadius: METEORITE_STRIKE.aoeRadius,
  }),
  effectFactory: (ability, pos) => [
    createMeteoriteEffect(pos, ability.damage, ability.aoeRadius, METEORITE_STRIKE.delay),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    damage: applyTierSum(METEORITE_STRIKE.damage, upgrades, damageUpgrade),
    powerCost: applyCostReduction(METEORITE_STRIKE.powerCost, upgrades, costUpgrade),
  }),
  modifierUpgrades: [damageUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.cometShower,
    label: 'Comet Shower',
    description: `Rain ${COMET_SHOWER.baseCount} meteorites — one dead-center, the rest scattered around it.`,
    cost: { stardust: 250, spaceMetal: 10 },
  },
}
