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
  carrier: 'carrier',
} as const
export type ShipKind = (typeof ShipKind)[keyof typeof ShipKind]

export type Ship = Entity & {
  kind: ShipKind
  fireRate: number
  fireCooldown: number
  damage: number
  speed: number
  attackRange: number
  patrolAngle: number
  shield: number
  maxShield: number
  shieldRegen: number
  shieldCooldownRemaining: number
  weaponSlots: number
}

export const EnemyKind = {
  drone: 'drone',
  tank: 'tank',
  shooter: 'shooter',
  swarm: 'swarm',
  bomber: 'bomber',
} as const
export type EnemyKind = (typeof EnemyKind)[keyof typeof EnemyKind]

export const MovementBehavior = {
  chase: 'chase',
  keepRange: 'keepRange',
  zigzag: 'zigzag',
} as const
export type MovementBehavior = (typeof MovementBehavior)[keyof typeof MovementBehavior]

export const DeathBehavior = {
  none: 'none',
  explode: 'explode',
} as const
export type DeathBehavior = (typeof DeathBehavior)[keyof typeof DeathBehavior]

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
}

export const ProjectileOwner = { ship: 'ship', enemy: 'enemy' } as const
export type ProjectileOwner = (typeof ProjectileOwner)[keyof typeof ProjectileOwner]

export type Projectile = Entity & {
  owner: ProjectileOwner
  damage: number
  lifetime: number
  prevPos?: Vec2
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
  duration?: number
}

export const EffectKind = {
  meteoriteStrike: 'meteoriteStrike',
  meteorStrike: 'meteorStrike',
  blackHole: 'blackHole',
  rocket: 'rocket',
  shield: 'shield',
  sun: 'sun',
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

export type ActiveEffect =
  | MeteorStrikeEffect
  | BlackHoleEffect
  | RocketEffect
  | ShieldEffect
  | SunEffect

export const CollectibleKind = {
  powerOrb: 'powerOrb',
  spaceMetal: 'spaceMetal',
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
  speed: number
  attackRange: number
  elapsed: number
  duration: number
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

export const GamePhase = {
  menu: 'menu',
  shipSelection: 'shipSelection',
  playing: 'playing',
  paused: 'paused',
  waveComplete: 'waveComplete',
  upgradeScreen: 'upgradeScreen',
  gameOver: 'gameOver',
} as const
export type GamePhase = (typeof GamePhase)[keyof typeof GamePhase]

export const UpgradeCategory = {
  weapons: 'weapons',
  ship: 'ship',
  powers: 'powers',
} as const
export type UpgradeCategory = (typeof UpgradeCategory)[keyof typeof UpgradeCategory]

export const UpgradeId = {
  unlockMeteor: 'unlockMeteor',
  meteoriteDamage: 'meteoriteDamage',
  meteoriteCostReduction: 'meteoriteCostReduction',
  meteorDamage: 'meteorDamage',
  meteorCostReduction: 'meteorCostReduction',
  unlockBlackHole: 'unlockBlackHole',
  blackHoleDamage: 'blackHoleDamage',
  blackHoleDuration: 'blackHoleDuration',
  unlockRocket: 'unlockRocket',
  rocketDamage: 'rocketDamage',
  rocketRadius: 'rocketRadius',
  unlockShield: 'unlockShield',
  shieldDuration: 'shieldDuration',
  shieldRadius: 'shieldRadius',
  unlockSun: 'unlockSun',
  sunDamage: 'sunDamage',
  sunDuration: 'sunDuration',
  unlockHelper: 'unlockHelper',
  helperDuration: 'helperDuration',
  helperDamage: 'helperDamage',
  unlockTelekinesis: 'unlockTelekinesis',
  telekinesisRadius: 'telekinesisRadius',
  telekinesisStrength: 'telekinesisStrength',
  unlockSolarFlare: 'unlockSolarFlare',
  solarFlareDamage: 'solarFlareDamage',
  solarFlareEfficiency: 'solarFlareEfficiency',
  shipMaxHp: 'shipMaxHp',
  shipDamage: 'shipDamage',
  shipFireRate: 'shipFireRate',
  shipShieldStrength: 'shipShieldStrength',
  shipSpeed: 'shipSpeed',
  powerRegen: 'powerRegen',
} as const
export type UpgradeId = (typeof UpgradeId)[keyof typeof UpgradeId]

export type UpgradeTier = {
  cost: number
  value: number
}

export type UpgradeDefinition = {
  id: UpgradeId
  category: UpgradeCategory
  /** For weapon upgrades, which weapon this belongs to */
  weapon?: AbilityKind
  label: string
  description: string
  tiers: UpgradeTier[]
}

export type PlayerUpgrades = Record<UpgradeId, { currentTier: number }>

export type GameState = {
  phase: GamePhase
  shipKind: ShipKind
  ship: Ship
  enemies: Enemy[]
  projectiles: Projectile[]
  allies: Ally[]
  abilities: Ability[]
  activeEffects: ActiveEffect[]
  collectibles: Collectible[]
  particles: Particle[]
  wave: number
  level: number
  score: number
  highScore: number
  isNewHighScore: boolean
  currency: number
  spaceMetal: number
  power: number
  maxPower: number
  powerRegen: number
  upgrades: PlayerUpgrades
  worldSize: Vec2
  waveTimer: number
  spawnQueue: EnemyKind[]
  spawnTimer: number
  totalWaveEnemies: number
  spawnedInWave: number
  // Per-ability runtime state for hold abilities. Keyed by AbilityKind. Each
  // entry tracks {active, timer, target}. Inactive abilities are simply absent.
  holdStates: Partial<Record<AbilityKind, HoldRuntimeState>>
}

// Inlined re-export of the hold-runtime state shape so types.ts doesn't have
// to import from engine/abilities/. Kept in sync manually — both shapes are
// trivial.
export type HoldRuntimeState = {
  active: boolean
  timer: number
  target: Vec2 | null
}

export type PlayerInput = {
  clicks: Vec2[]
  selectedAbility: AbilityKind | null
  holdPos?: Vec2 | null
  prevHoldPos?: Vec2 | null
  isHolding?: boolean
}
