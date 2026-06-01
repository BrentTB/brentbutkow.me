export type Vec2 = { x: number; y: number }

export type Entity = {
  id: string
  pos: Vec2
  vel: Vec2
  radius: number
  hp: number
  maxHp: number
}

export type Ship = Entity & {
  fireRate: number
  fireCooldown: number
  damage: number
  speed: number
  attackRange: number
  patrolAngle: number
}

export const EnemyKind = { drone: 'drone', tank: 'tank', shooter: 'shooter' } as const
export type EnemyKind = (typeof EnemyKind)[keyof typeof EnemyKind]

export type Enemy = Entity & {
  kind: EnemyKind
  speed: number
  damage: number
  scoreValue: number
  powerReward: number
  fireRate: number
  fireCooldown: number
  attackRange: number
}

export const ProjectileOwner = { ship: 'ship', enemy: 'enemy' } as const
export type ProjectileOwner = (typeof ProjectileOwner)[keyof typeof ProjectileOwner]

export type Projectile = Entity & {
  owner: ProjectileOwner
  damage: number
  lifetime: number
}

export const AbilityKind = {
  meteorite: 'meteorite',
  meteor: 'meteor',
  blackHole: 'blackHole',
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
  // Black hole lifetime in seconds; unused by instantaneous strikes
  duration?: number
}

export type MeteorStrike = {
  id: string
  kind: AbilityKind
  targetPos: Vec2
  delay: number
  elapsed: number
  damage: number
  aoeRadius: number
}

export type BlackHole = {
  id: string
  pos: Vec2
  radius: number
  pullStrength: number
  damage: number
  duration: number
  elapsed: number
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
  playing: 'playing',
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
  shipMaxHp: 'shipMaxHp',
  shipDamage: 'shipDamage',
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
  ship: Ship
  enemies: Enemy[]
  projectiles: Projectile[]
  abilities: Ability[]
  meteorStrikes: MeteorStrike[]
  blackHoles: BlackHole[]
  particles: Particle[]
  wave: number
  level: number
  score: number
  highScore: number
  isNewHighScore: boolean
  currency: number
  power: number
  maxPower: number
  powerRegen: number
  upgrades: PlayerUpgrades
  worldSize: Vec2
  waveTimer: number
  enemiesRemainingInWave: number
}

export type PlayerInput = {
  clicks: Vec2[]
  selectedAbility: AbilityKind | null
}
