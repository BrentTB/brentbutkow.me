import { EnemyKind } from './types'
import type { Vec2 } from './types'
import { rng } from './random'

export type EnemySpawn = {
  kind: EnemyKind
  pos: Vec2
}

export function getWave(waveNumber: number, worldSize: Vec2): EnemySpawn[] {
  const spawns: EnemySpawn[] = []
  const droneCount = 3 + waveNumber * 2
  const tankCount = Math.max(0, Math.floor((waveNumber - 1) / 2))
  const shooterCount = Math.max(0, Math.floor((waveNumber - 2) / 2))
  const total = droneCount + tankCount + shooterCount

  for (let i = 0; i < total; i++) {
    let kind: EnemyKind
    if (i < droneCount) kind = EnemyKind.drone
    else if (i < droneCount + tankCount) kind = EnemyKind.tank
    else kind = EnemyKind.shooter
    spawns.push({ kind, pos: randomEdgePosition(worldSize, i, total) })
  }

  return spawns
}

function randomEdgePosition(worldSize: Vec2, index: number, total: number): Vec2 {
  const margin = 50
  const baseAngle = (Math.PI * 2 * index) / total
  const jitter = rng.range(-0.3, 0.3)
  const angle = baseAngle + jitter
  const cx = worldSize.x / 2
  const cy = worldSize.y / 2
  const dist = Math.max(worldSize.x, worldSize.y) / 2 + margin

  return {
    x: clamp(cx + Math.cos(angle) * dist, 0, worldSize.x),
    y: clamp(cy + Math.sin(angle) * dist, 0, worldSize.y),
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export function getWaveDelay(waveNumber: number): number {
  if (waveNumber <= 1) return 0
  return 1
}
