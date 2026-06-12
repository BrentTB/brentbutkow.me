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

// Comet Shower (Meteorite ultimate). One meteorite always lands dead-center;
// the rest scatter within `scatterRadius` and fall staggered by `staggerStep`
// (+ up to `staggerJitter` of randomness) so they don't all hit at once.
export const COMET_SHOWER = {
  baseCount: 10,
  scatterRadius: 110,
  staggerStep: 0.1,
  // Floor the Comet Cadence upgrade reduces staggerStep toward (faster volley).
  minStaggerStep: 0.03,
  staggerJitter: 0.05,
  costMultiplier: 5,
} as const

// Meteor Shower (Meteor ultimate). The center meteor lands first (METEOR_STRIKE
// delay); a ring of meteors lands `ringDelay` seconds later, all together, evenly
// spaced around the aimed point at `ringRadius`. The Meteor Count upgrade adds
// ring meteors (+1 per tier) and the angle between them recomputes (360 / count).
// `baseRingCount` 4 at the diagonal start angle reproduces the original NE/SE/SW/NW.
export const METEOR_SHOWER = {
  baseRingCount: 4,
  ringRadius: 146,
  ringDelay: 0.5,
  costMultiplier: 3,
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

// Force Field (Shield ultimate). Grows from the base shield radius to
// `maxRadiusScale`× over `growDuration` then vanishes. Bumps shove enemies out
// at `knockback` (≈5× a base shield bounce — enemy speeds are 40–100) and burn
// them for `bumpDamage`/sec of contact, raised by the Overload upgrade.
export const FORCE_FIELD = {
  costMultiplier: 2,
  maxRadiusScale: 2,
  growDuration: 6,
  knockback: 600,
  bumpDamage: 30,
} as const

export const SUN = {
  cooldown: 12,
  powerCost: 100,
  radius: 180,
  damagePerSec: 15,
  duration: 8,
} as const

// Supernova (Sun ultimate). The sun holds at full size (base damage) for most
// of its life, then in the final stretch rapidly collapses to `collapseMinScale`
// over `collapseDuration`, then detonates over `burstDuration` — expanding to
// `burstRadiusScale`× and dealing `burstDamageMultiplier`× damage. Collapse +
// burst are fixed, so the Sun's duration upgrades extend only the full-size hold.
// The Critical Mass upgrade enlarges the burst.
export const SUPERNOVA = {
  costMultiplier: 3,
  collapseMinScale: 1 / 3,
  burstRadiusScale: 4,
  burstDamageMultiplier: 6,
  collapseDuration: 2.5,
  burstDuration: 1,
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

// Helper Factory (Helper ultimate). A tanky ally (`hpMultiplier`× a helper's HP)
// that deals no damage but spawns a fresh helper every `spawnInterval` seconds.
// Its HP still decays, so its lifetime (and total spawns) is bounded. The
// Assembly Line upgrade shortens the interval, floored at `minSpawnInterval`.
export const HELPER_FACTORY = {
  costMultiplier: 3,
  hpMultiplier: 6,
  spawnInterval: 4,
  minSpawnInterval: 1.5,
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
