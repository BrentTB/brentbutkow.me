export const GAME_NAME = 'Null Space'

export const WORLD_SIZE = { x: 3000, y: 3000 }

export const SHIP_DEFAULTS = {
  hp: 100,
  maxHp: 100,
  damage: 5,
  fireRate: 2,
  speed: 120,
  radius: 16,
  attackRange: 280,
}

export const POWER_DEFAULTS = {
  max: 100,
  regenRate: 5,
  startingPower: 80,
}

export const METEORITE_STRIKE = {
  delay: 0.3,
  cooldown: 0.5,
  powerCost: 5,
  damage: 15,
  aoeRadius: 40,
} as const

export const METEOR_STRIKE = {
  delay: 0.5,
  cooldown: 1.5,
  powerCost: 40,
  damage: 60,
  aoeRadius: 100,
} as const

export const ENEMY_STATS = {
  drone: {
    hp: 20,
    speed: 100,
    damage: 8,
    radius: 10,
    scoreValue: 10,
    powerReward: 5,
  },
  tank: {
    hp: 80,
    speed: 40,
    damage: 15,
    radius: 18,
    scoreValue: 30,
    powerReward: 15,
  },
} as const

export const CURRENCY_DROPS = {
  drone: { min: 0, max: 2 },
  tank: { min: 1, max: 5 },
} as const

export const CURRENCY_NAME = 'Stardust'

export const WAVES_PER_LEVEL = 3

export const PROJECTILE_SPEED = 400
export const PROJECTILE_LIFETIME = 3
export const PROJECTILE_RADIUS = 4

export const PARTICLE_DEFAULTS = {
  maxParticles: 200,
  explosionCount: 12,
  trailInterval: 0.05,
}
