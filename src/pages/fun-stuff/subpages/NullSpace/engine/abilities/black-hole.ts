import { BLACK_HOLE } from './abilityData'
import { createBlackHoleEffect } from '../effects'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockBlackHole,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Unlock Black Hole',
  description: 'Unlock the gravity-warping Black Hole',
  tiers: [{ cost: 20, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.blackHoleDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Damage',
  description: 'Increase black hole damage over time',
  tiers: [
    { cost: 10, value: 1 },
    { cost: 20, value: 2 },
    { cost: 35, value: 3 },
  ],
}

const durationUpgrade: UpgradeDefinition = {
  id: UpgradeId.blackHoleDuration,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Duration',
  description: 'Increase black hole duration',
  tiers: [
    { cost: 12, value: 1 },
    { cost: 24, value: 1.5 },
  ],
}

export const blackHole: AbilityDefinition = {
  kind: AbilityKind.blackHole,
  meta: { icon: '🕳', label: 'Black Hole' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.blackHole,
    cooldown: BLACK_HOLE.cooldown,
    powerCost: BLACK_HOLE.powerCost,
    damage: BLACK_HOLE.damage,
    aoeRadius: BLACK_HOLE.radius,
    duration: BLACK_HOLE.duration,
  }),
  effectFactory: (ability, pos) =>
    createBlackHoleEffect(
      pos,
      ability.aoeRadius,
      BLACK_HOLE.pullStrength,
      ability.damage,
      ability.duration ?? BLACK_HOLE.duration
    ),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockBlackHole].currentTier > 0,
    damage: applyTierSum(BLACK_HOLE.damage, upgrades, damageUpgrade),
    duration: applyTierSum(BLACK_HOLE.duration, upgrades, durationUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, durationUpgrade],
}
