// All per-ability tuning constants live here so anything related to an
// ability — its stats, its definition, its factories, its upgrades — sits
// inside engine/abilities/. Older code may still re-export these from data.ts
// for back-compat; new code should import from this file directly.

import { RadialForceMode } from './telekinesis/radial-force'

export const METEORITE_STRIKE = {
  delay: 0.3,
  cooldown: 0.2,
  powerCost: 6,
  damage: 10,
  aoeRadius: 40,
} as const

export const METEOR_STRIKE = {
  delay: 0.5,
  cooldown: 1.5,
  powerCost: 32,
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
  powerCost: 20,
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
// at `knockback` (≈5× a base shield bounce — enemy speeds are 40–100), raised by
// the Repulsor upgrade, and burn them for a flat `bumpDamage`/sec of contact.
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
// that deals no damage but spawns a fresh helper every `spawnInterval` seconds —
// the first after just `firstSpawnDelay` so it gets to work right away. Its HP
// still decays, so its lifetime (and total spawns) is bounded. The Assembly Line
// upgrade shortens the interval, floored at `minSpawnInterval`.
export const HELPER_FACTORY = {
  costMultiplier: 4,
  hpMultiplier: 6,
  spawnInterval: 4,
  minSpawnInterval: 1.5,
  firstSpawnDelay: 1,
} as const

// Telekinesis shoves enemies away; its ultimate Singularity pulls them in.
// Force scales with a plateau-cosine curve (full inside ~25% of radius, smooth
// falloff to 0 at the edge).
export const TELEKINESIS = {
  powerPerSec: 20,
  radius: 160,
  // Movement applied per second to an enemy at peak force (inside the plateau).
  force: 250,
  // Minimum seconds-of-power required to START a field. Matches solar flare.
  armSeconds: 1,
  mode: RadialForceMode.push,
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

// Fireworks (Rocket ultimate). The launched rocket bursts into `firstSplit`
// children (120° apart for 3); each of those bursts into `baseFinalCount`
// (+1 per Finale tier); that final generation is terminal. Damage divides by
// `damageFalloff` each generation (full → 1/3 → 1/9). Children hop
// `childFlightDistance` at `childSpeed` before exploding.
export const FIREWORKS = {
  costMultiplier: 3,
  firstSplit: 3,
  baseFinalCount: 3,
  damageFalloff: 3,
  childFlightDistance: 100,
  childSpeed: 250,
} as const

// Event Horizon (Black Hole ultimate). A wider (`radiusScale`×), stronger
// (`pullScale`× suction) gravity well. Enemies reaching the core (inner
// `coreRadiusFraction` of the radius) take `coreDamage` and are banished —
// relocated `banishDistance` further from the ship. Spaghettification raises the
// pull strength further.
export const EVENT_HORIZON = {
  costMultiplier: 2,
  radiusScale: 1.5,
  pullScale: 2,
  coreRadiusFraction: 0.18,
  coreDamage: 20,
  banishDistance: 260,
} as const

// Solar Plague (Solar Flare ultimate). The beam deals Solar Flare's direct
// damage AND ignites: the fire burns for `burnDuration`s at `dpsMultiplier` of
// the beam's per-second rate (damage-per-tick ÷ drainInterval), so holding
// stacks both (≈150% of Flare), and the fire spreads to non-burning enemies
// within `baseSpreadRange` (edge gap). Wildfire widens the spread.
export const SOLAR_PLAGUE = {
  costMultiplier: 3,
  burnDuration: 3,
  dpsMultiplier: 0.5,
  baseSpreadRange: 10,
} as const

// Singularity (Telekinesis ultimate). Pulls enemies inward (vs push). Enemies in
// the core (inner `coreRadiusFraction` of the radius) take `(count − 1) ×
// perEnemyDps` per second — a lone enemy takes none, a crowd takes a lot.
// Releasing the hold detonates a flat AoE burst that charges with hold time:
// linear from 0 to the full `baseExplosionDamage` (raised by Collapse) over
// `maxChargeSeconds` (so a ~1s hold ≈ 1/5 damage).
export const SINGULARITY = {
  costMultiplier: 3,
  coreRadiusFraction: 0.45,
  perEnemyDps: 7,
  baseExplosionDamage: 60,
  maxChargeSeconds: 2,
} as const

// Radiation pool. Drops a lingering zone; enemies inside accrue stacks (capped at
// maxStacks) and take stacks × dpsPerStack — trivial alone, but the ramp + stacks
// that linger after they leave are the payoff. `stackInterval`/`decayInterval` are
// the seconds to gain a stack in a pool / lose one outside.
export const RADIATION = {
  cooldown: 6,
  powerCost: 45,
  dpsPerStack: 1.5,
  radius: 120,
  duration: 6,
  maxStacks: 8,
  stackInterval: 0.4,
  decayInterval: 1.5,
} as const

// Meltdown (Radiation ultimate). A bigger, longer, hotter pool that stacks higher
// — and turns contagious: a max-stacked enemy seeds radiation on neighbours within
// `spreadRange` (edge gap). Contamination widens that reach.
export const MELTDOWN = {
  costMultiplier: 3,
  radiusScale: 1.4,
  durationScale: 1.5,
  dpsPerStackBonus: 1.5,
  maxStacks: 12,
  spreadRange: 60,
} as const

// Chain Lightning. A click bolt that strikes the nearest enemy, then leaps to the
// nearest unhit enemy within `jumpRange`, up to `maxJumps` hits, damage scaled by
// `falloff` each jump. `forks` is branches-per-hit (1 = a single chain). The arc
// lingers `arcDuration` seconds purely to render. Weak vs a lone boss by design.
export const CHAIN_LIGHTNING = {
  cooldown: 3,
  powerCost: 25,
  damage: 30,
  jumpRange: 140,
  maxJumps: 3,
  falloff: 0.78,
  forks: 1,
  arcDuration: 0.22,
} as const

// Ion Storm (Chain Lightning ultimate). The bolt forks to the two nearest enemies
// per hit (a branching tree, damage scaled by `falloff` per generation) and reaches
// further across more jumps.
export const ION_STORM = {
  costMultiplier: 3,
  jumpRange: 170,
  maxJumps: 6,
  forks: 2,
  falloff: 0.82,
  arcDuration: 0.28,
} as const

// Gravity Lure. Drops a beacon; non-boss enemies within `lureRadius` chase it
// instead of the ship. Pure repositioning — no damage. Pairs with any AoE (lure a
// crowd onto the beacon, then drop Sun/Radiation/Meteor on it).
export const GRAVITY_LURE = {
  cooldown: 10,
  powerCost: 35,
  lureRadius: 200,
  hp: 100,
  // Beacon body size — an enemy within this (+ its own radius) is touching the
  // beacon and chips its HP. Lured enemies rush in, so they all reach it.
  contactRadius: 28,
  // HP bleeds on its own (like a helper) so an un-attacked beacon still winds down —
  // visibly, via its HP ring — instead of vanishing on a hidden timer.
  hpDecayPerSec: 10,
} as const

// Collapsar (Gravity Lure ultimate). A wider, tougher beacon that detonates for
// `detonateDamage` over `detonateRadius` when it dies — the gathered crowd eats
// the blast. Implosion raises the detonation damage.
export const COLLAPSAR = {
  costMultiplier: 2,
  lureRadiusScale: 1.3,
  hp: 180,
  detonateDamage: 100,
  detonateRadius: 180,
} as const

// Overdrive. Drops a zone that makes enemies inside take `ampMult`× damage (the
// headline — it amplifies every other ability dropped on top), move at `slowMult`×,
// and deal `enemyDamageMult`×; while the ship sits inside, its cooldowns tick
// `selfHaste`× faster. A force-multiplier, not a damage source of its own.
export const OVERDRIVE = {
  cooldown: 14,
  powerCost: 90,
  radius: 160,
  duration: 6,
  ampMult: 1.5,
  slowMult: 0.6,
  enemyDamageMult: 0.6,
  selfHaste: 1.4,
} as const

// Overload Core (Overdrive ultimate). Bigger, higher amp, a much harder slow, and a
// stronger self-haste. Resonance pushes the damage amp further.
export const OVERLOAD_CORE = {
  costMultiplier: 3,
  radiusScale: 1.4,
  ampMult: 1.8,
  slowMult: 0.45,
  enemyDamageMult: 0.5,
  selfHaste: 1.6,
} as const
