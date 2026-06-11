import { BLACK_HOLE } from './ability-data'
import { canEnemyTakeDamage } from '../bosses/index'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { AbilityKind, EffectKind, UpgradeCategory, UpgradeId } from '../types'
import type { BlackHoleEffect, Enemy, Particle, UpgradeDefinition, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { applyTierSum, type AbilityDefinition } from './ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'

const unlockUpgrade: UpgradeDefinition = {
  id: UpgradeId.unlockBlackHole,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Unlock Black Hole',
  description: 'Unlock the gravity-warping Black Hole',
  tiers: [{ cost: 20, value: 1 }],
}

const damageUpgrade: UpgradeDefinition = {
  id: UpgradeId.blackHoleDamage,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Damage',
  description: 'Increase black hole damage over time',
  tiers: [
    { cost: 10, value: 1 },
    { cost: 40, value: 2 },
    { cost: 140, value: 3 },
    { cost: 280, value: 4 },
    { cost: 560, value: 5 },
  ],
}

const durationUpgrade: UpgradeDefinition = {
  id: UpgradeId.blackHoleDuration,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Duration',
  description: 'Increase black hole duration',
  tiers: [
    { cost: 12, value: 1 },
    { cost: 48, value: 1.5 },
    { cost: 192, value: 2 },
  ],
}

const radiusUpgrade: UpgradeDefinition = {
  id: UpgradeId.blackHoleRadius,
  category: UpgradeCategory.weapons,
  weapon: AbilityKind.blackHole,
  label: 'Range',
  description: 'Increase black hole pull radius',
  tiers: [
    { cost: 12, value: 25 },
    { cost: 48, value: 40 },
    { cost: 192, value: 70 },
  ],
}

export function createBlackHoleEffect(
  pos: Vec2,
  radius: number,
  pullStrength: number,
  damage: number,
  duration: number
): BlackHoleEffect {
  return {
    id: uid(),
    kind: EffectKind.blackHole,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    pullStrength,
    damage,
  }
}

function tickBlackHole(hole: BlackHoleEffect, ctx: EffectTickContext): EffectTickResult {
  if (hole.elapsed >= hole.duration) {
    return passThroughTick(null, ctx)
  }

  const r = applyBlackHoleEffect(ctx.enemies, hole, ctx.dt)
  return {
    effect: hole,
    enemies: r.enemies,
    projectiles: ctx.projectiles,
    particles: r.particles,
    scoreGained: r.scoreGained,
    killedEnemies: r.killedEnemies,
  }
}

function applyBlackHoleEffect(
  enemies: Enemy[],
  hole: BlackHoleEffect,
  dt: number
): {
  enemies: Enemy[]
  scoreGained: number
  killedEnemies: Enemy[]
  particles: Particle[]
} {
  let scoreGained = 0
  const surviving: Enemy[] = []
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []

  for (const enemy of enemies) {
    const dx = hole.pos.x - enemy.pos.x
    const dy = hole.pos.y - enemy.pos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > hole.radius) {
      surviving.push(enemy)
      continue
    }

    const nx = dist > 1 ? dx / dist : 0
    const ny = dist > 1 ? dy / dist : 0

    const strength = (1 - dist / hole.radius) * hole.pullStrength * dt
    const radial = 0.25
    const tangential = 0.85
    const spiralX = nx * strength * radial - ny * strength * tangential
    const spiralY = ny * strength * radial + nx * strength * tangential

    const distRatio = Math.max(0, 1 - dist / hole.radius)
    // Still pulled in, but invincible enemies (shielded boss) take no damage.
    const damageThisTick = canEnemyTakeDamage(enemy, enemies)
      ? hole.damage * (0.5 + distRatio * 1.5) * dt
      : 0

    const moved = {
      ...enemy,
      pos: {
        x: enemy.pos.x + spiralX,
        y: enemy.pos.y + spiralY,
      },
      hp: enemy.hp - damageThisTick,
    }

    if (moved.hp <= 0) {
      scoreGained += enemy.scoreValue
      killedEnemies.push(enemy)
      particles.push(...spawnExplosionParticles(enemy.pos, 8, '#6644cc'))
    } else {
      surviving.push(moved)
    }
  }

  return { enemies: surviving, scoreGained, killedEnemies, particles }
}

// Core gradients are static (colors + radius), so cache one per radius per
// context rather than rebuilding every frame. Painted under a translate so the
// origin-centered gradient follows the hole's screen position.
const blackHoleGradients = new WeakMap<CanvasRenderingContext2D, Map<number, CanvasGradient>>()

function getBlackHoleGradient(ctx: CanvasRenderingContext2D, radius: number): CanvasGradient {
  let byRadius = blackHoleGradients.get(ctx)
  if (!byRadius) {
    byRadius = new Map()
    blackHoleGradients.set(ctx, byRadius)
  }
  let gradient = byRadius.get(radius)
  if (!gradient) {
    gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    gradient.addColorStop(0, 'rgba(20, 0, 40, 0.9)')
    gradient.addColorStop(0.3, 'rgba(40, 10, 80, 0.6)')
    gradient.addColorStop(0.7, 'rgba(80, 30, 160, 0.2)')
    gradient.addColorStop(1, 'rgba(100, 50, 200, 0)')
    byRadius.set(radius, gradient)
  }
  return gradient
}

function renderBlackHole(
  ctx: CanvasRenderingContext2D,
  hole: BlackHoleEffect,
  camera: Camera
): void {
  const screen = worldToScreen(hole.pos, camera)
  const fadeIn = Math.min(3, hole.duration * 0.3)
  const fadeOut = Math.min(8, hole.duration * 0.6)
  const fadeOutStart = hole.duration - fadeOut
  let alpha: number
  if (hole.elapsed < fadeIn) {
    alpha = hole.elapsed / fadeIn
  } else if (hole.elapsed > fadeOutStart) {
    alpha = Math.max(0, (hole.duration - hole.elapsed) / fadeOut)
  } else {
    alpha = 1
  }

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  ctx.fillStyle = getBlackHoleGradient(ctx, hole.radius)
  ctx.beginPath()
  ctx.arc(0, 0, hole.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(130, 80, 200, 0.4)'
  ctx.lineWidth = 1.5
  for (let ring = 0; ring < 3; ring++) {
    const ringRadius = hole.radius * (0.3 + ring * 0.25)
    const rotAngle = hole.elapsed * (2 + ring) + ring * 2
    ctx.beginPath()
    ctx.arc(0, 0, ringRadius, rotAngle, rotAngle + Math.PI * 1.2)
    ctx.stroke()
  }

  ctx.restore()
}

export const blackHoleEffect: EffectDefinition = {
  tick: (effect, ctx) => tickBlackHole(effect as BlackHoleEffect, ctx),
  renderBack: (ctx, effect, camera) => renderBlackHole(ctx, effect as BlackHoleEffect, camera),
}

export const blackHole: AbilityDefinition = {
  kind: AbilityKind.blackHole,
  meta: { icon: IconName.blackHole, label: 'Black Hole' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.blackHole,
    cooldown: BLACK_HOLE.cooldown,
    powerCost: BLACK_HOLE.powerCost,
    damage: BLACK_HOLE.damage,
    aoeRadius: BLACK_HOLE.radius,
    duration: BLACK_HOLE.duration,
  }),
  effectFactory: (ability, pos) => [
    createBlackHoleEffect(
      pos,
      ability.aoeRadius,
      BLACK_HOLE.pullStrength,
      ability.damage,
      ability.duration ?? BLACK_HOLE.duration
    ),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[UpgradeId.unlockBlackHole].currentTier > 0,
    damage: applyTierSum(BLACK_HOLE.damage, upgrades, damageUpgrade),
    duration: applyTierSum(BLACK_HOLE.duration, upgrades, durationUpgrade),
    aoeRadius: applyTierSum(BLACK_HOLE.radius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, durationUpgrade, radiusUpgrade],
}
