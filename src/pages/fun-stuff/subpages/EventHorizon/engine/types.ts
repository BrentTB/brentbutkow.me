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

export type EnemyKind = 'drone' | 'tank'

export type Enemy = Entity & {
  kind: EnemyKind
  speed: number
  damage: number
  scoreValue: number
  powerReward: number
}

export type ProjectileOwner = 'ship' | 'player'

export type Projectile = Entity & {
  owner: ProjectileOwner
  damage: number
  lifetime: number
}

export type AbilityKind = 'meteorStrike'

export type Ability = {
  kind: AbilityKind
  cooldown: number
  cooldownRemaining: number
  powerCost: number
}

export type MeteorStrike = {
  id: string
  targetPos: Vec2
  delay: number
  elapsed: number
  damage: number
  aoeRadius: number
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

export type GamePhase = 'menu' | 'playing' | 'waveComplete' | 'gameOver'

export type GameState = {
  phase: GamePhase
  ship: Ship
  enemies: Enemy[]
  projectiles: Projectile[]
  abilities: Ability[]
  meteorStrikes: MeteorStrike[]
  particles: Particle[]
  wave: number
  score: number
  highScore: number
  power: number
  maxPower: number
  powerRegen: number
  worldSize: Vec2
  waveTimer: number
  enemiesRemainingInWave: number
}

export type PlayerInput = {
  clicks: Vec2[]
  selectedAbility: AbilityKind | null
}
