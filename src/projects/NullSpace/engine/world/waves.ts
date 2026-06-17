import { EnemyKind } from '../types'
import { rng } from '../math/random'
import {
  BOSS_LEVEL_INTERVAL,
  BOSS_WAVE_ENEMY_MULTIPLIER,
  WAVES_PER_LEVEL,
  WAVE_COMP,
  WAVE_THEME,
} from '../../data'

// Boss waves occur every BOSS_LEVEL_INTERVAL levels (i.e. every 9 waves by default).
export function isBossWave(waveNumber: number): boolean {
  const bossInterval = WAVES_PER_LEVEL * BOSS_LEVEL_INTERVAL
  return waveNumber > 0 && waveNumber % bossInterval === 0
}

// A wave's flavour. `mixed` is the default blend; the themed variants focus on a
// single enemy type for texture. Values double as runtime identifiers.
export const WaveArchetype = {
  mixed: 'mixed',
  swarmOnly: 'swarmOnly',
  allTank: 'allTank',
  shooterNest: 'shooterNest',
  bomberRun: 'bomberRun',
} as const
export type WaveArchetype = (typeof WaveArchetype)[keyof typeof WaveArchetype]

const THEMED: readonly WaveArchetype[] = [
  WaveArchetype.swarmOnly,
  WaveArchetype.allTank,
  WaveArchetype.shooterNest,
  WaveArchetype.bomberRun,
]

// Picks the wave's archetype. Boss waves and early waves are always mixed; past
// startWave a themed wave can appear, but only on even waves — so themed waves
// never run back-to-back and the cadence stays a minority spice.
export function getWaveArchetype(waveNumber: number): WaveArchetype {
  if (isBossWave(waveNumber) || waveNumber < WAVE_THEME.startWave) return WaveArchetype.mixed
  if (waveNumber % 2 !== 0) return WaveArchetype.mixed
  if (rng.next() >= WAVE_THEME.chance) return WaveArchetype.mixed
  return THEMED[rng.intRange(0, THEMED.length - 1)]
}

type WaveCounts = {
  drone: number
  tank: number
  shooter: number
  bomber: number
  dasher: number
  swarmPacks: number
}

// Mixed-wave counts: drones scale linearly, harder kinds tier in. Past the drone
// cap the overflow converts into tanks/shooters/bombers, so high waves lean on
// composition rather than an ever-growing drone wall.
function mixedCounts(waveNumber: number): WaveCounts {
  let drone = 2 + waveNumber
  let tank = Math.max(0, Math.floor((waveNumber - 1) / 3))
  let shooter = Math.max(0, Math.floor((waveNumber - 2) / 3))
  let bomber = Math.max(0, Math.floor((waveNumber - 4) / 4))
  // Dashers appear from wave 1 — they force the slingshot dodge from the start.
  const dasher = 1 + Math.floor(waveNumber / 4)
  const swarmPacks = Math.max(0, Math.floor((waveNumber - 3) / 4))
  if (drone > WAVE_COMP.maxDrones) {
    const overflow = drone - WAVE_COMP.maxDrones
    drone = WAVE_COMP.maxDrones
    tank += Math.floor(overflow / 3)
    shooter += Math.floor(overflow / 4)
    bomber += Math.floor(overflow / 5)
  }
  return { drone, tank, shooter, bomber, dasher, swarmPacks }
}

// Themed-wave counts: a single kind, sized so the wave still grows with depth.
function themedCounts(waveNumber: number, archetype: WaveArchetype): WaveCounts {
  const zero: WaveCounts = { drone: 0, tank: 0, shooter: 0, bomber: 0, dasher: 0, swarmPacks: 0 }
  switch (archetype) {
    case WaveArchetype.swarmOnly:
      return { ...zero, swarmPacks: Math.max(2, Math.floor(waveNumber / 3)) }
    case WaveArchetype.allTank:
      return { ...zero, tank: Math.max(3, Math.floor(waveNumber / 2)) }
    case WaveArchetype.shooterNest:
      return { ...zero, shooter: Math.max(4, Math.floor(waveNumber * 0.6)) }
    case WaveArchetype.bomberRun:
      return { ...zero, bomber: Math.max(3, Math.floor(waveNumber / 2)) }
    case WaveArchetype.mixed:
      return mixedCounts(waveNumber)
  }
}

// Turns counts into a spawn queue: singles shuffled together, each swarm pack
// kept contiguous and injected at a random position. `multiplier` slims the
// escort on boss waves.
function assembleQueue(counts: WaveCounts, multiplier: number): EnemyKind[] {
  const singles: EnemyKind[] = []
  const push = (kind: EnemyKind, n: number) => {
    for (let i = 0; i < Math.round(n * multiplier); i++) singles.push(kind)
  }
  push(EnemyKind.drone, counts.drone)
  push(EnemyKind.tank, counts.tank)
  push(EnemyKind.shooter, counts.shooter)
  push(EnemyKind.bomber, counts.bomber)
  push(EnemyKind.dasher, counts.dasher)
  shuffle(singles)

  const packs = Math.round(counts.swarmPacks * multiplier)
  for (let p = 0; p < packs; p++) {
    const packSize = rng.intRange(5, 8)
    const pack: EnemyKind[] = []
    for (let i = 0; i < packSize; i++) pack.push(EnemyKind.swarm)
    const insertAt = rng.intRange(0, singles.length)
    singles.splice(insertAt, 0, ...pack)
  }
  return singles
}

// `bossKind` (from GameState.bossSelection) is appended last on boss waves.
export function getWave(waveNumber: number, bossKind?: EnemyKind): EnemyKind[] {
  const multiplier = isBossWave(waveNumber) ? BOSS_WAVE_ENEMY_MULTIPLIER : 1
  const archetype = getWaveArchetype(waveNumber)
  const counts =
    archetype === WaveArchetype.mixed
      ? mixedCounts(waveNumber)
      : themedCounts(waveNumber, archetype)
  const queue = assembleQueue(counts, multiplier)

  // Boss appended last so it spawns after the regular enemies are cleared.
  if (isBossWave(waveNumber) && bossKind !== undefined) {
    queue.push(bossKind)
  }

  // Never hand back an empty wave — the wave-clear gate needs at least one
  // enemy, so a zero-count composition would stall sector progression.
  if (queue.length === 0) queue.push(EnemyKind.drone)

  return queue
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.intRange(0, i)
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
}

export function getWaveDelay(waveNumber: number): number {
  if (waveNumber <= 1) return 0
  return 1
}

// Kill-based progress through the current sector (0..1): each cleared wave fills
// one segment, advancing within a wave as its enemies die. Drives the HUD sector bar.
export function sectorProgress(opts: {
  wave: number
  spawnedInWave: number
  enemiesAlive: number
  totalWaveEnemies: number
}): number {
  if (opts.wave <= 0) return 0
  const waveInSector = (opts.wave - 1) % WAVES_PER_LEVEL
  const cleared =
    opts.totalWaveEnemies > 0
      ? Math.max(0, Math.min(1, (opts.spawnedInWave - opts.enemiesAlive) / opts.totalWaveEnemies))
      : 0
  return (waveInSector + cleared) / WAVES_PER_LEVEL
}
