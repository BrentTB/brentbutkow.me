import {
  WORLD_SIZE,
  PARTICLE_DEFAULTS,
  POWER_DEFAULTS,
  CURRENCY_DROPS,
  ENEMY_STATS,
  SPAWN_DELAY,
  SPAWN_DISTANCE,
  SWARM_SPAWN_SPREAD,
  SHIELD_COOLDOWN,
} from '../data'
import { TELEKINESIS, SOLAR_FLARE } from './abilities/abilityData'
import { checkCollision, distance, segmentIntersectsCircle } from './collision'
import {
  createShip,
  createAbilities,
  createProjectile,
  createEnemy,
  createParticle,
  spawnExplosionParticles,
  resetUid,
} from './entities'
import { updateAbilityCooldowns, resolveAbilityInput } from './abilities'
import {
  spawnCollectiblesFromKills,
  updateCollectibles,
  tryCollectSpaceMetal,
} from './collectibles'
import { applyShieldConstraints, updateActiveEffects } from './effects'
import { MAX_DT } from './time'
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
import {
  AbilityKind,
  DeathBehavior,
  EffectKind,
  EnemyKind,
  GamePhase,
  MovementBehavior,
  ProjectileOwner,
  ShipKind,
} from './types'
import type {
  GameState,
  PlayerInput,
  Enemy,
  Vec2,
  Projectile,
  Particle,
  Ally,
  UpgradeId,
} from './types'

export function createInitialState(): GameState {
  resetUid()
  rng.reseed(Date.now())
  return {
    phase: GamePhase.menu,
    shipKind: ShipKind.fighter,
    ship: createShip(ShipKind.fighter, WORLD_SIZE),
    enemies: [],
    projectiles: [],
    allies: [],
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
    telekinesisPos: null,
    telekinesisActive: false,
    solarFlareTarget: null,
    solarFlareTimer: 0,
    solarFlareActive: false,
  }
}

export function moveToShipSelection(state: GameState): GameState {
  return { ...state, phase: GamePhase.shipSelection }
}

export function startGame(state: GameState, shipKind: ShipKind): GameState {
  resetUid()
  rng.reseed(Date.now())
  const ship = createShip(shipKind, state.worldSize)
  const upgrades = createInitialUpgrades()
  return {
    ...state,
    phase: GamePhase.playing,
    shipKind,
    ship,
    enemies: [],
    projectiles: [],
    allies: [],
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
    telekinesisPos: null,
    telekinesisActive: false,
    solarFlareTarget: null,
    solarFlareTimer: 0,
    solarFlareActive: false,
  }
}

export function rechargeShieldWithMetal(state: GameState): GameState {
  if (state.spaceMetal < 1 || state.ship.shield >= state.ship.maxShield) return state
  return {
    ...state,
    spaceMetal: state.spaceMetal - 1,
    ship: { ...state.ship, shield: state.ship.maxShield, shieldCooldownRemaining: 0 },
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

  // Guard direct callers (and lag spikes) against a runaway physics step;
  // MAX_DT is the same cap the frame-time loop applies in time.ts.
  dt = Math.min(dt, MAX_DT)

  let {
    ship,
    enemies,
    projectiles,
    allies,
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
  let { solarFlareTimer } = state
  const { maxPower, powerRegen } = state
  let telekinesisPos: typeof state.telekinesisPos = null
  let solarFlareTarget: typeof state.solarFlareTarget = null

  // Wave delay only gates enemy spawning — the rest of the simulation
  // (in-flight meteors, homing power orbs, projectiles, ship attacks against
  // any stragglers) keeps running so nothing visibly freezes between waves.
  if (waveTimer > 0) {
    waveTimer = Math.max(0, waveTimer - dt)
  }

  // --- Spawn queue ---
  if (spawnQueue.length > 0 && waveTimer <= 0) {
    spawnTimer -= dt
    while (spawnTimer <= 0 && spawnQueue.length > 0) {
      const kind = spawnQueue[0]

      if (kind === EnemyKind.swarm) {
        // Burst-spawn all consecutive swarms at a shared center so the pack stays together
        const center = spawnPositionNearShip(ship.pos, state.worldSize)
        while (spawnQueue.length > 0 && spawnQueue[0] === EnemyKind.swarm) {
          const pos = {
            x: center.x + rng.range(-SWARM_SPAWN_SPREAD, SWARM_SPAWN_SPREAD),
            y: center.y + rng.range(-SWARM_SPAWN_SPREAD, SWARM_SPAWN_SPREAD),
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

  // --- Space metal click handling (marks clicked metal as homing) ---
  // The counter increments in updateCollectibles when the homing metal
  // actually reaches the ship.
  let abilityClicks = input.clicks
  if (abilityClicks.length > 0) {
    const metalResult = tryCollectSpaceMetal(collectibles, abilityClicks)
    collectibles = metalResult.collectibles
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
  allies = [...allies, ...abilityResult.newAllies]
  power -= abilityResult.powerSpent

  // --- Active effects (meteor strikes, black holes, rockets, shield, sun) ---
  const effectResult = updateActiveEffects(activeEffects, enemies, projectiles, ship, dt)
  activeEffects = effectResult.activeEffects
  enemies = effectResult.enemies
  projectiles = effectResult.projectiles
  particles = [...particles, ...effectResult.particles]
  score += effectResult.scoreGained
  currency += computeCurrencyFromKills(effectResult.killedEnemies)

  // --- Ship movement ---
  ship = updateShipPatrol(ship, dt, state.worldSize)

  // --- Ship auto-attack ---
  const attackResult = updateShipAttack(ship, enemies, projectiles, dt)
  ship = attackResult.ship
  projectiles = attackResult.projectiles

  // --- Enemy shooting (targets nearest of ship or ally) ---
  const enemyFireResult = updateEnemyShooting(enemies, ship, allies, projectiles, dt)
  enemies = enemyFireResult.enemies
  projectiles = enemyFireResult.projectiles

  // --- Enemy movement (pursues nearest of ship or ally) ---
  enemies = updateEnemyMovement(enemies, ship, allies, dt)
  // Shields block new entries — bounce non-grandfathered enemies back to the
  // boundary after they've moved this frame.
  enemies = applyShieldConstraints(activeEffects, enemies)

  // --- Ally update (movement + shooting) ---
  const allyResult = updateAllies(allies, enemies, ship, projectiles, dt)
  allies = allyResult.allies
  projectiles = allyResult.projectiles

  // --- Projectile movement ---
  projectiles = updateProjectiles(projectiles, dt)

  // --- Hold ability: Telekinesis ---
  // Power gate mirrors solar flare: needs `armSeconds` of power to start, runs
  // until power hits zero, then deactivates and requires re-arm.
  const isHolding = input.isHolding ?? false
  const holdPos = input.holdPos ?? null
  let telekinesisActive = state.telekinesisActive
  const tkAbility = abilities.find((a) => a.kind === AbilityKind.telekinesis)
  const tkRequested =
    isHolding && holdPos && input.selectedAbility === AbilityKind.telekinesis && tkAbility?.unlocked

  if (!tkRequested) {
    telekinesisActive = false
  } else {
    const armCost = TELEKINESIS.armSeconds * TELEKINESIS.powerPerSec
    if (!telekinesisActive && power >= armCost) telekinesisActive = true

    if (telekinesisActive) {
      const drain = TELEKINESIS.powerPerSec * dt
      power = Math.max(0, power - drain)
      if (power <= 0) {
        telekinesisActive = false
      } else {
        telekinesisPos = holdPos
        const radius = tkAbility.aoeRadius
        // Plateau falloff: full force inside ~25% of the radius, smooth cosine
        // drop to zero at the edge. Keeps the "near the cursor" plateau feel
        // from before, just applied to a radial pull/push instead of drag.
        const plateauEnd = 0.25
        const forceAt = (dist: number) => {
          if (dist >= radius) return 0
          const x = dist / radius
          if (x <= plateauEnd) return TELEKINESIS.force
          const t = (x - plateauEnd) / (1 - plateauEnd)
          return TELEKINESIS.force * 0.5 * (Math.cos(Math.PI * t) + 1)
        }
        const sign = TELEKINESIS.mode === 'pull' ? 1 : -1
        enemies = enemies.map((enemy) => {
          const dx = holdPos.x - enemy.pos.x
          const dy = holdPos.y - enemy.pos.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 0.01) return enemy
          const f = forceAt(dist)
          if (f === 0) return enemy
          const step = f * dt * sign
          return {
            ...enemy,
            pos: {
              x: enemy.pos.x + (dx / dist) * step,
              y: enemy.pos.y + (dy / dist) * step,
            },
          }
        })
      }
    }
  }

  // --- Hold ability: Solar Flare ---
  // Power gate: must have at least armSeconds of power to START. Once active,
  // keeps firing until power runs out, then deactivates and requires re-arm.
  let solarFlareActive = state.solarFlareActive
  const sfAbility = abilities.find((a) => a.kind === AbilityKind.solarFlare)
  const solarFlareKilledEnemies: Enemy[] = []
  const sfRequested =
    isHolding && holdPos && input.selectedAbility === AbilityKind.solarFlare && sfAbility?.unlocked

  if (!sfRequested) {
    solarFlareActive = false
    solarFlareTimer = 0
  } else {
    // powerCost is now per-second. Per-tick drain = powerCost * drainInterval.
    const perTickCost = sfAbility.powerCost * SOLAR_FLARE.drainInterval
    const armCost = SOLAR_FLARE.armSeconds * sfAbility.powerCost
    if (!solarFlareActive && power >= armCost) solarFlareActive = true
    // Deactivate as soon as the next drain tick can't be funded. Passive power
    // regen would otherwise nudge power back above 0 between drains and let
    // the beam keep going with stuttering damage.
    if (solarFlareActive && power < perTickCost) solarFlareActive = false

    if (solarFlareActive) {
      solarFlareTarget = holdPos
      solarFlareTimer -= dt
      // Particle rain: dense bright-white/yellow core at the center, thinner
      // orange spray spreading to the full radius. Gives a hot-fire look
      // rather than a uniform glow.
      const fullRadius = sfAbility.aoeRadius
      const hotColors = ['#ffffff', '#fff2b0', '#ffe066', '#ffc24a']
      const outerColors = ['#ff8833', '#ff6622', '#ffaa44']
      // Hot core: many particles, small radius, fast-fade short-life
      for (let i = 0; i < 10; i++) {
        const ang = rng.next() * Math.PI * 2
        const r = Math.sqrt(rng.next()) * (fullRadius * 0.35)
        particles = [
          ...particles,
          createParticle(
            { x: holdPos.x + Math.cos(ang) * r, y: holdPos.y + Math.sin(ang) * r },
            { x: 0, y: 0 },
            hotColors[Math.floor(rng.next() * hotColors.length)],
            0.18 + rng.next() * 0.18,
            3 + rng.next() * 3
          ),
        ]
      }
      // Outer spray: fewer particles, full radius
      for (let i = 0; i < 4; i++) {
        const ang = rng.next() * Math.PI * 2
        const r = Math.sqrt(rng.next()) * fullRadius
        particles = [
          ...particles,
          createParticle(
            { x: holdPos.x + Math.cos(ang) * r, y: holdPos.y + Math.sin(ang) * r },
            { x: 0, y: 0 },
            outerColors[Math.floor(rng.next() * outerColors.length)],
            0.3 + rng.next() * 0.3,
            2 + rng.next() * 2
          ),
        ]
      }

      if (solarFlareTimer <= 0 && power >= perTickCost) {
        power -= perTickCost
        solarFlareTimer = SOLAR_FLARE.drainInterval
        const radius = sfAbility.aoeRadius
        const updatedEnemies: Enemy[] = []
        for (const enemy of enemies) {
          if (distance(holdPos, enemy.pos) < radius + enemy.radius) {
            const damaged = { ...enemy, hp: enemy.hp - sfAbility.damage }
            if (damaged.hp <= 0) {
              solarFlareKilledEnemies.push(enemy)
              score += enemy.scoreValue
              currency += computeCurrencyFromKills([enemy])
              particles = [...particles, ...spawnExplosionParticles(enemy.pos, 12, '#ffaa33')]
            } else {
              updatedEnemies.push(damaged)
              particles = [...particles, ...spawnExplosionParticles(enemy.pos, 4, '#ffdd66')]
            }
          } else {
            updatedEnemies.push(enemy)
          }
        }
        enemies = updatedEnemies
      }
    }
  }

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

  // --- Collision: enemy projectiles vs allies ---
  const allyProjResult = resolveEnemyProjectileAllyCollisions(projectiles, allies)
  projectiles = allyProjResult.projectiles
  allies = allyProjResult.allies
  particles = [...particles, ...allyProjResult.particles]

  // --- Collision: enemies vs ship ---
  const shipCollision = resolveEnemyShipCollisions(enemies, ship)
  enemies = shipCollision.enemies
  ship = shipCollision.ship
  particles = [...particles, ...shipCollision.particles]

  // --- Collision: enemies vs allies (melee — enemy dies, ally takes damage) ---
  const allyMeleeResult = resolveEnemyAllyMeleeCollisions(enemies, allies)
  enemies = allyMeleeResult.enemies
  allies = allyMeleeResult.allies
  particles = [...particles, ...allyMeleeResult.particles]

  // --- Death effects (bomber explosions, etc.) ---
  // A bomber that dies by ramming the ship explodes too, so ship-collision
  // kills are fed through alongside ability/projectile kills.
  const killedForDeathEffects = [
    ...effectResult.killedEnemies,
    ...projCollision.killedEnemies,
    ...shipCollision.killedEnemies,
    ...allyMeleeResult.killedEnemies,
    ...solarFlareKilledEnemies,
  ]
  if (killedForDeathEffects.length > 0) {
    const deathResult = resolveDeathEffects(killedForDeathEffects, ship, activeEffects)
    if (deathResult.shipDamage > 0) {
      ship = applyDamageToShip(ship, deathResult.shipDamage)
    }
    particles = [...particles, ...deathResult.particles]
  }

  // --- Spawn collectibles from kills ---
  // Ship-collision deaths drop nothing — no reward for letting an enemy reach you.
  const killedForCollectibles = [
    ...effectResult.killedEnemies,
    ...projCollision.killedEnemies,
    ...solarFlareKilledEnemies,
  ]
  if (killedForCollectibles.length > 0) {
    collectibles = [...collectibles, ...spawnCollectiblesFromKills(killedForCollectibles)]
  }

  // --- Update collectibles (power orbs + clicked metals home toward ship) ---
  const collectibleResult = updateCollectibles(collectibles, ship, dt)
  collectibles = collectibleResult.collectibles
  power += collectibleResult.powerGained
  spaceMetal += collectibleResult.spaceMetalGained

  // --- Ability cooldowns ---
  abilities = updateAbilityCooldowns(abilities, dt)

  // --- Power regen ---
  power = Math.min(maxPower, power + powerRegen * dt)

  // --- Shield regen ---
  if (ship.shieldCooldownRemaining > 0) {
    ship = { ...ship, shieldCooldownRemaining: Math.max(0, ship.shieldCooldownRemaining - dt) }
  } else if (ship.shield < ship.maxShield) {
    ship = { ...ship, shield: Math.min(ship.maxShield, ship.shield + ship.shieldRegen * dt) }
  }

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
      allies: [],
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
      telekinesisPos: null,
      solarFlareTarget: null,
      solarFlareTimer: 0,
      solarFlareActive: false,
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
      allies,
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
      telekinesisPos: null,
      solarFlareTarget: null,
      solarFlareTimer: 0,
      solarFlareActive: false,
    }
  }

  return {
    ...state,
    ship,
    enemies,
    projectiles,
    allies,
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
    telekinesisPos,
    telekinesisActive,
    solarFlareTarget,
    solarFlareTimer,
    solarFlareActive,
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

function applyDamageToShip(ship: Ship, damage: number): Ship {
  if (damage <= 0) return ship
  const shieldAbsorb = Math.min(ship.shield, damage)
  const hpDamage = damage - shieldAbsorb
  return {
    ...ship,
    shield: ship.shield - shieldAbsorb,
    // Any hit to the shield resets the regen timer — healing only begins after
    // 3 seconds with no damage taken.
    shieldCooldownRemaining: shieldAbsorb > 0 ? SHIELD_COOLDOWN : ship.shieldCooldownRemaining,
    hp: ship.hp - hpDamage,
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

function updateShipAttack(
  ship: Ship,
  enemies: Enemy[],
  projectiles: Projectile[],
  dt: number
): { ship: Ship; projectiles: Projectile[] } {
  let cooldown = ship.fireCooldown - dt

  if (cooldown <= 0 && enemies.length > 0) {
    // Sort enemies in range by distance and take up to weaponSlots targets
    const inRange = enemies
      .map((e) => ({ enemy: e, dist: distance(ship.pos, e.pos) }))
      .filter((x) => x.dist < ship.attackRange)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, ship.weaponSlots)

    if (inRange.length > 0) {
      for (const { enemy } of inRange) {
        projectiles = [
          ...projectiles,
          createProjectile(ship.pos, enemy.pos, ProjectileOwner.ship, ship.damage),
        ]
      }
      cooldown = 1 / ship.fireRate
    }
  }

  return {
    ship: { ...ship, fireCooldown: Math.max(0, cooldown) },
    projectiles,
  }
}

// Returns the position of the nearest entity to a given point (ship or any ally).
function findNearestTarget(pos: Vec2, ship: Ship, allies: Ally[]): Vec2 {
  let nearest = ship.pos
  let nearestDist = distance(pos, ship.pos)
  for (const ally of allies) {
    const d = distance(pos, ally.pos)
    if (d < nearestDist) {
      nearest = ally.pos
      nearestDist = d
    }
  }
  return nearest
}

function updateEnemyShooting(
  enemies: Enemy[],
  ship: Ship,
  allies: Ally[],
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
      const target = findNearestTarget(enemy.pos, ship, allies)
      const dist = distance(enemy.pos, target)
      if (dist < enemy.attackRange) {
        const projDamage = ENEMY_STATS.shooter.projectileDamage
        const proj = createProjectile(enemy.pos, target, ProjectileOwner.enemy, projDamage)
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

  const targetVx = (dx / dist) * enemy.speed
  const targetVy = (dy / dist) * enemy.speed

  // Smooth velocity toward the target so slow chasers (tanks) don't jitter when
  // the ship reverses on its patrol. Heavier enemies turn more slowly: rate
  // scales with their movement speed.
  const turnRate = enemy.speed / 30
  const alpha = 1 - Math.exp(-turnRate * dt)
  const vx = enemy.vel.x + (targetVx - enemy.vel.x) * alpha
  const vy = enemy.vel.y + (targetVy - enemy.vel.y) * alpha

  return {
    ...enemy,
    pos: { x: enemy.pos.x + vx * dt, y: enemy.pos.y + vy * dt },
    vel: { x: vx, y: vy },
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

  // Hash the numeric suffix of the ID for a per-enemy phase offset so pack
  // members don't weave in lockstep. The oscillation is driven by the enemy's
  // own age (game time, speed-scaled) rather than wall-clock, keeping it
  // deterministic and in sync with the game-speed setting.
  const idNum = parseInt(enemy.id.slice(1), 10) || 0
  const phase = idNum * 2.39996
  const lateralStrength = Math.sin(enemy.age * 5 + phase) * 0.6

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

function updateEnemyMovement(
  enemies: Enemy[],
  ship: GameState['ship'],
  allies: Ally[],
  dt: number
): Enemy[] {
  return enemies.map((enemy) => {
    const target = findNearestTarget(enemy.pos, ship, allies)
    const targetAsShip = { ...ship, pos: target }
    const moved = MOVEMENT_FN[enemy.movementBehavior](enemy, targetAsShip, dt)
    return { ...moved, age: enemy.age + dt }
  })
}

// Ally behavior: shoots the nearest enemy in range and orbits the ship at a
// per-ally angle. Each ally has a unique phase offset from its id hash so
// stacked allies fan out instead of overlapping. Avoidance is intentionally
// half-baked — allies should not be optimally elusive.
const ALLY_ORBIT_RADIUS = 130
const ALLY_AVOID_RADIUS = 55
const ALLY_AVOID_WEIGHT = 0.7
const ALLY_NOISE_STRENGTH = 0.4

function allyOrbitTarget(ally: Ally, ship: GameState['ship']): Vec2 {
  // Per-ally phase from id hash; slowly drifts so each ally weaves around the
  // ship instead of locking to a fixed offset.
  const idNum = parseInt(ally.id.slice(1), 10) || 0
  const baseAngle = idNum * 2.3998 // golden-angle-ish, gives good fan-out
  const driftAngle = baseAngle + ally.elapsed * 0.6
  return {
    x: ship.pos.x + Math.cos(driftAngle) * ALLY_ORBIT_RADIUS,
    y: ship.pos.y + Math.sin(driftAngle) * ALLY_ORBIT_RADIUS,
  }
}

function updateAllies(
  allies: Ally[],
  enemies: Enemy[],
  ship: GameState['ship'],
  projectiles: Projectile[],
  dt: number
): { allies: Ally[]; projectiles: Projectile[] } {
  const surviving: Ally[] = []
  let newProjectiles = projectiles

  for (const ally of allies) {
    const elapsed = ally.elapsed + dt
    if (elapsed >= ally.duration) continue

    let updated = { ...ally, elapsed, fireCooldown: Math.max(0, ally.fireCooldown - dt) }

    // --- Targeting / shooting ---
    let nearestEnemy: Enemy | null = null
    let nearestDist = Infinity
    for (const enemy of enemies) {
      const d = distance(ally.pos, enemy.pos)
      if (d < nearestDist) {
        nearestDist = d
        nearestEnemy = enemy
      }
    }
    if (nearestEnemy && nearestDist <= ally.attackRange && updated.fireCooldown <= 0) {
      const proj = createProjectile(ally.pos, nearestEnemy.pos, ProjectileOwner.ship, ally.damage)
      newProjectiles = [...newProjectiles, proj]
      updated = { ...updated, fireCooldown: 1 / ally.fireRate }
    }

    // --- Steering: orbit a per-ally point near the ship, weak avoid + noise ---
    const target = allyOrbitTarget(updated, ship)
    let steerX = target.x - ally.pos.x
    let steerY = target.y - ally.pos.y
    const toTargetMag = Math.sqrt(steerX * steerX + steerY * steerY)
    if (toTargetMag > 0.01) {
      steerX /= toTargetMag
      steerY /= toTargetMag
    }
    for (const enemy of enemies) {
      const ex = ally.pos.x - enemy.pos.x
      const ey = ally.pos.y - enemy.pos.y
      const d = Math.sqrt(ex * ex + ey * ey)
      if (d < ALLY_AVOID_RADIUS && d > 0.01) {
        const weight = (1 - d / ALLY_AVOID_RADIUS) * ALLY_AVOID_WEIGHT
        steerX += (ex / d) * weight
        steerY += (ey / d) * weight
      }
    }
    // Per-ally noise so they don't all dodge in the exact same direction
    steerX += (rng.next() - 0.5) * ALLY_NOISE_STRENGTH
    steerY += (rng.next() - 0.5) * ALLY_NOISE_STRENGTH

    const steerMag = Math.sqrt(steerX * steerX + steerY * steerY)
    let targetVx = 0
    let targetVy = 0
    if (steerMag > 0.001) {
      targetVx = (steerX / steerMag) * ally.speed
      targetVy = (steerY / steerMag) * ally.speed
    }
    const turnRate = ally.speed / 30
    const alpha = 1 - Math.exp(-turnRate * dt)
    const vx = ally.vel.x + (targetVx - ally.vel.x) * alpha
    const vy = ally.vel.y + (targetVy - ally.vel.y) * alpha
    updated = {
      ...updated,
      pos: { x: ally.pos.x + vx * dt, y: ally.pos.y + vy * dt },
      vel: { x: vx, y: vy },
    }

    surviving.push(updated)
  }

  return { allies: surviving, projectiles: newProjectiles }
}

function resolveEnemyProjectileAllyCollisions(
  projectiles: Projectile[],
  allies: Ally[]
): { projectiles: Projectile[]; allies: Ally[]; particles: Particle[] } {
  const allParticles: Particle[] = []
  const surviving: Projectile[] = []
  const updatedAllies = allies.map((a) => ({ ...a }))

  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.enemy) {
      surviving.push(proj)
      continue
    }
    let hit = false
    for (let i = 0; i < updatedAllies.length; i++) {
      const ally = updatedAllies[i]
      if (ally.hp <= 0) continue
      // Ally is structurally compatible with Entity
      const dx = proj.pos.x - ally.pos.x
      const dy = proj.pos.y - ally.pos.y
      if (dx * dx + dy * dy < (proj.radius + ally.radius) ** 2) {
        updatedAllies[i] = { ...ally, hp: ally.hp - proj.damage }
        allParticles.push(...spawnExplosionParticles(proj.pos, 4, '#88ff88'))
        hit = true
        break
      }
    }
    if (!hit) surviving.push(proj)
  }

  return {
    projectiles: surviving,
    allies: updatedAllies.filter((a) => a.hp > 0),
    particles: allParticles,
  }
}

// Enemies that contact an ally die (same as ship-collision behavior) and the
// ally takes the enemy's damage value.
function resolveEnemyAllyMeleeCollisions(
  enemies: Enemy[],
  allies: Ally[]
): { enemies: Enemy[]; allies: Ally[]; particles: Particle[]; killedEnemies: Enemy[] } {
  const allParticles: Particle[] = []
  const survivingEnemies: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const updatedAllies = allies.map((a) => ({ ...a }))

  for (const enemy of enemies) {
    let consumed = false
    for (let i = 0; i < updatedAllies.length; i++) {
      const ally = updatedAllies[i]
      if (ally.hp <= 0) continue
      const dx = enemy.pos.x - ally.pos.x
      const dy = enemy.pos.y - ally.pos.y
      if (dx * dx + dy * dy < (enemy.radius + ally.radius) ** 2) {
        updatedAllies[i] = { ...ally, hp: ally.hp - enemy.damage }
        killedEnemies.push(enemy)
        allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff8866'))
        consumed = true
        break
      }
    }
    if (!consumed) survivingEnemies.push(enemy)
  }

  return {
    enemies: survivingEnemies,
    allies: updatedAllies.filter((a) => a.hp > 0),
    particles: allParticles,
    killedEnemies,
  }
}

function resolveDeathEffects(
  killedEnemies: Enemy[],
  ship: Ship,
  activeEffects: GameState['activeEffects']
): { shipDamage: number; particles: Particle[] } {
  let shipDamage = 0
  const particles: Particle[] = []

  // Shields the ship is currently sheltering inside. A bomber outside one of
  // these shields can't damage the ship — the dome eats the explosion.
  const shelteringShields = activeEffects.filter((e) => {
    if (e.kind !== EffectKind.shield) return false
    return distance(ship.pos, e.pos) < e.radius
  })

  for (const enemy of killedEnemies) {
    if (enemy.deathBehavior !== DeathBehavior.explode) continue

    const stats = ENEMY_STATS[enemy.kind]
    if (!('explosionDamage' in stats)) continue

    const dist = distance(enemy.pos, ship.pos)
    if (dist < stats.explosionRadius) {
      // Blocked iff the bomber is OUTSIDE a shield the ship is sheltering in.
      const blocked = shelteringShields.some(
        (s) => s.kind === EffectKind.shield && distance(enemy.pos, s.pos) >= s.radius
      )
      if (!blocked) {
        shipDamage += stats.explosionDamage
      }
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
      prevPos: p.pos,
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
  killedEnemies: Enemy[]
  particles: Particle[]
} {
  // Track hit projectiles by OBJECT REFERENCE (not by id), so any chance of
  // duplicate ids (HMR resetting the uid counter mid-game, two bullets
  // accidentally sharing a string id, etc.) can't make a single hit splash-
  // remove other in-flight bullets.
  const hitProjectiles = new Set<Projectile>()
  const allParticles: Particle[] = []
  let scoreGained = 0

  const updatedEnemies = enemies.map((e) => ({ ...e }))

  for (const proj of projectiles) {
    if (proj.owner !== ProjectileOwner.ship) continue
    for (let i = 0; i < updatedEnemies.length; i++) {
      const enemy = updatedEnemies[i]
      // Skip enemies that an earlier projectile already killed this tick — they
      // stay in the array until the dead filter at the bottom, but a corpse
      // shouldn't absorb a second bullet flying through the same space.
      if (enemy.hp <= 0) continue
      if (
        segmentIntersectsCircle(
          proj.prevPos ?? proj.pos,
          proj.pos,
          enemy.pos,
          enemy.radius + proj.radius
        )
      ) {
        hitProjectiles.add(proj)
        updatedEnemies[i] = { ...enemy, hp: enemy.hp - proj.damage }
        allParticles.push(...spawnExplosionParticles(enemy.pos, 6, '#ff4444'))
        break
      }
    }
  }

  const deadEnemies = updatedEnemies.filter((e) => e.hp <= 0)
  const killedEnemies: Enemy[] = []
  for (const dead of deadEnemies) {
    scoreGained += dead.scoreValue
    killedEnemies.push(dead)
    allParticles.push(...spawnExplosionParticles(dead.pos, 12, '#ffaa33'))
  }

  return {
    projectiles: projectiles.filter((p) => !hitProjectiles.has(p)),
    enemies: updatedEnemies.filter((e) => e.hp > 0),
    scoreGained,
    killedEnemies,
    particles: allParticles,
  }
}

function resolveEnemyProjectileShipCollisions(
  projectiles: Projectile[],
  ship: Ship
): { projectiles: Projectile[]; ship: Ship; particles: Particle[] } {
  const allParticles: Particle[] = []
  const surviving: Projectile[] = []
  let damagedShip = ship

  for (const proj of projectiles) {
    if (proj.owner === ProjectileOwner.enemy && checkCollision(proj, damagedShip)) {
      damagedShip = applyDamageToShip(damagedShip, proj.damage)
      allParticles.push(...spawnExplosionParticles(proj.pos, 4, '#ff6666'))
    } else {
      surviving.push(proj)
    }
  }

  return {
    projectiles: surviving,
    ship: damagedShip,
    particles: allParticles,
  }
}

function resolveEnemyShipCollisions(
  enemies: Enemy[],
  ship: Ship
): { enemies: Enemy[]; ship: Ship; particles: Particle[]; killedEnemies: Enemy[] } {
  const allParticles: Particle[] = []
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  let damagedShip = ship

  for (const enemy of enemies) {
    if (checkCollision(enemy, damagedShip)) {
      damagedShip = applyDamageToShip(damagedShip, enemy.damage)
      killedEnemies.push(enemy)
      allParticles.push(...spawnExplosionParticles(enemy.pos, 8, '#ff2222'))
    } else {
      surviving.push(enemy)
    }
  }

  return {
    enemies: surviving,
    ship: damagedShip,
    particles: allParticles,
    killedEnemies,
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
