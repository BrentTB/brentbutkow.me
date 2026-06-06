import { SPAWN_DELAY, SPAWN_DISTANCE, SWARM_SPAWN_SPREAD } from '../../data'
import { createEnemy } from '../entities/entity-creator'
import { clamp } from '../math/utils'
import { rng } from '../math/random'
import { EnemyKind } from '../types'
import type { Enemy, Vec2 } from '../types'

export function spawnPositionNearShip(shipPos: Vec2, worldSize: Vec2): Vec2 {
  const angle = rng.range(0, Math.PI * 2)
  const dist = rng.range(SPAWN_DISTANCE.min, SPAWN_DISTANCE.max)
  return {
    x: clamp(shipPos.x + Math.cos(angle) * dist, 0, worldSize.x),
    y: clamp(shipPos.y + Math.sin(angle) * dist, 0, worldSize.y),
  }
}

// Drains the queue based on `spawnTimer` (and the `waveTimer` gate). Burst-
// spawns consecutive swarm entries from a shared center so the pack stays
// together. Returns the updated arrays + the new spawnedInWave counter.
export function processSpawnQueue(opts: {
  spawnQueue: EnemyKind[]
  spawnTimer: number
  enemies: Enemy[]
  waveTimer: number
  spawnedInWave: number
  shipPos: Vec2
  worldSize: Vec2
  dt: number
}): {
  spawnQueue: EnemyKind[]
  spawnTimer: number
  enemies: Enemy[]
  spawnedInWave: number
} {
  let { spawnQueue, spawnTimer, enemies, spawnedInWave } = opts
  const { waveTimer, shipPos, worldSize, dt } = opts

  if (spawnQueue.length === 0 || waveTimer > 0) {
    return { spawnQueue, spawnTimer, enemies, spawnedInWave }
  }

  spawnTimer -= dt
  while (spawnTimer <= 0 && spawnQueue.length > 0) {
    const kind = spawnQueue[0]

    if (kind === EnemyKind.swarm) {
      const center = spawnPositionNearShip(shipPos, worldSize)
      while (spawnQueue.length > 0 && spawnQueue[0] === EnemyKind.swarm) {
        const pos = {
          x: center.x + rng.range(-SWARM_SPAWN_SPREAD, SWARM_SPAWN_SPREAD),
          y: center.y + rng.range(-SWARM_SPAWN_SPREAD, SWARM_SPAWN_SPREAD),
        }
        enemies = [...enemies, createEnemy(EnemyKind.swarm, pos)]
        spawnQueue = spawnQueue.slice(1)
        spawnedInWave++
      }
    } else {
      spawnQueue = spawnQueue.slice(1)
      const pos = spawnPositionNearShip(shipPos, worldSize)
      enemies = [...enemies, createEnemy(kind, pos)]
      spawnedInWave++
    }

    if (spawnQueue.length > 0) {
      spawnTimer += rng.range(SPAWN_DELAY.min, SPAWN_DELAY.max)
    }
  }

  return { spawnQueue, spawnTimer, enemies, spawnedInWave }
}
