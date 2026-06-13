import { applyTierSum } from '../abilities/ability-definition'
import { ShipWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { RICOCHET } from './ship-weapon-data'
import {
  makeLoadoutUpgrade,
  buildShipProjectile,
  type ShipWeaponDefinition,
} from './ship-weapon-definition'

export const RICOCHET_UPGRADE_IDS = {
  unlockRicochet: 'unlockRicochet',
  ricochetDamage: 'ricochetDamage',
  ricochetBounces: 'ricochetBounces',
} as const

const upgrade = makeLoadoutUpgrade(ShipWeaponKind.ricochet)

const unlockUpgrade = upgrade({
  id: RICOCHET_UPGRADE_IDS.unlockRicochet,
  label: 'Unlock Ricochet',
  description: 'Rounds that bounce between nearby enemies on hit',
  tiers: [{ cost: 70, value: 1 }],
})

const damageUpgrade = upgrade({
  id: RICOCHET_UPGRADE_IDS.ricochetDamage,
  label: 'Damage',
  description: 'Increase ricochet damage per hit',
  tiers: [
    { cost: 20, value: 2 },
    { cost: 80, value: 3 },
    { cost: 200, value: 5 },
  ],
})

const bouncesUpgrade = upgrade({
  id: RICOCHET_UPGRADE_IDS.ricochetBounces,
  label: 'Bounces',
  description: 'Increase how many times each round can ricochet',
  tiers: [
    { cost: 50, value: 1 },
    { cost: 180, value: 2 },
  ],
})

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
