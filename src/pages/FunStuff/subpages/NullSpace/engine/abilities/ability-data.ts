// All per-ability tuning constants live here so anything related to an
// ability — its stats, its definition, its factories, its upgrades — sits
// inside engine/abilities/. Older code may still re-export these from data.ts
// for back-compat; new code should import from this file directly.

export const METEORITE_STRIKE = {
  delay: 0.3,
  cooldown: 0.2,
  powerCost: 8,
  damage: 10,
  aoeRadius: 40,
} as const

export const METEOR_STRIKE = {
  delay: 0.5,
  cooldown: 1.5,
  powerCost: 40,
  damage: 60,
  aoeRadius: 100,
} as const

export const BLACK_HOLE = {
  cooldown: 2,
  powerCost: 30,
  damage: 3,
  radius: 120,
  pullStrength: 250,
  duration: 4,
} as const

export const ROCKET = {
  cooldown: 2.5,
  powerCost: 25,
  damage: 50,
  aoeRadius: 130,
  speed: 250,
  trailParticleInterval: 0.04,
} as const

export const SHIELD = {
  cooldown: 4,
  powerCost: 30,
  radius: 80,
  duration: 6,
} as const

export const SUN = {
  cooldown: 12,
  powerCost: 100,
  radius: 180,
  damagePerSec: 15,
  duration: 8,
} as const

export const HELPER = {
  cooldown: 8,
  powerCost: 40,
  damage: 3,
  radius: 8,
  speed: 110,
  fireRate: 1.5,
  attackRange: 200,
  hp: 20,
  // HP drained per second. With base hp=20, an untouched ally lives ~20s
  // (matching the old duration). Upgrading maxHp extends survival.
  hpDecayPerSec: 1,
} as const

// Toggle until we decide: 'pull' draws enemies toward the cursor, 'push'
// shoves them away. Force scales with the same plateau-cosine curve (full
// inside ~25% of radius, smooth falloff to 0 at the edge).
export const TELEKINESIS = {
  powerPerSec: 20,
  radius: 160,
  // Movement applied per second to an enemy at peak force (inside the plateau).
  force: 250,
  // Minimum seconds-of-power required to START a field. Matches solar flare.
  armSeconds: 1,
  mode: 'push' as 'pull' | 'push',
} as const

export const SOLAR_FLARE = {
  // Per-second cost shown to the player. Each drain tick consumes
  // `powerPerSec * drainInterval` (e.g. 20 per sec / 4 ticks per sec = 5 per tick).
  powerPerSec: 20,
  drainInterval: 0.25,
  damagePerTick: 12,
  beamWidth: 40,
  // Minimum seconds-of-power required to START a beam. Once started it keeps
  // firing until power runs out.
  armSeconds: 1,
} as const
