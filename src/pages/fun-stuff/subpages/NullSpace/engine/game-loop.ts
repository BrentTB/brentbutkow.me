import { WORLD_SIZE, PARTICLE_DEFAULTS, POWER_DEFAULTS } from '../data'
import { createAbilities, createShip, resetUid, updateParticles } from './entities/entityCreator'
import { ABILITY_LIST, resolveAbilityInput, updateAbilityCooldowns } from './abilities'
import { INACTIVE_HOLD_STATE, runHoldAbility } from './abilities/hold-runtime'
import type { HoldBag } from './abilities/hold-runtime'
import {
  spawnCollectiblesFromKills,
  tryCollectSpaceMetal,
  updateCollectibles,
} from './systems/collectibles'
import { applyShieldConstraints, updateActiveEffects } from './systems/effects'
import { MAX_DT } from './world/time'
import { processSpawnQueue } from './systems/spawner'
import { applyDamageToShip, updateShipAttack, updateShipPatrol } from './entities/ship'
import { updateEnemyMovement, updateEnemyShooting } from './entities/enemy'
import { updateAllies } from './entities/ally'
import {
  resolveDeathEffects,
  resolveEnemyAllyMeleeCollisions,
  resolveEnemyProjectileAllyCollisions,
  resolveEnemyProjectileShipCollisions,
  resolveEnemyShipCollisions,
  resolveProjectileEnemyCollisions,
  updateProjectiles,
} from './systems/combat'
import { computeCurrencyFromKills } from './systems/economy'
import {
  applyUpgradesToAbilities,
  applyUpgradesToPowerRegen,
  applyUpgradesToShip,
  canPurchaseUpgrade,
  createInitialUpgrades,
  getLevel,
  isUpgradeWave,
  purchaseUpgrade,
} from './upgrades'
import { getWave, getWaveDelay } from './world/waves'
import { loadHighScore, saveHighScore } from './world/persistence'
import { rng } from './math/random'
import { GamePhase, ShipKind } from './types'
import type { GameState, PlayerInput, UpgradeId } from './types'

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
    holdStates: {},
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
    holdStates: {},
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
  const { maxPower, powerRegen } = state
  let holdStates = state.holdStates

  // Wave delay only gates enemy spawning — the rest of the simulation
  // (in-flight meteors, homing power orbs, projectiles, ship attacks against
  // any stragglers) keeps running so nothing visibly freezes between waves.
  if (waveTimer > 0) {
    waveTimer = Math.max(0, waveTimer - dt)
  }

  // --- Spawn queue ---
  const spawnResult = processSpawnQueue({
    spawnQueue,
    spawnTimer,
    enemies,
    waveTimer,
    spawnedInWave,
    shipPos: ship.pos,
    worldSize: state.worldSize,
    dt,
  })
  spawnQueue = spawnResult.spawnQueue
  spawnTimer = spawnResult.spawnTimer
  enemies = spawnResult.enemies
  spawnedInWave = spawnResult.spawnedInWave

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

  // --- Hold abilities (Telekinesis, Solar Flare, etc.) ---
  // Each hold ability registers an `onFrame` and/or `onTick` callback in its
  // definition file; the runner handles the arm gate, drain, and active flag.
  const isHolding = input.isHolding ?? false
  const holdPos = input.holdPos ?? null
  let holdBag: HoldBag = { enemies, particles, power, killedEnemies: [] }
  const nextHoldStates: typeof holdStates = { ...holdStates }
  for (const def of ABILITY_LIST) {
    if (!def.hold) continue
    const ability = abilities.find((a) => a.kind === def.kind)
    if (!ability) continue
    const requested =
      isHolding && holdPos !== null && input.selectedAbility === def.kind && ability.unlocked
    const prev = holdStates[def.kind] ?? INACTIVE_HOLD_STATE
    const result = runHoldAbility({
      config: def.hold,
      ability,
      state: prev,
      requested,
      holdPos,
      bag: holdBag,
      dt,
    })
    nextHoldStates[def.kind] = result.state
    holdBag = result.bag
  }
  holdStates = nextHoldStates
  enemies = holdBag.enemies
  particles = holdBag.particles
  power = holdBag.power
  const holdKilledEnemies = holdBag.killedEnemies
  score += holdKilledEnemies.reduce((sum, e) => sum + e.scoreValue, 0)
  currency += computeCurrencyFromKills(holdKilledEnemies)

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
    ...holdKilledEnemies,
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
    ...holdKilledEnemies,
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
      holdStates: {},
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
      holdStates: {},
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
    holdStates,
  }
}
