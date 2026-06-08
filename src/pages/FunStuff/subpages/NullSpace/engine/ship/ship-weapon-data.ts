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
  basePierce: 2,
  // Width of the visible beam line, in pixels.
  beamWidth: 3,
} as const

export const MISSILE = {
  fireRateMultiplier: 0.55,
  damageMultiplier: 2.2,
  // Homing speed (px/sec). Slower than a bullet so the homing matters.
  baseSpeed: 220,
  lifetime: 4,
  radius: 5,
} as const

export const RICOCHET = {
  fireRateMultiplier: 0.85,
  damageMultiplier: 1.1,
  speed: PROJECTILE_SPEED * 0.9,
  lifetime: 3,
  baseBounces: 2,
  // Max distance a hit can redirect to for a bounce target.
  bounceRange: 240,
} as const

export const NUKE = {
  fireRateMultiplier: 0.15,
  damageMultiplier: 0.6,
  // The slow lob: a clearly draggy projectile so the player feels the trade.
  speed: 160,
  lifetime: 8,
  radius: 8,
  baseAoeRadius: 130,
  // Lingering "nuclear waste" zone left at the detonation site.
  baseWasteRadius: 110,
  baseWasteDps: 8,
  baseWasteDuration: 6,
} as const
