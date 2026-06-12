import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind, UpgradeCategory } from '../types'
import type { UpgradeDefinition } from '../types'
import { IconName } from '../../icon-names'
import { MISSILE } from './ship-weapon-data'
import { buildShipProjectile, type ShipWeaponDefinition } from './ship-weapon-definition'

export const MISSILE_UPGRADE_IDS = {
  unlockMissile: 'unlockMissile',
  missileDamage: 'missileDamage',
  missileSpeed: 'missileSpeed',
  missileSplash: 'missileSplash',
} as const

const unlockUpgrade: UpgradeDefinition = {
  id: MISSILE_UPGRADE_IDS.unlockMissile,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.missile,
  label: 'Unlock Missile',
  description: 'A slow homing projectile that tracks enemies and explodes on impact',
  tiers: [{ cost: 80, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: MISSILE_UPGRADE_IDS.missileDamage,
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
  id: MISSILE_UPGRADE_IDS.missileSpeed,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.missile,
  label: 'Tracking',
  description: 'Increase missile travel speed',
  tiers: [
    { cost: 30, value: 50 },
    { cost: 120, value: 80 },
  ],
}

const splashUpgrade: UpgradeDefinition = {
  id: MISSILE_UPGRADE_IDS.missileSplash,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.missile,
  label: 'Splash',
  description: 'Increase missile splash radius',
  tiers: [
    { cost: 40, value: 20 },
    { cost: 160, value: 35 },
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
    const splashRadius = applyTierSum(MISSILE.baseSplashRadius, upgrades, splashUpgrade)
    return [
      buildShipProjectile(shipPos, targetPos, damage, {
        speed,
        lifetime: MISSILE.lifetime,
        radius: MISSILE.radius,
        homing: true,
        // No waste fields → detonate is splash only, no lingering DOT zone.
        detonate: {
          aoeRadius: splashRadius,
          blastDamage: Math.round(damage * MISSILE.splashDamageRatio),
        },
      }),
    ]
  },
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, speedUpgrade, splashUpgrade],
}
