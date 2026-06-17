import {
  ANIMATION,
  BOSS_LEVEL_INTERVAL,
  FORWARD_DIR,
  HAZARD,
  PARTICLE_DEFAULTS,
  POWER_DEFAULTS,
  SECTOR,
  WARP,
  WORLD_SIZE,
} from '../data'
import {
  createAbilities,
  createDeathAnim,
  createParticle,
  createShip,
  spawnExplosionParticles,
  updateDeathAnims,
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
import { updateModifiedEnemies } from './systems/enemy-modifiers-tick'
import { MAX_DT } from './world/time'
import { processSpawnQueue } from './systems/spawner'
import {
  applyDamageToShip,
  applySlingshot,
  tickEscapeMode,
  tickFling,
  tickSlingHeat,
  updateShipDrift,
} from './entities/ship'
import { updateEnemyMovement, updateEnemyShooting } from './entities/enemy'
import { rollAllyWeapon, updateAllies } from './entities/ally'
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
import { waveSpeedEscalation } from './world/wave-escalation'
import { generateHazardField, updateHazards } from './systems/hazards'
import { advanceBossSelection, createBossSelection } from './bosses/boss-selection'
import { updateBossAI } from './bosses/boss-ai'
import { loadHighScore, saveHighScore } from './world/persistence'
import { rng } from './math/random'
import { toroidalDelta, wrapPosition } from './math/toroid'
import { getHelperWeaponForUnlockUpgrade, HELPER_WEAPON_LIST } from './weapons'
import { CollectibleKind, GamePhase, ShipKind, HelperWeaponKind } from './types'
import type { AbilityKind, GameState, PlayerInput, Vec2 } from './types'
import type { UpgradeId } from './upgrade-ids'

// Weapons a fresh run starts with — derived from each weapon's startsUnlocked
// flag so the registry stays the single source of truth.
const INITIAL_UNLOCKED_WEAPONS: HelperWeaponKind[] = HELPER_WEAPON_LIST.filter(
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
    deathAnims: [],
    deathTimer: 0,
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
    forwardDir: { ...FORWARD_DIR },
    portalPos: { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y },
    warpTimer: 0,
    warpFlashTimer: 0,
    hazards: [],
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    totalWaveEnemies: 0,
    spawnedInWave: 0,
    waveElapsed: 0,
    holdStates: {},
    levelUpWeaponOffers: [],
    unlockedWeapons: [...INITIAL_UNLOCKED_WEAPONS],
    ultimatesOwned: [],
    escapeTrailAccumulator: 0,
    bossSelection: createBossSelection(),
  }
}

export function moveToShipSelection(state: GameState): GameState {
  // Clear the previous run's entities so the ship-select background is empty —
  // otherwise the dead run's enemies/particles linger behind the panel.
  return {
    ...state,
    phase: GamePhase.shipSelection,
    enemies: [],
    projectiles: [],
    allies: [],
    particles: [],
    deathAnims: [],
    deathTimer: 0,
    activeEffects: [],
    collectibles: [],
    hazards: [],
  }
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
    deathAnims: [],
    deathTimer: 0,
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
    worldSize: WORLD_SIZE,
    forwardDir: { ...FORWARD_DIR },
    portalPos: { x: WORLD_SIZE.x / 2, y: WORLD_SIZE.y },
    warpTimer: 0,
    warpFlashTimer: 0,
    hazards: [],
    waveTimer: 0,
    spawnQueue: [],
    spawnTimer: 0,
    totalWaveEnemies: 0,
    spawnedInWave: 0,
    waveElapsed: 0,
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

// Resets the wrapping world for the sector `state.level` belongs to: drops the
// ship at the centre and scatters a hazard field (clear of the spawn) on eligible
// (non-boss) sectors. The world is a fixed-size torus, so there are no bounds to
// lay out — the portal is positioned later, by beginWarp, when the sector clears.
export function resetForSector(state: GameState): GameState {
  const worldSize: Vec2 = { ...WORLD_SIZE }
  const center = { x: worldSize.x / 2, y: worldSize.y / 2 }
  const bossSector = state.level > 0 && state.level % BOSS_LEVEL_INTERVAL === 0
  const seedField = !bossSector && state.level % HAZARD.laneEveryWaves === 0
  return {
    ...state,
    worldSize,
    forwardDir: { ...FORWARD_DIR },
    portalPos: { ...center }, // placeholder — beginWarp positions the real portal
    warpTimer: 0,
    warpFlashTimer: 0,
    hazards: seedField ? generateHazardField(worldSize, center) : [],
    ship: {
      ...state.ship,
      pos: { ...center },
      vel: { x: 0, y: 0 },
      flingVel: { x: 0, y: 0 },
      driftMomentum: 0,
      // Random start phase so each sector's idle weave doesn't always lead off right.
      weavePhase: rng.next(),
      lastHeading: { ...FORWARD_DIR },
    },
  }
}

// Advances the wave/level counters; when crossing into a new sector (level change,
// including game start 0→1) it lays out a fresh sector with the ship at the world centre.
// Does NOT spawn the wave — see beginWave.
function advanceWave(state: GameState): GameState {
  const nextWave = state.wave + 1
  const base: GameState = { ...state, wave: nextWave, level: getLevel(nextWave) }
  return getLevel(nextWave) !== getLevel(state.wave) ? resetForSector(base) : base
}

// Populates the current wave's spawn queue and goes live. A boss wave consumes
// nextBoss and rolls the following one (keeping the dev-console readout ahead).
function beginWave(state: GameState): GameState {
  const bossWave = isBossWave(state.wave)
  const queue = getWave(state.wave, bossWave ? state.bossSelection.nextBoss : undefined)
  return {
    ...state,
    phase: GamePhase.playing,
    waveTimer: getWaveDelay(state.wave),
    spawnQueue: queue,
    spawnTimer: 0,
    totalWaveEnemies: queue.length,
    spawnedInWave: 0,
    waveElapsed: 0,
    bossSelection: bossWave ? advanceBossSelection(state.bossSelection) : state.bossSelection,
  }
}

// Advances one wave and starts it — the within-sector path (and game start).
export function startNextWave(state: GameState): GameState {
  return beginWave(advanceWave(state))
}

export function applyUpgradeToState(state: GameState, upgradeId: UpgradeId): GameState {
  if (!canPurchaseUpgrade(state.upgrades, upgradeId, state.currency)) return state
  const { upgrades, currencySpent } = purchaseUpgrade(state.upgrades, upgradeId)
  const abilities = syncUltimateAbilities(
    applyUpgradesToAbilities(state.abilities, upgrades),
    state.ultimatesOwned
  )
  const ship = applyUpgradesToShip(state.ship, upgrades)
  const powerRegen = applyUpgradesToPowerRegen(POWER_DEFAULTS.regenRate, upgrades)

  // Whichever weapon-unlock the player bought clears both offers — they only
  // get one new weapon per level-up. Ship/power upgrades don't touch offers.
  const purchasedWeapon = getWeaponForUnlockUpgrade(upgradeId)
  const levelUpWeaponOffers =
    purchasedWeapon && state.levelUpWeaponOffers.includes(purchasedWeapon)
      ? []
      : state.levelUpWeaponOffers

  // Ally-weapon unlock purchase: append the kind to unlockedWeapons so summoned
  // allies can roll it at spawn (see rollAllyWeapon). Ships don't equip weapons.
  const purchasedHelperWeapon = getHelperWeaponForUnlockUpgrade(upgradeId)
  const unlockedWeapons =
    purchasedHelperWeapon && !state.unlockedWeapons.includes(purchasedHelperWeapon)
      ? [...state.unlockedWeapons, purchasedHelperWeapon]
      : state.unlockedWeapons

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

// Begins the end-of-sector warp cutscene: spawns the portal just offscreen ahead
// of the ship, then hands off to advanceWarp which flies the ship into it. Auto-
// collects dropped loot first, then clears the field. updateGameState early-returns
// while warping, so the player has no slingshot control during the cutscene.
export function beginWarp(state: GameState): GameState {
  let { power, spaceMetal, singularityShard } = state
  for (const c of state.collectibles) {
    if (c.kind === CollectibleKind.spaceMetal) spaceMetal += c.value
    else if (c.kind === CollectibleKind.singularityShard) singularityShard += c.value
    else power = Math.min(state.maxPower, power + c.value)
  }
  // Portal spawns ahead of the ship (offscreen), wrapped into the torus.
  const portalPos = wrapPosition({
    x: state.ship.pos.x + state.forwardDir.x * WARP.spawnAhead,
    y: state.ship.pos.y + state.forwardDir.y * WARP.spawnAhead,
  })
  return {
    ...state,
    phase: GamePhase.warping,
    warpTimer: WARP.maxDuration,
    warpFlashTimer: 0,
    portalPos,
    power,
    spaceMetal,
    singularityShard,
    enemies: [],
    // Helpers (and the helper factory) don't follow the ship through the warp —
    // each sector starts with no allies, so a fresh squad can't be banked.
    allies: [],
    projectiles: [],
    activeEffects: [],
    collectibles: [],
    particles: [],
    hazards: [],
    // Cancel any residual fling / escape so the cutscene flight is clean.
    ship: { ...state.ship, flingVel: { x: 0, y: 0 }, escapeMode: null },
  }
}

// Ends the warp in the next sector, then opens the shop. The
// wave itself isn't spawned until the player leaves the shop (finishUpgradeScreen).
export function completeWarp(state: GameState): GameState {
  const advanced = advanceWave(state)
  return {
    ...advanced,
    phase: GamePhase.upgradeScreen,
    levelUpWeaponOffers: rollLevelUpWeaponOffers(advanced.abilities),
  }
}

// Drives the warp cutscene each frame (no player control). The sim is suspended
// while warping — updateGameState early-returns — so it runs entirely here. Two
// stages: (1) the ship flies into the portal with NO screen effect; (2) once it
// arrives, the screen flash plays for `flashDuration`, then the jump completes.
// `landed` signals the caller to reseed the camera/starfield for the fresh sector.
export function advanceWarp(state: GameState, dt: number): { state: GameState; landed: boolean } {
  if (state.phase !== GamePhase.warping) return { state, landed: false }

  // The sim is frozen during the warp, but cosmetic world animations keep
  // playing — the last kill's death burst finishes (instead of sticking as a
  // frozen "star") and lingering particles fade as the ship flies in.
  const particles = updateParticles(state.particles, dt)
  const deathAnims = updateDeathAnims(state.deathAnims, dt)
  const animated = { ...state, particles, deathAnims }

  // Stage 2 — flash: the ship has reached the portal; hold there while the
  // screen flash plays, then open the shop.
  if (state.warpFlashTimer > 0) {
    const warpFlashTimer = state.warpFlashTimer - dt
    if (warpFlashTimer <= 0) return { state: completeWarp(animated), landed: true }
    return { state: { ...animated, warpFlashTimer }, landed: false }
  }

  // Stage 1 — flight. Head toward the portal along the shortest (wrapped) path,
  // wrapping the position as it flies (the updateGameState wrap pass is skipped
  // while warping, so do it here).
  const warpTimer = Math.max(0, state.warpTimer - dt)
  const { x: dx, y: dy } = toroidalDelta(state.ship.pos, state.portalPos)
  const dist = Math.hypot(dx, dy)
  if (dist <= WARP.arriveRadius || warpTimer <= 0) {
    // Snap onto the portal and begin the flash — completion waits for it to end.
    // Zero the velocity so the sprite held under the flash doesn't carry stale motion.
    return {
      state: {
        ...animated,
        ship: { ...state.ship, pos: { ...state.portalPos }, vel: { x: 0, y: 0 } },
        warpTimer,
        warpFlashTimer: WARP.flashDuration,
      },
      landed: false,
    }
  }
  const step = Math.min(dist, WARP.flySpeed * dt)
  const nx = dx / dist
  const ny = dy / dist
  const ship = {
    ...state.ship,
    pos: wrapPosition({ x: state.ship.pos.x + nx * step, y: state.ship.pos.y + ny * step }),
    vel: { x: nx * WARP.flySpeed, y: ny * WARP.flySpeed },
    lastHeading: { x: nx, y: ny },
  }
  return { state: { ...animated, ship, warpTimer }, landed: false }
}

// Drives the player-death explosion (GamePhase.dying). The sim is suspended —
// updateGameState early-returns — so particles + death animations tick here and
// the wreck keeps cooking off; when the timer ends the phase flips to gameOver
// (the high score is saved at that moment, not at the killing hit).
export function advanceDeathSequence(
  state: GameState,
  dt: number,
  reducedMotion = false
): GameState {
  if (state.phase !== GamePhase.dying) return state
  dt = Math.min(dt, MAX_DT)

  let particles = updateParticles(state.particles, dt)
  const deathAnims = updateDeathAnims(state.deathAnims, dt)

  // Secondary pops during the first part of the sequence — the wreck cooks off.
  // Reduced motion keeps the sequence calm: no extra bursts.
  const elapsed = ANIMATION.deathSequence - state.deathTimer
  if (!reducedMotion && elapsed < ANIMATION.deathSequence * 0.6 && rng.next() < 0.25) {
    particles = [
      ...particles,
      ...spawnExplosionParticles(
        { x: state.ship.pos.x + rng.range(-20, 20), y: state.ship.pos.y + rng.range(-20, 20) },
        8,
        rng.next() < 0.5 ? '#ffaa55' : '#ffffff'
      ),
    ]
  }

  const deathTimer = state.deathTimer - dt
  if (deathTimer <= 0) {
    const isNewHighScore = state.score > state.highScore
    saveHighScore(state.score)
    return {
      ...state,
      phase: GamePhase.gameOver,
      particles,
      deathAnims,
      deathTimer: 0,
      allies: [],
      isNewHighScore,
      highScore: Math.max(state.highScore, state.score),
    }
  }

  return { ...state, particles, deathAnims, deathTimer }
}

// Leaves the shop and spawns the wave in the sector the warp already laid out.
export function finishUpgradeScreen(state: GameState): GameState {
  return beginWave({ ...state, levelUpWeaponOffers: [] })
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
    deathAnims,
    score,
    power,
    currency,
    spaceMetal,
    singularityShard,
    hazards,
    spawnQueue,
    spawnTimer,
    spawnedInWave,
    waveElapsed,
  } = state
  let { waveTimer } = state
  const { maxPower, powerRegen } = state
  let holdStates = state.holdStates

  // Cosmetic damage-flash decays each frame; a hit later this frame refreshes it.
  ship = { ...ship, hitFlash: Math.max(0, ship.hitFlash - dt) }

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
    forwardDir: state.forwardDir,
    waveNumber: state.wave,
    dt,
  })
  spawnQueue = spawnResult.spawnQueue
  spawnTimer = spawnResult.spawnTimer
  enemies = spawnResult.enemies
  spawnedInWave = spawnResult.spawnedInWave

  // Soft stall-escalation: time-since-wave-start drives a rising enemy-speed
  // multiplier, so parking and letting enemies trail the ship forever gets worse.
  waveElapsed = waveElapsed + dt
  const waveSpeedMult = waveSpeedEscalation(waveElapsed)

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
  // Each freshly-summoned ally rolls a weapon from the player's unlocked pool.
  allies = [
    ...allies,
    ...abilityResult.newAllies.map((a) => ({
      ...a,
      weapon: rollAllyWeapon(state.unlockedWeapons),
    })),
  ]
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

  // --- Hunt target: the nearest enemy the ship's movement steers toward. The
  // attack system decides what's actually damageable; movement just engages. ---
  let huntTarget: Vec2 | null = null
  let huntBest = Infinity
  for (const e of enemies) {
    const { x: hdx, y: hdy } = toroidalDelta(ship.pos, e.pos)
    const d = hdx * hdx + hdy * hdy
    if (d < huntBest) {
      huntBest = d
      huntTarget = e.pos
    }
  }

  // --- Ship movement ---
  // Priority: Escape Mode (invincible dash) > slingshot coast > auto-movement.
  // A flick sets the coast velocity; while it lasts the ship overrides its
  // auto-movement, then resumes hunting/drifting from wherever it landed.
  if (input.fling && ship.escapeMode === null) {
    ship = applySlingshot(ship, input.fling)
  }
  let escapeTrailAccumulator = state.escapeTrailAccumulator
  const escape = tickEscapeMode(ship, dt, escapeTrailAccumulator)
  ship = escape.ship
  particles = [...particles, ...escape.particles]
  escapeTrailAccumulator = escape.trailAccumulator
  if (ship.escapeMode === null) {
    const flung = tickFling(ship, dt)
    ship = flung.ship
    if (flung.active) {
      // Coasting: arm the momentum window so the drift that resumes after the
      // coast inherits this heading instead of snapping back toward forward.
      ship = { ...ship, driftMomentum: SECTOR.momentumWindow }
    } else {
      ship = updateShipDrift(ship, dt, {
        forwardDir: state.forwardDir,
        target: huntTarget,
      })
    }
  }

  // Ship has no weapons — all damage comes from player abilities and allies.

  // --- Enemy shooting (targets nearest of ship or ally) ---
  const enemyFireResult = updateEnemyShooting(enemies, ship, allies, projectiles, dt)
  enemies = enemyFireResult.enemies
  projectiles = enemyFireResult.projectiles

  // --- Enemy movement (pursues nearest of ship or ally) ---
  enemies = updateEnemyMovement(enemies, ship, allies, dt, waveSpeedMult)
  // Shields block new entries — bounce non-grandfathered enemies back to the
  // boundary after they've moved this frame. Force fields also burn on contact.
  const shieldResult = applyShieldConstraints(activeEffects, enemies, dt)
  enemies = shieldResult.enemies
  score += shieldResult.scoreGained
  currency += computeCurrencyFromKills(shieldResult.killedEnemies, stardustMultiplier)
  particles = [...particles, ...shieldResult.particles]

  // --- Ally update (movement + shooting) ---
  const allyResult = updateAllies(allies, enemies, ship, projectiles, dt, state.unlockedWeapons)
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

  // --- Enemy modifiers (shield regen + speed-enemy trail particles) ---
  const modifierResult = updateModifiedEnemies(enemies, dt)
  enemies = modifierResult.enemies
  particles = [...particles, ...modifierResult.particles]

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

  // --- Hazards (scattered mines) ---
  // Routed through applyDamageToShip, so an Escape-Mode dash across is free.
  const hazardResult = updateHazards(hazards, ship, dt)
  hazards = hazardResult.hazards
  if (hazardResult.shipDamage > 0) {
    ship = applyDamageToShip(ship, hazardResult.shipDamage)
  }

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

  // Cosmetic disintegration for every enemy that died this frame (all kill
  // sources, no duplicates — a dead enemy is removed by exactly one resolver).
  // Purely visual, runs alongside the explosion particles spawned above.
  const killedThisFrame = [...killedForDeathEffects, ...shieldResult.killedEnemies]
  if (killedThisFrame.length > 0) {
    deathAnims = [...deathAnims, ...killedThisFrame.map(createDeathAnim)]
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

  // Low HP: the ship trails smoke + embers so danger reads before game over.
  if (!input.reducedMotion && ship.hp / ship.maxHp < ANIMATION.lowHpThreshold && rng.next() < 0.5) {
    particles.push(
      createParticle(
        {
          x: ship.pos.x + rng.range(-ship.radius, ship.radius),
          y: ship.pos.y + rng.range(-ship.radius, ship.radius),
        },
        { x: rng.range(-15, 15), y: rng.range(-45, -10) },
        rng.next() < 0.3 ? '#ff7733' : '#777777',
        0.8,
        rng.range(2, 5)
      )
    )
  }

  // --- Particles + death animations ---
  particles = updateParticles(particles, dt)
  if (particles.length > PARTICLE_DEFAULTS.maxParticles) {
    particles = particles.slice(particles.length - PARTICLE_DEFAULTS.maxParticles)
  }
  deathAnims = updateDeathAnims(deathAnims, dt)

  // --- Wrap every entity back into the torus. Movement this frame may have
  // pushed positions just past an edge; toroidal deltas stay correct only while
  // positions are within one world span, so normalise them once here. ---
  ship = { ...ship, pos: wrapPosition(ship.pos) }
  enemies = enemies.map((e) => ({ ...e, pos: wrapPosition(e.pos) }))
  projectiles = projectiles.map((p) => ({ ...p, pos: wrapPosition(p.pos) }))
  allies = allies.map((a) => ({ ...a, pos: wrapPosition(a.pos) }))
  collectibles = collectibles.map((c) => ({ ...c, pos: wrapPosition(c.pos) }))

  // --- Player death → dying sequence (the ship explodes, THEN gameOver) ---
  // High score is saved when the sequence ends (advanceDeathSequence), not here.
  if (ship.hp <= 0) {
    // Reduced motion still gets a death burst — just a calmer, smaller one.
    const wreck = input.reducedMotion
      ? spawnExplosionParticles(ship.pos, 10, '#ffaa55')
      : [
          ...spawnExplosionParticles(ship.pos, 28, '#ffaa55'),
          ...spawnExplosionParticles(ship.pos, 16, '#ffffff'),
          ...spawnExplosionParticles(ship.pos, 12, '#66aacc'),
        ]
    return {
      ...state,
      phase: GamePhase.dying,
      deathTimer: ANIMATION.deathSequence,
      ship,
      enemies,
      projectiles,
      allies,
      abilities,
      activeEffects,
      collectibles,
      particles: [...particles, ...wreck],
      deathAnims,
      score,
      power,
      currency,
      spaceMetal,
      singularityShard,
      hazards,
      waveTimer: 0,
      spawnQueue,
      spawnTimer,
      spawnedInWave,
      waveElapsed,
      holdStates: {},
      escapeTrailAccumulator,
    }
  }

  // --- Check wave complete ---
  if (spawnQueue.length === 0 && enemies.length === 0 && state.totalWaveEnemies > 0) {
    const cleared: GameState = {
      ...state,
      phase: GamePhase.waveComplete,
      ship,
      enemies,
      projectiles,
      allies,
      abilities,
      activeEffects,
      collectibles,
      particles,
      deathAnims,
      score,
      power,
      currency,
      spaceMetal,
      singularityShard,
      waveTimer: 0,
      spawnQueue,
      spawnTimer,
      spawnedInWave,
      waveElapsed,
      holdStates: {},
      hazards,
      escapeTrailAccumulator,
    }
    // Sector cleared (every 3rd wave) → warp first; the shop opens once the warp
    // lands the next sector. Mid-sector waves just wait for the Next Wave button.
    return isUpgradeWave(state.wave) ? beginWarp(cleared) : cleared
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
    deathAnims,
    score,
    power,
    currency,
    spaceMetal,
    singularityShard,
    waveTimer,
    spawnQueue,
    spawnTimer,
    spawnedInWave,
    waveElapsed,
    holdStates,
    hazards,
    escapeTrailAccumulator,
  }
}
