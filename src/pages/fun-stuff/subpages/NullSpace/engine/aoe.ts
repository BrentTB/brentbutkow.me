import type { Enemy, Vec2 } from './types'

export type AoeResult = {
  enemies: Enemy[]
  killedEnemies: Enemy[]
  scoreGained: number
  powerGained: number
}

/**
 * Apply flat damage to every enemy within `radius` of `center`. Used by
 * instantaneous bursts (rocket detonation, future single-hit AoE abilities).
 * Shared with `damageEnemiesInRadius` (DOT variant) via the same circle test.
 */
export function damageEnemiesInRadiusFlat(
  enemies: Enemy[],
  center: Vec2,
  radius: number,
  damage: number
): AoeResult {
  return applyDamage(enemies, center, radius, damage)
}

/**
 * Apply per-second damage to every enemy within `radius` of `center`, scaled
 * by `dt`. Used by damage-over-time zones (shield, sun, future plasma fields).
 */
export function damageEnemiesInRadius(
  enemies: Enemy[],
  center: Vec2,
  radius: number,
  damagePerSec: number,
  dt: number
): AoeResult {
  return applyDamage(enemies, center, radius, damagePerSec * dt)
}

function applyDamage(enemies: Enemy[], center: Vec2, radius: number, damage: number): AoeResult {
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  let scoreGained = 0
  let powerGained = 0
  const radiusSq = radius * radius

  for (const enemy of enemies) {
    const dx = enemy.pos.x - center.x
    const dy = enemy.pos.y - center.y
    if (dx * dx + dy * dy > radiusSq) {
      surviving.push(enemy)
      continue
    }

    const next = { ...enemy, hp: enemy.hp - damage }
    if (next.hp <= 0) {
      killedEnemies.push(enemy)
      scoreGained += enemy.scoreValue
      powerGained += enemy.powerReward
    } else {
      surviving.push(next)
    }
  }

  return { enemies: surviving, killedEnemies, scoreGained, powerGained }
}
