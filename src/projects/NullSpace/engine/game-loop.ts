import {
  ANIMATION,
  ASTEROID,
  BOSS_LEVEL_INTERVAL,
  CALAMITY,
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
  spawnAsteroidLoot,
  spawnCollectiblesFromKills,
  tryCollectSpaceMetal,
  updateCollectibles,
} from './systems/collectibles'
import { applyShieldConstraints } from './abilities/shield'
import { recentreRepulseFields } from './spaceMetalAbilities/repulse'
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
  countAbilitySlots,
  createInitialUpgrades,
  getAbilityCap,
  getAbilityLineUpgradeIds,
  getLevel,
  getPowerOrbMultiplier,
  getSalvageRefund,
  getSpaceMetalDropMultiplier,
  getStardustMultiplier,
  isUpgradeWave,
  purchaseUpgrade,
  resetUpgradeTiers,
  syncUltimateAbilities,
} from './upgrades'
import { purchaseUltimate } from './ultimates'
import { emptySpawnState, getWave, getWaveDelay, isBossWave } from './world/waves'
import { waveSpeedEscalation } from './world/wave-escalation'
import { generateHazardField, replenishHazardField, updateHazards } from './calamities/hazards'
import {
  applyEffectsToAsteroids,
  resolveAsteroidContacts,
  resolveProjectileAsteroidCollisions,
  seedAsteroidField,
  splitAsteroid,
  updateAsteroids,
} from './calamities/asteroids'
import { applyRadialDamage } from './calamities/calamity-damage'
import { createShockwaveEffect, shockwaveRadiusAt } from './calamities/shockwave'
import { applyWanderingHoles, createWanderingBlackHole } from './calamities/wandering-black-hole'
import { advanceBossSelection, createBossSelection } from './bosses/boss-selection'
import { updateBossAI } from './bosses/boss-ai'
import { loadHighScore, saveHighScore } from './world/persistence'
import { reseedForNewSession, rng } from './math/random'
import { toroidalDelta, wrapPosition } from './math/toroid'
import { getHelperWeaponForUnlockUpgrade, HELPER_WEAPON_LIST } from './weapons'
import { CollectibleKind, EffectKind, GamePhase, ShipKind, HelperWeaponKind } from './types'
import type {
  AbilityKind,
  Asteroid,
  Collectible,
  GameState,
  Particle,
  PlayerInput,
  Vec2,
} from './types'
import type { UpgradeId } from './upgrade-ids'

// Weapons a fresh run starts with — derived from each weapon's startsUnlocked
// flag so the registry stays the single source of truth.
const INITIAL_UNLOCKED_WEAPONS: HelperWeaponKind[] = HELPER_WEAPON_LIST.filter(
  (d) => d.startsUnlocked
).map((d) => d.kind)

export function createInitialState(): GameState {
  reseedForNewSession()
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
    kills: 0,
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
    calamityTimer: CALAMITY.shockwaveIntervalMin,
    hazards: [],
    asteroids: [],
    spawn: emptySpawnState(),
    holdStates: {},
    levelUpWeaponOffers: [],
    salvageOfferUsed: false,
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
    asteroids: [],
  }
}

export function startGame(state: GameState, shipKind: ShipKind): GameState {
  reseedForNewSession()
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
    kills: 0,
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
    calamityTimer: CALAMITY.shockwaveIntervalMin,
    hazards: [],
    asteroids: [],
    spawn: emptySpawnState(),
    highScore: loadHighScore(),
    isNewHighScore: false,
    holdStates: {},
    levelUpWeaponOffers: [],
    salvageOfferUsed: false,
    unlockedWeapons: [...INITIAL_UNLOCKED_WEAPONS],
    ultimatesOwned: [],
    escapeTrailAccumulator: 0,
    // Fresh unique window — every boss appears once before repeats this run.
    bossSelection: createBossSelection(),
  }
}

// Picks up to `count` distinct locked weapons at random from the seeded rng.
export function rollLevelUpWeaponOffers(
  abilities: GameState['abilities'],
  cap: number,
  opts: { exclude?: AbilityKind; count?: number } = {}
): GameState['levelUpWeaponOffers'] {
  // At the slot cap, stop offering abilities — the player must Salvage one for room.
  if (countAbilitySlots(abilities) >= cap) return []
  const count = opts.count ?? 2
  // Ultimate rows start locked too, but they're bought via the shard economy,
  // never offered as a level-up weapon — exclude them here. opts.exclude skips a
  // just-salvaged ability for this one roll.
  const locked = abilities
    .filter((a) => !a.unlocked && BASE_KIND_OF[a.kind] === undefined && a.kind !== opts.exclude)
    .map((a) => a.kind)
  const offers: GameState['levelUpWeaponOffers'] = []
  for (let i = 0; i < count && locked.length > 0; i++) {
    const idx = rng.intRange(0, locked.length - 1)
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
  // Asteroids ramp in from a later sector, so sector 1 stays a clean intro (and its
  // spawn layout is undisturbed by the asteroid seed's RNG draws).
  const seedAsteroids = !bossSector && state.level >= ASTEROID.startSector
  return {
    ...state,
    worldSize,
    forwardDir: { ...FORWARD_DIR },
    portalPos: { ...center }, // placeholder — beginWarp positions the real portal
    warpTimer: 0,
    warpFlashTimer: 0,
    hazards: seedField ? generateHazardField(worldSize, center) : [],
    asteroids: seedAsteroids ? seedAsteroidField(worldSize, center) : [],
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
    // Mines are single-use, so a sector's field thins as they detonate. Top it back
    // up at every non-boss wave start (clear of the ship) so there's always a field
    // around — not just a full one at sector start. Boss waves stay clear.
    hazards: bossWave
      ? state.hazards
      : replenishHazardField(state.hazards, state.worldSize, state.ship.pos),
    spawn: {
      waveTimer: getWaveDelay(state.wave),
      queue,
      timer: 0,
      total: queue.length,
      spawned: 0,
      elapsed: 0,
    },
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

// Salvage an ability line: reset its upgrades + drop its ultimate, refund 50% of
// the Stardust spent and 100% of the Space Metal + Shards (premium boss currencies),
// and — when a slot frees — re-roll the level-up offers, skipping the salvaged kind
// for that one roll. Meteorite has no unlock upgrade, so salvaging it strips only its
// modifiers/ultimate and it stays unlocked — the player can never reach zero abilities.
export function salvageAbility(state: GameState, baseKind: AbilityKind): GameState {
  const refund = getSalvageRefund(state.upgrades, state.ultimatesOwned, baseKind)
  if (!refund.reclaimable) return state

  const ids = getAbilityLineUpgradeIds(baseKind)
  const upgrades = resetUpgradeTiers(state.upgrades, ids)
  const ultimatesOwned = state.ultimatesOwned.filter((u) => BASE_KIND_OF[u] !== baseKind)
  let abilities = syncUltimateAbilities(
    applyUpgradesToAbilities(state.abilities, upgrades),
    ultimatesOwned
  )
  // applyUpgradesToAbilities leaves unlockedAt set even after unlock flips false, but
  // the hotbar order keys on unlockedAt — so clear it for a removed line. Meteorite
  // stays unlocked (no unlock upgrade), so this never touches it.
  abilities = abilities.map((a) =>
    a.kind === baseKind && !a.unlocked ? { ...a, unlockedAt: null } : a
  )

  // Re-lock any ally weapons the salvaged Helper line had unlocked.
  const strippedWeapons = new Set(
    ids
      .map((id) => getHelperWeaponForUnlockUpgrade(id))
      .filter((k): k is HelperWeaponKind => k !== undefined)
  )
  const unlockedWeapons = strippedWeapons.size
    ? state.unlockedWeapons.filter((w) => !strippedWeapons.has(w))
    : state.unlockedWeapons

  const slotFreed = countAbilitySlots(abilities) < countAbilitySlots(state.abilities)
  // Re-roll only on the first slot-freeing salvage this shop visit — so a shop
  // shows at most two offer sets and you can't salvage→swap→salvage to fish.
  const reroll = slotFreed && !state.salvageOfferUsed
  return {
    ...state,
    upgrades,
    ultimatesOwned,
    abilities,
    unlockedWeapons,
    currency: state.currency + refund.stardust,
    spaceMetal: state.spaceMetal + refund.spaceMetal,
    singularityShard: state.singularityShard + refund.singularityShard,
    salvageOfferUsed: reroll ? true : state.salvageOfferUsed,
    levelUpWeaponOffers: reroll
      ? rollLevelUpWeaponOffers(abilities, getAbilityCap(), { exclude: baseKind })
      : state.levelUpWeaponOffers,
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
    asteroids: [],
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
    levelUpWeaponOffers: rollLevelUpWeaponOffers(advanced.abilities, getAbilityCap()),
    // Fresh shop → the one salvage re-roll is available again.
    salvageOfferUsed: false,
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

// Splits each destroyed asteroid into its fragments, drops loot for the ones the
// player engaged (playerInteracted), and spawns a debris burst. Shared by every
// place a rock dies — gunfire, ability AoE, the wandering well.
function settleKilledAsteroids(
  killed: Asteroid[],
  asteroids: Asteroid[],
  collectibles: Collectible[],
  particles: Particle[]
): { asteroids: Asteroid[]; collectibles: Collectible[]; particles: Particle[] } {
  let nextAsteroids = asteroids
  let nextCollectibles = collectibles
  let nextParticles = particles
  for (const k of killed) {
    nextAsteroids = [...nextAsteroids, ...splitAsteroid(k)]
    if (k.playerInteracted) nextCollectibles = [...nextCollectibles, ...spawnAsteroidLoot(k)]
    nextParticles = [...nextParticles, ...spawnExplosionParticles(k.pos, 14, ASTEROID.color)]
  }
  return { asteroids: nextAsteroids, collectibles: nextCollectibles, particles: nextParticles }
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
    kills,
    power,
    currency,
    spaceMetal,
    singularityShard,
    hazards,
    asteroids,
    calamityTimer,
  } = state
  // Spawn bookkeeping lives in state.spawn; alias to flat locals so the loop body
  // and the spawner interface stay unchanged, then rebuild state.spawn on return.
  let {
    waveTimer,
    queue: spawnQueue,
    timer: spawnTimer,
    spawned: spawnedInWave,
    elapsed: waveElapsed,
  } = state.spawn
  const { maxPower, powerRegen } = state
  let holdStates = state.holdStates

  // Cosmetic damage-flash decays each frame; a hit later this frame refreshes it.
  ship = {
    ...ship,
    hitFlash: Math.max(0, ship.hitFlash - dt),
    hitFlashCooldown: Math.max(0, ship.hitFlashCooldown - dt),
  }

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

  // Soft stall-escalation: a rising enemy-speed multiplier the longer a wave drags.
  // The clock starts only once the last enemy has spawned (the queue is drained), so
  // the grace period is time given AFTER the wave is fully on the field — a slow
  // spawn-in never eats into it. Parking past that makes enemies steadily speed up.
  if (spawnQueue.length === 0) {
    waveElapsed = waveElapsed + dt
  }
  const waveSpeedMult = waveSpeedEscalation(waveElapsed, isBossWave(state.wave))
  // The frame escalation kicks in (the warning countdown hits 0): a red burst on
  // every living enemy so the speed-up reads as an event, not a silent ramp.
  if (waveSpeedMult > 1 && waveSpeedEscalation(waveElapsed - dt, isBossWave(state.wave)) <= 1) {
    for (const e of enemies) {
      particles = [...particles, ...spawnExplosionParticles(e.pos, 6, '#ff4628')]
    }
  }

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

  // Snapshot effects before updateActiveEffects ticks them: one-shot effects (a
  // meteor impact) expire on their damage frame, so applyEffectsToAsteroids below
  // must read them here, before they're filtered out, or asteroids never feel them.
  const effectsThisFrame = activeEffects

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
  enemies = updateEnemyMovement(enemies, ship, allies, hazards, dt, waveSpeedMult)
  // Repulse fields ride the ship: re-centre them on its final position this frame
  // so the knockback below (and the render) don't trail a frame behind its movement.
  activeEffects = recentreRepulseFields(activeEffects, ship.pos)
  // Shields block new entries — bounce non-grandfathered enemies back to the
  // boundary after they've moved this frame. Force fields also burn on contact.
  const shieldResult = applyShieldConstraints(activeEffects, enemies, dt, asteroids)
  enemies = shieldResult.enemies
  asteroids = shieldResult.asteroids
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
  let holdBag: HoldBag = { enemies, particles, power, killedEnemies: [], asteroids }
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
  asteroids = holdBag.asteroids
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

  // --- Player projectiles vs asteroids (shoot to break; loot only when engaged) ---
  const projAsteroid = resolveProjectileAsteroidCollisions(projectiles, asteroids)
  projectiles = projAsteroid.projectiles
  asteroids = projAsteroid.asteroids
  particles = [...particles, ...projAsteroid.particles]
  if (projAsteroid.killedAsteroids.length > 0) {
    const settled = settleKilledAsteroids(
      projAsteroid.killedAsteroids,
      asteroids,
      collectibles,
      particles
    )
    asteroids = settled.asteroids
    collectibles = settled.collectibles
    particles = settled.particles
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

  // --- Calamities (neutral world hazards that damage everyone) ---
  // Mines detonate on contact, blasting ship + enemies + allies through the
  // shared radial primitive (Escape-Mode immunity + shields handled inside it).
  // Calamity kills count toward `kills` but drop no score/currency/loot, so they
  // can't be farmed — they ride the death pipeline below, not the reward tallies.
  const calamityKilled: typeof enemies = []
  const hazardResult = updateHazards(hazards, ship, enemies, allies)
  hazards = hazardResult.hazards
  ship = hazardResult.ship
  enemies = hazardResult.enemies
  allies = hazardResult.allies
  particles = [...particles, ...hazardResult.particles]
  calamityKilled.push(...hazardResult.killedEnemies)

  // Player abilities + AoE effects pull / damage asteroids (loot when destroyed).
  const effectAsteroids = applyEffectsToAsteroids(effectsThisFrame, asteroids, dt)
  asteroids = effectAsteroids.asteroids
  particles = [...particles, ...effectAsteroids.particles]
  if (effectAsteroids.killedAsteroids.length > 0) {
    const settled = settleKilledAsteroids(
      effectAsteroids.killedAsteroids,
      asteroids,
      collectibles,
      particles
    )
    asteroids = settled.asteroids
    collectibles = settled.collectibles
    particles = settled.particles
  }

  // Asteroids drift + bounce off each other, then chip everyone they touch
  // (debounced per-rock). Their enemy kills also ride the death pipeline, no score.
  asteroids = updateAsteroids(asteroids, dt)
  const asteroidContact = resolveAsteroidContacts(asteroids, ship, enemies, allies)
  asteroids = asteroidContact.asteroids
  ship = asteroidContact.ship
  enemies = asteroidContact.enemies
  allies = asteroidContact.allies
  particles = [...particles, ...asteroidContact.particles]
  calamityKilled.push(...asteroidContact.killedEnemies)
  // A rock worn down by its own collisions shatters like any other kill — split +
  // explode, but no loot (the bump damage was non-player, so playerInteracted gates it out).
  if (asteroidContact.killedAsteroids.length > 0) {
    const settled = settleKilledAsteroids(
      asteroidContact.killedAsteroids,
      asteroids,
      collectibles,
      particles
    )
    asteroids = settled.asteroids
    collectibles = settled.collectibles
    particles = settled.particles
  }

  // Calamity scheduler: on non-boss waves, periodically erupt a telegraphed
  // shock-ring or a drifting wandering black hole near the ship (rings are the
  // more frequent of the two). Boss fights are left undisturbed.
  if (!isBossWave(state.wave)) {
    calamityTimer -= dt
    if (calamityTimer <= 0) {
      const angle = rng.next() * Math.PI * 2
      if (rng.next() < 0.65) {
        const spawnDist = rng.range(
          CALAMITY.shockwaveSpawnRange * 0.4,
          CALAMITY.shockwaveSpawnRange
        )
        activeEffects = [
          ...activeEffects,
          createShockwaveEffect({
            x: ship.pos.x + Math.cos(angle) * spawnDist,
            y: ship.pos.y + Math.sin(angle) * spawnDist,
          }),
        ]
        calamityTimer = rng.range(CALAMITY.shockwaveIntervalMin, CALAMITY.shockwaveIntervalMax)
      } else {
        const spawnDist = rng.range(CALAMITY.wellSpawnRange * 0.5, CALAMITY.wellSpawnRange)
        const driftAngle = rng.next() * Math.PI * 2
        activeEffects = [
          ...activeEffects,
          createWanderingBlackHole(
            {
              x: ship.pos.x + Math.cos(angle) * spawnDist,
              y: ship.pos.y + Math.sin(angle) * spawnDist,
            },
            {
              x: Math.cos(driftAngle) * CALAMITY.wellDriftSpeed,
              y: Math.sin(driftAngle) * CALAMITY.wellDriftSpeed,
            }
          ),
        ]
        calamityTimer = rng.range(CALAMITY.wellIntervalMin, CALAMITY.wellIntervalMax)
      }
    }
  }

  // Shockwave damage: the expanding front hits only the annulus it swept this
  // frame (prev→curr radius), so each entity takes one centre-weighted hit as the
  // ring passes — strongest near the origin, weakest at the rim.
  for (const effect of activeEffects) {
    if (effect.kind !== EffectKind.shockwave || effect.elapsed < effect.delay) continue
    const outer = shockwaveRadiusAt(effect, effect.elapsed)
    const inner = shockwaveRadiusAt(effect, effect.elapsed - dt)
    if (outer <= inner) continue
    const blast = applyRadialDamage(
      effect.pos,
      inner,
      outer,
      (d) => {
        const ratio = Math.max(0, 1 - d / effect.maxRadius)
        const frac = CALAMITY.shockwaveEdgeFraction
        return effect.baseDamage * (frac + (1 - frac) * ratio)
      },
      ship,
      enemies,
      allies,
      '#ffb347'
    )
    ship = blast.ship
    enemies = blast.enemies
    allies = blast.allies
    particles = [...particles, ...blast.particles]
    calamityKilled.push(...blast.killedEnemies)
  }

  // Wandering black hole: drags every body toward it and burns the core. Neutral,
  // so no score and no asteroid loot; Escape Mode shrugs off both pull and damage.
  const wandering = applyWanderingHoles(
    activeEffects,
    ship,
    enemies,
    allies,
    asteroids,
    projectiles,
    dt
  )
  ship = wandering.ship
  enemies = wandering.enemies
  allies = wandering.allies
  asteroids = wandering.asteroids
  projectiles = wandering.projectiles
  particles = [...particles, ...wandering.particles]
  calamityKilled.push(...wandering.killedEnemies)
  if (wandering.killedAsteroids.length > 0) {
    const settled = settleKilledAsteroids(
      wandering.killedAsteroids,
      asteroids,
      collectibles,
      particles
    )
    asteroids = settled.asteroids
    collectibles = settled.collectibles
    particles = settled.particles
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
    ...calamityKilled,
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
  // Tally every enemy destroyed this frame — killedThisFrame is the dedup'd
  // all-sources kill list, so kills stays coherent with the score awarded above.
  kills += killedThisFrame.length

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
      kills,
      power,
      currency,
      spaceMetal,
      singularityShard,
      hazards,
      asteroids,
      spawn: {
        waveTimer: 0,
        queue: spawnQueue,
        timer: spawnTimer,
        total: state.spawn.total,
        spawned: spawnedInWave,
        elapsed: waveElapsed,
      },
      holdStates: {},
      calamityTimer,
      escapeTrailAccumulator,
    }
  }

  // --- Check wave complete ---
  if (spawnQueue.length === 0 && enemies.length === 0 && state.spawn.total > 0) {
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
      kills,
      power,
      currency,
      spaceMetal,
      singularityShard,
      spawn: {
        waveTimer: 0,
        queue: spawnQueue,
        timer: spawnTimer,
        total: state.spawn.total,
        spawned: spawnedInWave,
        elapsed: waveElapsed,
      },
      holdStates: {},
      hazards,
      asteroids,
      calamityTimer,
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
    kills,
    power,
    currency,
    spaceMetal,
    singularityShard,
    spawn: {
      waveTimer,
      queue: spawnQueue,
      timer: spawnTimer,
      total: state.spawn.total,
      spawned: spawnedInWave,
      elapsed: waveElapsed,
    },
    holdStates,
    hazards,
    asteroids,
    calamityTimer,
    escapeTrailAccumulator,
  }
}
