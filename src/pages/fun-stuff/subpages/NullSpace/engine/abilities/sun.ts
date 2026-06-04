import { SUN } from './abilityData'
import { createSunEffect } from '../effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockSun,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.sun,
  label: 'Unlock Sun',
  description: 'Unlock the devastating Sun',
  tiers: [{ cost: 50, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.sunDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.sun,
  label: 'Damage',
  description: 'Increase sun damage per second',
  tiers: [
    { cost: 15, value: 5 },
    { cost: 30, value: 8 },
    { cost: 50, value: 12 },
  ],
}

const durationUpgrade: UpgradeDefinition = {
  id: UpgradeId.sunDuration,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.sun,
  label: 'Duration',
  description: 'Increase sun duration',
  tiers: [
    { cost: 20, value: 1 },
    { cost: 40, value: 2 },
  ],
}

export const sun: AbilityDefinition = {
  kind: AbilityKind.sun,
  meta: { icon: '☀', label: 'Sun' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.sun,
    cooldown: SUN.cooldown,
    powerCost: SUN.powerCost,
    damage: SUN.damagePerSec,
    aoeRadius: SUN.radius,
    duration: SUN.duration,
  }),
  effectFactory: (ability, pos) =>
    createSunEffect(pos, ability.aoeRadius, ability.damage, ability.duration ?? SUN.duration),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockSun].currentTier > 0,
    damage: applyTierSum(SUN.damagePerSec, upgrades, damageUpgrade),
    duration: applyTierSum(SUN.duration, upgrades, durationUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, durationUpgrade],
}
