import { EnemyKind } from './types'
import { rng } from './random'

export function getWave(waveNumber: number): EnemyKind[] {
  const droneCount = 3 + waveNumber * 2
  const tankCount = Math.max(0, Math.floor((waveNumber - 1) / 2))
  const shooterCount = Math.max(0, Math.floor((waveNumber - 2) / 2))
  const swarmPacks = Math.max(0, Math.floor((waveNumber - 3) / 3))
  const bomberCount = Math.max(0, Math.floor((waveNumber - 4) / 3))

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
