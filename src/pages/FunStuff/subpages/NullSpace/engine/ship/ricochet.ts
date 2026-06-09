import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind, UpgradeCategory, UpgradeId } from '../types'
import type { UpgradeDefinition } from '../types'
import { IconName } from '../../icon-names'
import { RICOCHET } from './ship-weapon-data'
import { buildShipProjectile, type ShipWeaponDefinition } from './ship-weapon-definition'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockRicochet,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.ricochet,
  label: 'Unlock Ricochet',
  description: 'Rounds that bounce between nearby enemies on hit',
  tiers: [{ cost: 70, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.ricochetDamage,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.ricochet,
  label: 'Damage',
  description: 'Increase ricochet damage per hit',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 80, value: 3 },
    { cost: 200, value: 5 },
  ],
}

const bouncesUpgrade: UpgradeDefinition = {
  id: UpgradeId.ricochetBounces,
  category: UpgradeCategory.loadout,
  weapon: ShipWeaponKind.ricochet,
  label: 'Bounces',
  description: 'Increase how many times each round can ricochet',
  tiers: [
    { cost: 50, value: 1 },
    { cost: 180, value: 2 },
  ],
}

export const ricochet: ShipWeaponDefinition = {
  kind: ShipWeaponKind.ricochet,
  meta: { icon: IconName.ricochet, label: 'Ricochet' },
  fireRateMultiplier: RICOCHET.fireRateMultiplier,
  weaponDamage: (baseShipDamage, upgrades) =>
    applyTierSum(baseShipDamage * RICOCHET.damageMultiplier, upgrades, damageUpgrade),
  createProjectiles: (shipPos, targetPos, damage, upgrades) => {
    const remaining = applyTierSum(RICOCHET.baseBounces, upgrades, bouncesUpgrade)
    return [
      buildShipProjectile(shipPos, targetPos, damage, {
        speed: RICOCHET.speed,
        lifetime: RICOCHET.lifetime,
        bounce: {
          remaining,
          hitEnemyIds: [],
          bounceRange: RICOCHET.bounceRange,
          lifetimePerBounce: RICOCHET.lifetimePerBounce,
        },
      }),
    ]
  },
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, bouncesUpgrade],
}
