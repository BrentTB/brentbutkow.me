import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { IconName } from '../../icon-names'
import { NUKE } from './ship-weapon-data'
import { buildShipProjectile, type ShipWeaponDefinition } from './ship-weapon-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockNuke,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.nuke,
  label: 'Unlock Nuke',
  description: 'A very slow shell with a massive blast that leaves radioactive waste',
  tiers: [{ cost: 140, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.nukeDamage,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.nuke,
  label: 'Damage',
  description: 'Increase nuke blast damage',
  tiers: [
    { cost: 50, value: 10 },
    { cost: 200, value: 20 },
    { cost: 480, value: 35 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.nukeBlastRadius,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.nuke,
  label: 'Blast Radius',
  description: 'Increase nuke blast radius',
  tiers: [
    { cost: 40, value: 25 },
    { cost: 160, value: 40 },
  ],
}

const wasteDurationUpgrade: UpgradeDefinition = {
  id: UpgradeId.nukeWasteDuration,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.nuke,
  label: 'Fallout',
  description: 'Radioactive waste lingers longer',
  tiers: [
    { cost: 40, value: 2 },
    { cost: 160, value: 3 },
  ],
}

export const nuke: ShipWeaponDefinition = {
  kind: ShipWeaponKind.nuke,
  meta: { icon: IconName.nuke, label: 'Nuke' },
  fireRateMultiplier: NUKE.fireRateMultiplier,
  weaponDamage: (baseShipDamage, upgrades) =>
    applyTierSum(baseShipDamage * NUKE.damageMultiplier, upgrades, damageUpgrade),
  createProjectiles: (shipPos, targetPos, damage, upgrades) => {
    const aoeRadius = applyTierSum(NUKE.baseAoeRadius, upgrades, radiusUpgrade)
    const wasteDuration = applyTierSum(NUKE.baseWasteDuration, upgrades, wasteDurationUpgrade)
    return [
      buildShipProjectile(shipPos, targetPos, damage, {
        speed: NUKE.speed,
        lifetime: NUKE.lifetime,
        radius: NUKE.radius,
        // Carries the detonation parameters with it so combat.ts can apply
        // them at impact without importing the weapon registry.
        detonate: {
          aoeRadius,
          // Direct hit also delivers the full blast damage to the surrounding
          // enemies, so the contact damage itself is folded into the AoE.
          blastDamage: damage,
          wasteRadius: NUKE.baseWasteRadius,
          wasteDps: NUKE.baseWasteDps,
          wasteDuration,
          wasteGrowDuration: NUKE.wasteGrowDuration,
        },
      }),
    ]
  },
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, radiusUpgrade, wasteDurationUpgrade],
}
