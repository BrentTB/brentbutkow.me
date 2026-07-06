import { AbilityKind } from './engine/types'
import type { EnemyKind } from './engine/types'

export const GAME_NAME = 'Null Space'

// The world is a torus — both axes wrap, no walls. Fixed size across sectors
// (difficulty scales via waves, not space). Half-width is 1300; every spatial
// delta the game measures (aim, blast, collision) stays well under that, so the
// shortest-path / nearest-image is always unambiguous.
export const WORLD_SIZE = { x: 2600, y: 2600 }

export const SHIELD_COOLDOWN = 3

// Seconds the ship is immune to Void Worm contact (head + body) after a worm hit.
// Caps a lunge that sweeps through the head and several segments to a single hit.
export const WORM_CONTACT_IFRAME = 0.8

// Seconds of full damage immunity granted after any hit that reaches HP. A dense
// swarm can chip the shield freely, but the first blow through it buys a brief
// breather so several contacts in one beat can't chain into an instant kill.
// Separate from WORM_CONTACT_IFRAME above: that one gates a single worm lunge's
// multi-segment sweep, this one gates any HP hit from any source.
export const DAMAGE_IFRAME = 0.6

// Slingshot (flick the ship). Base values are deliberately weak + wild; the
// ship upgrades (Power / Control / Cadence / Heat Sink) push toward strong,
// precise, fast, and sustainable.
export const SLINGSHOT = {
  baseSpeed: 600, // peak coast speed at full charge (world units/sec)
  baseJitter: 0.38, // ~22° random angular scatter per flick
  minJitter: 0.05, // accuracy floor (~3°)
  baseCooldown: 1, // seconds between flicks
  minCooldown: 0.4, // cadence floor
  // --- Heat: a slow-burn pool. 0..1; full-charge flicks add the most, tiny
  // precise nudges almost nothing. Builds slowly (burst many flings before the
  // cap) and cools slowly (a long recovery), so it reads as a long-term resource
  // rather than a per-fling tax. Overheating doesn't lock you out — applySlingshot
  // still flings at half distance for double heat — so you can always limp away.
  heatPerFling: 0.18, // heat added by a FULL-charge flick (scaled by charge)
  baseCoolRate: 0.05, // heat dissipated per second (raised by Heat Sink)
  maxCoolRate: 0.2, // cooling cap (sanity bound)
  heatReengage: 0.5, // overheat clears only once heat falls back below this
  overheatSlowMult: 0.7, // patrol speed multiplier while overheated
  heatJitterBonus: 0.3, // extra scatter (rad) at full heat — control slips as you heat up
} as const

export const POWER_DEFAULTS = {
  max: 2000,
  // Abilities are now the player's only weapon, so the floor must sustain basic
  // defence — the cheapest abilities stay castable off regen alone.
  regenRate: 6,
  startingPower: 100,
}

// Sprite-animation tuning (Phase 8). All durations in seconds — cosmetic only.
export const ANIMATION = {
  hitFlash: 0.07, // white-wash on damage
  hitFlashThrottle: 0.6, // min gap between white-washes (continuous damage pulses, not solid)
  enemyFireFlash: 0.06, // enemy muzzle blip
  spawnIn: 0.35, // enemy warp-in grow
  deathAnim: 0.26, // enemy disintegration (×1.8 for bosses)
  deathSequence: 1.3, // player ship-explosion before gameOver
  lowHpThreshold: 0.3, // ship hp ratio that triggers smoke + screen vignette
} as const

// Ability stat constants live in engine/abilities/ability-data.ts. Import from
// there directly.

// Display order for the hotbar AND the shop. Edit this array to reorder.
// Initial order: cheapest → most expensive at base cost.
// ABILITY_META, HOLD_ABILITIES, factory tables, and upgrade definitions are all
// derived from per-ability files in engine/abilities/ — import them from there.
export const WEAPON_ORDER: readonly AbilityKind[] = [
  AbilityKind.meteorite,
  AbilityKind.rocket,
  AbilityKind.shield,
  AbilityKind.meteor,
  AbilityKind.blackHole,
  AbilityKind.sun,
  AbilityKind.helper,
  AbilityKind.telekinesis,
  AbilityKind.solarFlare,
  AbilityKind.radiation,
  AbilityKind.chainLightning,
  AbilityKind.gravityLure,
  AbilityKind.overdrive,
  AbilityKind.hypnosis,
  // Ultimates sit at the end — their hotbar slot is inherited from the base
  // they replace, so this position only governs row creation, not display.
  AbilityKind.cometShower,
  AbilityKind.meteorShower,
  AbilityKind.helperFactory,
  AbilityKind.supernova,
  AbilityKind.forceField,
  AbilityKind.fireworks,
  AbilityKind.eventHorizon,
  AbilityKind.solarPlague,
  AbilityKind.singularity,
  AbilityKind.meltdown,
  AbilityKind.ionStorm,
  AbilityKind.collapsar,
  AbilityKind.overloadCore,
  AbilityKind.piedPiper,
]

export const ENEMY_STATS = {
  drone: {
    hp: 20,
    speed: 100,
    damage: 8,
    radius: 10,
    scoreValue: 10,
    powerReward: 2,
  },
  tank: {
    hp: 80,
    speed: 40,
    damage: 15,
    radius: 18,
    scoreValue: 30,
    powerReward: 8,
  },
  shooter: {
    hp: 30,
    speed: 50,
    damage: 6,
    radius: 12,
    scoreValue: 20,
    powerReward: 4,
    fireRate: 0.8,
    attackRange: 350,
    projectileDamage: 8,
  },
  swarm: {
    hp: 8,
    speed: 150,
    damage: 3,
    radius: 6,
    scoreValue: 5,
    powerReward: 1,
  },
  bomber: {
    hp: 50,
    speed: 35,
    damage: 5,
    radius: 14,
    scoreValue: 25,
    powerReward: 6,
    explosionDamage: 40,
    explosionRadius: 80,
  },
  dasher: {
    hp: 35,
    speed: 70,
    damage: 18,
    radius: 11,
    scoreValue: 25,
    powerReward: 5,
  },
  dreadnought: {
    hp: 800,
    speed: 50,
    damage: 20,
    radius: 36,
    scoreValue: 500,
    powerReward: 200,
    // Doubles as the standoff distance — the boss approaches the player to here, then holds.
    attackRange: 220,
    // Laser attack. fireRange exceeds the standoff so it shoots from where it
    // holds; projectileSpeed is well under the player laser (800) so it reads as
    // a slow beam the player can slingshot away from.
    fireRate: 0.5,
    fireRange: 480,
    projectileDamage: 12,
    projectileSpeed: 300,
    projectileBeam: true,
  },
  shieldGenerator: {
    hp: 80,
    speed: 0,
    damage: 12,
    radius: 14,
    scoreValue: 50,
    powerReward: 20,
    // Generators fire lasers too — most of the incoming fire — so clearing them
    // is the way to cut the boss fight's pressure down.
    fireRate: 0.25,
    fireRange: 460,
    projectileDamage: 6,
    projectileSpeed: 280,
    projectileBeam: true,
  },
  voidWorm: {
    hp: 150,
    speed: 80,
    damage: 25,
    radius: 24,
    scoreValue: 400,
    powerReward: 180,
  },
  wormSegment: {
    hp: 120,
    speed: 0,
    // The body bites too, but ship-side WORM_CONTACT_IFRAME gates worm contact to
    // one hit per lunge — so the re-pinned chain crossing the ship can't melt it,
    // yet flying through the body still costs you.
    damage: 12,
    radius: 14,
    scoreValue: 25,
    powerReward: 8,
  },
  // Erupts from a dying body segment: a small, fast, low-HP lunger (dash cycle).
  // Contact damage is dealt the normal way (no worm i-frame) — these are separate
  // threats, not part of the worm body.
  miniVoidWorm: {
    hp: 18,
    speed: 90,
    damage: 12,
    radius: 9,
    scoreValue: 10,
    powerReward: 2,
  },
  phaseShifter: {
    hp: 350,
    speed: 0,
    damage: 15,
    radius: 24,
    scoreValue: 500,
    powerReward: 200,
    // Fires lasers between teleports from wherever it lands.
    fireRate: 0.7,
    fireRange: 520,
    projectileDamage: 10,
    projectileSpeed: 320,
    projectileBeam: true,
  },
} as const

export const CURRENCY_DROPS: Record<EnemyKind, { min: number; max: number }> = {
  drone: { min: 0, max: 2 },
  tank: { min: 1, max: 5 },
  shooter: { min: 1, max: 3 },
  swarm: { min: 0, max: 1 },
  bomber: { min: 1, max: 4 },
  dasher: { min: 1, max: 4 },
  dreadnought: { min: 5, max: 15 },
  shieldGenerator: { min: 1, max: 3 },
  voidWorm: { min: 5, max: 15 },
  wormSegment: { min: 1, max: 3 },
  // Mini worms drop nothing — they're finite per fight but shouldn't be farmable.
  miniVoidWorm: { min: 0, max: 0 },
  phaseShifter: { min: 5, max: 15 },
}

export const CURRENCY_NAME = 'Stardust'

export const POWER_ORB = {
  radius: 6,
  floatDuration: 0.5,
  magnetStrength: 350,
  drag: 0.94,
  // Safety-net expiry only: orbs auto-home at floatDuration and homing
  // collectibles never time out, so in practice an orb is always collected
  // well before this. It exists so an orb can't linger forever if homing is
  // ever gated off.
  lifetime: 12,
} as const

// Material spent (with Stardust + Shards) on Ultimate purchases. Change this one
// constant to rename it everywhere (HUD, shop, dev console).
export const SPACE_METAL_NAME = 'Space Metal'

// Run-scoped boss material that gates Ultimate purchases. Change this one
// constant to rename it everywhere (HUD, shop, dev console).
export const SINGULARITY_SHARD_NAME = 'Singularity Shard'
// Shards awarded per boss kill.
export const SHARDS_PER_BOSS = 1

// Singularity Shard pickup — drops on boss death and auto-homes like a power
// orb (floats briefly, then flies to the ship; no click needed).
export const SINGULARITY_SHARD = {
  radius: 9,
  floatDuration: 0.5,
  lifetime: 12,
  // Violet diamond identity — kept here so the renderer (and any future HUD
  // pickup icon) share one source for the shard's colour.
  fill: '#d8b4ff',
  stroke: '#f0e0ff',
} as const

export const SPACE_METAL = {
  radius: 10,
  lifetime: 12,
  collectionRadius: 30,
  dropChance: {
    drone: 0.03,
    tank: 0.12,
    shooter: 0.06,
    swarm: 0.01,
    bomber: 0.1,
    dasher: 0.06,
    // Boss drops are handled by BossDefinition.onDeath — these are never rolled.
    // Worm segments drop nothing so the body can't be farmed for metal.
    dreadnought: 0,
    shieldGenerator: 0,
    voidWorm: 0,
    wormSegment: 0,
    miniVoidWorm: 0,
    phaseShifter: 0,
  } as Record<EnemyKind, number>,
} as const

export const WAVES_PER_LEVEL = 3
// Boss appears every BOSS_LEVEL_INTERVAL levels (waves = WAVES_PER_LEVEL × BOSS_LEVEL_INTERVAL).
export const BOSS_LEVEL_INTERVAL = 3
// Fraction of normal enemy count on boss waves. Tune to adjust how crowded the boss fight feels.
export const BOSS_WAVE_ENEMY_MULTIPLIER = 0.4

// Per-wave enemy stat growth, applied at spawn. HP climbs steeply so enemies
// survive the heavy AoE/abilities of late game; contact damage barely moves so
// the player isn't one-shot. Count + harder mixes stay the primary difficulty lever.
export const STAT_SCALING = {
  hpPerWave: 0.1, // +10% max HP per wave past wave 1 → ~×3 by wave 20
  hpMax: 6, // HP multiplier ceiling
  damagePerWave: 0.026, // +2.6% contact damage per wave → ~×1.5 by wave 20
  damageMax: 2, // damage multiplier ceiling
} as const

// Mixed-wave count caps. Past the cap, drone overflow converts into harder kinds
// so high waves lean on composition (tanks/shooters/bombers) rather than a drone wall.
export const WAVE_COMP = {
  maxDrones: 12,
} as const

// Dasher charge cycle. Approaches within triggerRange, stalls for windupDuration
// (the dodge tell), then lunges at chargeSpeed for chargeDuration while curving to
// track the target (chargeTurnRate), then recovers (slow, vulnerable). chargeSpeed
// sits above ship patrol speed but below a slingshot fling (600), and the tracking
// means a flat sidestep won't shake it — a real juke or a slingshot will.
export const DASHER = {
  triggerRange: 240,
  windupDuration: 0.6,
  chargeSpeed: 420,
  chargeDuration: 0.7,
  // Radians/sec the lunge curves toward the target. Enough to beat a lazy sidestep,
  // capped so it stays dodgeable with a committed juke or slingshot.
  chargeTurnRate: 2.4,
  recoverDuration: 2,
  recoverSpeed: 50,
} as const

// Soft stall-escalation. A wave runs at normal speed through gracePeriod, then
// surviving enemies jump by initialStep the instant it ends and keep speeding up
// (rampPerSec per second, capped at maxMult) the longer it drags — so parking and
// watching enemies trail the ship gets steadily worse. The cap keeps even escalated
// enemies under a slingshot fling (600), so the player can always break away.
export const WAVE_ESCALATION = {
  gracePeriod: 30,
  // Boss waves are meant to be long fights, so they get a much longer grace
  // before enemies start speeding up.
  bossGracePeriod: 75,
  // An immediate speed bump the instant the grace ends — so the moment the warning
  // countdown hits 0 reads as a real jump, not a slow creep.
  initialStep: 0.12,
  rampPerSec: 0.04,
  maxMult: 2.2,
} as const

// Themed waves (all-tank, swarm-only, etc.) for mid/late-game texture. Only on
// even waves past startWave (never back-to-back, never on boss/early waves).
export const WAVE_THEME = {
  startWave: 10,
  chance: 0.5, // probability an eligible (even, past-start, non-boss) wave is themed
} as const

// Late-game enemy modifiers — appear only past startWave, on regular ships.
export const ENEMY_MODIFIERS = {
  startWave: 12,
  baseChance: 0.1, // modifier chance at startWave
  chancePerWave: 0.05, // chance growth per wave past startWave
  maxChance: 0.6,
  weights: { speed: 1, shield: 1, giant: 1 }, // relative pick weights once a modifier rolls
  speedMult: 1.6, // speed modifier: movement speed ×
  speedTint: 'rgba(255, 70, 40, 0.55)', // red sprite wash for the speed modifier
  speedTrailColor: '#ff5a3c',
  speedTrailChance: 0.4, // per-frame trail-particle spawn probability per speed enemy
  speedTrailSize: 4,
  speedTrailLifetime: 0.45,
  shieldFraction: 0.5, // shield pool = scaled maxHp ×
  shieldRegen: 6, // shield HP regenerated per second after the cooldown
  giantSpeedMult: 0.5, // giant: slower
  giantRadiusMult: 1.8, // giant: bigger (hitbox + sprite)
  giantHpMult: 2.5, // giant: tankier (on top of wave HP scaling)
} as const

export const SPAWN_DELAY = { min: 0.1, max: 1.0 } as const
export const SPAWN_DISTANCE = { min: 650, max: 1050 } as const

// Half-width of the box swarm members scatter into around their shared spawn center.
export const SWARM_SPAWN_SPREAD = 60

// The world is a torus, but the ship keeps a gentle "forward" it drifts along when
// idle — stored as a vector so the math is direction-agnostic. Forward is -y (up
// the screen); flying off any edge wraps seamlessly to the opposite side.
export const FORWARD_DIR = { x: 0, y: -1 } as const

// Ship idle-drift and hunt-orbit tuning.
export const SECTOR = {
  driftSpeed: 75, // gentle forward drift when no enemies (world units/sec)
  weaveAmplitude: 90, // lateral weave half-width during idle drift
  weaveFrequency: 0.5, // weave cycles/sec
  momentumWindow: 0.6, // seconds the resumed drift inherits the fling heading
  // The ship has no weapons, so it backs away rather than engages — holding
  // enemies at a respectful orbit distance (so they stay on-screen) while kept
  // deliberately leaky: driftSpeed/steerRate stay modest, so faster threats and
  // dasher charges close in and force a player slingshot.
  orbitRange: 238, // flee-orbit radius (px): how far the ship holds enemies off
  orbitSpeedFraction: 0.7, // tangential (circling) speed = ship speed × this
  fleeBias: 0.18, // outward lean: rest point sits this × speed beyond orbitRange
  steerRate: 3, // how fast velocity eases toward the desired heading (flowy turns)
} as const

// End-of-sector warp cutscene. The portal only appears once the sector clears:
// it spawns `spawnAhead` units ahead of the ship (just offscreen), the ship flies
// into it at `flySpeed` with no player control, and the jump completes when it
// reaches within `arriveRadius`. `maxDuration` is a safety cap if it never lands.
export const WARP = {
  spawnAhead: 1100,
  // Beat of free flight (player still in control) after a sector clears, before the
  // warp cutscene begins — softens the hand-off so control isn't snatched instantly.
  preDelay: 1,
  // Slow, cinematic fly-in (~2.5× longer than a quick zoom) so the jump reads.
  flySpeed: 480,
  arriveRadius: 70,
  maxDuration: 4,
  // Once the ship reaches the portal, the screen flash plays for this long
  // (the only time the warp effect shows) before the shop opens.
  flashDuration: 0.55,
  // Magnet speed dropped loot homes to the ship at during the fly-in. Well above
  // flySpeed so it visibly rushes in and catches the moving ship; a safety sweep
  // at warp completion banks any straggler so nothing is lost.
  lootMagnetStrength: 1000,
} as const

// Enemy spawn angle bias. Most spawns arrive ahead of the ship; the forward cone
// tightens as waves climb (sets up the Phase 7.5 difficulty curve).
export const SPAWN_CONE = {
  forwardFraction: 0.7, // fraction spawning within the forward cone
  forwardHalfAngle: Math.PI / 3, // ±60° around forward at wave 1
  tightenPerWave: 0.012, // half-angle shrinks per wave
  minHalfAngle: Math.PI / 6, // floor at ±30°
} as const

// Mines scattered across the whole world — thread between them as the ship
// advances (Escape Mode dashes through unharmed). Dense and present from wave 1
// so the player must slingshot to navigate, not just sit and tap enemies.
export const HAZARD = {
  mineCount: 22, // mines scattered across the world
  mineRadius: 26, // trigger radius — an entity this close sets the mine off
  mineDamage: 35,
  mineBlastRadius: 72, // single-use detonation damages everyone within this radius
  forwardMargin: 500, // keep mines at least this far from the ship's spawn point
  laneEveryWaves: 1, // a minefield appears every non-boss sector
  avoidRadius: 110, // enemies begin steering around a mine within this gap beyond its trigger radius
  avoidStrength: 2, // overall strength of the heading bend away from / around a mine
  avoidTangent: 2.5, // arc-around weight vs the straight push-out (higher = smoother but tighter)
  avoidTurnRate: 7, // how fast the heading eases into the avoidance arc (higher = snappier)
  color: '#d6533a',
} as const

// Shockwave calamity: a neutral shock-ring that periodically erupts near the
// ship. After a brief telegraph it expands outward, dealing one-time damage to
// everyone the front sweeps — strongest at the centre, weakest at the rim. A
// natural disaster, so it endangers the player as much as the enemies.
export const CALAMITY = {
  shockwaveStartRadius: 24,
  shockwaveMaxRadius: 350,
  shockwaveGrowDuration: 1.1, // seconds for the front to reach max radius
  shockwaveDelay: 2, // telegraph lead before the ring fires
  shockwaveBaseDamage: 30, // damage at the centre; falls off toward the rim
  shockwaveEdgeFraction: 0.3, // fraction of base damage dealt at the very rim
  shockwaveSpawnRange: 380, // max distance from the ship a ring can erupt
  shockwaveIntervalMin: 9, // seconds between rings (random within the range)
  shockwaveIntervalMax: 20,
  // When a calamity roll isn't a nebula, this is its chance of being a shock-ring
  // (the remainder is a wandering black hole) — keeps rings more frequent than wells.
  shockwaveShareOfRest: 0.65,
  // Wandering black hole: a neutral drifting gravity well whose job is to inhibit
  // movement, not kill — strong pull, low damage. pullStrength stays under a
  // slingshot fling (SLINGSHOT.baseSpeed) so you can always escape.
  wellStartRadius: 60, // winks in this small...
  wellMaxRadius: 320, // ...and swells to this over wellGrowDuration
  wellGrowDuration: 2,
  wellPullStrength: 320, // strong drag (its primary purpose); still escapable
  wellDamage: 6, // low per-second burn at the rim; ramps toward the core
  wellDriftSpeed: 28, // how fast the well wanders
  wellDuration: 11, // total lifetime
  wellSpawnRange: 420, // distance from the ship it erupts
  wellIntervalMin: 16, // seconds between wandering wells (random within the range)
  wellIntervalMax: 26,
} as const

// Asteroid calamity: slow destructible bodies that drift through the sector, damage
// everyone they touch, and split into smaller tiers when destroyed. They react to
// every force that moves enemies (black hole, telekinesis, domes), so you can fling
// or trap them. Loot drops only when the player engaged the rock (damaged or moved it).
export const ASTEROID = {
  tiers: {
    large: { radius: 46, hp: 130, contactDamage: 30, driftSpeed: 32, spaceMetal: 1, powerOrbs: 1 },
    medium: { radius: 30, hp: 64, contactDamage: 22, driftSpeed: 46, spaceMetal: 0, powerOrbs: 1 },
    small: { radius: 18, hp: 30, contactDamage: 14, driftSpeed: 64, spaceMetal: 0, powerOrbs: 0 },
  },
  splitCount: 2, // fragments a large/medium asteroid breaks into when destroyed
  splitScatter: 80, // px/s sideways kick added to each fragment's inherited velocity
  contactCooldown: 0.8, // seconds before an asteroid can deal contact damage again
  contactPad: 16, // contact-damage reach beyond the asteroid's radius (covers a touching hull)
  bumpSelfDamage: 18, // hp the asteroid itself loses each bump — a collision wears it down too (no loot)
  spinMax: 1.1, // max |angular velocity| for the cosmetic roll (rad/s)
  restitution: 0.85, // velocity retained in an asteroid-asteroid bounce
  seedCount: 4, // asteroids drifting in a fresh non-boss sector
  startSector: 2, // first sector they appear in — sector 1 stays a clean intro
  forwardMargin: 360, // keep seeded asteroids at least this far from the ship's spawn
  powerOrbValue: 4, // power granted by each orb a destroyed asteroid drops
  variantCount: 5, // distinct silhouettes the renderer rotates through
  color: '#9b8b7a',
} as const

// Nebula calamity: neutral drifting zones (no damage). The three variants share one
// spawn/lifetime shape; each applies a single symmetric modifier to whatever is
// inside. fog conceals entities beyond the clear sight-bubbles (player's + allies');
// slow drags movement and the slingshot; haze scatters auto-fire aim and warps the
// player's view. Everyone inside is affected equally — a natural hazard, not a tool.
export const NEBULA = {
  duration: 16, // total lifetime (springs up, holds, dissipates)
  growDuration: 3, // winks in from startRadius to maxRadius over this
  startRadius: 140,
  maxRadius: 500,
  driftSpeed: 28, // slow wander across the sector
  spawnRange: 420, // distance from the ship a nebula erupts
  intervalMin: 14, // seconds between nebulas (random within the range)
  intervalMax: 26,
  weight: 0.45, // share of calamity rolls that pick a nebula (vs shockwave / well)
  // Fog: clear sight-bubbles — anything inside one is mutually visible despite fog.
  sightRadius: 150, // the player's clear bubble
  allySightRadius: 100, // each ally's (smaller) clear bubble
  fogDensity: 1.7, // fog puffs drawn denser than the slow/haze clouds — thick outside the cleared bubble
  wanderSpeed: 70, // speed of a blinded enemy's semi-random meander
  slowMult: 0.35, // movement multiplier for drift + enemies + allies inside a slow nebula
  slowSlingMult: 0.75, // gentler drag on the slingshot launch + coast — you can still escape
  hazeJitterMax: 0.5, // peak aim error (radians) at the haze centre, fading to 0 at the rim
  hazeWarpAmp: 1, // drunk-ripple amplitude scalar for the player's view
  hazeWarpSpeed: 2.2, // ripple oscillation speed
  cloudPuffs: 14, // soft blobs per nebula — overlap into an irregular billowy cloud
  fogColor: '120, 134, 150', // grey-blue murk (rgb, for the rgba() cloud + vignette)
  slowColor: '90, 120, 210', // cold blue
  hazeColor: '150, 200, 90', // sickly green
} as const

// Wormhole pair calamity: two linked rifts that drift across the sector. Anything
// entering one mouth is teleported to the other with its velocity preserved — the
// displacement is the hazard (no damage). A neutral disaster you can weaponize:
// fling an asteroid through into a swarm, or bail through when cornered.
export const WORMHOLE = {
  duration: 13, // total lifetime (winks in, holds, dissipates)
  growDuration: 1.4, // mouths swell from startRadius to maxRadius over this
  startRadius: 26,
  maxRadius: 90, // mouth radius — a body within this of either mouth teleports
  driftSpeed: 22, // the pair drifts together this fast
  exitMargin: 28, // placed this far beyond the exit mouth's rim, so it never instantly re-enters
  spawnRangeNear: 320, // mouth A erupts this far from the ship, at a random bearing
  separationMin: 560, // mouth B sits separationMin..Max from A at a random angle — always wider
  separationMax: 780, // than 2*maxRadius+exitMargin, so no orientation lets an exit cross-loop
  intervalMin: 16, // seconds between wormholes (random within the range)
  intervalMax: 28,
  weight: 0.3, // share of non-nebula calamity rolls that pick a wormhole
  color: '60, 200, 210', // teal rift (rgb) — distinct from the purple warp portal / black hole
} as const

// The portal the ship warps through when a sector clears. Dormant until then.
export const PORTAL = {
  radius: 120,
  activeColor: 'rgba(176, 130, 255, 0.9)',
} as const

export const PROJECTILE_SPEED = 400
export const PROJECTILE_LIFETIME = 3
export const PROJECTILE_RADIUS = 4

export const PARTICLE_DEFAULTS = {
  maxParticles: 200,
  explosionCount: 12,
  trailInterval: 0.05,
}

export type ChangelogEntry = {
  version: string
  date: string
  changes: {
    breaking?: string[]
    features?: string[]
    balance?: string[]
    fixes?: string[]
    ui?: string[] // Anything that changes UI without changing actual game functionality
    architecture?: string[] // Internal refactors that don't change game features or behavior
  }
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.17.0',
    date: '2026-07-06',
    changes: {
      ui: [
        'The tutorial got a rework: fewer beats, one lesson at a time, and a dot trail on the card so you can see how far through you are.',
        'Nothing in the tutorial advances on a timer anymore. Every explanation waits for you to press Next, so you can read at your own pace.',
        'On those read-and-continue steps you can tap anywhere on the card, not just the Next button. Bigger target for a phone.',
        'Tutorial prompts are shorter and get to the point.',
      ],
      fixes: [
        'The post-sector shop header now names the sector you just cleared. It was showing the next one (clear sector 1 and it read "Sector 2 Complete"), because the shop opens once you have already warped ahead.',
        'Nebulas, shockwaves, wormholes, and wandering black holes no longer erupt mid-tutorial and bury whatever you were being taught.',
        "The handoff into the tutorial's mine lesson no longer jump-cuts: the practice drones visibly burst instead of vanishing, the mines arrive with a flash, and the ship eases onto its new heading rather than snapping to it.",
      ],
      balance: [
        "Tutorial power regen is slowed well below the meteorite's cost, so the run-the-bar-down lesson takes a few casts instead of a clicking race against the recharge.",
      ],
    },
  },
  {
    version: '1.16.3',
    date: '2026-07-06',
    changes: {
      fixes: [
        'The green haze nebula no longer chews through framerate. Its woozy "drunk" ripple now renders at a lower internal resolution (which you cannot see on an effect that blurry) instead of re-warping the whole screen every frame.',
      ],
    },
  },
  {
    version: '1.16.2',
    date: '2026-07-03',
    changes: {
      fixes: [
        'The Stardust counter in the top bar is now the same cyan as everywhere else, instead of a violet that made it look like Singularity Shards.',
      ],
    },
  },
  {
    version: '1.16.1',
    date: '2026-07-02',
    changes: {
      ui: [
        'The game page now opens with a proper heading and a short intro above the canvas, so you (and search engines) know what you are looking at before you press Start.',
        'The heading and back button now line up with every other page instead of sitting slightly lower.',
      ],
    },
  },
  {
    version: '1.16.0',
    date: '2026-07-02',
    changes: {
      features: [
        'A hit that gets through your shield now grants a brief moment of invincibility, so a tight swarm can no longer stack several blows into a single-beat kill — you always get a breather to slip away.',
        'Clearing a wave no longer freezes the game with a Next Wave prompt. The next wave flows straight in and a small notice tells you the one you just cleared — only shops still pause the action.',
      ],
      ui: [
        'A counter appears once five or fewer enemies remain in a wave, so you know how close you are to clearing it.',
        'The screen now shakes when you take damage, and settles as you recover (respects the reduce-motion setting).',
      ],
    },
  },
  {
    version: '1.15.0',
    date: '2026-06-24',
    changes: {
      features: [
        'New ability — Hypnosis: click near an enemy to seize its mind. It turns and fights for you, keeping its own look, full strength, attack, and even its size/speed modifier — a charmed gunner keeps shooting, while rammers chase down the nearest enemy and a charmed bomber charges in for one last blast. Other enemies round on it; it bleeds down over time (and from their fire) and only goes when it actually dies — no timer, no revert. Bosses are immune. Its ultimate, Pied Piper, flips a whole crowd inside a radius at once.',
      ],
    },
  },
  {
    version: '1.14.2',
    date: '2026-06-23',
    changes: {
      fixes: [
        'Time spent paused no longer counts toward your run duration on the leaderboard — only actual play-time is recorded.',
      ],
    },
  },
  {
    version: '1.14.1',
    date: '2026-06-23',
    changes: {
      fixes: [
        'Leaving a run and pressing Continue no longer wipes its clock — the leaderboard now records the whole run, not just the time played since you resumed.',
      ],
    },
  },
  {
    version: '1.14.0',
    date: '2026-06-21',
    changes: {
      features: [
        'Bosses now grow more dangerous the deeper into a run they appear. Their health and damage scale with the wave like every other enemy, and their signature threat escalates too: the Void Worm arrives with a longer body, the Dreadnought rings itself with more shield generators, and the Phase Shifter drops bigger swarm rings that start folding in tougher (but still fast) units.',
        'Destroying a Void Worm body segment now erupts it into small, fast mini worms that lunge at you — and once you have torn through half the body, every segment bursts into two. The worm is no longer a single attack you can simply out-fly.',
      ],
      balance: [
        'A single blast no longer near-deletes the Void Worm. Any burst — a rocket, a singularity collapse — now loses bite as it tears down the chain, each further body segment it catches taking less, so flattening the whole worm takes more than a couple of well-placed hits.',
        'The Void Worm body now bites. Brushing the head or a segment hurts, but a brief contact i-frame means a lunge that sweeps you through several parts lands a single hit, not one per segment — so a longer worm is a bigger hazard to weave through, not just more health.',
      ],
      fixes: [
        'Killing a Void Worm now ends it outright — destroying the head takes the whole body with it, instead of leaving stray segments drifting in place.',
      ],
      ui: [
        'End-of-sector loot now flies to your ship during the warp instead of being silently auto-collected, so you can actually see it get picked up.',
      ],
      architecture: [
        "Unified every boss's depth-scaling count math (worm segments, Dreadnought generators, Phase Shifter rings) behind one shared helper.",
      ],
    },
  },
  {
    version: '1.13.0',
    date: '2026-06-21',
    changes: {
      features: [
        'The Dreadnought now charges and fires a heavy laser whenever its shield is down — telegraphed by a brightening beam line, and the bolt gently homes, so you have to slingshot clear instead of just drifting aside. Phase 2 fires it on a tighter cooldown.',
      ],
      balance: [
        'The Void Worm and Dasher now curve to track you mid-charge instead of lunging in a straight line. A flat sidestep no longer shakes them; you have to juke hard or slingshot clear. Their wind-up is a touch shorter too.',
        'Phase Shifter swarm rings now burn out the moment it teleports again, popping for a little splash damage if you are sitting on them — so they can no longer pile up faster than you clear them.',
      ],
      fixes: [
        "The Void Worm's head no longer feels invincible: it takes reduced damage while the body still shields it (so your hits land and chip it) and full damage once every segment is destroyed.",
      ],
    },
  },
  {
    version: '1.12.0',
    date: '2026-06-21',
    changes: {
      features: [
        'Every ability now has an Efficiency upgrade that trims its power cost — the ones that were missing it (Sun, Black Hole, Chain Lightning, Radiation, Gravity Lure, Overdrive) have one now, and their ultimates inherit it.',
        'The run now autosaves after every wave, not just every sector — Continue picks up from the wave you were on.',
      ],
      ui: [
        'When the speed-up countdown runs out, a brief "Enemies sped up!" sign now flashes instead of the timer simply vanishing — so the lurch reads as a confirmed event.',
        'Clearing a sector no longer snatches control the instant the last enemy dies: you keep flying for a beat, and the warp portal now opens along your heading so the fly-in never jerks the ship around.',
      ],
      fixes: [
        'After a warp the ship keeps the heading it travelled in, instead of snapping to face straight up in the new sector.',
        'Calamities (mines, asteroids, nebula clouds) no longer blink out the instant a sector is cleared — they linger as harmless scenery through the warp rather than popping.',
        'The sector progress bar no longer briefly shows the first wave of the next sector as already cleared while you sit in the shop.',
      ],
      balance: ['Increase the wave escalation gracePeriod from 20s to 30s'],
    },
  },
  {
    version: '1.11.0',
    date: '2026-06-21',
    changes: {
      features: [
        'A shop now opens right before every boss — your last chance to spend the Stardust you earned fighting toward it, instead of walking into the fight with a full wallet and nowhere to spend it. It comes with a cryptic anomaly warning: enough for a veteran to know what is coming, enough for a newcomer to know to gear up.',
      ],
      ui: [
        'Redrew the Void Worm boss head — an angled, heavy-browed glare over a gaping fanged maw, in place of the old round-eyed face.',
      ],
      balance: ["Increase the Radiation ability's stackInterval from 0.4s to 0.8s"],
    },
  },
  {
    version: '1.10.1',
    date: '2026-06-21',
    changes: {
      fixes: [
        'The slingshot aim arrow no longer disappears when your ship wraps across a world edge: it now tracks the ship across the seam instead of being drawn a full world off-screen.',
      ],
    },
  },
  {
    version: '1.10.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Overdrive: drop a field that turns the ground against your enemies — everything inside takes more damage (so your meteors, radiation, and bolts all hit harder there), moves slower, and deals less, while your own cooldowns race as long as you stand in it. A force multiplier, not a weapon: set it down, then pour everything into it. Its Overload Core ultimate is bigger, amplifies harder, and slows enemies to a crawl.',
      ],
      balance: [
        'Chain Lightning arcs through up to 4 enemies per bolt; Ion Storm forks into 2 chains for up to 8 hits across a packed cluster.',
      ],
    },
  },
  {
    version: '1.9.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Gravity Lure: drop a beacon and nearby enemies swarm it instead of your ship — peel a mob off yourself, or herd a crowd onto one spot and drop Sun, Radiation, or a Meteor on top. Enemies tear the beacon down by attacking it, so it lasts as long as you can keep them off it. Its Collapsar ultimate reaches further, takes more punishment, and detonates on everything it gathered when it finally dies.',
      ],
    },
  },
  {
    version: '1.8.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Radiation: drop a radioactive pool and enemies that linger in it stack radiation — each stack adds damage, and the stacks keep burning for a while after they walk out. Trivial on its own, lethal when you funnel a crowd through it (black hole, telekinesis) or pin a boss in it. Its Meltdown ultimate stacks higher and turns contagious: max-stacked enemies spread the glow to their neighbours.',
        'Chain Lightning: a bolt that strikes the nearest enemy then leaps between them, weakening with every jump — superb against packs, deliberately weak against a lone target. Its Ion Storm ultimate splits into two parallel chains seeded on different enemies — on a tight cluster they overlap to pile extra zaps onto each one.',
      ],
    },
  },
  {
    version: '1.7.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Wormhole pair: two linked rifts drift across the sector — fly into one and you come out the other with your momentum intact. Everything travels through: enemies, allies, asteroids, even shots. It deals no damage; the displacement is the danger. Fling an asteroid through it into a swarm, or bail through one when you are cornered.',
      ],
      fixes: [
        'Allies and your ship now keep engaging a boss caught in a fog cloud — bosses always show through fog, but allies were wrongly holding fire on a concealed one.',
      ],
    },
  },
  {
    version: '1.6.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Nebulas: drifting hazard clouds that spring up, linger, then dissipate — and endanger you as much as the enemies. Fog hides everything inside it (you keep a small clear bubble around your ship, allies keep smaller ones), so blinded enemies wander until you or an ally close in. Slow clouds drag every ship, enemy, and ally caught inside and sap your slingshot. Haze clouds warp your view and scatter aim — for you and the enemies alike.',
      ],
      fixes: [
        'The tutorial and in-code text no longer claim the ship fires on its own — it has had no guns since the "You Are the Weapon" rework; your abilities and allies are the offense.',
      ],
    },
  },
  {
    version: '1.5.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Asteroids: drifting rocks that damage everyone, bounce off each other, and shatter into smaller ones when destroyed. Shoot them, fling them with telekinesis, or pull them into a black hole; they only drop loot if you engaged them. They appear from sector 2 onward.',
        'Wandering black hole: a neutral gravity well that drifts across the sector, dragging your ship, enemies, allies, and asteroids toward its core and burning everything caught in it. Slingshot away to escape its pull.',
      ],
      balance: [
        'The wandering black hole now pulls much harder but deals far less damage: its job is to trap you, not kill you. It also winks in small and swells to full size over a couple of seconds instead of showing a warning ring.',
        'When a wave drags on, enemies now jump to a faster speed the instant the countdown ends, then keep ramping, so the speed-up is something you feel rather than a slow creep.',
        'Asteroids now take damage from their own collisions — bumping the ship or an enemy chips the rock, so enough impacts break it apart (no loot, since the hit was not yours to deal).',
        'Telekinesis, black holes, and the wandering black hole now change how an asteroid actually moves — fling one and it keeps going, or slow its drift and it stays slowed, instead of snapping back to its original course the moment the force lets go.',
        'The wave speed-up grace timer now starts only once the last enemy of a wave has finished spawning in, so a slow spawn no longer eats into your breathing room before enemies escalate.',
      ],
      fixes: [
        'The ship no longer washes solid white while sitting in a wandering black hole; its damage flash now pulses like enemies do under continuous damage.',
        'Meteorites and other area abilities now actually damage and break asteroids; their one-shot blasts were previously missing them entirely.',
        'Mines now stay around for the whole sector instead of thinning out to nothing — the minefield tops back up at the start of every non-boss wave.',
        'The leaderboard no longer overlaps its Back button across the score rows in fullscreen; the whole board now scales as a single panel.',
      ],
      ui: [
        'Asteroids now come in several silhouettes instead of all looking identical, and show a small health bar once chipped.',
        'Enemies flash red and burst the moment the wave speed-up kicks in.',
      ],
      architecture: [
        'Generalised the ability force systems (gravity well, radial push/pull, dome knockback) into body-agnostic primitives, so asteroids and the ship react to the same forces as enemies.',
      ],
    },
  },
  {
    version: '1.4.0',
    date: '2026-06-20',
    changes: {
      features: [
        'Calamities: neutral space disasters that endanger everyone: your ship, the enemies, and your allies alike.',
        'Mines reworked - they now detonate once on contact (no more lurking forever) and blast everything nearby, and enemies steer around them. Shove an enemy into one with a black hole or telekinesis.',
        'New Shockwave calamity: a telegraphed ring that erupts and sweeps the sector, hitting hardest at its centre and fading toward the edge.',
      ],
      fixes: [
        'Enemies now arc smoothly around mines instead of charging straight in and circling them.',
      ],
      ui: [
        'A countdown now warns you in the final 10 seconds before enemies start speeding up, so the ramp no longer feels like it comes out of nowhere.',
        'Tutorial: the ship now flies into a mine on its own (you cannot fling it away), showing that it will not dodge hazards, then you repair the shield with space metal.',
      ],
      architecture: [
        'Added a shared radial-damage primitive (applyRadialDamage) and a single applyDamageToAlly path, reused by mines and shockwaves.',
        'Grouped the calamity code (mines, Shockwave, shared radial damage) under engine/calamities/.',
      ],
    },
  },
  {
    version: '1.3.2',
    date: '2026-06-19',
    changes: {
      fixes: [
        'On boss waves, enemies no longer flash the red "speeding up" tint before they actually start speeding up.',
      ],
      architecture: [
        'Grouped the wave-spawning fields of the game state into one `spawn` object and sectioned the state type for readability; in-progress saves migrate automatically.',
      ],
    },
  },
  {
    version: '1.3.1',
    date: '2026-06-19',
    changes: {
      fixes: [
        'Boss waves now give you much longer before enemies start speeding up — they are meant to be long fights, so they no longer ramp up on the normal wave timer.',
        'The Rocket ability (and its Fireworks upgrade) and helper shots now take the short way across the edge of the world instead of flying the long way around it.',
      ],
      ui: ['Tutorial: the Next / Finish button now sticks to the right of the card.'],
    },
  },
  {
    version: '1.3.0',
    date: '2026-06-19',
    changes: {
      features: [
        'Ability slots: you can hold up to 4 abilities at once. Once they fill, the shop stops offering new ones — so each run commits to its own kit instead of unlocking everything by the end.',
        'Salvage an ability from its shop page to clear a slot. You get back half the Stardust you spent on it, plus all the Space Metal and Singularity Shards, then a fresh pair of abilities is offered — once per shop visit, so you can swap without endlessly fishing for a weapon. Meteorite can be stripped back to basics but never removed, so you always have something to fire.',
      ],
    },
  },
  {
    version: '1.2.0',
    date: '2026-06-19',
    changes: {
      features: [
        'Online leaderboard — enter a name when a run ends and your score is saved to the server, not just this browser. Your local best still shows on the game-over screen.',
        'See the top 50 scores: open the leaderboard from the main menu or the game-over screen.',
        'The game-over screen now shows how many enemies you destroyed that run.',
      ],
    },
  },
  {
    version: '1.1.0',
    date: '2026-06-19',
    changes: {
      features: [
        'New space metal ability — Repulse: blast a shockwave out from the ship that hurls every enemy away and eats their bullets. It follows you and keeps growing, so when it fades you have room to breathe.',
        'New space metal ability — Comet Storm: call down a few seconds of comets across the screen around you. Each hit is small, but they keep raining wherever you fly — good for wearing down a crowd.',
      ],
      fixes: [
        'The release-notes filters no longer trap you. Switching them all off used to collapse this panel so you could not turn them back on; now it shows a short note and the filter menu stays reachable.',
      ],
    },
  },
  {
    version: '1.0.0',
    date: '2026-06-16',
    changes: {
      breaking: [
        'Your ship no longer has guns. It flies and dodges on its own, but every shot is now yours — defend it with abilities and the slingshot from the very first wave.',
        'The Carrier ship is gone. With ships unarmed, a three-gun hull had nothing left to offer.',
        'Saved runs from older versions are cleared — too much changed under the hood to carry them forward.',
      ],
      features: [
        'New enemy, the Dasher: it winds up, shows the line of its lunge, then charges straight at the ship. Read the tell and slingshot clear.',
        'Waves that drag heat up — lingering enemies speed up and glow redder the longer you stall, so you can no longer just watch them trail the ship.',
        'Arm your helpers: unlock the old ship weapons (laser, missile, ricochet, nuke) under the Helper ability in the upgrade shop for your summoned allies — each unlock arms about a quarter of them, so buying all four arms them all.',
      ],
      balance: [
        'Ships are set apart by toughness and speed now, not firepower; ship select drops the combat-stat bars and the shop drops its Auto-Turret and Fire Rate upgrades — there are no ship guns left to boost.',
        'The slingshot is a long-burn resource: many quick flings before it overheats, then a slower cool-down. Overheating no longer locks you out — you can still fling, at half the distance for double the heat.',
        'Power regenerates faster and the cheapest abilities cost less, so you always have an answer. Regular enemies drop less power; bosses drop a big refill.',
        'Fewer enemies per wave, and mines are denser and present from wave one — thread between them.',
        'The ship keeps its distance from enemies rather than charging in, but it can never escape on its own.',
        'The maximum power was increased from 1000 to 2000.',
        'The Helper Factory ultimate costs a bit more to field, now that its summoned allies can carry your unlocked weapons.',
      ],
    },
  },
  {
    version: '0.26.1',
    date: '2026-06-16',
    changes: {
      features: [
        'The guided tutorial now teaches the full toolkit: swap to the Black Hole and cast it, scoop up space metal to refresh your shield, and steer clear of mines.',
      ],
      ui: [
        'Tutorial prompts adapt for touch (tap) versus desktop (click); the manual-steering (WASD) step is gone. The ship flies itself.',
      ],
    },
  },
  {
    version: '0.26.0',
    date: '2026-06-14',
    changes: {
      features: [
        'New players get a guided tutorial the first time they start a game: a demo wave that pauses to teach the thing everyone misses: your ship flies and fights on its own, and YOU attack independently by clicking, and can fling the ship with a slingshot.',
        'Replay the tutorial any time from the "How to Play" button on the start menu or the in-game Help screen.',
      ],
      ui: [
        'The tutorial spotlights what to do, dimming the scene and ringing the ship or the enemy to hit, and adapts its prompts for touch (tap) versus desktop (click / WASD).',
        'Ship selection now shows a Guns stat: 1 for most ships, 3 for the Carrier.',
      ],
      fixes: [
        'Enemies under continuous damage (Event Horizon, Solar Plague, and the like) no longer stay washed solid white. The white damage flash now pulses at most a few times a second.',
        'Tutorial polish: the spotlight no longer dims its own target dark, demo enemies no longer drift off forever when slingshotted, the slingshot is locked except on its own step, and the final step shows just Finish.',
      ],
    },
  },
  {
    version: '0.25.1',
    date: '2026-06-14',
    changes: {
      fixes: [
        'Enemies that stop to shoot now turn to face you, instead of pointing a fixed direction while firing.',
        'Your ship no longer gets stuck circling beneath an enemy (and slowly sinking with it). It now orbits targets smoothly to either side.',
        "Force Field and Shield now bump and catch enemies across the world's wrap-around edges, not only on the side where they were cast.",
        "Missile blast damage and ally collisions now also register across the world's wrap-around edges, matching targeting and homing.",
        'Force Field now flings stationary enemies it expands into (like shooters holding their ground), the same as ones that fly into it.',
        'The warp portal and the warp flash now line up: the view locks onto the portal as the ship arrives, so the rings stay concentric.',
      ],
    },
  },
  {
    version: '0.25.0',
    date: '2026-06-14',
    changes: {
      features: [
        'The world is now endless: fly off any edge and you seamlessly reappear on the opposite side, in every direction. No more walls or corridor; space wraps around you like a globe.',
        'Targeting, homing, AoE, and collisions all take the shortest path across the wrap, so enemies and shots just over an edge are handled exactly like ones right in front of you.',
      ],
      breaking: [
        'Saves from before the endless-world update are cleared. The world model changed, so older runs can no longer be continued.',
      ],
      architecture: [
        'Replaced the bounded corridor with a fixed-size torus: one toroidal-math layer (wrap, shortest-delta, nearest-image) now feeds distance, aim, and collision, with all rendering wrapping through a single camera chokepoint.',
      ],
    },
  },
  {
    version: '0.24.3',
    date: '2026-06-14',
    changes: {
      fixes: [
        'With "reduce motion" on, the death sequence now stays genuinely calm: the ship still explodes, but with a smaller, single burst and no extra cook-off pops.',
      ],
    },
  },
  {
    version: '0.24.2',
    date: '2026-06-14',
    changes: {
      fixes: [
        'Continuing a saved run no longer leaves the game frozen. The frame clock now restarts on resume.',
        'A destroyed ship now stays gone. It was briefly flashing back (pure white) behind the game-over screen the instant it appeared.',
        'The start menu no longer looks cramped when a save exists: the onboarding blurb is hidden for returning players, leaving room for Continue / New Game.',
        'The screen no longer darkens during the warp between sectors. You can watch the ship fly into the portal, and the fly-in is slower (~2.5×) so the jump actually reads.',
        "Restarting after a defeat now clears the previous run's enemies from the ship-select background.",
        'Death bursts (and other particles) now finish animating during the warp to the next sector instead of freezing mid-burst.',
        'The ship now stays pointing up as it flies into the portal, instead of flipping sideways when it arrives.',
      ],
      ui: [
        'Tanks no longer show a rotating turret: they ram rather than shoot, so the spinning part wrongly implied a ranged attack.',
      ],
    },
  },
  {
    version: '0.24.1',
    date: '2026-06-14',
    changes: {
      fixes: [
        'You can now actually see your ship explode: the dark game-over screen no longer drops the instant you die, so the death sequence plays out first.',
      ],
      ui: [
        'Enemy death bursts are a bit smaller and less busy.',
        'The ship engine flame now connects to the hull (sits just under the ship) and is a touch taller, so it never looks detached.',
        'The pause menu only offers "Save & Exit" once you have a save (after the first shop clears). Before that there is nothing to return to.',
      ],
    },
  },
  {
    version: '0.24.0',
    date: '2026-06-14',
    changes: {
      features: [
        'Your run now autosaves at each sector (when the shop opens). Close the tab or pick "Save & Exit" from the pause menu, and a "Continue" button on the start screen drops you right back at the shop in the exact same state. Even the RNG is restored, so the next waves play out identically. Starting a New Game or losing clears the save.',
        'Bigger Fireworks / Rocket explosion-radius upgrades now visibly throw their debris further, so the extra radius reads at a glance instead of looking identical.',
      ],
    },
  },
  {
    version: '0.23.1',
    date: '2026-06-14',
    changes: {
      fixes: [
        'The HEAT bar now tracks live on mobile. It was lagging behind (often reading empty) during play and only snapping to the real value when you paused.',
        'The shop now shows your Space Metal balance alongside Stardust and Singularity Shards. It was hidden even though Ultimates are bought with it.',
        'Pinch-zoom is now disabled while playing, so the view can no longer get stuck zoomed-in mid-game; entering fullscreen also snaps any existing zoom back to normal.',
        'On phones the ability + Space Metal buttons now sit in a bar below (or beside) the play area instead of overlapping it. The ship and tap-to-aim are no longer blocked where a button used to cover the screen.',
      ],
    },
  },
  {
    version: '0.23.0',
    date: '2026-06-14',
    changes: {
      features: [
        'The whole game has more life: your ship trails an engine flame that flares with speed, kicks back when it fires, and flashes a weapon-coloured muzzle blip on every shot.',
        'Enemies breathe and read better: drones bob, tanks sweep a rotating turret, and every enemy warps in with a grow-in instead of popping into existence.',
        'Hits land harder: enemies (and your ship) flash white when damaged, and a struck enemy now shatters in a short disintegration before the explosion.',
        'Dying is a moment now: when your ship goes down it explodes in a brief sequence before the game-over screen, instead of cutting out instantly.',
        'Ability flair: meteors trail flame as they fall, the black hole pulls in a swirl of dust, and the shield shimmers around its rim.',
        'A danger read at low HP: the ship smokes and the screen edges glow red as you near death.',
      ],
      ui: [
        'All the new animation honours your "reduce motion" system setting: flicker, bob, and the screen pulse damp down (the death sequence still plays out, just calmer).',
      ],
      architecture: [
        'A SpriteAnimation primitive (multi-frame, pre-rasterized) backs the enemy disintegration; everything else is procedural (sine/tint/particles) driven by a cosmetic render clock kept out of the deterministic game state. Player death adds a GamePhase.dying that runs an advanceDeathSequence tick (mirroring the warp cutscene) before flipping to gameOver.',
      ],
    },
  },
  {
    version: '0.22.0',
    date: '2026-06-13',
    changes: {
      features: [
        'Enemy modifiers appear deeper into a run: Speed enemies are faster, washed red, and leave a trail; Shield enemies carry a regenerating shield like yours (it soaks a hit, then recharges after a pause); Giant enemies are slow, oversized, and very tanky.',
        'Themed waves now break up the rotation past wave 10 (an all-tank push, a swarm of swarms, a shooter nest, or a bomber run) alongside the usual mixed waves.',
      ],
      balance: [
        'Enemies gain a lot of HP but only a little contact damage as waves climb (about ×4 HP / ×1.5 damage by wave 20), so your late-game abilities have something to chew through without you getting one-shot.',
        'High mixed waves cap their drone count and spend the overflow on tougher enemies, so deep waves get harder through composition rather than a wall of drones.',
      ],
      fixes: [
        'The warp portal no longer sits unreached at the far end during play. Clear a sector and it appears just ahead of your ship, which flies into it for a brief hands-off jump to the next sector.',
        'Hazard mines are scattered sparsely across the whole corridor instead of bunched into one band.',
        'A soft slingshot into a corridor wall now eases back gently instead of springing you off it.',
        'When hunting, the ship orbits to whichever side an enemy sits on instead of always strafing the same direction.',
      ],
      architecture: [
        'All enemy damage funnels through a single applyDamageToEnemy helper, which is what lets the regenerating enemy shield work everywhere without touching each weapon. Per-wave stat scaling and the modifier roll both apply at spawn. The end-of-sector warp is a hands-off cutscene: the portal spawns ahead of the ship and advanceWarp flies it in (camera unclamped, corridor borders dropped) before the shop opens.',
      ],
    },
  },
  {
    version: '0.21.0',
    date: '2026-06-13',
    changes: {
      features: [
        'Sector corridors: each level is now a finite corridor your ship flies up toward a portal. Clear the sector, then warp through to a fresh one. Boss sectors put the boss at the gate as the final blockade.',
        'Your ship now auto-pilots up the corridor and hunts the nearest enemy, closing in to orbit and strafe it rather than sitting still. Clear a sector and you warp to a fresh corridor, then refit at the shop. Progress is gated by clearing waves, so the slingshot stays a pure dodge/positioning tool and can never skip a level.',
        'Hazard mines sit mid-corridor on some sectors: dash across the gap (Escape Mode passes through unharmed).',
      ],
      ui: [
        'The level bar is now a sector progress bar: a ship marker advances toward the portal as waves clear (a boss marker caps boss sectors).',
        'New auto-pilot framing: the ship threads sector after sector on its own; you guard the path ahead (start-screen and help copy updated).',
      ],
      balance: [
        'Enemies now spawn mostly ahead of the ship, in a forward cone that tightens as waves climb.',
      ],
      fixes: [
        'Slinging into a corridor wall now bounces you straight back (with an impact spark) instead of pinning you against it while the momentum bleeds off.',
        'Space metal and Singularity Shards dropped by a boss are auto-collected when you warp out. A kill right before the portal is no longer wasted.',
        'The corridor entry and far walls now get the same glowing border as the sides.',
      ],
      architecture: [
        'Ship movement is now hunt-and-drift (replacing the fixed-arena orbit), which also fixes the post-fling snap-back. A new "warping" phase drives the portal transition, and per-sector world bounds, forward direction, and portal position are first-class game-state fields shared by the engine, renderer, and HUD.',
      ],
    },
  },
  {
    version: '0.20.0',
    date: '2026-06-13',
    changes: {
      features: [
        'Four more ultimates, bought with the Singularity Shard economy and replacing their base weapon in the hotbar.',
        'Rocket → Fireworks: the rocket bursts into three rockets, each bursting into three more, a cascading cluster. Upgrade Finale to add a rocket to every second-wave burst.',
        'Black Hole → Event Horizon: a wider, stronger well that zaps enemies at the core and banishes them far from your ship. Upgrade Spaghettification to drag them in harder.',
        'Solar Flare → Solar Plague: the beam still burns enemies directly, but now also sets them ablaze: the fire keeps dealing damage over time and leaps between enemies that touch. Upgrade Wildfire to make it jump further.',
        'Telekinesis → Singularity: pulls enemies into a crushing core that hurts more the more it holds, then detonates on release: the longer you hold (up to 2s), the bigger the blast. Its core darkens toward deep purple as the blast charges. Upgrade Collapse to make it bigger still.',
      ],
      architecture: [
        'Effects can spawn child effects (Fireworks’ cascading rockets), hold abilities can fire a release burst (Singularity’s detonation), and enemies carry a generic fire status driven by a new burning system (Solar Plague). Gravity-pull, radial-force, force-field rendering, and solar beam-damage helpers are now shared between base abilities and their ultimates.',
      ],
      fixes: [
        'The Next Wave button (and other overlay buttons) no longer shrink when hovered in fullscreen.',
      ],
    },
  },
  {
    version: '0.19.0',
    date: '2026-06-12',
    changes: {
      features: [
        'Three more ultimates, each bought with the Singularity Shard economy and replacing its base weapon in the hotbar.',
        'Helper → Helper Factory: a tanky factory that deals no damage but builds a steady stream of helpers on a timer. Upgrade Assembly Line to build them faster.',
        'Sun → Supernova: the sun holds, then collapses and shifts blue before detonating in a brief, devastating blast. Upgrade Critical Mass to widen the explosion.',
        'Shield → Force Field: a dome that grows to twice its size then vanishes, flinging enemies away on contact and burning them. Upgrade Repulsor to throw them harder.',
      ],
      ui: [
        'Abilities you can’t afford now stay dimmed the whole time, instead of only darkening once they finish recharging.',
      ],
    },
  },
  {
    version: '0.18.1',
    date: '2026-06-11',
    changes: {
      architecture: [
        'Effects are registry-driven: each ability/weapon file owns its effect’s full lifecycle (factory, per-tick simulation, world-layer drawing) and registers a single EffectDefinition: the effects system and renderer dispatch generically, so adding an effect never touches them.',
        'Bosses declare their own rendering: BossDefinition gained renderBack (the Phase Shifter telegraph), spriteAlpha (the mid-shift ghost), and a hideShieldBubble predicate: the renderer no longer hard-codes any boss.',
        'Hold abilities declare their own overlays (renderBack/renderFront on the hold config): the Solar Flare haze and Telekinesis ripple moved into their ability files, so a new hold ability needs zero renderer edits.',
        'Bosses declare their movement behaviour on their BossDefinition and bosses always die as bosses: the per-kind movement/death tables in entity-creator now cover only regular enemies.',
        'Boss runtime state is a kind-tagged discriminated union: each boss declares its own state type in its own file (the Dreadnought’s drone timer, the worm’s attack cycle, the shifter’s teleport cycle) and TypeScript narrows it without casts.',
        'Upgrade ids live next to the upgrades they belong to: every ability/weapon file owns its id block and engine/upgrade-ids.ts assembles the global UpgradeId: adding content no longer edits a central 70-entry enum.',
        'Ultimates build their upgrade math through composeUltimateUpgrades: the base ability’s full upgrade patch flows through automatically, so a base gaining a new upgradable field can never be silently dropped by its ultimate.',
        'Shared geometry helpers: ringPositions (generator/swarm/meteor rings), clampToWorld (boss movement and teleport targeting), and bossPhase (the two-phase HP threshold) replace three near-identical copies.',
        'Dev-console state manipulation moved out of the React hook into engine/dev-tools.ts, and slingshot press/drag/release decoding into input/sling-gesture.ts: both pure and unit-tested; a guard test also keeps WEAPON_ORDER covering every ability.',
        'Each ability/weapon file binds its upgrades once via makeAbilityUpgrade / makeLoadoutUpgrade, so every upgrade declares only id/label/description/tiers. The repeated category + weapon fields (and the copy-paste risk of a stale weapon tag) are gone.',
        'The in-game help text for channelled abilities is derived from the ability registry instead of a hand-maintained list.',
      ],
    },
  },
  {
    version: '0.18.0',
    date: '2026-06-11',
    changes: {
      features: [
        'Ultimate abilities, upgraded variants of your weapons, forged with a new currency: the Singularity Shard. Every boss you defeat drops one (it floats free and homes to your ship automatically).',
        'Buy an ultimate from a weapon’s shop page once you own the base weapon. It costs stardust + space metal + Singularity Shards, and the shard price climbs with each ultimate you buy this run (1, then 2, then 3 …). The ultimate replaces its base in your hotbar (keeping the same slot).',
        'Meteorite → Comet Shower: a single tap rains meteorites: one dead-center on your aim, the rest scattered and staggered around it. Upgrade Comet Count for more meteorites, or Comet Cadence to make them fall in quicker succession.',
        'Meteor → Meteor Shower: a center hit plus a ring of meteors that land together a beat later. The Meteor Count upgrade adds another to the ring, closing the angle between them.',
        'New Power upgrades: Life Regen (slowly heal ship HP), Stardust Yield (multiply the Stardust earned from kills), Metal Detector (raise the chance enemies drop Space Metal), and Energy Siphon (gain more power from each kill).',
      ],
      ui: [
        'Owned ultimates are marked in the ability bar (and their upgrade cards in the shop) with a purple tint, so they stand apart from your base weapons.',
        'The three shop currencies now read as distinct coloured symbols (Stardust, Space Metal, Singularity Shard).',
        'Ship tab: the four Slingshot upgrades are tucked behind a “Slingshot” entry you drill into, keeping the tab tidy.',
        'Meteor strike telegraphs (the falling-meteor markers) now appear in the order the meteors will land, instead of all at once.',
        'An overheated ship now shows it: the hull washes red (fading as it cools) and vents smoke and embers.',
      ],
      fixes: [
        'Restarting from the pause menu works again: the new game no longer freezes in place after you pick a ship.',
      ],
      architecture: [
        'Ultimates are registry-driven (one `ultimate` block per ability) so any weapon can gain one in future without touching the shop, hotbar, or purchase flow.',
      ],
    },
  },
  {
    version: '0.17.0',
    date: '2026-06-10',
    changes: {
      features: [
        'New boss, Void Worm: a long segmented serpent that weaves after your ship and lunges in sudden charges you have to dodge. Its body shields the head. Destroy the segments (the worm shortens and rejoins as pieces die), then kill the exposed head to bring it down. The boss HP bar tracks head + body combined.',
        'New boss, Phase Shifter: blinks across the battlefield, aiming to land right on top of you. A red X marks the destination a couple of seconds ahead. While it phases it cannot be harmed, and on arrival it materialises a ring of swarmers around itself. Below half health it teleports faster and brings a bigger ring.',
        'Boss waves now pick a random boss: each of the three bosses appears once before any repeats, then selection is fully random. The lineup reshuffles every run.',
      ],
      fixes: [
        'Tapping on (or right next to) your ship now fires the selected ability there instead of being swallowed by the slingshot: only an actual drag flings the ship, so enemies swarming you stay targetable.',
      ],
    },
  },
  {
    version: '0.16.1',
    date: '2026-06-10',
    changes: {
      ui: [
        'Full sprite art pass: every ship, enemy, and projectile redrawn with cleaner silhouettes and shading.',
        'Bullets (yours and enemies’) are larger with white-hot cores so they’re easier to track.',
      ],
    },
  },
  {
    version: '0.16.0',
    date: '2026-06-09',
    changes: {
      features: [
        'The Dreadnought boss now attacks: it fires a slow red laser beam you can slingshot clear of, shooting from range while it holds at its standoff.',
        'Its shield generators fire lasers too, and put out most of the incoming fire, so destroying them (which also drops the boss’s shield) is the way to cut the fight’s pressure down.',
      ],
    },
  },
  {
    version: '0.15.0',
    date: '2026-06-09',
    changes: {
      features: [
        'New movement, Slingshot: drag from your ship in any direction and release to fling it that way. Your way to dodge danger, reposition, or close the gap, and it works no matter which ability is selected. Throws carry a little random scatter, and the ship coasts then drifts to a stop.',
        'Slingshot Heat: every flick builds heat (big flings cost the most, tiny nudges almost nothing) that cools over time. Fill the bar and the slingshot overheats: locked out, and the ship slows, until it cools back down. Rewards short, precise dodges and burst use over endless kiting; your aim also gets shakier the hotter you run.',
        'Four new Ship upgrades for the slingshot: Power (fling farther), Control (less scatter), Cadence (shorter cooldown), and Heat Sink (cool faster).',
      ],
      ui: [
        'Added a HEAT gauge to the HUD, plus an aim arrow showing direction + charge while you drag (it greys out while the slingshot is recharging or overheated).',
      ],
    },
  },
  {
    version: '0.14.0',
    date: '2026-06-09',
    changes: {
      features: [
        'Dreadnought boss appears at the end of every 3rd level (waves 9, 18, 27 ...).',
        'Boss is wrapped in a shield (same look as your ship’s) projected by a ring of generator drones. Destroy every generator to drop the shield and damage the boss.',
        'At 50% HP the boss re-arms: it regenerates its shield with 5 generators (up from 3) and spawns escort drones twice as fast.',
        'Boss slowly advances on the player and holds at a standoff, its generator ring spread evenly around it and tracking it as it moves.',
        'While shielded the boss can’t be harmed by anything: auto-attacks, homing missiles, ricochet bounces, allies, and every AoE ability now skip or pass through it and target the generators instead.',
        'Boss waves spawn a slimmed-down regular enemy escort alongside the boss.',
        'Killing the boss guarantees 1–4 space metal drops.',
      ],
      ui: [
        'The level-progress bar cross-fades into a top-screen boss HP bar when a boss appears, and back again once it falls.',
        'Carrier: buying a new ship weapon now auto-equips it into a still-default (Bullet) slot. Once all three slots hold non-default weapons, new purchases are left for you to slot manually.',
      ],
      architecture: [
        'New engine/bosses/ registry: add a BossDefinition to plug in future bosses (Void Worm, Phase Shifter) without touching game-loop or combat code.',
      ],
    },
  },
  {
    version: '0.13.2',
    date: '2026-06-09',
    changes: {
      balance: [
        'Each ricochet bounce refreshes the round to at least 0.5s of remaining lifetime, so a chain that keeps finding targets uses all its bounces instead of expiring mid-flight. Base lifetime unchanged.',
        'Laser pierce 2 → 3 enemies (+50%)',
      ],
      fixes: [
        'Entity IDs now use crypto.randomUUID for session-wide uniqueness (was a module-level counter): bouncing rounds no longer skip enemies whose recycled IDs were already hit.',
      ],
      ui: [
        'Buying a ship weapon on a single-slot ship auto-equips it. Carrier keeps the manual slot choice.',
      ],
    },
  },
  {
    version: '0.13.1',
    date: '2026-06-08',
    changes: {
      features: [
        'Missile now splashes on impact: enemies in a small radius take 60% damage (direct hit unchanged). New Splash upgrade widens the radius.',
      ],
      balance: [
        'Nuke: damage ×2.5 (+150%), fire cadence ~1/3 of bullet (−67%), bigger blast and waste radius.',
        'Ricochet: bounce range 240 → 500 (+108%), full bullet speed.',
      ],
      ui: [
        'Nuclear-waste zone expands once on detonation then shrinks to nothing (no pulse); damage area matches the visual.',
        'Carrier loadout slots are now cycle-on-click chips (was a dropdown), showing slot number, current weapon, and a cycle hint.',
      ],
      fixes: ['Ricochet rounds now draw a short magenta trail.'],
    },
  },
  {
    version: '0.13.0',
    date: '2026-06-08',
    changes: {
      features: [
        'Ship auto-attack is now a swappable weapon. New Loadout shop tab offers alternatives (Bullet unchanged): Laser pierces in a line, Missile homes onto targets, Ricochet bounces between nearby enemies, Nuke lobs slow for a massive blast leaving a radioactive zone.',
        'Carrier fields 3 different weapons at once: one per slot, each firing on its own independent cadence.',
        'Per-weapon upgrade trees in the Loadout tab: damage, pierce, bounces, blast, fallout.',
      ],
      architecture: [
        'New engine/ship/ folder holds ship variants, weapon definitions, and the weapon registry (mirrors engine/abilities/): a new weapon needs one file + one registry entry. SHIP_VARIANTS moved there, re-exported from data.ts.',
      ],
    },
  },
  {
    version: '0.12.0',
    date: '2026-06-08',
    changes: {
      features: [
        'Added power-cost (Efficiency) upgrades to Rocket, Shield, Helper, and Telekinesis. Added Range / Radius upgrades to Meteor, Black Hole, Sun, and Solar Flare.',
        'Telekinesis gains a Force upgrade: pushes enemies harder.',
        'Damage upgrades now extend to 5 tiers for every weapon and the ship auto-turret.',
      ],
      balance: [
        'Meteorite: power cost 5 → 8 (+60%), damage 15 → 10 (−33%), cooldown 0.05 → 0.2 (×4).',
        'Tier 2 stardust cost ×2 (+100%), Tier 3 ×4 (+300%) across every weapon and ship upgrade.',
      ],
      fixes: [
        'Telekinesis on-screen circle now matches the upgraded pull radius.',
        'Offered weapons sit at the bottom of the shop list until purchased (no longer jump into the middle of your unlocked list).',
        'Mobile: space-metal ability buttons and weapon swapping are tappable again.',
        'Mobile (iOS pseudo-fullscreen): rotating portrait to landscape no longer leaves Safari’s tab bar showing.',
      ],
      ui: [
        'Maxed-out weapons show a "MAX" badge in the shop list.',
        'Changelog now has a filter dropdown to toggle categories (Features, Balance, Fixes, etc.); "Internal Architecture" is hidden by default.',
        'Ability cards show a top-right recharge ring that fills as the cooldown ticks down.',
        'Shop now lists weapons in unlock order (matching the hotbar); newly-offered weapons appear at the bottom of the list.',
      ],
    },
  },
  {
    version: '0.11.1',
    date: '2026-06-07',
    changes: {
      ui: [
        'Mobile: the weapon and space-metal ability buttons merge into one cluster clear of the play area: a bottom row in portrait, a right-side column in landscape. Desktop keeps the split bottom/side layout.',
        'Help (?) button removed from the HUD, moved into the settings menu.',
      ],
    },
  },
  {
    version: '0.11.0',
    date: '2026-06-07',
    changes: {
      ui: [
        'Replaced every game emoji (pause, fullscreen, help, all weapon and space-metal icons) with an inline-SVG icon set: icons render identically on every device and tint to the accent colour on hover.',
      ],
    },
  },
  {
    version: '0.10.2',
    date: '2026-06-07',
    changes: {
      ui: [
        'Drag abilities (telekinesis, solar flare) no longer scroll the page on mobile: the canvas claims touch gestures.',
        'Short landscape phones: the upgrade screen Continue button now sits right under the last upgrade (no forced gap).',
        "iOS pseudo-fullscreen now re-hides Safari's URL / tab bar after a rotate.",
      ],
    },
  },
  {
    version: '0.10.1',
    date: '2026-06-06',
    changes: {
      fixes: [
        'Non-bomber enemies (drones, tanks, shooters, swarmers) no longer suicide on contact: they deal their damage, bounce off the ship or helper, and stay in the fight. Bombers still detonate on impact.',
        'Bomber death explosions now damage helpers in the blast radius, not just the ship (shields still shelter a helper inside the dome).',
      ],
      balance: ['Bomber explosion damage 30 → 40 (+33%)'],
    },
  },
  {
    version: '0.10.0',
    date: '2026-06-06',
    changes: {
      features: [
        'Added an in-game help modal (? button, top-right) covering gameplay, controls, space-metal abilities, and progression; freezes the game while open.',
      ],
      ui: [
        'Reworked the start-screen blurb for the cosmic-guardian premise, pointing new players at the in-game help.',
      ],
    },
  },
  {
    version: '0.9.2',
    date: '2026-06-06',
    changes: {
      features: [
        'Helper allies no longer expire on a timer: they lose 1 HP/s and die at 0, with combat damage on top. The old Duration upgrade is now Max Health.',
      ],
      ui: [
        'Landscape fullscreen on mobile: start / ship-select / upgrade screens now scroll when taller than the viewport, keeping Start / Launch / Continue reachable.',
        'Canvas now renders at devicePixelRatio resolution: sprites are crisp on Retina / high-DPI mobile.',
        'Camera zoom now folds in min-dimension scaling, so wide-but-short viewports zoom out further.',
        'iOS pseudo-fullscreen now nudges Safari to auto-hide its URL bar on entry.',
      ],
      fixes: [
        'Helper damage and max-HP upgrades now reach the spawned ally.',
        'Escape Mode dash is now clamped to the play area.',
      ],
    },
  },
  {
    version: '0.9.1',
    date: '2026-06-06',
    changes: {
      balance: [
        'Sun duration 5 → 8s (+60%)',
        'Solar flare beam width 60 → 40px (−33%)',
        'Black hole cost 50 → 30 power (−40%)',
        'Black hole pull strength 200 → 250 (+25%)',
      ],
    },
  },
  {
    version: '0.9.0',
    date: '2026-06-06',
    changes: {
      features: [
        'Ability bar now hides locked abilities and orders the rest by unlock time: the first unlocked gets hotkey 1, the second 2, and the slot never shifts after.',
        'Escape Mode: new space-metal ability (hotkey G, costs 2 space metal), slows the ship while charging, then dashes in your current heading with a flame trail; ship invincible throughout.',
        'Level-up weapons tab now offers 2 random locked weapons per level; buying one removes the other for that level-up. Owned weapons stay fully upgradable.',
      ],
      ui: [
        'Mobile ability bar wraps to multiple rows when many abilities are unlocked.',
        'Space-metal counter + abilities moved to a dedicated right-side rail, built on a small registry for new powers.',
      ],
    },
  },
  {
    version: '0.8.4',
    date: '2026-06-04',
    changes: {
      fixes: [
        'Enemy bullets no longer tunnel through the ship at 2× game speed: the swept collision check now applies to enemy fire too.',
      ],
      architecture: [
        'Solar Flare kills now tally score and currency through the game loop like every other kill source (was inline); removed dead telekinesis drag-delta input plumbing.',
      ],
    },
  },
  {
    version: '0.8.3',
    date: '2026-06-04',
    changes: {
      features: [
        'Telekinesis now applies a radial force that pushes enemies away from your cursor (was drag-based). Set TELEKINESIS.mode to "pull" in abilityData.ts to flip behavior.',
      ],
      fixes: [
        'Telekinesis now needs 1 second of power to start and shuts off the instant power runs out.',
      ],
    },
  },
  {
    version: '0.8.2',
    date: '2026-06-04',
    changes: {
      features: [
        'Allies now have an HP bar that follows them, mirroring the ship bar.',
        'Allies now orbit the ship at unique per-ally angles and weave with random noise: stacked allies fan out instead of overlapping.',
        'Solar Flare visual now spawns a dense white/yellow core with a wider orange spray.',
      ],
      balance: [
        'Allies dodge enemies worse (lower avoid radius, weaker push, added random movement) so they can die.',
      ],
      fixes: ['Solar Flare now deactivates the moment power drops below one tick of cost.'],
      architecture: [
        'Consolidated all per-ability data (meta, base stats, factories, upgrade definitions and application) into one file per ability under engine/abilities/: a new ability is one file + an index entry.',
      ],
    },
  },
  {
    version: '0.8.1',
    date: '2026-06-04',
    changes: {
      features: [
        'Allies now follow your ship and weave away from nearby enemies (no longer stand still while shooting).',
        'Solar Flare is now a radial particle storm at your cursor (was a beam from your ship).',
        'Solar Flare arms only with at least 1 second of power available and stops the moment power runs out.',
        'Telekinesis force now uses a plateau curve: full strength near the cursor with a smooth falloff.',
      ],
      fixes: [
        'Enemies now die and damage allies when ramming them.',
        'Solar Flare cursor now stays under your actual mouse instead of drifting as the camera moves.',
        'Space metal can now be collected while Solar Flare or Telekinesis is selected.',
      ],
    },
  },
  {
    version: '0.8.0',
    date: '2026-06-04',
    changes: {
      features: [
        'New ability: Helper. Click to summon a ranged ally that fights for 20 seconds. No cap; stack them.',
        'New ability: Telekinesis. Hold to create a force field at your cursor; drag to push enemies away with distance-based falloff.',
        'New ability: Solar Flare. Hold toward enemies for a continuous damage beam; power drains every 0.25s while active.',
        'Enemies now target and shoot at Helper allies.',
      ],
      fixes: [
        'Bullets no longer tunnel through enemies at 2× game speed: swept segment-circle collision replaces the old point check.',
        'Wave-complete screen: pressing Enter now advances to the next wave.',
      ],
    },
  },
  {
    version: '0.7.0',
    date: '2026-06-03',
    changes: {
      features: [
        'Ship selection screen before each game: choose from Fighter, Interceptor, Dreadnought, or Carrier',
        'Fighter: balanced all-round ship (100 HP, 50 shield)',
        'Interceptor: fast glass cannon (70 HP, 25 shield, 8 damage, 180 speed)',
        'Dreadnought: massive shield pool that regens after cooldown (110 HP, 120 shield, slow)',
        'Carrier: fires at up to 3 enemies simultaneously (moderate stats)',
        'Ship shield system: a secondary HP layer that absorbs damage first and regens over time',
        'Shield enters a cooldown when broken, then regens at half the starting amount',
        'Space metal can instantly refill the shield: press F or click the HUD button',
        'New upgrade: Fire Rate, increase auto-turret fire rate (3 tiers)',
        'New upgrade: Shield Strength, increase maximum shield (3 tiers)',
        'New upgrade: Engine Boost, increase ship speed (3 tiers)',
      ],
      fixes: [
        'Shop upgrade buttons are now fully clickable (was text-only, not the surrounding box)',
        'Two player bullets in the air: one hitting an enemy no longer removes the other',
      ],
      ui: ['Player ship is no longer visible in the background before a game starts'],
    },
  },
  {
    version: '0.6.1',
    date: '2026-06-02',
    changes: {
      features: [
        'Shield now reflects enemy velocity on contact: enemies bounce off the dome instead of snapping back to the edge',
        'Shield blocks bomber explosions if the ship is inside the dome and the bomber explodes outside it',
        'Rocket now detonates when it physically touches an enemy, instead of flying past and still damaging from empty space',
        'Shield grandfathering is now per-tick: an enemy inside when the shield dropped can walk out, but loses grandfathered status on leaving and is bounced back if it re-enters',
      ],
      ui: [
        'Camera now zooms based on viewport area: the same total world is visible regardless of screen size or fullscreen state',
        'Mobile shows more world area (zoomed-out) so enemies approaching from the sides are visible',
        'Mobile polish: bigger pause / fullscreen tap targets (44×44) and a much taller game area on phones',
        'Fullscreen now works on iPhone Safari via a CSS-based fallback (Fullscreen API is unsupported there)',
        'HUD elements (level bar, score, pause / fullscreen buttons, ability hotbar) now scale with the gameplay area',
        'Pause / settings / upgrade / game-over screens scale with the HUD too',
        'Game starts more zoomed-out by default',
      ],
      fixes: ['Going fullscreen no longer reveals more of the game world'],
    },
  },
  {
    version: '0.6.0',
    date: '2026-06-02',
    changes: {
      features: [
        'New ability: Rocket. Flies from your ship to the target, exploding on arrival with a bigger blast radius than the meteor',
        'New ability: Shield. A stationary dome that absorbs enemy projectiles and blocks enemies from entering (those already inside when it drops stay free until they leave)',
        'New ability: Sun. Drops a massive stationary AoE damage zone for a few seconds; very long cooldown',
        'Six abilities total now visible in the hotbar, unlockable from the shop',
      ],
      fixes: ['Hotbar and shop weapon order is now driven by a single WEAPON_ORDER array'],
    },
  },
  {
    version: '0.5.1',
    date: '2026-06-02',
    changes: {
      features: [
        'Clicked space metal now flies into the ship (same magnetic arc as power orbs) instead of teleporting away. Click-to-claim unchanged.',
      ],
      fixes: [
        'Wave delay no longer freezes in-flight meteors / homing power orbs: only enemy spawning is gated',
        'Game now opens with the camera already centered on your ship: no "rush across space" on first load or restart.',
        'Bombers now explode when they reach your ship: the on-death AoE fires on every death, not just when shot down.',
        'Swarm enemies now weave in sync with the game-speed setting and freeze cleanly when paused: driven by game time, not the wall clock.',
      ],
      ui: ['Game-speed buttons in Settings now announce their selected state to screen readers.'],
    },
  },
  {
    version: '0.5.0',
    date: '2026-06-02',
    changes: {
      features: [
        'Pause menu: press P or click the pause button; resumes cleanly with no time-skip',
        'Settings menu: game speed slider (0.5×/1×/2×) accessible from pause',
        'Fullscreen toggle button: uses the Fullscreen API to fill the screen',
        'Speed indicator in the HUD when game speed is not 1×',
      ],
      fixes: [
        'Tank enemies pursue the ship steadily: velocity is now smoothed instead of flipping each frame as the ship reverses',
      ],
      ui: [
        'Upgrade menu now stays a fixed size across tabs: no heading jump or layout shift when switching Weapons/Ship/Powers',
        'Shooter enemy sprite redesigned: cleaner diamond silhouette with a glowing eye',
      ],
    },
  },
  {
    version: '0.4.0',
    date: '2026-06-02',
    changes: {
      features: [
        'New enemy: Swarm. Tiny, fast, zigzag movement, spawn in packs of 5-8',
        'New enemy: Bomber. Slow, bulky, explodes on death dealing AoE damage to the ship',
        'Power orbs: enemies now drop blue orbs that magnetically arc toward your ship to restore power',
        'Space metal: rare gold hexagonal drops that must be clicked to collect (premium currency)',
      ],
      ui: ['Space metal counter in the HUD'],
      architecture: [
        'Unified effect system replaces per-ability arrays',
        'Data-driven movement behaviors (chase, keep-range, zigzag) replace hardcoded enemy if/else',
        'Ability creation uses a factory map instead of branching logic',
      ],
    },
  },
  {
    version: '0.3.0',
    date: '2026-06-02',
    changes: {
      features: [
        'Enemies trickle in near the ship with randomized order and timing, instead of all spawning at the map edge at once',
      ],
      ui: [
        'Level progress bar at the top of the HUD: fills as enemies spawn, with milestone dots per wave',
        'HUD now shows "Level X" instead of raw wave numbers',
        'Wave-complete and game-over screens show wave progress within the current level',
      ],
      fixes: [
        'Abilities now sort by power cost (cheapest first); hotkey numbers and HUD badges derive from that order',
      ],
      architecture: [
        'Random functions now use the seeded RNG instead of deterministic index-based positioning',
      ],
    },
  },
  {
    version: '0.2.1',
    date: '2026-06-01',
    changes: {
      fixes: [
        'Black Hole Duration upgrade now extends the black hole lifetime',
        'Game-over screen no longer shows "New High Score!" when you only tie your best',
      ],
      architecture: [
        'Black hole gradients are now cached instead of rebuilt each frame',
        'Enemy stats now read from a single source of truth',
        'Sprite keys converted to a const object, removing the last magic-string union',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-06-01',
    changes: {
      features: [
        'New enemy: Shooter. Ranged enemy that fires projectiles at your ship',
        'New ability: Black Hole. Pulls enemies in a spiral, deals damage over time (more at center)',
        'Dual attack system: Meteorite (cheap/fast) and Meteor (expensive/powerful)',
        'Ship upgrades: Hull Plating (max HP) and Auto-Turret (damage)',
        'Power regen upgrade',
        'Stardust currency dropped by enemies for purchasing upgrades',
        'Level system: every 3 waves = 1 level, upgrade screen between levels',
        'Seeded random number generator for unique sessions',
        'Upgrade shop with tabbed UI (Weapons, Ship, Powers)',
        'Drill-down weapon upgrades: click a weapon to see its sub-upgrades',
        'Hotkeys 1/2/3 to switch between abilities',
      ],
      balance: ['Ship damage 10 → 5 (−50%), power regen 3 → 5/s (+67%)'],
      architecture: ['Eliminated all magic-string union types in favor of const objects'],
      fixes: ['Renamed from Event Horizon to Null Space'],
    },
  },
  {
    version: '0.1.0',
    date: '2026-05-31',
    changes: {
      features: [
        'Initial release: playable space defense game',
        'Ship auto-flies and auto-attacks enemies',
        'Meteor strike ability (click to launch)',
        'Power system for abilities with passive regen',
        'Two enemy types: Drone and Tank',
        'Wave-based progression with increasing difficulty',
        'High score persistence via localStorage',
        'Lazy-loaded so it does not affect site load time',
      ],
      ui: [
        'Pixel art sprites rendered on Canvas 2D',
        'HUD with HP bar, power bar, score, wave counter',
        'Menu, wave complete, and game over screens',
        'Games hub page under Fun Stuff',
      ],
    },
  },
]

export const GAME_VERSION = CHANGELOG[0].version
