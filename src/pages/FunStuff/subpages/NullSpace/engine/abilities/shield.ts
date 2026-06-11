import { SHIELD } from './ability-data'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { AbilityKind, EffectKind, ProjectileOwner, UpgradeCategory, UpgradeId } from '../types'
import type {
  ActiveEffect,
  Enemy,
  Particle,
  Projectile,
  ShieldEffect,
  UpgradeDefinition,
  Vec2,
} from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { applyCostReduction, applyTierSum, type AbilityDefinition } from './ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockShield,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Unlock Shield',
  description: 'Unlock the Shield barrier',
  tiers: [{ cost: 30, value: 1 }],
}

const durationUpgrade: UpgradeDefinition = {
  id: UpgradeId.shieldDuration,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Duration',
  description: 'Increase shield duration',
  tiers: [
    { cost: 12, value: 1.5 },
    { cost: 48, value: 2.5 },
    { cost: 192, value: 3.5 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.shieldRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Size',
  description: 'Increase shield radius',
  tiers: [
    { cost: 10, value: 15 },
    { cost: 40, value: 25 },
    { cost: 140, value: 40 },
  ],
}

const costUpgrade: UpgradeDefinition = {
  id: UpgradeId.shieldCostReduction,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.shield,
  label: 'Efficiency',
  description: 'Reduce shield power cost',
  tiers: [
    { cost: 12, value: 5 },
    { cost: 48, value: 5 },
  ],
}

export function createShieldEffect(pos: Vec2, radius: number, duration: number): ShieldEffect {
  return {
    id: uid(),
    kind: EffectKind.shield,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    grandfatheredEnemyIds: null,
  }
}

function tickShield(zone: ShieldEffect, ctx: EffectTickContext): EffectTickResult {
  if (zone.elapsed >= zone.duration) {
    return passThroughTick(null, ctx)
  }

  // Grandfathered list = enemies that have been inside the shield CONTINUOUSLY
  // since it spawned. The shield only blocks NEW entries — anyone caught
  // inside at spawn time gets to wander out freely, BUT once they leave they
  // can't come back. Recompute the list every tick to enforce that.
  const radiusSq = zone.radius * zone.radius
  const insideThisTick = new Set<string>()
  for (const enemy of ctx.enemies) {
    const dx = enemy.pos.x - zone.pos.x
    const dy = enemy.pos.y - zone.pos.y
    if (dx * dx + dy * dy < radiusSq) insideThisTick.add(enemy.id)
  }
  let grandfathered: string[]
  if (zone.grandfatheredEnemyIds === null) {
    // First tick — everyone currently inside gets grandfathered.
    grandfathered = [...insideThisTick]
  } else {
    // Subsequent ticks — keep only the IDs that are STILL inside. An enemy
    // that has moved outside drops off the list and is treated as a newcomer
    // on any future re-entry attempt.
    grandfathered = zone.grandfatheredEnemyIds.filter((id) => insideThisTick.has(id))
  }

  // Absorb enemy projectiles inside the shield; leave ship projectiles alone.
  // Bullets fired from inside (by grandfathered enemies) are still absorbed.
  const remainingProjectiles: Projectile[] = []
  const absorbParticles: Particle[] = []
  for (const p of ctx.projectiles) {
    if (p.owner === ProjectileOwner.enemy) {
      const dx = p.pos.x - zone.pos.x
      const dy = p.pos.y - zone.pos.y
      if (dx * dx + dy * dy < radiusSq) {
        absorbParticles.push(...spawnExplosionParticles(p.pos, 3, '#88ccff'))
        continue
      }
    }
    remainingProjectiles.push(p)
  }

  return {
    effect: { ...zone, grandfatheredEnemyIds: grandfathered },
    enemies: ctx.enemies,
    projectiles: remainingProjectiles,
    particles: absorbParticles,
    scoreGained: 0,
    killedEnemies: [],
  }
}

/**
 * Push non-grandfathered enemies that are inside any active shield out to the
 * edge of that shield. Called AFTER enemy movement so an enemy that just
 * walked into a shield this frame gets bounced back to the boundary.
 *
 * Shape: similar to homing — pure geometry, no allocations on the hot path
 * when no shields are active.
 */
export function applyShieldConstraints(effects: ActiveEffect[], enemies: Enemy[]): Enemy[] {
  let active: ShieldEffect[] | null = null
  for (const e of effects) {
    if (e.kind === EffectKind.shield) {
      if (!active) active = []
      active.push(e)
    }
  }
  if (!active) return enemies

  return enemies.map((enemy) => {
    let pos = enemy.pos
    let vel = enemy.vel
    let bumped = false
    for (const zone of active!) {
      if (zone.grandfatheredEnemyIds?.includes(enemy.id)) continue
      const dx = pos.x - zone.pos.x
      const dy = pos.y - zone.pos.y
      const distSq = dx * dx + dy * dy
      if (distSq < zone.radius * zone.radius) {
        const dist = Math.sqrt(distSq)
        // Outward unit normal from shield center to enemy.
        const nx = dist > 0.01 ? dx / dist : 1
        const ny = dist > 0.01 ? dy / dist : 0
        // Snap to the edge so we never have an enemy genuinely inside the shield.
        pos = {
          x: zone.pos.x + nx * zone.radius,
          y: zone.pos.y + ny * zone.radius,
        }
        // Bounce: reflect the inward velocity component, keep the tangential
        // component. Enemies moving outward (vDotN >= 0) aren't bounced —
        // they're already leaving on their own.
        const vDotN = vel.x * nx + vel.y * ny
        if (vDotN < 0) {
          vel = {
            x: vel.x - 2 * vDotN * nx,
            y: vel.y - 2 * vDotN * ny,
          }
        }
        bumped = true
      }
    }
    return bumped ? { ...enemy, pos, vel } : enemy
  })
}

function renderShield(ctx: CanvasRenderingContext2D, dome: ShieldEffect, camera: Camera): void {
  const screen = worldToScreen(dome.pos, camera)
  const fadeIn = Math.min(0.4, dome.duration * 0.15)
  const fadeOut = Math.min(0.8, dome.duration * 0.3)
  const fadeOutStart = dome.duration - fadeOut
  let alpha: number
  if (dome.elapsed < fadeIn) alpha = dome.elapsed / fadeIn
  else if (dome.elapsed > fadeOutStart)
    alpha = Math.max(0, (dome.duration - dome.elapsed) / fadeOut)
  else alpha = 1

  const pulse = 0.85 + Math.sin(dome.elapsed * 5) * 0.15

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Translucent dome fill
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, dome.radius)
  gradient.addColorStop(0, 'rgba(120, 200, 255, 0.05)')
  gradient.addColorStop(0.6, 'rgba(120, 200, 255, 0.1)')
  gradient.addColorStop(1, 'rgba(60, 180, 255, 0.25)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, dome.radius, 0, Math.PI * 2)
  ctx.fill()

  // Pulsing rim
  ctx.strokeStyle = `rgba(120, 220, 255, ${0.6 * pulse})`
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, dome.radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

export const shieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickShield(effect as ShieldEffect, ctx),
  renderBack: (ctx, effect, camera) => renderShield(ctx, effect as ShieldEffect, camera),
}

export const shield: AbilityDefinition = {
  kind: AbilityKind.shield,
  meta: { icon: IconName.shield, label: 'Shield' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.shield,
    cooldown: SHIELD.cooldown,
    powerCost: SHIELD.powerCost,
    // Shield is a movement barrier, not a damage dealer.
    damage: 0,
    aoeRadius: SHIELD.radius,
    duration: SHIELD.duration,
  }),
  effectFactory: (ability, pos) => [
    createShieldEffect(pos, ability.aoeRadius, ability.duration ?? SHIELD.duration),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockShield].currentTier > 0,
    aoeRadius: applyTierSum(SHIELD.radius, upgrades, radiusUpgrade),
    duration: applyTierSum(SHIELD.duration, upgrades, durationUpgrade),
    powerCost: applyCostReduction(SHIELD.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [durationUpgrade, radiusUpgrade, costUpgrade],
}
