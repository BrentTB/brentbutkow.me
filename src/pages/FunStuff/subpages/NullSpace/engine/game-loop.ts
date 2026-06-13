import { WORLD_SIZE, PARTICLE_DEFAULTS, POWER_DEFAULTS } from '../data'
import {
  createAbilities,
  createParticle,
  createShip,
  updateParticles,
} from './entities/entity-creator'
import {
  ABILITY_LIST,
  BASE_KIND_OF,
  ULTIMATE_KIND_OF,
  WEAPON_UNLOCK_UPGRADE,
  resolveAbilityInput,
  updateAbilityCooldowns,
} from './abilities'
import { INACTIVE_HOLD_STATE, runHoldAbility } from './abilities/hold-runtime'
import type { HoldBag } from './abilities/hold-runtime'
import {
  spawnCollectiblesFromKills,
  tryCollectSpaceMetal,
  updateCollectibles,
} from './systems/collectibles'
import { applyShieldConstraints } from './abilities/shield'
import { updateActiveEffects } from './systems/effects'
import { updateBurningEnemies } from './systems/burning'
import { MAX_DT } from './world/time'
import { processSpawnQueue } from './systems/spawner'
import {
  applyDamageToShip,
  applySlingshot,
  tickEscapeMode,
  tickFling,
  tickSlingHeat,
  updateShipAttack,
  updateShipPatrol,
} from './entities/ship'
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
  getPowerOrbMultiplier,
  getSpaceMetalDropMultiplier,
  getStardustMultiplier,
  isUpgradeWave,
  purchaseUpgrade,
  syncUltimateAbilities,
} from './upgrades'
import { purchaseUltimate } from './ultimates'
import { getWave, getWaveDelay, isBossWave } from './world/waves'
import { advanceBossSelection, createBossSelection } from './bosses/boss-selection'
import { updateBossAI } from './bosses/boss-ai'
import { loadHighScore, saveHighScore } from './world/persistence'
import { rng } from './math/random'
import { getShipWeaponForUnlockUpgrade, SHIP_WEAPON_LIST } from './ship'
import { GamePhase, ShipKind, ShipWeaponKind } from './types'
import type { AbilityKind, GameState, PlayerInput } from './types'
import type { UpgradeId } from './upgrade-ids'

// Weapons a fresh run starts with — derived from each weapon's startsUnlocked
// flag so the registry stays the single source of truth.
const INITIAL_UNLOCKED_WEAPONS: ShipWeaponKind[] = SHIP_WEAPON_LIST.filter(
  (d) => d.startsUnlocked
).map((d) => d.kind)

export function createInitialState(): GameState {
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
    singularityShard: 0,
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
    levelUpWeaponOffers: [],
    unlockedWeapons: [...INITIAL_UNLOCKED_WEAPONS],
    ultimatesOwned: [],
    escapeTrailAccumulator: 0,
    bossSelection: createBossSelection(),
  }
}

export function moveToShipSelection(state: GameState): GameState {
  return { ...state, phase: GamePhase.shipSelection }
}

export function startGame(state: GameState, shipKind: ShipKind): GameState {
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
    singularityShard: 0,
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
    levelUpWeaponOffers: [],
    unlockedWeapons: [...INITIAL_UNLOCKED_WEAPONS],
    ultimatesOwned: [],
    escapeTrailAccumulator: 0,
    // Fresh unique window — every boss appears once before repeats this run.
    bossSelection: createBossSelection(),
  }
}

// Picks up to `count` random locked weapons (no duplicates). Uses Math.random
// because rng is reseeded per session — we don't want offers tied to the
// same seed across level-ups in one run.
export function rollLevelUpWeaponOffers(
  abilities: GameState['abilities'],
  count = 2
): GameState['levelUpWeaponOffers'] {
  // Ultimate rows start locked too, but they're bought via the shard economy,
  // never offered as a level-up weapon — exclude them here.
  const locked = abilities
    .filter((a) => !a.unlocked && BASE_KIND_OF[a.kind] === undefined)
    .map((a) => a.kind)
  const offers: GameState['levelUpWeaponOffers'] = []
  for (let i = 0; i < count && locked.length > 0; i++) {
    const idx = Math.floor(Math.random() * locked.length)
    offers.push(locked[idx])
    locked.splice(idx, 1)
  }
  return offers
}

export function startNextWave(state: GameState): GameState {
  const nextWave = state.wave + 1
  const bossWave = isBossWave(nextWave)
  const queue = getWave(nextWave, bossWave ? state.bossSelection.nextBoss : undefined)
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
    // Consuming nextBoss rolls the following one, keeping the dev-console
    // readout one boss wave ahead.
    bossSelection: bossWave ? advanceBossSelection(state.bossSelection) : state.bossSelection,
  }
}

export function applyUpgradeToState(state: GameState, upgradeId: UpgradeId): GameState {
  if (!canPurchaseUpgrade(state.upgrades, upgradeId, state.currency)) return state
  const { upgrades, currencySpent } = purchaseUpgrade(state.upgrades, upgradeId)
  const abilities = syncUltimateAbilities(
    applyUpgradesToAbilities(state.abilities, upgrades),
    state.ultimatesOwned
  )
  let ship = applyUpgradesToShip(state.ship, upgrades)
  const powerRegen = applyUpgradesToPowerRegen(POWER_DEFAULTS.regenRate, upgrades)

  // Whichever weapon-unlock the player bought clears both offers — they only
  // get one new weapon per level-up. Ship/power upgrades don't touch offers.
  const purchasedWeapon = getWeaponForUnlockUpgrade(upgradeId)
  const levelUpWeaponOffers =
    purchasedWeapon && state.levelUpWeaponOffers.includes(purchasedWeapon)
      ? []
      : state.levelUpWeaponOffers

  // Ship-weapon unlock purchase: append the kind to unlockedWeapons so the
  // Loadout shop tab and equip handler can offer it, then auto-equip where it
  // makes sense:
  //  - Single-slot ships: always equip the newest weapon (only one slot).
  //  - Carrier (multi-slot): drop it into the first still-default (bullet) slot.
  //    Once every slot holds a non-default weapon, leave it for the player to
  //    slot manually rather than evicting one of their choices.
  const purchasedShipWeapon = getShipWeaponForUnlockUpgrade(upgradeId)
  const unlockedWeapons =
    purchasedShipWeapon && !state.unlockedWeapons.includes(purchasedShipWeapon)
      ? [...state.unlockedWeapons, purchasedShipWeapon]
      : state.unlockedWeapons
  if (purchasedShipWeapon) {
    if (ship.weaponSlots === 1) {
      ship = { ...ship, equippedWeapons: [purchasedShipWeapon] }
    } else {
      const bulletSlot = ship.equippedWeapons.indexOf(ShipWeaponKind.bullet)
      if (bulletSlot !== -1) {
        const next = [...ship.equippedWeapons]
        next[bulletSlot] = purchasedShipWeapon
        ship = { ...ship, equippedWeapons: next }
      }
    }
  }

  return {
    ...state,
    upgrades,
    currency: state.currency - currencySpent,
    abilities,
    ship,
    powerRegen,
    levelUpWeaponOffers,
    unlockedWeapons,
  }
}

// Equip a ship weapon to a slot. Validates the kind is unlocked and the slot
// is in range. For the Carrier (multi-slot), enforces distinctness across
// slots — if `kind` is already equipped in another slot, that other slot is
// swapped to whatever was at `slotIndex` (a swap, not a duplicate).
export function equipShipWeapon(
  state: GameState,
  slotIndex: number,
  kind: ShipWeaponKind
): GameState {
  if (slotIndex < 0 || slotIndex >= state.ship.weaponSlots) return state
  if (!state.unlockedWeapons.includes(kind)) return state

  const current = state.ship.equippedWeapons
  const previousAtSlot = current[slotIndex]
  if (previousAtSlot === kind) return state

  const next = [...current]
  next[slotIndex] = kind
  const duplicate = next.findIndex((k, i) => i !== slotIndex && k === kind)
  if (duplicate !== -1) {
    // Swap: send whatever was here over to the duplicate slot so the loadout
    // stays unique without forcing the player to manually reshuffle.
    next[duplicate] = previousAtSlot
  }

  return { ...state, ship: { ...state.ship, equippedWeapons: next } }
}

// Buys the ultimate for `baseKind` (deducts stardust + space metal + shards),
// then re-syncs the ability rows so the ultimate goes live in the base's hotbar
// slot immediately.
export function applyUltimatePurchaseToState(state: GameState, baseKind: AbilityKind): GameState {
  const purchased = purchaseUltimate(state, baseKind)
  if (purchased === state) return state
  return {
    ...purchased,
    abilities: syncUltimateAbilities(
      applyUpgradesToAbilities(purchased.abilities, purchased.upgrades),
      purchased.ultimatesOwned
    ),
  }
}

// Dev-only: unlock a base ability without paying, by forcing its unlock upgrade
// to tier 1 and re-deriving the ability rows. Starter abilities (no unlock
// upgrade) are already unlocked.
export function devUnlockWeapon(state: GameState, kind: AbilityKind): GameState {
  const unlockId = WEAPON_UNLOCK_UPGRADE[kind]
  const upgrades = unlockId ? { ...state.upgrades, [unlockId]: { currentTier: 1 } } : state.upgrades
  const abilities = syncUltimateAbilities(
    applyUpgradesToAbilities(state.abilities, upgrades),
    state.ultimatesOwned
  )
  return { ...state, upgrades, abilities }
}

// Dev-only: grant a base ability's ultimate for free (bypasses the shard cost).
export function devGrantUltimate(state: GameState, baseKind: AbilityKind): GameState {
  const ultimateKind = ULTIMATE_KIND_OF[baseKind]
  if (!ultimateKind || state.ultimatesOwned.includes(ultimateKind)) return state
  const ultimatesOwned = [...state.ultimatesOwned, ultimateKind]
  const abilities = syncUltimateAbilities(
    applyUpgradesToAbilities(state.abilities, state.upgrades),
    ultimatesOwned
  )
  return { ...state, ultimatesOwned, abilities }
}

function getWeaponForUnlockUpgrade(upgradeId: UpgradeId): AbilityKind | null {
  for (const kind of Object.keys(WEAPON_UNLOCK_UPGRADE) as AbilityKind[]) {
    if (WEAPON_UNLOCK_UPGRADE[kind] === upgradeId) return kind
  }
  return null
}

export function finishUpgradeScreen(state: GameState): GameState {
  return startNextWave({ ...state, levelUpWeaponOffers: [] })
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
    singularityShard,
    spawnQueue,
    spawnTimer,
    spawnedInWave,
  } = state
  let { waveTimer } = state
  const { maxPower, powerRegen } = state
  let holdStates = state.holdStates

  // Upgrade-derived economy multipliers (constant across the frame).
  const stardustMultiplier = getStardustMultiplier(state.upgrades)
  const spaceMetalDropMultiplier = getSpaceMetalDropMultiplier(state.upgrades)
  const powerOrbMultiplier = getPowerOrbMultiplier(state.upgrades)

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

  // --- Boss AI (onSpawn + phase advance + drone spawning + self-motion) ---
  const bossResult = updateBossAI(enemies, dt, { shipPos: ship.pos, worldSize: state.worldSize })
  enemies = bossResult.enemies
  if (bossResult.newEnemies.length > 0) {
    enemies = [...enemies, ...bossResult.newEnemies]
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
  const effectResult = updateActiveEffects(
    activeEffects,
    enemies,
    projectiles,
    ship,
    state.worldSize,
    dt
  )
  activeEffects = effectResult.activeEffects
  enemies = effectResult.enemies
  projectiles = effectResult.projectiles
  particles = [...particles, ...effectResult.particles]
  score += effectResult.scoreGained
  currency += computeCurrencyFromKills(effectResult.killedEnemies, stardustMultiplier)

  // --- Ship movement ---
  // Priority: Escape Mode (invincible dash) > slingshot coast > patrol.
  // A fresh slingshot flick sets the coast velocity; it then overrides patrol
  // until it decays. Escape Mode still trumps everything while active.
  if (input.fling && ship.escapeMode === null) {
    ship = applySlingshot(ship, input.fling)
  }
  let escapeTrailAccumulator = state.escapeTrailAccumulator
  const escape = tickEscapeMode(ship, dt, escapeTrailAccumulator, state.worldSize)
  ship = escape.ship
  particles = [...particles, ...escape.particles]
  escapeTrailAccumulator = escape.trailAccumulator
  if (ship.escapeMode === null) {
    const flung = tickFling(ship, dt, state.worldSize)
    ship = flung.ship
    if (!flung.active) {
      ship = updateShipPatrol(ship, dt, state.worldSize)
    }
  }

  // --- Ship auto-attack ---
  const attackResult = updateShipAttack(ship, enemies, projectiles, dt, state.upgrades)
  ship = attackResult.ship
  projectiles = attackResult.projectiles

  // --- Enemy shooting (targets nearest of ship or ally) ---
  const enemyFireResult = updateEnemyShooting(enemies, ship, allies, projectiles, dt)
  enemies = enemyFireResult.enemies
  projectiles = enemyFireResult.projectiles

  // --- Enemy movement (pursues nearest of ship or ally) ---
  enemies = updateEnemyMovement(enemies, ship, allies, dt)
  // Shields block new entries — bounce non-grandfathered enemies back to the
  // boundary after they've moved this frame. Force fields also burn on contact.
  const shieldResult = applyShieldConstraints(activeEffects, enemies, dt)
  enemies = shieldResult.enemies
  score += shieldResult.scoreGained
  currency += computeCurrencyFromKills(shieldResult.killedEnemies, stardustMultiplier)
  particles = [...particles, ...shieldResult.particles]

  // --- Ally update (movement + shooting) ---
  const allyResult = updateAllies(allies, enemies, ship, projectiles, dt)
  allies = allyResult.allies
  projectiles = allyResult.projectiles

  // --- Projectile movement ---
  projectiles = updateProjectiles(projectiles, enemies, dt)

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
  currency += computeCurrencyFromKills(holdKilledEnemies, stardustMultiplier)

  // --- Burning enemies (Solar Plague fire: DOT + spread to neighbours) ---
  const burnResult = updateBurningEnemies(enemies, dt)
  enemies = burnResult.enemies
  particles = [...particles, ...burnResult.particles]
  score += burnResult.scoreGained
  const burnKilledEnemies = burnResult.killedEnemies
  currency += computeCurrencyFromKills(burnKilledEnemies, stardustMultiplier)

  // --- Collision: ship projectiles vs enemies ---
  const projCollision = resolveProjectileEnemyCollisions(projectiles, enemies)
  projectiles = projCollision.projectiles
  enemies = projCollision.enemies
  score += projCollision.scoreGained
  currency += computeCurrencyFromKills(projCollision.killedEnemies, stardustMultiplier)
  particles = [...particles, ...projCollision.particles]
  // Nuke detonations spawn lingering "nuclear waste" effects here.
  if (projCollision.newEffects.length > 0) {
    activeEffects = [...activeEffects, ...projCollision.newEffects]
  }

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
    ...burnKilledEnemies,
  ]
  if (killedForDeathEffects.length > 0) {
    const deathResult = resolveDeathEffects(killedForDeathEffects, ship, allies, activeEffects)
    if (deathResult.shipDamage > 0) {
      ship = applyDamageToShip(ship, deathResult.shipDamage)
    }
    allies = deathResult.allies
    particles = [...particles, ...deathResult.particles]
  }

  // --- Spawn collectibles from kills ---
  // Ship-collision deaths drop nothing — no reward for letting an enemy reach you.
  const killedForCollectibles = [
    ...effectResult.killedEnemies,
    ...projCollision.killedEnemies,
    ...holdKilledEnemies,
    ...burnKilledEnemies,
  ]
  if (killedForCollectibles.length > 0) {
    collectibles = [
      ...collectibles,
      ...spawnCollectiblesFromKills(
        killedForCollectibles,
        spaceMetalDropMultiplier,
        powerOrbMultiplier
      ),
    ]
  }

  // --- Update collectibles (power orbs + clicked metals home toward ship) ---
  const collectibleResult = updateCollectibles(collectibles, ship, dt)
  collectibles = collectibleResult.collectibles
  power += collectibleResult.powerGained
  spaceMetal += collectibleResult.spaceMetalGained
  singularityShard += collectibleResult.singularityShardGained

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

  // --- HP regen (Life Regen upgrade; 0 by default) ---
  if (ship.hpRegen > 0 && ship.hp < ship.maxHp) {
    ship = { ...ship, hp: Math.min(ship.maxHp, ship.hp + ship.hpRegen * dt) }
  }

  // --- Slingshot cooldown + heat ---
  if (ship.slingCooldownRemaining > 0) {
    ship = { ...ship, slingCooldownRemaining: Math.max(0, ship.slingCooldownRemaining - dt) }
  }
  ship = tickSlingHeat(ship, dt)

  // Overheated ship vents smoke + red embers so the lockout reads on the ship itself.
  if (ship.slingOverheated && rng.next() < 0.7) {
    particles.push(
      createParticle(
        {
          x: ship.pos.x + rng.range(-ship.radius, ship.radius),
          y: ship.pos.y + rng.range(-ship.radius, ship.radius),
        },
        { x: rng.range(-20, 20), y: rng.range(-55, -20) },
        rng.next() < 0.35 ? '#e0552b' : '#888888',
        0.9,
        rng.range(3, 6)
      )
    )
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
      singularityShard,
      highScore: Math.max(state.highScore, score),
      isNewHighScore,
      waveTimer: 0,
      spawnQueue,
      spawnTimer,
      spawnedInWave,
      holdStates: {},
      escapeTrailAccumulator,
    }
  }

  // --- Check wave complete ---
  if (spawnQueue.length === 0 && enemies.length === 0 && state.totalWaveEnemies > 0) {
    const enteringUpgrade = isUpgradeWave(state.wave)
    const nextPhase = enteringUpgrade ? GamePhase.upgradeScreen : GamePhase.waveComplete
    const levelUpWeaponOffers = enteringUpgrade
      ? rollLevelUpWeaponOffers(abilities)
      : state.levelUpWeaponOffers
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
      singularityShard,
      waveTimer: 0,
      spawnQueue,
      spawnTimer,
      spawnedInWave,
      holdStates: {},
      levelUpWeaponOffers,
      escapeTrailAccumulator,
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
    singularityShard,
    waveTimer,
    spawnQueue,
    spawnTimer,
    spawnedInWave,
    holdStates,
    escapeTrailAccumulator,
  }
}
