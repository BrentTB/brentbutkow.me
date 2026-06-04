import { TELEKINESIS } from './abilityData'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockTelekinesis,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Unlock Telekinesis',
  description: 'Hold to push enemies and your ship with a force field',
  tiers: [{ cost: 35, value: 1 }],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.telekinesisRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Radius',
  description: 'Increase telekinesis field radius',
  tiers: [
    { cost: 15, value: 30 },
    { cost: 30, value: 50 },
  ],
}

const strengthUpgrade: UpgradeDefinition = {
  id: UpgradeId.telekinesisStrength,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.telekinesis,
  label: 'Force',
  description: 'Increase telekinesis push strength',
  tiers: [
    { cost: 20, value: 0.4 },
    { cost: 40, value: 0.6 },
  ],
}

export const telekinesis: AbilityDefinition = {
  kind: AbilityKind.telekinesis,
  meta: { icon: '✋', label: 'Telekinesis' },
  activation: 'hold',
  base: () => ({
    kind: AbilityKind.telekinesis,
    cooldown: 0,
    powerCost: TELEKINESIS.powerPerSec,
    damage: 0,
    aoeRadius: TELEKINESIS.radius,
  }),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockTelekinesis].currentTier > 0,
    aoeRadius: applyTierSum(TELEKINESIS.radius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [radiusUpgrade, strengthUpgrade],
}
