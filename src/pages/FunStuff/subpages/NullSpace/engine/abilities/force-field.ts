import { FORCE_FIELD, SHIELD } from './ability-data'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { AbilityKind, EffectKind, ProjectileOwner } from '../types'
import type { ForceFieldEffect, Particle, Projectile, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from './ability-definition'
import { shield } from './shield'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'

export const FORCE_FIELD_UPGRADE_IDS = {
  forceFieldDamage: 'forceFieldDamage',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.forceField)

const overloadUpgrade = upgrade({
  id: FORCE_FIELD_UPGRADE_IDS.forceFieldDamage,
  label: 'Overload',
  description: 'Force field burns harder on contact',
  tiers: [
    { cost: 70, value: 15 },
    { cost: 200, value: 20 },
    { cost: 460, value: 30 },
  ],
})

export function createForceFieldEffect(
  pos: Vec2,
  startRadius: number,
  growDuration: number,
  bumpDamage: number
): ForceFieldEffect {
  return {
    id: uid(),
    kind: EffectKind.forceField,
    pos: { ...pos },
    elapsed: 0,
    duration: growDuration,
    radius: startRadius,
    startRadius,
    maxRadius: startRadius * FORCE_FIELD.maxRadiusScale,
    growDuration,
    knockback: FORCE_FIELD.knockback,
    bumpDamage,
    grandfatheredEnemyIds: null,
  }
}

// Live radius of a force field at `field.elapsed`: grows linearly from
// startRadius to maxRadius (2×) over growDuration. Stored back onto the effect
// each tick so applyShieldConstraints reads the same size the renderer draws.
export function getForceFieldCurrentRadius(field: ForceFieldEffect): number {
  if (field.elapsed <= 0) return field.startRadius
  const t = field.growDuration > 0 ? Math.min(1, field.elapsed / field.growDuration) : 1
  return field.startRadius + (field.maxRadius - field.startRadius) * t
}

function tickForceField(field: ForceFieldEffect, ctx: EffectTickContext): EffectTickResult {
  if (field.elapsed >= field.duration) {
    return passThroughTick(null, ctx)
  }

  const radius = getForceFieldCurrentRadius(field)
  const radiusSq = radius * radius

  // Same grandfathering as the base shield: only NEW entrants are blocked;
  // anyone caught inside at spawn (or as the field grows over them) gets a free
  // pass until they leave, then can't re-enter.
  const insideThisTick = new Set<string>()
  for (const enemy of ctx.enemies) {
    const dx = enemy.pos.x - field.pos.x
    const dy = enemy.pos.y - field.pos.y
    if (dx * dx + dy * dy < radiusSq) insideThisTick.add(enemy.id)
  }
  const grandfathered =
    field.grandfatheredEnemyIds === null
      ? [...insideThisTick]
      : field.grandfatheredEnemyIds.filter((id) => insideThisTick.has(id))

  // Absorb enemy projectiles inside the field; leave ship projectiles alone.
  const remainingProjectiles: Projectile[] = []
  const absorbParticles: Particle[] = []
  for (const p of ctx.projectiles) {
    if (p.owner === ProjectileOwner.enemy) {
      const dx = p.pos.x - field.pos.x
      const dy = p.pos.y - field.pos.y
      if (dx * dx + dy * dy < radiusSq) {
        absorbParticles.push(...spawnExplosionParticles(p.pos, 3, '#c8a8ff'))
        continue
      }
    }
    remainingProjectiles.push(p)
  }

  return {
    effect: { ...field, radius, grandfatheredEnemyIds: grandfathered },
    enemies: ctx.enemies,
    projectiles: remainingProjectiles,
    particles: absorbParticles,
    scoreGained: 0,
    killedEnemies: [],
  }
}

function renderForceField(
  ctx: CanvasRenderingContext2D,
  field: ForceFieldEffect,
  camera: Camera
): void {
  const screen = worldToScreen(field.pos, camera)
  const fadeIn = Math.min(0.3, field.duration * 0.1)
  const fadeOut = Math.min(0.6, field.duration * 0.25)
  const fadeOutStart = field.duration - fadeOut
  let alpha: number
  if (field.elapsed < fadeIn) alpha = field.elapsed / fadeIn
  else if (field.elapsed > fadeOutStart)
    alpha = Math.max(0, (field.duration - field.elapsed) / fadeOut)
  else alpha = 1

  const pulse = 0.85 + Math.sin(field.elapsed * 6) * 0.15
  const r = field.radius

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Violet dome — distinct from the cool-blue base shield.
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  gradient.addColorStop(0, 'rgba(190, 150, 255, 0.05)')
  gradient.addColorStop(0.6, 'rgba(180, 120, 255, 0.12)')
  gradient.addColorStop(1, 'rgba(150, 90, 255, 0.3)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(200, 160, 255, ${0.7 * pulse})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

export const forceFieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickForceField(effect as ForceFieldEffect, ctx),
  renderBack: (ctx, effect, camera) => renderForceField(ctx, effect as ForceFieldEffect, camera),
}

export const forceField: AbilityDefinition = {
  kind: AbilityKind.forceField,
  ultimateOf: AbilityKind.shield,
  meta: { icon: IconName.shield, label: 'Force Field' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.forceField,
    cooldown: SHIELD.cooldown,
    powerCost: SHIELD.powerCost * FORCE_FIELD.costMultiplier,
    damage: FORCE_FIELD.bumpDamage,
    aoeRadius: SHIELD.radius,
    duration: FORCE_FIELD.growDuration,
  }),
  effectFactory: (ability, pos) => [
    createForceFieldEffect(
      pos,
      ability.aoeRadius,
      ability.duration ?? FORCE_FIELD.growDuration,
      ability.damage
    ),
  ],
  applyUpgrades: composeUltimateUpgrades(shield, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? SHIELD.powerCost) * FORCE_FIELD.costMultiplier,
    damage: applyTierSum(FORCE_FIELD.bumpDamage, upgrades, overloadUpgrade),
  })),
  modifierUpgrades: [overloadUpgrade],
}
