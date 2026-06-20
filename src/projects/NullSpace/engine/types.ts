// Type-only import — erased at compile time, so although boss files import
// values from types.ts, there is no runtime cycle. The union itself lives with
// the bosses so each boss declares its own runtime state in its own file.
import type { BossRuntimeState } from './bosses/boss-definition'
// Same type-only pattern: each feature file owns its upgrade ids and
// engine/upgrade-ids.ts assembles the union.
import type { UpgradeId } from './upgrade-ids'

export type Vec2 = { x: number; y: number }

export type Entity = {
  id: string
  pos: Vec2
  vel: Vec2
  radius: number
  hp: number
  maxHp: number
}

export const ShipKind = {
  fighter: 'fighter',
  interceptor: 'interceptor',
  dreadnought: 'dreadnought',
} as const
export type ShipKind = (typeof ShipKind)[keyof typeof ShipKind]

// A weapon a helper (ally) can be armed with. Bullet is the default; the rest
// are unlocked via the Helper shop and rolled onto summoned allies. Defined here
// (not in engine/weapons/) so Ally can reference it without a types→weapons cycle.
export const HelperWeaponKind = {
  bullet: 'bullet',
  laser: 'laser',
  missile: 'missile',
  ricochet: 'ricochet',
  nuke: 'nuke',
} as const
export type HelperWeaponKind = (typeof HelperWeaponKind)[keyof typeof HelperWeaponKind]

export const EscapeModePhase = {
  charge: 'charge',
  dash: 'dash',
} as const
export type EscapeModePhase = (typeof EscapeModePhase)[keyof typeof EscapeModePhase]

export type EscapeModeState = {
  phase: EscapeModePhase
  timer: number
  heading: Vec2
}

export type Ship = Entity & {
  kind: ShipKind
  speed: number
  // Seconds left in the post-fling window where the resumed forward-drift still
  // inherits the fling heading (eases back to forward) instead of snapping. 0 = pure drift.
  driftMomentum: number
  // Accumulated lateral-weave phase, advanced by dt during forward drift.
  weavePhase: number
  shield: number
  maxShield: number
  shieldRegen: number
  shieldCooldownRemaining: number
  // HP regenerated per second. 0 by default; the Life Regeneration power upgrade
  // raises it. Heals up to maxHp while alive.
  hpRegen: number
  // Cached last non-zero movement direction (unit vector). Falls back to {1,0}
  // at game start. Used by Escape Mode to dash when the ship is stationary.
  lastHeading: Vec2
  // Set while Escape Mode is active. null when inactive. While set, the ship
  // is invincible and its movement is overridden by the escape-mode tick.
  escapeMode: EscapeModeState | null
  // Residual slingshot velocity. A flick sets it; it decays each tick and, while
  // non-trivial, overrides patrol so the ship coasts in the flung direction.
  flingVel: Vec2
  // Slingshot tuning, baked from upgrades (Power / Control / Cadence / Heat
  // Sink), plus the live cooldown + heat state that gate the next flick.
  slingMaxSpeed: number
  slingJitter: number
  slingCooldown: number
  slingCooldownRemaining: number
  slingCoolRate: number
  // Heat 0..1. Each flick adds (scaled by charge); decays over time. At 1 the
  // slingshot overheats — locked out (and the ship slows) until heat falls back
  // below the re-engage threshold.
  slingHeat: number
  slingOverheated: boolean
  // Cosmetic timer (seconds, counts down to 0) — render-only, never touches the
  // simulation. hitFlash washes the sprite white on damage.
  hitFlash: number
}

export const EnemyKind = {
  drone: 'drone',
  tank: 'tank',
  shooter: 'shooter',
  swarm: 'swarm',
  bomber: 'bomber',
  dasher: 'dasher',
  dreadnought: 'dreadnought',
  shieldGenerator: 'shieldGenerator',
  voidWorm: 'voidWorm',
  wormSegment: 'wormSegment',
  phaseShifter: 'phaseShifter',
} as const
export type EnemyKind = (typeof EnemyKind)[keyof typeof EnemyKind]

// Optional late-game enemy modifier. `speed` is a fast red-tinted trailing
// enemy, `shield` wraps it in a player-style regenerating shield, `giant` makes
// it slow, oversized, and high-HP. One per enemy.
export const EnemyModifier = {
  speed: 'speed',
  shield: 'shield',
  giant: 'giant',
} as const
export type EnemyModifier = (typeof EnemyModifier)[keyof typeof EnemyModifier]

export const MovementBehavior = {
  chase: 'chase',
  keepRange: 'keepRange',
  zigzag: 'zigzag',
  stationary: 'stationary',
  // Pursues the target until within `attackRange`, then holds position.
  approach: 'approach',
  // Telegraphed charger: approach → windup tell → locked straight-line lunge →
  // recover. Per-enemy cycle state lives on Enemy.dasher.
  dash: 'dash',
  // The boss tick owns position and velocity; the movement system leaves the
  // enemy untouched (unlike `stationary`, which zeroes vel each frame).
  none: 'none',
} as const
export type MovementBehavior = (typeof MovementBehavior)[keyof typeof MovementBehavior]

export const DeathBehavior = {
  none: 'none',
  explode: 'explode',
  boss: 'boss',
} as const
export type DeathBehavior = (typeof DeathBehavior)[keyof typeof DeathBehavior]

// Solar Plague fire status. Ticks DOT each frame and spreads to touching
// non-burning enemies; cleared when `remaining` reaches 0. Spread copies these
// values (resetting `remaining` to `duration`) so a chain keeps consistent
// damage, reach, and a full burn on each fresh catch.
export type BurningState = {
  remaining: number
  duration: number
  dps: number
  spreadRange: number
}

// Dasher attack cycle. The stage timer counts DOWN; `heading` is the lunge
// direction, locked at the windup→charge transition so the charge commits to a
// straight line the player dodges. Present only on dasher enemies.
export const DashStage = {
  approach: 'approach',
  windup: 'windup',
  charge: 'charge',
  recover: 'recover',
} as const
export type DashStage = (typeof DashStage)[keyof typeof DashStage]

export type DasherState = {
  stage: DashStage
  stageTimer: number
  heading: Vec2
}

export type Enemy = Entity & {
  kind: EnemyKind
  speed: number
  damage: number
  scoreValue: number
  powerReward: number
  fireRate: number
  fireCooldown: number
  attackRange: number
  movementBehavior: MovementBehavior
  deathBehavior: DeathBehavior
  // Seconds this enemy has been simulated; advances with the (speed-scaled) dt
  // so time-based movement like the swarm weave stays in sync with game speed.
  age: number
  // Present only on boss enemies — the boss's kind-tagged runtime state.
  boss?: BossRuntimeState
  // Solar Plague fire. Present while alight; absent otherwise.
  burning?: BurningState
  // Late-game modifier (absent on plain enemies). Set at spawn.
  modifier?: EnemyModifier
  // Present only on shield-modifier enemies — a player-style absorb-first pool
  // that regenerates after a cooldown. Damage routes through applyDamageToEnemy.
  enemyShield?: { shield: number; maxShield: number; regen: number; cooldownRemaining: number }
  // Dasher charge cycle (absent on other kinds). Drives the windup→lunge tell.
  dasher?: DasherState
  // Cosmetic timers (seconds) — render-only. hitFlash washes white on damage,
  // fireFlash blips the muzzle on a shot, spawnIn counts DOWN from the warp-in
  // grow (0 = fully materialised). Movement/collision ignore them.
  hitFlash: number
  // Gates how often hitFlash may re-trigger, so continuous damage (DOT, Event
  // Horizon) pulses the white wash instead of pinning it solid. Counts down to 0.
  hitFlashCooldown: number
  fireFlash: number
  spawnIn: number
}

export const ProjectileOwner = { ship: 'ship', enemy: 'enemy' } as const
export type ProjectileOwner = (typeof ProjectileOwner)[keyof typeof ProjectileOwner]

export type Projectile = Entity & {
  owner: ProjectileOwner
  damage: number
  lifetime: number
  prevPos?: Vec2
  // Visual-only: render as a laser beam (segment prevPos→pos) instead of a
  // sprite. Player lasers render as beams via `pierce`; enemy lasers set this.
  beam?: boolean
  // Optional behavior tags written by helper-weapon createProjectiles. A plain
  // bullet leaves them undefined and takes the default collision path.
  pierce?: { maxHits: number; hitEnemyIds: string[] }
  homing?: boolean
  bounce?: {
    // Redirects left after the initial hit. The first enemy struck is free
    // (checked before this decrements), so a round hits remaining + 1 enemies.
    remaining: number
    hitEnemyIds: string[]
    bounceRange: number
    // When set, every successful bounce raises the projectile's lifetime to at
    // least this many seconds — so a ricochet that keeps chaining doesn't time
    // out before exhausting its bounces.
    lifetimePerBounce?: number
  }
  // Generic "AoE-on-hit + optional lingering zone" tag. Bullets/laser/ricochet
  // leave it undefined and take the per-projectile damage path. Missile sets
  // aoeRadius+blastDamage for splash. Nuke also sets waste* to leave a DOT zone.
  detonate?: {
    aoeRadius: number
    blastDamage: number
    wasteRadius?: number
    wasteDps?: number
    wasteDuration?: number
    wasteGrowDuration?: number
  }
}

export const AbilityKind = {
  meteorite: 'meteorite',
  meteor: 'meteor',
  blackHole: 'blackHole',
  rocket: 'rocket',
  shield: 'shield',
  sun: 'sun',
  helper: 'helper',
  telekinesis: 'telekinesis',
  solarFlare: 'solarFlare',
  // Ultimates — upgraded variants of a base ability, purchased with the
  // Singularity Shard economy. Each links to its base via `ultimateOf`.
  cometShower: 'cometShower',
  meteorShower: 'meteorShower',
  helperFactory: 'helperFactory',
  supernova: 'supernova',
  forceField: 'forceField',
  fireworks: 'fireworks',
  eventHorizon: 'eventHorizon',
  solarPlague: 'solarPlague',
  singularity: 'singularity',
} as const
export type AbilityKind = (typeof AbilityKind)[keyof typeof AbilityKind]

export type Ability = {
  kind: AbilityKind
  cooldown: number
  cooldownRemaining: number
  powerCost: number
  damage: number
  aoeRadius: number
  unlocked: boolean
  // Index assigned the first time the ability becomes unlocked. Drives the
  // HUD ordering and hotkey numbers — once 2 = blackHole, it stays 2 even
  // if more abilities unlock later. null = still locked.
  unlockedAt: number | null
  duration?: number
  // Helper-only: max HP for the summoned ally. The Helper upgrade lets the
  // player bump this — allies no longer expire on a timer; they take HP decay
  // over time and die when hp ≤ 0, so maxHp directly controls survivability.
  maxHp?: number
  // Telekinesis: peak force per second applied to enemies inside the plateau.
  // Force Field: the outward knockback speed of a bump. Upgradable for both.
  force?: number
  // Multi-projectile abilities (Comet Shower): how many strikes a single
  // activation spawns. Upgradable. Absent for single-strike abilities.
  count?: number
  // Comet Shower: seconds between successive comets landing. Upgradable
  // (smaller = faster volley). Absent for abilities without a staggered volley.
  staggerStep?: number
  // Supernova-only: burst radius = base sun radius × this. Upgradable so the
  // explosion grows. Absent for abilities without a burst phase.
  burstScale?: number
  // Helper Factory-only: seconds between helper spawns. Upgradable (smaller =
  // faster line). Absent for abilities that don't spawn on a timer.
  spawnInterval?: number
  // Solar Plague-only: edge-gap a non-burning enemy must be within to catch fire
  // from a burning one. Upgradable (Wildfire). Absent elsewhere.
  spreadRange?: number
  // Singularity-only: flat AoE damage of the burst dealt when the hold is
  // released. Upgradable (Collapse). Absent on abilities without a release burst.
  explosionDamage?: number
}

export const EffectKind = {
  meteoriteStrike: 'meteoriteStrike',
  meteorStrike: 'meteorStrike',
  blackHole: 'blackHole',
  rocket: 'rocket',
  shield: 'shield',
  sun: 'sun',
  nuclearWaste: 'nuclearWaste',
  supernova: 'supernova',
  forceField: 'forceField',
  eventHorizon: 'eventHorizon',
  repulseField: 'repulseField',
  cometStorm: 'cometStorm',
  shockwave: 'shockwave',
} as const
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind]

export type EffectBase = {
  id: string
  kind: EffectKind
  pos: Vec2
  elapsed: number
  duration: number
}

export type MeteorStrikeEffect = EffectBase & {
  kind: typeof EffectKind.meteoriteStrike | typeof EffectKind.meteorStrike
  delay: number
  damage: number
  aoeRadius: number
}

export type BlackHoleEffect = EffectBase & {
  kind: typeof EffectKind.blackHole
  radius: number
  pullStrength: number
  damage: number
}

export type RocketEffect = EffectBase & {
  kind: typeof EffectKind.rocket
  vel: Vec2
  targetPos: Vec2
  damage: number
  aoeRadius: number
  trailTimer: number
  // Fireworks ultimate only: on detonation, spawn `splits[0]` child rockets
  // (each carrying `splits.slice(1)`) at evenly-spaced angles, dividing damage by
  // `damageFalloff` per generation. Absent on a plain rocket — it just explodes.
  fireworks?: { splits: number[]; damageFalloff: number }
}

export type ShieldEffect = EffectBase & {
  kind: typeof EffectKind.shield
  radius: number
  // IDs of enemies that were already inside the radius when the shield spawned.
  // They get a free pass — the shield only blocks NEW entries. `null` means the
  // list hasn't been initialized yet (populated on the first tick).
  grandfatheredEnemyIds: string[] | null
}

export type SunEffect = EffectBase & {
  kind: typeof EffectKind.sun
  radius: number
  damagePerSec: number
}

// Lingering radioactive zone left by a nuke detonation. Same DOT shape as
// SunEffect but with a grow-then-shrink size schedule: scales from 0 to
// `peakRadius` over `growDuration`, then linearly back down to 0 over the
// remainder of `duration`.
export type NuclearWasteEffect = EffectBase & {
  kind: typeof EffectKind.nuclearWaste
  peakRadius: number
  growDuration: number
  damagePerSec: number
}

// The Sun ultimate. Holds at full `baseRadius` (base damage) for most of its
// life, then over the final `collapseDuration` shrinks and shifts blue, then
// over `burstDuration` rapidly expands to `burstRadius` for `burstDamagePerSec`
// (6× base). The current radius/damage are derived from `elapsed` by
// getSupernovaState().
export type SupernovaEffect = EffectBase & {
  kind: typeof EffectKind.supernova
  baseRadius: number
  baseDamagePerSec: number
  collapseDuration: number
  burstDuration: number
  burstRadius: number
  burstDamagePerSec: number
}

// The Shield ultimate. A dome that grows from `startRadius` to `maxRadius` (2×)
// over its lifetime then disappears. Bumps shove enemies out at `knockback`
// (far harder than a base shield bounce) and burn them for `bumpDamage`/sec.
// `radius` is the live size, recomputed each tick so the collision pass reads it.
export type ForceFieldEffect = EffectBase & {
  kind: typeof EffectKind.forceField
  radius: number
  startRadius: number
  maxRadius: number
  growDuration: number
  knockback: number
  bumpDamage: number
  grandfatheredEnemyIds: string[] | null
}

// The Black Hole ultimate. A wider, stronger gravity well that pulls enemies in
// like a black hole, but an enemy reaching the core takes `coreDamage` and is
// banished — relocated `banishDistance` further from the ship. `radius`/
// `pullStrength`/`damage` mirror BlackHoleEffect; the core fields drive the zap.
export type EventHorizonEffect = EffectBase & {
  kind: typeof EffectKind.eventHorizon
  radius: number
  pullStrength: number
  damage: number
  coreRadius: number
  coreDamage: number
  banishDistance: number
}

// Repulse (space-metal ability). A dome centred on the ship that follows it,
// grows from `startRadius` to `maxRadius` over `growDuration`, and absorbs enemy
// fire crossing it. Enemies it catches are hurled outward at `knockback` via the
// same constraint path as the Force Field (applyShieldConstraints) — a real
// launch, not a per-frame nudge. `bumpDamage` is 0 (pure defensive) and
// `grandfatheredEnemyIds` stays null so it launches every enemy, not just newcomers.
export type RepulseFieldEffect = EffectBase & {
  kind: typeof EffectKind.repulseField
  radius: number
  startRadius: number
  maxRadius: number
  growDuration: number
  knockback: number
  bumpDamage: number
  grandfatheredEnemyIds: string[] | null
}

// Comet Storm (space-metal ability). A ship-centred emitter: every
// `spawnInterval` it drops `cometsPerWave` meteorite strikes at random points
// within `spreadRadius` of the ship (so the rain follows the player), each for
// `cometDamage` over `cometAoeRadius`. The strikes are ordinary MeteorStrikeEffects.
export type CometStormEffect = EffectBase & {
  kind: typeof EffectKind.cometStorm
  spawnTimer: number
  spawnInterval: number
  spreadRadius: number
  cometsPerWave: number
  cometDamage: number
  cometAoeRadius: number
}

// Shockwave calamity. After a `delay` telegraph, an expanding front grows from
// `startRadius` to `maxRadius` over `growDuration`, dealing one-time damage to
// everyone it sweeps (strongest at the centre). The damage is applied in the
// main loop's calamity pass (it needs ship + allies, which the effect tick does
// not carry); the effect itself only ages and renders.
export type ShockwaveEffect = EffectBase & {
  kind: typeof EffectKind.shockwave
  delay: number
  startRadius: number
  maxRadius: number
  growDuration: number
  baseDamage: number
}

export type ActiveEffect =
  | MeteorStrikeEffect
  | BlackHoleEffect
  | RocketEffect
  | ShieldEffect
  | SunEffect
  | NuclearWasteEffect
  | SupernovaEffect
  | ForceFieldEffect
  | EventHorizonEffect
  | RepulseFieldEffect
  | CometStormEffect
  | ShockwaveEffect

export const CollectibleKind = {
  powerOrb: 'powerOrb',
  spaceMetal: 'spaceMetal',
  singularityShard: 'singularityShard',
} as const
export type CollectibleKind = (typeof CollectibleKind)[keyof typeof CollectibleKind]

export type Collectible = {
  id: string
  kind: CollectibleKind
  pos: Vec2
  vel: Vec2
  value: number
  elapsed: number
  lifetime: number
  // true → flying toward the ship via the homing helper. Power orbs become
  // homing automatically after their float phase; space metal only becomes
  // homing once the player clicks it.
  homing: boolean
}

// A mine scattered across the world. Single-use: the first entity to touch it detonates it,
// dealing blast damage to everyone (ship, enemies, allies) nearby. NOT an enemy — it never
// blocks wave completion.
export const HazardKind = { mine: 'mine' } as const
export type HazardKind = (typeof HazardKind)[keyof typeof HazardKind]

export type Hazard = {
  id: string
  kind: HazardKind
  pos: Vec2
  // Trigger radius — an entity this close sets the mine off.
  radius: number
  damage: number
}

export type Ally = {
  id: string
  pos: Vec2
  vel: Vec2
  radius: number
  hp: number
  maxHp: number
  fireRate: number
  fireCooldown: number
  damage: number
  // The helper weapon this ally fires, rolled at spawn from the player's unlocked
  // ally weapons (bullet by default). Reuses the helper-weapon definitions.
  weapon: HelperWeaponKind
  speed: number
  attackRange: number
  // Time alive — drives orbit-phase drift so allies fan around the ship.
  elapsed: number
  // Helper Factory only: seconds between helper spawns. Present → this ally is a
  // factory (deals no damage, never shoots; spawns helpers instead). Absent on a
  // normal helper.
  spawnInterval?: number
  // Factory countdown to the next spawn; reset to `spawnInterval` on each spawn.
  spawnTimer?: number
}

export type Particle = {
  id: string
  pos: Vec2
  vel: Vec2
  lifetime: number
  elapsed: number
  color: string
  size: number
}

// Cosmetic disintegration left behind by a dead enemy — the sprite spins/fades
// out under a shatter overlay. Never collides or scores; ticked alongside
// particles and culled once `elapsed >= duration`. Stores the enemy `kind` (not
// a sprite key) so the engine stays free of renderer concepts.
export type DeathAnim = {
  id: string
  kind: EnemyKind
  pos: Vec2
  vel: Vec2
  angle: number
  sizeScale: number
  elapsed: number
  duration: number
  isBoss: boolean
}

export const GamePhase = {
  menu: 'menu',
  shipSelection: 'shipSelection',
  playing: 'playing',
  paused: 'paused',
  waveComplete: 'waveComplete',
  upgradeScreen: 'upgradeScreen',
  // Timed, non-interactive portal jump between sectors — sim frozen, animation runs.
  warping: 'warping',
  // Player HP hit 0 — the ship-explosion sequence plays out before gameOver.
  dying: 'dying',
  gameOver: 'gameOver',
} as const
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

export const UpgradeCategory = {
  weapons: 'weapons',
  ship: 'ship',
  powers: 'powers',
  // Ally-weapon (loadout) upgrades. Allies wield these; no shop tab renders this
  // category (CATEGORY_ORDER is weapons/ship/powers) — the unlocks surface on the
  // Helper ability's upgrade page instead.
  loadout: 'loadout',
} as const
export type UpgradeCategory = (typeof UpgradeCategory)[keyof typeof UpgradeCategory]

export type UpgradeTier = {
  cost: number
  value: number
}

export type UpgradeDefinition = {
  id: UpgradeId
  category: UpgradeCategory
  /** For weapon/loadout upgrades, which weapon this belongs to */
  weapon?: AbilityKind | HelperWeaponKind
  label: string
  description: string
  tiers: UpgradeTier[]
}

export type PlayerUpgrades = Record<UpgradeId, { currentTier: number }>

// Per-run boss draw. Inlined (like HoldRuntimeState) so types.ts doesn't import
// from engine/bosses/. pool = boss kinds not yet seen this run; nextBoss = the
// pre-rolled upcoming boss (visible/settable in the dev console).
export type BossSelection = { nextBoss: EnemyKind; pool: EnemyKind[] }

// Wave-spawning bookkeeping — the spawner's working set. Grouped so the spawner
// system takes/returns one cohesive slice instead of six loose fields, and so
// `state` reads as ~8 concerns instead of a flat wall. Reset per wave.
export type SpawnState = {
  // Inter-wave delay countdown; while > 0 the next wave's enemies haven't begun.
  waveTimer: number
  // Enemy kinds still waiting to spawn for the current wave.
  queue: EnemyKind[]
  // Seconds until the next enemy in the queue spawns.
  timer: number
  // Total enemies the current wave will spawn (drives the HUD progress bar).
  total: number
  // How many of `total` have spawned so far.
  spawned: number
  // Seconds since the wave's enemies began spawning. Drives soft stall-escalation
  // (enemies speed up the longer a wave drags).
  elapsed: number
}

export type GameState = {
  // --- Run / phase ---
  phase: GamePhase
  shipKind: ShipKind

  // --- Entities ---
  ship: Ship
  enemies: Enemy[]
  projectiles: Projectile[]
  allies: Ally[]
  activeEffects: ActiveEffect[]
  collectibles: Collectible[]
  particles: Particle[]
  // Cosmetic enemy-death disintegrations (see DeathAnim).
  deathAnims: DeathAnim[]
  // Scattered mine clusters. Not part of the kill/wave economy.
  hazards: Hazard[]

  // --- Progress / score ---
  wave: number
  level: number
  score: number
  highScore: number
  isNewHighScore: boolean
  // Cumulative enemies destroyed this run — shown on the game-over screen and
  // sent with the leaderboard score so the server can sanity-check it.
  kills: number
  // Seconds left in the player-death explosion (GamePhase.dying). 0 elsewhere;
  // counts down, then the phase flips to gameOver.
  deathTimer: number

  // --- Economy ---
  currency: number
  spaceMetal: number
  // Run-scoped boss material — the gating currency for Ultimate purchases.
  // Earned 1 per boss kill, spent (with stardust + space metal) on ultimates.
  singularityShard: number

  // --- Power ---
  power: number
  maxPower: number
  powerRegen: number

  // --- Loadout / upgrades ---
  abilities: Ability[]
  upgrades: PlayerUpgrades
  // Per-ability runtime state for hold abilities. Keyed by AbilityKind. Each
  // entry tracks {active, timer, target}. Inactive abilities are simply absent.
  holdStates: Partial<Record<AbilityKind, HoldRuntimeState>>
  // Up to 2 randomly-picked locked weapons offered on the current upgrade
  // screen. Buying any one clears the array — the player gets one unlock per
  // level-up at most. Empty between upgrade screens.
  levelUpWeaponOffers: AbilityKind[]
  // True once a Salvage has re-rolled the offers this shop visit. The re-roll
  // fires only on the FIRST slot-freeing salvage, so a shop shows at most two
  // offer sets — stops salvage→swap→salvage fishing. Reset on shop entry.
  salvageOfferUsed: boolean
  // Helper-weapon kinds the player has unlocked this run. Starts with bullet;
  // every successful helper-weapon unlock pushes its kind here. Resets per run.
  unlockedWeapons: HelperWeaponKind[]
  // Ultimate ability kinds purchased this run. Drives the escalating shard cost
  // (N = ultimatesOwned.length + 1) and replaces the base in the hotbar/shop.
  // Resets per run.
  ultimatesOwned: AbilityKind[]

  // --- World / sector ---
  // Active world bounds — the torus size, set on each sector reset.
  worldSize: Vec2
  // Sector "forward" unit axis (fixed to FORWARD_DIR this version).
  forwardDir: Vec2
  // Portal the ship flies into during the end-of-sector warp (spawned just ahead
  // of the ship when the sector clears).
  portalPos: Vec2
  // Safety cap (seconds) on the warp flight; 0 outside the `warping` phase.
  warpTimer: number
  // Seconds left in the warp screen flash. 0 during the fly-into-portal flight;
  // set once the ship reaches the portal, then the jump completes when it hits 0.
  warpFlashTimer: number
  // Seconds until the next ambient calamity (a Shockwave) erupts. Counts down
  // only on non-boss waves; rerolled after each eruption.
  calamityTimer: number

  // --- Wave spawning ---
  spawn: SpawnState

  // --- Misc run state ---
  // Accumulator that drives Escape Mode's flame-trail particle emission. Resets
  // to 0 when escape ends.
  escapeTrailAccumulator: number
  // Which boss the next boss wave spawns + the unseen pool. Reset per run.
  bossSelection: BossSelection
}

// Inlined re-export of the hold-runtime state shape so types.ts doesn't have
// to import from engine/abilities/. Kept in sync manually — both shapes are
// trivial.
export type HoldRuntimeState = {
  active: boolean
  // Tick-based holds count this DOWN to the next drain tick; continuous holds
  // accumulate active hold-seconds in it (read by onRelease to charge a burst).
  timer: number
  target: Vec2 | null
}

export type PlayerInput = {
  clicks: Vec2[]
  selectedAbility: AbilityKind | null
  holdPos?: Vec2 | null
  isHolding?: boolean
  // One-shot slingshot flick: unit drag direction + 0..1 charge (drag distance).
  // Set the frame the player releases a ship-grab drag; cleared after one tick.
  fling?: { dir: Vec2; charge: number } | null
  // OS "reduce motion" preference, sampled per frame. Gates cosmetic-only
  // particle emitters in the engine; the renderer reads its own copy too.
  reducedMotion?: boolean
}
