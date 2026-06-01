import { WORLD_SIZE, PARTICLE_DEFAULTS, POWER_DEFAULTS } from '../data'
import { checkCollision, distance } from './collision'
import {
  createShip,
  createAbilities,
  createProjectile,
  createEnemy,
  spawnExplosionParticles,
  resetUid,
} from './entities'
import { updateAbilityCooldowns, updateMeteorStrikes, resolveAbilityInput } from './abilities'
import { getWave, getWaveDelay } from './waves'
import { loadHighScore, saveHighScore } from './persistence'
import type { GameState, PlayerInput, Enemy, Projectile, Particle } from './types'

export function createInitialState(): GameState {
  resetUid()
  return {
    phase: 'menu',
    ship: createShip(WORLD_SIZE),
    enemies: [],
    projectiles: [],
    abilities: createAbilities(),
    meteorStrikes: [],
    particles: [],
    wave: 0,
    score: 0,
    highScore: loadHighScore(),
    power: POWER_DEFAULTS.startingPower,
    maxPower: POWER_DEFAULTS.max,
    powerRegen: POWER_DEFAULTS.regenRate,
    worldSize: WORLD_SIZE,
    waveTimer: 0,
    enemiesRemainingInWave: 0,
  }
}

export function startGame(state: GameState): GameState {
  resetUid()
  const ship = createShip(state.worldSize)
  return {
    ...state,
    phase: 'playing',
    ship,
    enemies: [],
    projectiles: [],
    abilities: createAbilities(),
    meteorStrikes: [],
    particles: [],
    wave: 0,
    score: 0,
    power: POWER_DEFAULTS.startingPower,
    maxPower: POWER_DEFAULTS.max,
    powerRegen: POWER_DEFAULTS.regenRate,
    waveTimer: 0,
    enemiesRemainingInWave: 0,
    highScore: loadHighScore(),
  }
}

export function startNextWave(state: GameState): GameState {
  const nextWave = state.wave + 1
  const spawns = getWave(nextWave, state.worldSize)
  const enemies = spawns.map((s) => createEnemy(s.kind, s.pos))
  const delay = getWaveDelay(nextWave)

  return {
    ...state,
    phase: 'playing',
    wave: nextWave,
    enemies: [...state.enemies, ...enemies],
    waveTimer: delay,
    enemiesRemainingInWave: enemies.length,
  }
}

export function updateGameState(state: GameState, dt: number, input: PlayerInput): GameState {
  if (state.phase !== 'playing') return state

  dt = Math.min(dt, 0.1)

  let { ship, enemies, projectiles, abilities, meteorStrikes, particles, score, power } = state
  let { waveTimer } = state
  const { enemiesRemainingInWave, maxPower, powerRegen } = state

  if (waveTimer > 0) {
    waveTimer -= dt
    if (waveTimer > 0) {
      particles = updateParticles(particles, dt)
      abilities = updateAbilityCooldowns(abilities, dt)
      ship = updateShipPatrol(ship, dt, state.worldSize)
      return { ...state, ship, particles, abilities, power, waveTimer }
    }
  }

  // --- Player abilities ---
  const abilityResult = resolveAbilityInput(
    { ...state, power },
    input.clicks,
    input.selectedAbility
  )
  abilities = abilityResult.abilities
  meteorStrikes = [...meteorStrikes, ...abilityResult.newStrikes]
  power -= abilityResult.powerSpent

  // --- Meteor strikes ---
  const meteorResult = updateMeteorStrikes(meteorStrikes, enemies, dt)
  meteorStrikes = meteorResult.strikes
  enemies = meteorResult.enemies
  particles = [...particles, ...meteorResult.particles]
  score += meteorResult.scoreGained
  power += meteorResult.powerGained

  // --- Ship movement ---
  ship = updateShipPatrol(ship, dt, state.worldSize)

  // --- Ship auto-attack ---
  const attackResult = updateShipAttack(ship, enemies, projectiles, dt)
  ship = attackResult.ship
  projectiles = attackResult.projectiles

  // --- Enemy movement ---
  enemies = updateEnemyMovement(enemies, ship, dt)

  // --- Projectile movement ---
  projectiles = updateProjectiles(projectiles, dt)

  // --- Collision: projectiles vs enemies ---
  const projCollision = resolveProjectileEnemyCollisions(projectiles, enemies)
  projectiles = projCollision.projectiles
  enemies = projCollision.enemies
  score += projCollision.scoreGained
  power += projCollision.powerGained
  particles = [...particles, ...projCollision.particles]

  // --- Collision: enemies vs ship ---
  const shipCollision = resolveEnemyShipCollisions(enemies, ship)
  enemies = shipCollision.enemies
  ship = shipCollision.ship
  particles = [...particles, ...shipCollision.particles]

  // --- Ability cooldowns ---
  abilities = updateAbilityCooldowns(abilities, dt)

  // --- Power regen ---
  power = Math.min(maxPower, power + powerRegen * dt)

  // --- Particles ---
  particles = updateParticles(particles, dt)
  if (particles.length > PARTICLE_DEFAULTS.maxParticles) {
    particles = particles.slice(particles.length - PARTICLE_DEFAULTS.maxParticles)
  }

  // --- Check game over (before wave complete — dying on the last enemy is still a loss) ---
  if (ship.hp <= 0) {
    saveHighScore(score)
    return {
      ...state,
      phase: 'gameOver',
      ship,
      enemies,
      projectiles,
      abilities,
      meteorStrikes,
      particles,
      score,
      power,
      highScore: Math.max(state.highScore, score),
      waveTimer: 0,
      enemiesRemainingInWave,
    }
  }

  // --- Check wave complete ---
  if (enemies.length === 0 && enemiesRemainingInWave > 0) {
    return {
      ...state,
      phase: 'waveComplete',
      ship,
      enemies,
      projectiles,
      abilities,
      meteorStrikes,
      particles,
      score,
      power,
      waveTimer: 0,
      enemiesRemainingInWave: 0,
    }
  }

  return {
    ...state,
    ship,
    enemies,
    projectiles,
    abilities,
    meteorStrikes,
    particles,
    score,
    power,
    waveTimer,
    enemiesRemainingInWave,
  }
}

function updateShipPatrol(ship: Ship, dt: number, worldSize: { x: number; y: number }): Ship {
  const angle = ship.patrolAngle + dt * 0.4
  const cx = worldSize.x / 2
  const cy = worldSize.y / 2
  const orbitX = 200
  const orbitY = 120

  const targetX = cx + Math.sin(angle) * orbitX
  const targetY = cy + Math.sin(angle * 2) * orbitY

  const dx = targetX - ship.pos.x
  const dy = targetY - ship.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const speed = Math.min(ship.speed, dist / dt)

  const velX = dist > 0.1 ? (dx / dist) * speed : 0
  const velY = dist > 0.1 ? (dy / dist) * speed : 0

  return {
    ...ship,
    pos: {
      x: ship.pos.x + velX * dt,
      y: ship.pos.y + velY * dt,
    },
    vel: { x: velX, y: velY },
    patrolAngle: angle,
  }
}

type Ship = GameState['ship']

function updateShipAttack(
  ship: Ship,
  enemies: Enemy[],
  projectiles: Projectile[],
  dt: number
): { ship: Ship; projectiles: Projectile[] } {
  let cooldown = ship.fireCooldown - dt

  if (cooldown <= 0 && enemies.length > 0) {
    let nearest: Enemy | null = null
    let nearestDist = Infinity

    for (const enemy of enemies) {
      const dist = distance(ship.pos, enemy.pos)
      if (dist < ship.attackRange && dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    }

    if (nearest) {
      const proj = createProjectile(ship.pos, nearest.pos, 'ship', ship.damage)
      projectiles = [...projectiles, proj]
      cooldown = 1 / ship.fireRate
    }
  }

  return {
    ship: { ...ship, fireCooldown: Math.max(0, cooldown) },
    projectiles,
  }
}

function updateEnemyMovement(enemies: Enemy[], ship: Ship, dt: number): Enemy[] {
  return enemies.map((enemy) => {
    const dx = ship.pos.x - enemy.pos.x
    const dy = ship.pos.y - enemy.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 1) return enemy

    const nx = dx / dist
    const ny = dy / dist

    return {
      ...enemy,
      pos: {
        x: enemy.pos.x + nx * enemy.speed * dt,
        y: enemy.pos.y + ny * enemy.speed * dt,
      },
      vel: { x: nx * enemy.speed, y: ny * enemy.speed },
    }
  })
}

function updateProjectiles(projectiles: Projectile[], dt: number): Projectile[] {
  return projectiles
    .map((p) => ({
      ...p,
      pos: {
        x: p.pos.x + p.vel.x * dt,
        y: p.pos.y + p.vel.y * dt,
      },
      lifetime: p.lifetime - dt,
    }))
    .filter((p) => p.lifetime > 0)
}

function resolveProjectileEnemyCollisions(
  projectiles: Projectile[],
  enemies: Enemy[]
): {
  projectiles: Projectile[]
  enemies: Enemy[]
  scoreGained: number
  powerGained: number
  particles: Particle[]
} {
  const hitProjectiles = new Set<string>()
  const allParticles: Particle[] = []
  let scoreGained = 0

  const updatedEnemies = enemies.map((e) => ({ ...e }))

  for (const proj of projectiles) {
    if (proj.owner !== 'ship') continue
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i]
      if (checkCollision(proj, enemy)) {
        hitProjectiles.add(proj.id)
        updatedEnemies[i] = { ...enemy, hp: enemy.hp - proj.damage }
        allParticles.push(...spawnExplosionParticles(enemy.pos, 6, '#ff4444'))
        break
      }
    }
  }

  const deadEnemies = updatedEnemies.filter((e) => e.hp <= 0)
  let powerGained = 0
  for (const dead of deadEnemies) {
    scoreGained += dead.scoreValue
    powerGained += dead.powerReward
    allParticles.push(...spawnExplosionParticles(dead.pos, 12, '#ffaa33'))
  }

  return {
    projectiles: projectiles.filter((p) => !hitProjectiles.has(p.id)),
    enemies: updatedEnemies.filter((e) => e.hp > 0),
    scoreGained,
    powerGained,
    particles: allParticles,
  }
}

function resolveEnemyShipCollisions(
  enemies: Enemy[],
  ship: Ship
): { enemies: Enemy[]; ship: Ship; particles: Particle[] } {
  const allParticles: Particle[] = []
  let totalDamage = 0
  const surviving: Enemy[] = []

  for (const enemy of enemies) {
    if (checkCollision(enemy, ship)) {
      totalDamage += enemy.damage
      allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff2222'))
    } else {
      surviving.push(enemy)
    }
  }

  return {
    enemies: surviving,
    ship: totalDamage > 0 ? { ...ship, hp: ship.hp - totalDamage } : ship,
    particles: allParticles,
  }
}

function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      pos: {
        x: p.pos.x + p.vel.x * dt,
        y: p.pos.y + p.vel.y * dt,
      },
      vel: {
        x: p.vel.x * 0.96,
        y: p.vel.y * 0.96,
      },
      elapsed: p.elapsed + dt,
    }))
    .filter((p) => p.elapsed < p.lifetime)
}
