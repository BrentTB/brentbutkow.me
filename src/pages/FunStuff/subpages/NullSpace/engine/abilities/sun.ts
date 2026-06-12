import { SUN } from './ability-data'
import { damageEnemiesInRadius } from '../math/aoe'
import { uid } from '../entities/entity-creator'
import { AbilityKind, EffectKind } from '../types'
import type { SunEffect, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { makeAbilityUpgrade, applyTierSum, type AbilityDefinition } from './ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'

export const SUN_UPGRADE_IDS = {
  unlockSun: 'unlockSun',
  sunDamage: 'sunDamage',
  sunDuration: 'sunDuration',
  sunRadius: 'sunRadius',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.sun)

const unlockUpgrade = upgrade({
  id: SUN_UPGRADE_IDS.unlockSun,
  label: 'Unlock Sun',
  description: 'Unlock the devastating Sun',
  tiers: [{ cost: 50, value: 1 }],
})

const damageUpgrade = upgrade({
  id: SUN_UPGRADE_IDS.sunDamage,
  label: 'Damage',
  description: 'Increase sun damage per second',
  tiers: [
    { cost: 15, value: 5 },
    { cost: 60, value: 8 },
    { cost: 200, value: 12 },
    { cost: 400, value: 18 },
    { cost: 800, value: 25 },
  ],
})

const durationUpgrade = upgrade({
  id: SUN_UPGRADE_IDS.sunDuration,
  label: 'Duration',
  description: 'Increase sun duration',
  tiers: [
    { cost: 20, value: 1 },
    { cost: 80, value: 2 },
  ],
})

const radiusUpgrade = upgrade({
  id: SUN_UPGRADE_IDS.sunRadius,
  label: 'Range',
  description: 'Increase sun radiation radius',
  tiers: [
    { cost: 15, value: 30 },
    { cost: 60, value: 50 },
    { cost: 200, value: 80 },
  ],
})

export function createSunEffect(
  pos: Vec2,
  radius: number,
  damagePerSec: number,
  duration: number
): SunEffect {
  return {
    id: uid(),
    kind: EffectKind.sun,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    damagePerSec,
  }
}

function tickSun(sun: SunEffect, ctx: EffectTickContext): EffectTickResult {
  if (sun.elapsed >= sun.duration) {
    return passThroughTick(null, ctx)
  }

  const { enemies, scoreGained, killedEnemies } = damageEnemiesInRadius(
    ctx.enemies,
    sun.pos,
    sun.radius,
    sun.damagePerSec,
    ctx.dt
  )

  return {
    effect: sun,
    enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained,
    killedEnemies,
  }
}

function renderSun(ctx: CanvasRenderingContext2D, sun: SunEffect, camera: Camera): void {
  const screen = worldToScreen(sun.pos, camera)
  const fadeIn = Math.min(0.5, sun.duration * 0.15)
  const fadeOut = Math.min(1.0, sun.duration * 0.3)
  const fadeOutStart = sun.duration - fadeOut
  let alpha: number
  if (sun.elapsed < fadeIn) alpha = sun.elapsed / fadeIn
  else if (sun.elapsed > fadeOutStart) alpha = Math.max(0, (sun.duration - sun.elapsed) / fadeOut)
  else alpha = 1

  const pulse = 1 + Math.sin(sun.elapsed * 4) * 0.04
  const r = sun.radius * pulse

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Corona — outer glow
  const corona = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.4)
  corona.addColorStop(0, 'rgba(255, 220, 120, 0.35)')
  corona.addColorStop(0.5, 'rgba(255, 140, 60, 0.18)')
  corona.addColorStop(1, 'rgba(255, 100, 40, 0)')
  ctx.fillStyle = corona
  ctx.beginPath()
  ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2)
  ctx.fill()

  // Core — bright center
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  core.addColorStop(0, 'rgba(255, 250, 230, 1)')
  core.addColorStop(0.4, 'rgba(255, 220, 120, 0.9)')
  core.addColorStop(0.8, 'rgba(255, 140, 60, 0.5)')
  core.addColorStop(1, 'rgba(255, 100, 40, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export const sunEffect: EffectDefinition = {
  tick: (effect, ctx) => tickSun(effect as SunEffect, ctx),
  renderBack: (ctx, effect, camera) => renderSun(ctx, effect as SunEffect, camera),
}

export const sun: AbilityDefinition = {
  kind: AbilityKind.sun,
  meta: { icon: IconName.sun, label: 'Sun' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.sun,
    cooldown: SUN.cooldown,
    powerCost: SUN.powerCost,
    damage: SUN.damagePerSec,
    aoeRadius: SUN.radius,
    duration: SUN.duration,
  }),
  effectFactory: (ability, pos) => [
    createSunEffect(pos, ability.aoeRadius, ability.damage, ability.duration ?? SUN.duration),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[SUN_UPGRADE_IDS.unlockSun].currentTier > 0,
    damage: applyTierSum(SUN.damagePerSec, upgrades, damageUpgrade),
    duration: applyTierSum(SUN.duration, upgrades, durationUpgrade),
    aoeRadius: applyTierSum(SUN.radius, upgrades, radiusUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, durationUpgrade, radiusUpgrade],
  ultimate: {
    kind: AbilityKind.supernova,
    label: 'Supernova',
    description: 'The sun collapses, then detonates — a brief blast for 5× damage.',
    cost: { stardust: 450, spaceMetal: 16 },
  },
}
