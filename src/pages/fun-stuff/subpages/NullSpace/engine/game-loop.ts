import {
  WORLD_SIZE,
  PARTICLE_DEFAULTS,
  POWER_DEFAULTS,
  CURRENCY_DROPS,
  ENEMY_STATS,
  SPAWN_DELAY,
  SPAWN_DISTANCE,
} from '../data'
import { checkCollision, distance } from './collision'
import {
  createShip,
  createAbilities,
  createProjectile,
  createEnemy,
  spawnExplosionParticles,
  resetUid,
} from './entities'
import { updateAbilityCooldowns, resolveAbilityInput } from './abilities'
import {
  spawnCollectiblesFromKills,
  updateCollectibles,
  tryCollectSpaceMetal,
} from './collectibles'
import { updateActiveEffects } from './effects'
import {
  createInitialUpgrades,
  isUpgradeWave,
  getLevel,
  canPurchaseUpgrade,
  purchaseUpgrade,
  applyUpgradesToAbilities,
  applyUpgradesToShip,
  applyUpgradesToPowerRegen,
} from './upgrades'
import { getWave, getWaveDelay } from './waves'
import { loadHighScore, saveHighScore } from './persistence'
import { rng } from './random'
import { DeathBehavior, EnemyKind, GamePhase, MovementBehavior, ProjectileOwner } from './types'
import type { GameState, PlayerInput, Enemy, Vec2, Projectile, Particle, UpgradeId } from './types'

export function createInitialState(): GameState {
  resetUid()
  rng.reseed(Date.now())
  return {
    phase: GamePhase.menu,
    ship: createShip(WORLD_SIZE),
    enemies: [],
    projectiles: [],
    abilities: createAbilities(),
    activeEffects: [],
    collectibles: [],
    particles: [],
    wave: 0,
    level: 0,
    score: 0,
    highScore: loadHighScore(),
    isNewHighScore: false,
    currency: 0,
    spaceMetal: 0,
    power: POWER_DEFAULTS.startingPower,
    maxPower: POWER_DEFAULTS.max,
    powerRegen: POWER_DEFAULTS.regenRate,
    upgrades: createInitialUpgrades(),
    worldSize: WORLD_SIZE,
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    totalWaveEnemies: 0,
    spawnedInWave: 0,
  }
}

export function startGame(state: GameState): GameState {
  resetUid()
  rng.reseed(Date.now())
  const ship = createShip(state.worldSize)
  const upgrades = createInitialUpgrades()
  return {
    ...state,
    phase: GamePhase.playing,
    ship,
    enemies: [],
    projectiles: [],
    abilities: createAbilities(),
    activeEffects: [],
    collectibles: [],
    particles: [],
    wave: 0,
    level: 0,
    score: 0,
    currency: 0,
    spaceMetal: 0,
    power: POWER_DEFAULTS.startingPower,
    maxPower: POWER_DEFAULTS.max,
    powerRegen: POWER_DEFAULTS.regenRate,
    upgrades,
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    totalWaveEnemies: 0,
    spawnedInWave: 0,
    highScore: loadHighScore(),
    isNewHighScore: false,
  }
}

export function startNextWave(state: GameState): GameState {
  const nextWave = state.wave + 1
  const queue = getWave(nextWave)
  const delay = getWaveDelay(nextWave)

  return {
    ...state,
    phase: GamePhase.playing,
    wave: nextWave,
    level: getLevel(nextWave),
    waveTimer: delay,
    spawnQueue: queue,
    spawnTimer: 0,
    totalWaveEnemies: queue.length,
    spawnedInWave: 0,
  }
}

export function applyUpgradeToState(state: GameState, upgradeId: UpgradeId): GameState {
  if (!canPurchaseUpgrade(state.upgrades, upgradeId, state.currency)) return state
  const { upgrades, currencySpent } = purchaseUpgrade(state.upgrades, upgradeId)
  const abilities = applyUpgradesToAbilities(state.abilities, upgrades)
  const ship = applyUpgradesToShip(state.ship, upgrades)
  const powerRegen = applyUpgradesToPowerRegen(POWER_DEFAULTS.regenRate, upgrades)

  return {
    ...state,
    upgrades,
    currency: state.currency - currencySpent,
    abilities,
    ship,
    powerRegen,
  }
}

export function finishUpgradeScreen(state: GameState): GameState {
  return startNextWave(state)
}

export function updateGameState(state: GameState, dt: number, input: PlayerInput): GameState {
  if (state.phase !== GamePhase.playing) return state

  dt = Math.min(dt, 0.1)

  let {
    ship,
    enemies,
    projectiles,
    abilities,
    activeEffects,
    collectibles,
    particles,
    score,
    power,
    currency,
    spaceMetal,
    spawnQueue,
    spawnTimer,
    spawnedInWave,
  } = state
  let { waveTimer } = state
  const { maxPower, powerRegen } = state

  if (waveTimer > 0) {
    waveTimer -= dt
    if (waveTimer > 0) {
      particles = updateParticles(particles, dt)
      abilities = updateAbilityCooldowns(abilities, dt)
      ship = updateShipPatrol(ship, dt, state.worldSize)
      return { ...state, ship, particles, abilities, power, waveTimer }
    }
  }

  // --- Spawn queue ---
  if (spawnQueue.length > 0) {
    spawnTimer -= dt
    while (spawnTimer <= 0 && spawnQueue.length > 0) {
      const kind = spawnQueue[0]

      if (kind === EnemyKind.swarm) {
        // Burst-spawn all consecutive swarms at a shared center so the pack stays together
        const center = spawnPositionNearShip(ship.pos, state.worldSize)
        while (spawnQueue.length > 0 && spawnQueue[0] === EnemyKind.swarm) {
          const pos = {
            x: center.x + rng.range(-30, 30),
            y: center.y + rng.range(-30, 30),
          }
          enemies = [...enemies, createEnemy(EnemyKind.swarm, pos)]
          spawnQueue = spawnQueue.slice(1)
          spawnedInWave++
        }
      } else {
        spawnQueue = spawnQueue.slice(1)
        const pos = spawnPositionNearShip(ship.pos, state.worldSize)
        enemies = [...enemies, createEnemy(kind, pos)]
        spawnedInWave++
      }

      if (spawnQueue.length > 0) {
        spawnTimer += rng.range(SPAWN_DELAY.min, SPAWN_DELAY.max)
      }
    }
  }

  // --- Space metal collection (consumes clicks that hit metal) ---
  let abilityClicks = input.clicks
  if (abilityClicks.length > 0) {
    const metalResult = tryCollectSpaceMetal(collectibles, abilityClicks)
    collectibles = metalResult.collectibles
    spaceMetal += metalResult.spaceMetalGained
    abilityClicks = metalResult.remainingClicks
  }

  // --- Player abilities ---
  const abilityResult = resolveAbilityInput(
    { ...state, power },
    abilityClicks,
    input.selectedAbility
  )
  abilities = abilityResult.abilities
  activeEffects = [...activeEffects, ...abilityResult.newEffects]
  power -= abilityResult.powerSpent

  // --- Active effects (meteor strikes, black holes, etc.) ---
  const effectResult = updateActiveEffects(activeEffects, enemies, ship, dt)
  activeEffects = effectResult.activeEffects
  enemies = effectResult.enemies
  particles = [...particles, ...effectResult.particles]
  score += effectResult.scoreGained
  currency += computeCurrencyFromKills(effectResult.killedEnemies)

  // --- Ship movement ---
  ship = updateShipPatrol(ship, dt, state.worldSize)

  // --- Ship auto-attack ---
  const attackResult = updateShipAttack(ship, enemies, projectiles, dt)
  ship = attackResult.ship
  projectiles = attackResult.projectiles

  // --- Enemy shooting ---
  const enemyFireResult = updateEnemyShooting(enemies, ship, projectiles, dt)
  enemies = enemyFireResult.enemies
  projectiles = enemyFireResult.projectiles

  // --- Enemy movement ---
  enemies = updateEnemyMovement(enemies, ship, dt)

  // --- Projectile movement ---
  projectiles = updateProjectiles(projectiles, dt)

  // --- Collision: ship projectiles vs enemies ---
  const projCollision = resolveProjectileEnemyCollisions(projectiles, enemies)
  projectiles = projCollision.projectiles
  enemies = projCollision.enemies
  score += projCollision.scoreGained
  currency += computeCurrencyFromKills(projCollision.killedEnemies)
  particles = [...particles, ...projCollision.particles]

  // --- Collision: enemy projectiles vs ship ---
  const enemyProjResult = resolveEnemyProjectileShipCollisions(projectiles, ship)
  projectiles = enemyProjResult.projectiles
  ship = enemyProjResult.ship
  particles = [...particles, ...enemyProjResult.particles]

  // --- Collision: enemies vs ship ---
  const shipCollision = resolveEnemyShipCollisions(enemies, ship)
  enemies = shipCollision.enemies
  ship = shipCollision.ship
  particles = [...particles, ...shipCollision.particles]

  // --- Death effects (bomber explosions, etc.) ---
  const allKilled = [...effectResult.killedEnemies, ...projCollision.killedEnemies]
  if (allKilled.length > 0) {
    const deathResult = resolveDeathEffects(allKilled, ship)
    if (deathResult.shipDamage > 0) {
      ship = { ...ship, hp: ship.hp - deathResult.shipDamage }
    }
    particles = [...particles, ...deathResult.particles]
  }

  // --- Spawn collectibles from kills ---
  const allKilledForCollectibles = [...effectResult.killedEnemies, ...projCollision.killedEnemies]
  if (allKilledForCollectibles.length > 0) {
    collectibles = [...collectibles, ...spawnCollectiblesFromKills(allKilledForCollectibles)]
  }

  // --- Update collectibles (power orbs home toward ship) ---
  const collectibleResult = updateCollectibles(collectibles, ship, dt)
  collectibles = collectibleResult.collectibles
  power += collectibleResult.powerGained

  // --- Ability cooldowns ---
  abilities = updateAbilityCooldowns(abilities, dt)

  // --- Power regen ---
  power = Math.min(maxPower, power + powerRegen * dt)

  // --- Particles ---
  particles = updateParticles(particles, dt)
  if (particles.length > PARTICLE_DEFAULTS.maxParticles) {
    particles = particles.slice(particles.length - PARTICLE_DEFAULTS.maxParticles)
  }

  // --- Check game over ---
  if (ship.hp <= 0) {
    const isNewHighScore = score > state.highScore
    saveHighScore(score)
    return {
      ...state,
      phase: GamePhase.gameOver,
      ship,
      enemies,
      projectiles,
      abilities,
      activeEffects,
      collectibles,
      particles,
      score,
      power,
      currency,
      spaceMetal,
      highScore: Math.max(state.highScore, score),
      isNewHighScore,
      waveTimer: 0,
      spawnQueue,
      spawnTimer,
      spawnedInWave,
    }
  }

  // --- Check wave complete ---
  if (spawnQueue.length === 0 && enemies.length === 0 && state.totalWaveEnemies > 0) {
    const nextPhase = isUpgradeWave(state.wave) ? GamePhase.upgradeScreen : GamePhase.waveComplete
    return {
      ...state,
      phase: nextPhase,
      ship,
      enemies,
      projectiles,
      abilities,
      activeEffects,
      collectibles,
      particles,
      score,
      power,
      currency,
      spaceMetal,
      waveTimer: 0,
      spawnQueue,
      spawnTimer,
      spawnedInWave,
    }
  }

  return {
    ...state,
    ship,
    enemies,
    projectiles,
    abilities,
    activeEffects,
    collectibles,
    particles,
    score,
    power,
    currency,
    spaceMetal,
    waveTimer,
    spawnQueue,
    spawnTimer,
    spawnedInWave,
  }
}

function computeCurrencyFromKills(killedEnemies: Enemy[]): number {
  let total = 0
  for (const enemy of killedEnemies) {
    const range = CURRENCY_DROPS[enemy.kind]
    if (range) {
      total += rng.intRange(range.min, range.max)
    }
  }
  return total
}

function spawnPositionNearShip(shipPos: Vec2, worldSize: Vec2): Vec2 {
  const angle = rng.range(0, Math.PI * 2)
  const dist = rng.range(SPAWN_DISTANCE.min, SPAWN_DISTANCE.max)
  return {
    x: clamp(shipPos.x + Math.cos(angle) * dist, 0, worldSize.x),
    y: clamp(shipPos.y + Math.sin(angle) * dist, 0, worldSize.y),
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

type Ship = GameState['ship']

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
      const proj = createProjectile(ship.pos, nearest.pos, ProjectileOwner.ship, ship.damage)
      projectiles = [...projectiles, proj]
      cooldown = 1 / ship.fireRate
    }
  }

  return {
    ship: { ...ship, fireCooldown: Math.max(0, cooldown) },
    projectiles,
  }
}

function updateEnemyShooting(
  enemies: Enemy[],
  ship: Ship,
  projectiles: Projectile[],
  dt: number
): { enemies: Enemy[]; projectiles: Projectile[] } {
  const updatedEnemies: Enemy[] = []
  let newProjectiles = projectiles

  for (const enemy of enemies) {
    if (enemy.fireRate <= 0) {
      updatedEnemies.push(enemy)
      continue
    }

    let cooldown = enemy.fireCooldown - dt
    if (cooldown <= 0) {
      const dist = distance(enemy.pos, ship.pos)
      if (dist < enemy.attackRange) {
        const projDamage = ENEMY_STATS.shooter.projectileDamage
        const proj = createProjectile(enemy.pos, ship.pos, ProjectileOwner.enemy, projDamage)
        newProjectiles = [...newProjectiles, proj]
        cooldown = 1 / enemy.fireRate
      }
    }
    updatedEnemies.push({ ...enemy, fireCooldown: Math.max(0, cooldown) })
  }

  return { enemies: updatedEnemies, projectiles: newProjectiles }
}

type MoveFn = (enemy: Enemy, ship: Ship, dt: number) => Enemy

function moveChase(enemy: Enemy, ship: Ship, dt: number): Enemy {
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
}

function moveKeepRange(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const dx = ship.pos.x - enemy.pos.x
  const dy = ship.pos.y - enemy.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  if (dist < enemy.attackRange * 0.7) {
    return { ...enemy, vel: { x: 0, y: 0 } }
  }

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
}

function moveZigzag(enemy: Enemy, ship: Ship, dt: number): Enemy {
  const dx = ship.pos.x - enemy.pos.x
  const dy = ship.pos.y - enemy.pos.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return enemy

  const nx = dx / dist
  const ny = dy / dist

  // Hash the numeric suffix of the ID for a per-enemy phase offset
  const idNum = parseInt(enemy.id.slice(1), 10) || 0
  const phase = idNum * 2.39996
  const lateralStrength = Math.sin(Date.now() * 0.005 + phase) * 0.6

  const mx = nx + -ny * lateralStrength
  const my = ny + nx * lateralStrength
  const mDist = Math.sqrt(mx * mx + my * my)
  const fmx = mDist > 0 ? mx / mDist : 0
  const fmy = mDist > 0 ? my / mDist : 0

  return {
    ...enemy,
    pos: {
      x: enemy.pos.x + fmx * enemy.speed * dt,
      y: enemy.pos.y + fmy * enemy.speed * dt,
    },
    vel: { x: fmx * enemy.speed, y: fmy * enemy.speed },
  }
}

const MOVEMENT_FN: Record<MovementBehavior, MoveFn> = {
  [MovementBehavior.chase]: moveChase,
  [MovementBehavior.keepRange]: moveKeepRange,
  [MovementBehavior.zigzag]: moveZigzag,
}

function updateEnemyMovement(enemies: Enemy[], ship: Ship, dt: number): Enemy[] {
  return enemies.map((enemy) => MOVEMENT_FN[enemy.movementBehavior](enemy, ship, dt))
}

function resolveDeathEffects(
  killedEnemies: Enemy[],
  ship: Ship
): { shipDamage: number; particles: Particle[] } {
  let shipDamage = 0
  const particles: Particle[] = []

  for (const enemy of killedEnemies) {
    if (enemy.deathBehavior !== DeathBehavior.explode) continue

    const stats = ENEMY_STATS[enemy.kind]
    if (!('explosionDamage' in stats)) continue

    const dist = distance(enemy.pos, ship.pos)
    if (dist < stats.explosionRadius) {
      shipDamage += stats.explosionDamage
      particles.push(...spawnExplosionParticles(enemy.pos, 20, '#ff8833'))
    } else {
      particles.push(...spawnExplosionParticles(enemy.pos, 14, '#ff6622'))
    }
  }

  return { shipDamage, particles }
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
  killedEnemies: Enemy[]
  particles: Particle[]
} {
  const hitProjectiles = new Set<string>()
  const allParticles: Particle[] = []
  let scoreGained = 0

  const updatedEnemies = enemies.map((e) => ({ ...e }))

  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.ship) continue
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
  const killedEnemies: Enemy[] = []
  for (const dead of deadEnemies) {
    scoreGained += dead.scoreValue
    powerGained += dead.powerReward
    killedEnemies.push(dead)
    allParticles.push(...spawnExplosionParticles(dead.pos, 12, '#ffaa33'))
  }

  return {
    projectiles: projectiles.filter((p) => !hitProjectiles.has(p.id)),
    enemies: updatedEnemies.filter((e) => e.hp > 0),
    scoreGained,
    powerGained,
    killedEnemies,
    particles: allParticles,
  }
}

function resolveEnemyProjectileShipCollisions(
  projectiles: Projectile[],
  ship: Ship
): { projectiles: Projectile[]; ship: Ship; particles: Particle[] } {
  const allParticles: Particle[] = []
  let totalDamage = 0
  const surviving: Projectile[] = []

  for (const proj of projectiles) {
    if (proj.owner === ProjectileOwner.enemy && checkCollision(proj, ship)) {
      totalDamage += proj.damage
      allParticles.push(...spawnExplosionParticles(proj.pos, 4, '#ff6666'))
    } else {
      surviving.push(proj)
    }
  }

  return {
    projectiles: surviving,
    ship: totalDamage > 0 ? { ...ship, hp: ship.hp - totalDamage } : ship,
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
