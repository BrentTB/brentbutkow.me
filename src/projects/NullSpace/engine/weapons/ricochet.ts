import { HelperWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { RICOCHET } from './helper-weapon-data'
import {
  makeLoadoutUpgrade,
  buildHelperProjectile,
  type HelperWeaponDefinition,
} from './helper-weapon-definition'

export const RICOCHET_UPGRADE_IDS = {
  unlockRicochet: 'unlockRicochet',
} as const

const upgrade = makeLoadoutUpgrade(HelperWeaponKind.ricochet)

const unlockUpgrade = upgrade({
  id: RICOCHET_UPGRADE_IDS.unlockRicochet,
  label: 'Ally Ricochet',
  description: 'Arms ~1 in 4 helpers with rounds that bounce between enemies.',
  tiers: [{ cost: 70, value: 1 }],
})

export const ricochet: HelperWeaponDefinition = {
  kind: HelperWeaponKind.ricochet,
  meta: { icon: IconName.ricochet, label: 'Ricochet' },
  fireRateMultiplier: RICOCHET.fireRateMultiplier,
  weaponDamage: (baseDamage) => baseDamage * RICOCHET.damageMultiplier,
  createProjectiles: (shipPos, targetPos, damage) => [
    buildHelperProjectile(shipPos, targetPos, damage, {
      speed: RICOCHET.speed,
      lifetime: RICOCHET.lifetime,
      bounce: {
        remaining: RICOCHET.baseBounces,
        hitEnemyIds: [],
        bounceRange: RICOCHET.bounceRange,
        lifetimePerBounce: RICOCHET.lifetimePerBounce,
      },
    }),
  ],
  unlockUpgrade,
}
