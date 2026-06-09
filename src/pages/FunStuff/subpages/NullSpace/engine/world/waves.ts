import { EnemyKind } from '../types'
import { rng } from '../math/random'
import { BOSS_LEVEL_INTERVAL, BOSS_WAVE_ENEMY_MULTIPLIER, WAVES_PER_LEVEL } from '../../data'

// Boss waves occur every BOSS_LEVEL_INTERVAL levels (i.e. every 9 waves by default).
export function isBossWave(waveNumber: number): boolean {
  const bossInterval = WAVES_PER_LEVEL * BOSS_LEVEL_INTERVAL
  return waveNumber > 0 && waveNumber % bossInterval === 0
}

// Returns the boss kind to spawn on boss waves. Extend the mapping here when pt2 bosses are added.
export function getBossForWave(waveNumber: number): EnemyKind {
  void waveNumber
  return EnemyKind.dreadnought
}

export function getWave(waveNumber: number): EnemyKind[] {
  const multiplier = isBossWave(waveNumber) ? BOSS_WAVE_ENEMY_MULTIPLIER : 1

  const droneCount = Math.round((3 + waveNumber * 2) * multiplier)
  const tankCount = Math.round(Math.max(0, Math.floor((waveNumber - 1) / 2)) * multiplier)
  const shooterCount = Math.round(Math.max(0, Math.floor((waveNumber - 2) / 2)) * multiplier)
  const swarmPacks = Math.round(Math.max(0, Math.floor((waveNumber - 3) / 3)) * multiplier)
  const bomberCount = Math.round(Math.max(0, Math.floor((waveNumber - 4) / 3)) * multiplier)

  // Non-swarm enemies are shuffled together as singles
  const singles: EnemyKind[] = []
  for (let i = 0; i < droneCount; i++) singles.push(EnemyKind.drone)
  for (let i = 0; i < tankCount; i++) singles.push(EnemyKind.tank)
  for (let i = 0; i < shooterCount; i++) singles.push(EnemyKind.shooter)
  for (let i = 0; i < bomberCount; i++) singles.push(EnemyKind.bomber)
  shuffle(singles)

  // Each swarm pack stays contiguous; injected at a random position in the queue
  for (let p = 0; p < swarmPacks; p++) {
    const packSize = rng.intRange(5, 8)
    const pack: EnemyKind[] = []
    for (let i = 0; i < packSize; i++) pack.push(EnemyKind.swarm)
    const insertAt = rng.intRange(0, singles.length)
    singles.splice(insertAt, 0, ...pack)
  }

  // Boss appended last so it spawns after the regular enemies are cleared.
  if (isBossWave(waveNumber)) {
    singles.push(getBossForWave(waveNumber))
  }

  return singles
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
