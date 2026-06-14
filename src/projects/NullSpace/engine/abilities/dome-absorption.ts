import { spawnExplosionParticles } from '../entities/entity-creator'
import { ProjectileOwner } from '../types'
import { toroidalDelta } from '../math/toroid'
import type { ForceFieldEffect, Particle, Projectile, ShieldEffect } from '../types'
import type { EffectTickContext, EffectTickResult } from '../systems/effect-definition'

// Shared tick for dome abilities — the base Shield and its Force Field ultimate.
// Both enforce the same grandfathering (only enemies inside CONTINUOUSLY since
// spawn get a free pass; once they leave they can't return — applyShieldConstraints
// bounces the newcomers out) and both absorb enemy projectiles caught inside.
// Callers pass the live `radius` (static for the shield, growing for the force
// field) and the absorb-particle color.
export function tickDomeAbsorption(
  zone: ShieldEffect | ForceFieldEffect,
  ctx: EffectTickContext,
  radius: number,
  absorbColor: string
): EffectTickResult {
  const radiusSq = radius * radius
  const insideThisTick = new Set<string>()
  for (const enemy of ctx.enemies) {
    const { x: dx, y: dy } = toroidalDelta(zone.pos, enemy.pos)
    if (dx * dx + dy * dy < radiusSq) insideThisTick.add(enemy.id)
  }
  const grandfathered =
    zone.grandfatheredEnemyIds === null
      ? [...insideThisTick]
      : zone.grandfatheredEnemyIds.filter((id) => insideThisTick.has(id))

  // Bullets fired from inside (by grandfathered enemies) are still absorbed.
  const remainingProjectiles: Projectile[] = []
  const absorbParticles: Particle[] = []
  for (const p of ctx.projectiles) {
    if (p.owner === ProjectileOwner.enemy) {
      const { x: dx, y: dy } = toroidalDelta(zone.pos, p.pos)
      if (dx * dx + dy * dy < radiusSq) {
        absorbParticles.push(...spawnExplosionParticles(p.pos, 3, absorbColor))
        continue
      }
    }
    remainingProjectiles.push(p)
  }

  return {
    effect: { ...zone, radius, grandfatheredEnemyIds: grandfathered },
    enemies: ctx.enemies,
    projectiles: remainingProjectiles,
    particles: absorbParticles,
    scoreGained: 0,
    killedEnemies: [],
  }
}
