import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { IconName } from '../../icon-names'
import { MISSILE } from './ship-weapon-data'
import { buildShipProjectile, type ShipWeaponDefinition } from './ship-weapon-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockMissile,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.missile,
  label: 'Unlock Missile',
  description: 'A slow homing projectile that tracks enemies',
  tiers: [{ cost: 80, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.missileDamage,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.missile,
  label: 'Damage',
  description: 'Increase missile damage',
  tiers: [
    { cost: 25, value: 4 },
    { cost: 100, value: 6 },
    { cost: 240, value: 10 },
  ],
}

const speedUpgrade: UpgradeDefinition = {
  id: UpgradeId.missileSpeed,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.missile,
  label: 'Tracking',
  description: 'Increase missile travel speed',
  tiers: [
    { cost: 30, value: 50 },
    { cost: 120, value: 80 },
  ],
}

export const missile: ShipWeaponDefinition = {
  kind: ShipWeaponKind.missile,
  meta: { icon: IconName.missile, label: 'Missile' },
  fireRateMultiplier: MISSILE.fireRateMultiplier,
  weaponDamage: (baseShipDamage, upgrades) =>
    applyTierSum(baseShipDamage * MISSILE.damageMultiplier, upgrades, damageUpgrade),
  createProjectiles: (shipPos, targetPos, damage, upgrades) => {
    const speed = applyTierSum(MISSILE.baseSpeed, upgrades, speedUpgrade)
    return [
      buildShipProjectile(shipPos, targetPos, damage, {
        speed,
        lifetime: MISSILE.lifetime,
        radius: MISSILE.radius,
        homing: true,
      }),
    ]
  },
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, speedUpgrade],
}
