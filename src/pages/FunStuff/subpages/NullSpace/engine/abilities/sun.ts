import { SUN } from './ability-data'
import { createSunEffect } from '../systems/effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import { IconName } from '../../icon-names'

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
    { cost: 60, value: 8 },
    { cost: 200, value: 12 },
    { cost: 400, value: 18 },
    { cost: 800, value: 25 },
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
    { cost: 80, value: 2 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.sunRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.sun,
  label: 'Range',
  description: 'Increase sun radiation radius',
  tiers: [
    { cost: 15, value: 30 },
    { cost: 60, value: 50 },
    { cost: 200, value: 80 },
  ],
}

export const sun: AbilityDefinition = {
  kind: AbilityKind.sun,
  meta: { icon: IconName.sun, label: 'Sun' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.sun,
    cooldown: SUN.cooldown,
    powerCost: SUN.powerCost,
    damage: SUN.damagePerSec,
    aoeRadius: SUN.radius,
    duration: SUN.duration,
  }),
  effectFactory: (ability, pos) => [
    createSunEffect(pos, ability.aoeRadius, ability.damage, ability.duration ?? SUN.duration),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockSun].currentTier > 0,
    damage: applyTierSum(SUN.damagePerSec, upgrades, damageUpgrade),
    duration: applyTierSum(SUN.duration, upgrades, durationUpgrade),
    aoeRadius: applyTierSum(SUN.radius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, durationUpgrade, radiusUpgrade],
}
