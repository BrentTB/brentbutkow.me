import { EnemyKind } from './types'
import { rng } from './random'

export function getWave(waveNumber: number): EnemyKind[] {
  const kinds: EnemyKind[] = []
  const droneCount = 3 + waveNumber * 2
  const tankCount = Math.max(0, Math.floor((waveNumber - 1) / 2))
  const shooterCount = Math.max(0, Math.floor((waveNumber - 2) / 2))

  for (let i = 0; i < droneCount; i++) kinds.push(EnemyKind.drone)
  for (let i = 0; i < tankCount; i++) kinds.push(EnemyKind.tank)
  for (let i = 0; i < shooterCount; i++) kinds.push(EnemyKind.shooter)

  shuffle(kinds)
  return kinds
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
