import { spawnExplosionParticles } from '../../entities/entity-creator'
import { ProjectileOwner } from '../../types'
import { toroidalDelta } from '../../math/toroid'
import type { ForceFieldEffect, Particle, Projectile, ShieldEffect, Vec2 } from '../../types'
import type { EffectTickContext, EffectTickResult } from '../../systems/effect-definition'

// Removes enemy projectiles caught inside a circle, spawning a small absorb
// burst where each one vanishes. Shared by the dome abilities (Shield, Force
// Field) and the Repulse field — anything that should soak up enemy fire.
export function absorbEnemyProjectiles(
  center: Vec2,
  radius: number,
  projectiles: Projectile[],
  absorbColor: string
): { projectiles: Projectile[]; particles: Particle[] } {
  const radiusSq = radius * radius
  const remaining: Projectile[] = []
  const particles: Particle[] = []
  for (const p of projectiles) {
    if (p.owner === ProjectileOwner.enemy) {
      const { x: dx, y: dy } = toroidalDelta(center, p.pos)
      if (dx * dx + dy * dy < radiusSq) {
        particles.push(...spawnExplosionParticles(p.pos, 3, absorbColor))
        continue
      }
    }
    remaining.push(p)
  }
  return { projectiles: remaining, particles }
}

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
  const { projectiles, particles } = absorbEnemyProjectiles(
    zone.pos,
    radius,
    ctx.projectiles,
    absorbColor
  )

  return {
    effect: { ...zone, radius, grandfatheredEnemyIds: grandfathered },
    enemies: ctx.enemies,
    projectiles,
    particles,
    scoreGained: 0,
    killedEnemies: [],
  }
}
