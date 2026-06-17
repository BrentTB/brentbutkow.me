import { HelperWeaponKind } from '../types'
import { IconName } from '../../icon-names'
import { MISSILE } from './helper-weapon-data'
import {
  makeLoadoutUpgrade,
  buildHelperProjectile,
  type HelperWeaponDefinition,
} from './helper-weapon-definition'

export const MISSILE_UPGRADE_IDS = {
  unlockMissile: 'unlockMissile',
} as const

const upgrade = makeLoadoutUpgrade(HelperWeaponKind.missile)

const unlockUpgrade = upgrade({
  id: MISSILE_UPGRADE_IDS.unlockMissile,
  label: 'Ally Missiles',
  description: 'Arms ~1 in 4 helpers with homing missiles that explode on impact.',
  tiers: [{ cost: 80, value: 1 }],
})

export const missile: HelperWeaponDefinition = {
  kind: HelperWeaponKind.missile,
  meta: { icon: IconName.missile, label: 'Missile' },
  fireRateMultiplier: MISSILE.fireRateMultiplier,
  weaponDamage: (baseDamage) => baseDamage * MISSILE.damageMultiplier,
  createProjectiles: (shipPos, targetPos, damage) => [
    buildHelperProjectile(shipPos, targetPos, damage, {
      speed: MISSILE.baseSpeed,
      lifetime: MISSILE.lifetime,
      radius: MISSILE.radius,
      homing: true,
      // No waste fields → detonate is splash only, no lingering DOT zone.
      detonate: {
        aoeRadius: MISSILE.baseSplashRadius,
        blastDamage: Math.round(damage * MISSILE.splashDamageRatio),
      },
    }),
  ],
  unlockUpgrade,
}
