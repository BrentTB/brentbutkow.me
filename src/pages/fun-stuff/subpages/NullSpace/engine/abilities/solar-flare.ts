import { SOLAR_FLARE } from './abilityData'
import { AbilityKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { applyTierSum, type AbilityDefinition } from './ability-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockSolarFlare,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Unlock Solar Flare',
  description: 'Hold to emit a continuous damage beam toward your cursor',
  tiers: [{ cost: 40, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.solarFlareDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Damage',
  description: 'Increase solar flare damage per tick',
  tiers: [
    { cost: 15, value: 4 },
    { cost: 30, value: 6 },
    { cost: 50, value: 10 },
  ],
}

const efficiencyUpgrade: UpgradeDefinition = {
  id: UpgradeId.solarFlareEfficiency,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.solarFlare,
  label: 'Efficiency',
  description: 'Reduce solar flare power drain per second',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 40, value: 2 },
  ],
}

export const solarFlare: AbilityDefinition = {
  kind: AbilityKind.solarFlare,
  meta: { icon: '🌟', label: 'Solar Flare' },
  activation: 'hold',
  base: () => ({
    kind: AbilityKind.solarFlare,
    cooldown: 0,
    powerCost: SOLAR_FLARE.powerPerSec,
    damage: SOLAR_FLARE.damagePerTick,
    aoeRadius: SOLAR_FLARE.beamWidth,
  }),
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockSolarFlare].currentTier > 0,
    damage: applyTierSum(SOLAR_FLARE.damagePerTick, upgrades, damageUpgrade),
    powerCost: Math.max(1, applyTierSum(SOLAR_FLARE.powerPerSec, upgrades, efficiencyUpgrade, -1)),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, efficiencyUpgrade],
}
