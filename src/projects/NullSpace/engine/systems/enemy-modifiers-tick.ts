import { ENEMY_MODIFIERS } from '../../data'
import { createParticle } from '../entities/entity-creator'
import { rng } from '../math/random'
import { EnemyModifier } from '../types'
import type { Enemy, Particle } from '../types'

export type ModifierTickResult = { enemies: Enemy[]; particles: Particle[] }

// Per-frame upkeep for modified enemies: regenerate shield-modifier pools (after
// their hit cooldown, mirroring the ship's shield) and trail red embers behind
// speed-modifier enemies. The hit cooldown itself is set in applyDamageToEnemy.
export function updateModifiedEnemies(enemies: Enemy[], dt: number): ModifierTickResult {
  const particles: Particle[] = []
  const next = enemies.map((enemy) => {
    let e = enemy

    const s = e.enemyShield
    if (s) {
      if (s.cooldownRemaining > 0) {
        e = {
          ...e,
          enemyShield: { ...s, cooldownRemaining: Math.max(0, s.cooldownRemaining - dt) },
        }
      } else if (s.shield < s.maxShield) {
        e = { ...e, enemyShield: { ...s, shield: Math.min(s.maxShield, s.shield + s.regen * dt) } }
      }
    }

    if (e.modifier === EnemyModifier.speed && rng.next() < ENEMY_MODIFIERS.speedTrailChance) {
      particles.push(
        createParticle(
          { x: e.pos.x, y: e.pos.y },
          { x: -e.vel.x * 0.12, y: -e.vel.y * 0.12 },
          ENEMY_MODIFIERS.speedTrailColor,
          ENEMY_MODIFIERS.speedTrailLifetime,
          ENEMY_MODIFIERS.speedTrailSize
        )
      )
    }

    return e
  })

  return { enemies: next, particles }
}
