import { PROJECTILE_RADIUS } from '../../data'
import { uid } from '../entities/entity-creator'
import { toroidalDelta } from '../math/toroid'
import { ProjectileOwner, UpgradeCategory } from '../types'
import type { Projectile, HelperWeaponKind, UpgradeDefinition, Vec2 } from '../types'
import type { IconName } from '../../icon-names'

// A weapon an ally can be armed with, mirroring AbilityDefinition. A weapon owns
// its firing cadence multiplier, how it spawns projectiles (pre-tagged with
// behavior fields the combat system reads), the damage it does, and the upgrade
// that unlocks it. Combat never imports this file — it dispatches on the
// projectile's optional fields.
export type HelperWeaponDefinition = {
  kind: HelperWeaponKind
  meta: { icon: IconName; label: string }
  // True only for the default weapon (bullet). Everything else needs its
  // `unlockUpgrade` purchased before it can be equipped.
  startsUnlocked?: boolean
  // Multiplier applied to the firing ally's fireRate to compute this weapon's
  // cooldown (`1 / (fireRate * multiplier)`). Nuke is ~0.1, missile ~0.55,
  // bullet 1.
  fireRateMultiplier: number
  // Live damage given the firing ally's base damage.
  weaponDamage: (baseDamage: number) => number
  // Spawns the projectile(s) for a single target (bullet returns 1).
  createProjectiles: (shipPos: Vec2, targetPos: Vec2, damage: number) => Projectile[]
  // One-tier purchase that unlocks the weapon. Absent for the default weapon.
  unlockUpgrade?: UpgradeDefinition
}

// Binds a helper weapon so each of its upgrades declares only id/label/
// description/tiers — the shared loadout category + weapon fields are injected
// once per file. Loadout parallel of makeAbilityUpgrade.
export function makeLoadoutUpgrade(
  weapon: HelperWeaponKind
): (def: Omit<UpgradeDefinition, 'category' | 'weapon'>) => UpgradeDefinition {
  return (def) => ({ ...def, category: UpgradeCategory.loadout, weapon })
}

// Per-weapon options for building a ship projectile beyond the bullet defaults.
// Unset fields fall back to bullet's values (PROJECTILE_RADIUS / 1-hp).
export type WeaponProjectileOpts = {
  speed: number
  lifetime: number
  radius?: number
  pierce?: Projectile['pierce']
  homing?: boolean
  bounce?: Projectile['bounce']
  detonate?: Projectile['detonate']
}

// Builds a ship-owned projectile aimed from `shipPos` toward `targetPos`,
// pre-tagged with whichever behavior fields the caller passes. Shared by the
// non-bullet weapons (bullet uses createProjectile directly).
export function buildHelperProjectile(
  shipPos: Vec2,
  targetPos: Vec2,
  damage: number,
  opts: WeaponProjectileOpts
): Projectile {
  // Aim along the shortest (torus-wrapped) path so a target across a world seam is
  // shot the short way, not the long way around — matches createProjectile.
  const { x: dx, y: dy } = toroidalDelta(shipPos, targetPos)
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 1
  return {
    id: uid(),
    pos: { ...shipPos },
    prevPos: { ...shipPos },
    vel: { x: nx * opts.speed, y: ny * opts.speed },
    radius: opts.radius ?? PROJECTILE_RADIUS,
    hp: 1,
    maxHp: 1,
    owner: ProjectileOwner.ship,
    damage,
    lifetime: opts.lifetime,
    ...(opts.pierce ? { pierce: opts.pierce } : {}),
    ...(opts.homing ? { homing: opts.homing } : {}),
    ...(opts.bounce ? { bounce: opts.bounce } : {}),
    ...(opts.detonate ? { detonate: opts.detonate } : {}),
  }
}
