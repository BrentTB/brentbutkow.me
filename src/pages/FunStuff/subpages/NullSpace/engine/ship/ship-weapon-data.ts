// Per-weapon tuning constants. The PROJECTILE_SPEED / damage scale from data.ts
// are the bullet baseline; specialty weapons multiply or override them here.

import { PROJECTILE_SPEED } from '../../data'

export const BULLET = {
  // Multiplier applied to ship.fireRate for this weapon's cooldown
  // (1 = unchanged, 0.15 = much slower).
  fireRateMultiplier: 1,
  // Multiplier on ship.damage before tier bonuses apply.
  damageMultiplier: 1,
  // Straight-line projectile speed reuse.
  speed: PROJECTILE_SPEED,
  lifetime: 3,
} as const

export const LASER = {
  fireRateMultiplier: 0.85,
  damageMultiplier: 0.85,
  speed: PROJECTILE_SPEED * 2,
  lifetime: 0.45,
  // Number of enemies one beam can damage before being consumed.
  basePierce: 3,
  // Width of the visible beam line, in pixels.
  beamWidth: 3,
} as const

export const MISSILE = {
  fireRateMultiplier: 0.55,
  damageMultiplier: 2.0,
  // Homing speed (px/sec). Slower than a bullet so the homing matters.
  baseSpeed: PROJECTILE_SPEED / 2,
  lifetime: 4,
  radius: 5,
  // Splash AoE on contact — radius small but enough to clip a tight group.
  baseSplashRadius: 50,
  // Splash damage scales with main hit damage.
  splashDamageRatio: 0.6,
} as const

export const RICOCHET = {
  fireRateMultiplier: 0.85,
  damageMultiplier: 1.0,
  speed: PROJECTILE_SPEED,
  lifetime: 3,
  baseBounces: 2,
  bounceRange: 500,
  // Each successful bounce raises the projectile's lifetime to at least this
  // many seconds.
  lifetimePerBounce: 0.5,
} as const

export const NUKE = {
  // Much slower fire than before — the visual punch sells the tradeoff.
  fireRateMultiplier: 0.1,
  // Big payload — direct/blast damage well above bullet so the slow cadence pays off.
  damageMultiplier: 1.5,
  // The slow lob: a clearly draggy projectile so the player feels the trade.
  speed: 160,
  lifetime: 8,
  radius: 8,
  baseAoeRadius: 150,
  // Lingering "nuclear waste" zone left at the detonation site.
  baseWasteRadius: 130,
  baseWasteDps: 10,
  baseWasteDuration: 6,
  // How long the zone takes to grow from 0 to peak radius after spawning,
  // before slowly shrinking back to 0 over the remainder of the duration.
  wasteGrowDuration: 0.6,
} as const
