import { canEnemyTakeDamage } from '../bosses'
import { VOID_WORM } from '../bosses/void-worm'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { toroidalDelta } from './toroid'
import { EnemyKind } from '../types'
import type { Enemy, Vec2 } from '../types'

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
  // Burst AoE soaks through the Void Worm body — see segmentFalloff.
  return applyDamage(enemies, center, radius, damage, { segmentFalloff: true })
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

function applyDamage(
  enemies: Enemy[],
  center: Vec2,
  radius: number,
  damage: number,
  opts?: { segmentFalloff?: boolean }
): AoeResult {
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  let scoreGained = 0
  let powerGained = 0
  const radiusSq = radius * radius

  // Burst AoE loses bite tearing down the Void Worm body — each further segment
  // takes a smaller share (DOT zones pass no flag and hit every segment in full).
  const segmentMult = opts?.segmentFalloff
    ? wormSegmentFalloff(enemies, center, radiusSq)
    : undefined

  for (const enemy of enemies) {
    const { x: dx, y: dy } = toroidalDelta(center, enemy.pos)
    if (dx * dx + dy * dy > radiusSq) {
      surviving.push(enemy)
      continue
    }

    // Invincible enemies (shielded boss) absorb AoE without taking damage.
    if (!canEnemyTakeDamage(enemy, enemies)) {
      surviving.push(enemy)
      continue
    }

    const next = applyDamageToEnemy(enemy, damage * (segmentMult?.get(enemy.id) ?? 1))
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

// Maps each in-radius Void Worm segment's id to its blast multiplier: segments
// sorted by distance from the blast, the nearest taking the full hit and each
// further one VOID_WORM.aoeFalloff^index, floored. Other enemies aren't included
// (callers treat a missing entry as ×1).
function wormSegmentFalloff(enemies: Enemy[], center: Vec2, radiusSq: number): Map<string, number> {
  const hits: { id: string; d2: number }[] = []
  for (const e of enemies) {
    if (e.kind !== EnemyKind.wormSegment) continue
    // A segment that absorbs the hit takes no damage, so it mustn't occupy a falloff
    // slot and push the segments behind it to a deeper (weaker) index.
    if (!canEnemyTakeDamage(e, enemies)) continue
    const { x: dx, y: dy } = toroidalDelta(center, e.pos)
    const d2 = dx * dx + dy * dy
    if (d2 <= radiusSq) hits.push({ id: e.id, d2 })
  }
  hits.sort((a, b) => a.d2 - b.d2)
  const mult = new Map<string, number>()
  hits.forEach((h, i) =>
    mult.set(h.id, Math.max(VOID_WORM.aoeFalloffFloor, VOID_WORM.aoeFalloff ** i))
  )
  return mult
}
