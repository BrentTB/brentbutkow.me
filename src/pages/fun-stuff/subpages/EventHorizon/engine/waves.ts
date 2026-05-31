import type { EnemyKind, Vec2 } from './types'

export type EnemySpawn = {
  kind: EnemyKind
  pos: Vec2
}

export function getWave(waveNumber: number, worldSize: Vec2): EnemySpawn[] {
  const spawns: EnemySpawn[] = []
  const droneCount = 3 + waveNumber * 2
  const tankCount = Math.max(0, Math.floor((waveNumber - 1) / 2))
  const total = droneCount + tankCount

  for (let i = 0; i < total; i++) {
    const kind: EnemyKind = i < droneCount ? 'drone' : 'tank'
    spawns.push({ kind, pos: randomEdgePosition(worldSize, i, total) })
  }

  return spawns
}

function randomEdgePosition(worldSize: Vec2, index: number, total: number): Vec2 {
  const margin = 50
  const angle = (Math.PI * 2 * index) / total + ((Math.PI * 2 * pseudoRandom(index)) / total) * 0.3
  const cx = worldSize.x / 2
  const cy = worldSize.y / 2
  const dist = Math.max(worldSize.x, worldSize.y) / 2 + margin

  return {
    x: clamp(cx + Math.cos(angle) * dist, 0, worldSize.x),
    y: clamp(cy + Math.sin(angle) * dist, 0, worldSize.y),
  }
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function getWaveDelay(waveNumber: number): number {
  if (waveNumber <= 1) return 0
  return 2.5
}
