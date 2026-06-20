import { ASTEROID, BOSS_LEVEL_INTERVAL, CALAMITY, NEBULA, WAVES_PER_LEVEL } from '../data'
import {
  devGrantUltimate,
  devUnlockWeapon,
  resetForSector,
  rollLevelUpWeaponOffers,
} from './game-loop'
import { advanceBossSelection } from './bosses/boss-selection'
import { createShip } from './entities/entity-creator'
import { createMine } from './calamities/hazards'
import { createShockwaveEffect } from './calamities/shockwave'
import { createWanderingBlackHole } from './calamities/wandering-black-hole'
import { createNebula } from './calamities/nebula'
import { createAsteroid } from './calamities/asteroids'
import { getAbilityCap, getLevel } from './upgrades'
import { emptySpawnState } from './world/waves'
import { AbilityKind, AsteroidTier, EnemyKind, GamePhase, NebulaVariant, ShipKind } from './types'
import type { GameState, Hazard, Vec2 } from './types'

// Dev-console state manipulation — every mutation the console offers, as pure
// GameState → GameState functions so they're testable without React. Only the
// dev build wires these up; production tree-shakes the module away.

// Patch shape for the dev console — every field optional, undefined means
// "leave alone." devPatchState merges this onto the live GameState in one shot.
export type DevPatch = {
  shipKind?: ShipKind
  shipHp?: number
  shipMaxHp?: number
  shipShield?: number
  shipMaxShield?: number
  shipSpeed?: number
  score?: number
  currency?: number
  spaceMetal?: number
  singularityShard?: number
  power?: number
  maxPower?: number
  wave?: number
  // One-shot: overrides the upcoming boss wave's boss, then selection resumes.
  nextBoss?: EnemyKind
  // Unlock a base ability (no cost). Grant a base ability's ultimate (no cost).
  unlockWeapon?: AbilityKind
  grantUltimate?: AbilityKind
}

export function devPatchState(state: GameState, patch: DevPatch): GameState {
  let ship = state.ship
  let shipKind = state.shipKind

  if (patch.shipKind !== undefined && patch.shipKind !== state.shipKind) {
    const fresh = createShip(patch.shipKind, state.worldSize)
    ship = {
      ...fresh,
      pos: ship.pos,
      vel: ship.vel,
      driftMomentum: ship.driftMomentum,
      weavePhase: ship.weavePhase,
    }
    shipKind = patch.shipKind
  }
  if (patch.shipMaxHp !== undefined) ship = { ...ship, maxHp: patch.shipMaxHp }
  if (patch.shipHp !== undefined) ship = { ...ship, hp: patch.shipHp }
  if (patch.shipMaxShield !== undefined) ship = { ...ship, maxShield: patch.shipMaxShield }
  if (patch.shipShield !== undefined) ship = { ...ship, shield: patch.shipShield }
  if (patch.shipSpeed !== undefined) ship = { ...ship, speed: patch.shipSpeed }

  const wave = patch.wave ?? state.wave
  let next: GameState = {
    ...state,
    ship,
    shipKind,
    score: patch.score ?? state.score,
    currency: patch.currency ?? state.currency,
    spaceMetal: patch.spaceMetal ?? state.spaceMetal,
    singularityShard: patch.singularityShard ?? state.singularityShard,
    power: patch.power ?? state.power,
    maxPower: patch.maxPower ?? state.maxPower,
    wave,
    level: patch.wave !== undefined ? getLevel(wave) : state.level,
    // One-shot by construction: only nextBoss changes — the pool is left
    // alone, and consuming the boss wave advances selection as usual.
    bossSelection:
      patch.nextBoss !== undefined
        ? { ...state.bossSelection, nextBoss: patch.nextBoss }
        : state.bossSelection,
  }
  if (patch.unlockWeapon !== undefined) next = devUnlockWeapon(next, patch.unlockWeapon)
  if (patch.grantUltimate !== undefined) next = devGrantUltimate(next, patch.grantUltimate)
  // A wave jump crosses into a (possibly different) sector — re-lay it.
  return patch.wave !== undefined ? resetForSector(next) : next
}

// Jump to the between-sector shop as it appears in play: warped into the next
// fresh sector with the field cleared. Continue then spawns that wave.
export function devJumpToUpgrades(state: GameState): GameState {
  const base = state.wave > 0 ? state.wave : 1
  const boundary = Math.ceil(base / WAVES_PER_LEVEL) * WAVES_PER_LEVEL
  const upcomingWave = boundary + 1
  return resetForSector({
    ...state,
    phase: GamePhase.upgradeScreen,
    wave: upcomingWave,
    level: getLevel(upcomingWave),
    enemies: [],
    projectiles: [],
    activeEffects: [],
    spawn: emptySpawnState(),
    levelUpWeaponOffers: rollLevelUpWeaponOffers(state.abilities, getAbilityCap()),
    salvageOfferUsed: false,
  })
}

// Jump to the next boss wave after the current one. Spawns only the boss (no
// escort) so the fight is reachable instantly for testing. Consumes nextBoss
// exactly like a real boss wave so the readout stays ahead.
export function devJumpToBoss(state: GameState): GameState {
  const bossInterval = WAVES_PER_LEVEL * BOSS_LEVEL_INTERVAL
  const bossWave = Math.floor(state.wave / bossInterval) * bossInterval + bossInterval
  return resetForSector({
    ...state,
    phase: GamePhase.playing,
    wave: bossWave,
    level: getLevel(bossWave),
    enemies: [],
    projectiles: [],
    activeEffects: [],
    collectibles: [],
    spawn: {
      waveTimer: 0,
      queue: [state.bossSelection.nextBoss],
      timer: 0,
      total: 1,
      spawned: 0,
      elapsed: 0,
    },
    bossSelection: advanceBossSelection(state.bossSelection),
  })
}

// The calamities the dev console can summon on demand. Values double as runtime ids.
export const DevCalamity = {
  mines: 'mines',
  shockwave: 'shockwave',
  asteroid: 'asteroid',
  wanderingBlackHole: 'wanderingBlackHole',
  nebulaFog: 'nebulaFog',
  nebulaSlow: 'nebulaSlow',
  nebulaHaze: 'nebulaHaze',
} as const
export type DevCalamity = (typeof DevCalamity)[keyof typeof DevCalamity]

// Drops one calamity into the live arrays near the ship so it behaves exactly like a
// scheduler-spawned one — for testing each in isolation. Positioned ahead of the ship
// (zones overlap it immediately; bodies/wells drift back toward it).
export function devSpawnCalamity(state: GameState, kind: DevCalamity): GameState {
  const { pos } = state.ship
  const fwd = state.forwardDir
  const ahead = (dist: number): Vec2 => ({ x: pos.x + fwd.x * dist, y: pos.y + fwd.y * dist })
  const towardShip = (speed: number): Vec2 => ({ x: -fwd.x * speed, y: -fwd.y * speed })
  const addEffect = (effect: GameState['activeEffects'][number]): GameState => ({
    ...state,
    activeEffects: [...state.activeEffects, effect],
  })

  switch (kind) {
    case DevCalamity.mines: {
      const mines: Hazard[] = Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return createMine({ x: pos.x + Math.cos(a) * 160, y: pos.y + Math.sin(a) * 160 })
      })
      return { ...state, hazards: [...state.hazards, ...mines] }
    }
    case DevCalamity.shockwave:
      return addEffect(createShockwaveEffect(ahead(40)))
    case DevCalamity.asteroid:
      return {
        ...state,
        asteroids: [
          ...state.asteroids,
          createAsteroid(
            AsteroidTier.large,
            ahead(340),
            towardShip(ASTEROID.tiers.large.driftSpeed)
          ),
        ],
      }
    case DevCalamity.wanderingBlackHole:
      return addEffect(createWanderingBlackHole(ahead(280), towardShip(CALAMITY.wellDriftSpeed)))
    case DevCalamity.nebulaFog:
      return addEffect(createNebula(NebulaVariant.fog, ahead(120), towardShip(NEBULA.driftSpeed)))
    case DevCalamity.nebulaSlow:
      return addEffect(createNebula(NebulaVariant.slow, ahead(120), towardShip(NEBULA.driftSpeed)))
    case DevCalamity.nebulaHaze:
      return addEffect(createNebula(NebulaVariant.haze, ahead(120), towardShip(NEBULA.driftSpeed)))
  }
}
