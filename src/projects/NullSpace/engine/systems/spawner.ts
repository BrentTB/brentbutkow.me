import { SPAWN_CONE, SPAWN_DELAY, SPAWN_DISTANCE, SWARM_SPAWN_SPREAD } from '../../data'
import { createEnemy } from '../entities/entity-creator'
import { scaleEnemy } from '../world/enemy-scaling'
import { applyModifier, rollEnemyModifier } from '../world/enemy-modifiers'
import { clamp } from '../math/utils'
import { rng } from '../math/random'
import { EnemyKind } from '../types'
import type { Enemy, Vec2 } from '../types'

// Creates an enemy for the current wave: wave stat-scaling first, then a chance
// at a late-game modifier (so a shield pool is sized off the scaled HP). The
// single source for spawning so both the swarm-burst and single paths match.
function spawnEnemy(kind: EnemyKind, pos: Vec2, waveNumber: number): Enemy {
  let enemy = scaleEnemy(createEnemy(kind, pos), waveNumber)
  const modifier = rollEnemyModifier(kind, waveNumber)
  if (modifier) enemy = applyModifier(enemy, modifier)
  return enemy
}

// Picks a spawn point a random distance from the ship. Most spawns land in a cone
// AHEAD of the ship (along forwardDir) so the pressure comes from the direction of
// travel; the cone tightens as waves climb. The rest arrive from the rear arc.
export function spawnPositionNearShip(
  shipPos: Vec2,
  worldSize: Vec2,
  forwardDir: Vec2,
  waveNumber: number
): Vec2 {
  const forwardAngle = Math.atan2(forwardDir.y, forwardDir.x)
  let angle: number
  if (rng.next() < SPAWN_CONE.forwardFraction) {
    const half = Math.max(
      SPAWN_CONE.minHalfAngle,
      SPAWN_CONE.forwardHalfAngle - SPAWN_CONE.tightenPerWave * waveNumber
    )
    angle = forwardAngle + rng.range(-half, half)
  } else {
    // Rear ~180° arc behind the ship.
    angle = forwardAngle + Math.PI + rng.range(-Math.PI / 2, Math.PI / 2)
  }
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
  forwardDir: Vec2
  waveNumber: number
  dt: number
}): {
  spawnQueue: EnemyKind[]
  spawnTimer: number
  enemies: Enemy[]
  spawnedInWave: number
} {
  let { spawnQueue, spawnTimer, enemies, spawnedInWave } = opts
  const { waveTimer, shipPos, worldSize, forwardDir, waveNumber, dt } = opts

  if (spawnQueue.length === 0 || waveTimer > 0) {
    return { spawnQueue, spawnTimer, enemies, spawnedInWave }
  }

  spawnTimer -= dt
  while (spawnTimer <= 0 && spawnQueue.length > 0) {
    const kind = spawnQueue[0]

    if (kind === EnemyKind.swarm) {
      const center = spawnPositionNearShip(shipPos, worldSize, forwardDir, waveNumber)
      while (spawnQueue.length > 0 && spawnQueue[0] === EnemyKind.swarm) {
        const pos = {
          x: center.x + rng.range(-SWARM_SPAWN_SPREAD, SWARM_SPAWN_SPREAD),
          y: center.y + rng.range(-SWARM_SPAWN_SPREAD, SWARM_SPAWN_SPREAD),
        }
        enemies = [...enemies, spawnEnemy(EnemyKind.swarm, pos, waveNumber)]
        spawnQueue = spawnQueue.slice(1)
        spawnedInWave++
      }
    } else {
      spawnQueue = spawnQueue.slice(1)
      const pos = spawnPositionNearShip(shipPos, worldSize, forwardDir, waveNumber)
      enemies = [...enemies, spawnEnemy(kind, pos, waveNumber)]
      spawnedInWave++
    }

    if (spawnQueue.length > 0) {
      spawnTimer += rng.range(SPAWN_DELAY.min, SPAWN_DELAY.max)
    }
  }

  return { spawnQueue, spawnTimer, enemies, spawnedInWave }
}
