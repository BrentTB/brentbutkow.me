import { canEnemyTakeDamage } from '../bosses/index'
import { applyDamageToEnemy } from '../entities/enemy-damage'
import { spawnExplosionParticles } from '../entities/entity-creator'
import { distance } from '../math/collision'
import type { Enemy, Particle, Vec2 } from '../types'

// Particle burst spawned at an enemy when the beam hits it.
type BeamBurst = { count: number; color: string }

type BeamDamageOptions = {
  // Burst spawned when the hit kills the enemy.
  killBurst: BeamBurst
  // Burst spawned when the hit lands but the enemy survives. Omit for none.
  surviveBurst?: BeamBurst
  // Maps a surviving (already-damaged) enemy to its stored form — e.g. stamping
  // a burning status. Identity when omitted.
  onSurvive?: (enemy: Enemy) => Enemy
}

export type BeamDamageResult = {
  enemies: Enemy[]
  particles: Particle[]
  killedEnemies: Enemy[]
}

// Damages every targetable enemy within `radius` (+ the enemy's own radius) of
// `origin` by `damage`, splitting kills from survivors and emitting hit
// particles. Shared by Solar Flare and its ultimate Solar Plague (which stamps
// burning on survivors). Invincible enemies (shielded boss) are skipped.
export function damageEnemiesInBeam(
  enemies: Enemy[],
  particles: Particle[],
  origin: Vec2,
  radius: number,
  damage: number,
  options: BeamDamageOptions
): BeamDamageResult {
  const survivors: Enemy[] = []
  const killedEnemies: Enemy[] = []
  let nextParticles = particles

  for (const enemy of enemies) {
    if (distance(origin, enemy.pos) < radius + enemy.radius && canEnemyTakeDamage(enemy, enemies)) {
      const damaged = applyDamageToEnemy(enemy, damage)
      if (damaged.hp <= 0) {
        killedEnemies.push(enemy)
        nextParticles = [
          ...nextParticles,
          ...spawnExplosionParticles(enemy.pos, options.killBurst.count, options.killBurst.color),
        ]
      } else {
        survivors.push(options.onSurvive ? options.onSurvive(damaged) : damaged)
        if (options.surviveBurst) {
          nextParticles = [
            ...nextParticles,
            ...spawnExplosionParticles(
              enemy.pos,
              options.surviveBurst.count,
              options.surviveBurst.color
            ),
          ]
        }
      }
    } else {
      survivors.push(enemy)
    }
  }

  return { enemies: survivors, particles: nextParticles, killedEnemies }
}
