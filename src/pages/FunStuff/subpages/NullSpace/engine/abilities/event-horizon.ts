import { BLACK_HOLE, EVENT_HORIZON } from './ability-data'
import { uid } from '../entities/entity-creator'
import { applyGravityWell } from './gravity-pull'
import { AbilityKind, EffectKind } from '../types'
import type { EventHorizonEffect, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from './ability-definition'
import { blackHole } from './black-hole'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'
import { passThroughTick } from '../systems/effect-definition'
import { IconName } from '../../icon-names'

export const EVENT_HORIZON_UPGRADE_IDS = {
  eventHorizonPull: 'eventHorizonPull',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.eventHorizon)

const pullUpgrade = upgrade({
  id: EVENT_HORIZON_UPGRADE_IDS.eventHorizonPull,
  label: 'Spaghettification',
  description: 'Drag enemies to the core harder',
  // Values add onto the base pull (pullStrength × pullScale) via applyTierSum.
  tiers: [
    { cost: 80, value: 150 },
    { cost: 220, value: 200 },
    { cost: 500, value: 250 },
  ],
})

const BASE_PULL = BLACK_HOLE.pullStrength * EVENT_HORIZON.pullScale

export function createEventHorizonEffect(
  pos: Vec2,
  radius: number,
  pullStrength: number,
  damage: number,
  duration: number
): EventHorizonEffect {
  return {
    id: uid(),
    kind: EffectKind.eventHorizon,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    pullStrength,
    damage,
    coreRadius: radius * EVENT_HORIZON.coreRadiusFraction,
    coreDamage: EVENT_HORIZON.coreDamage,
    banishDistance: EVENT_HORIZON.banishDistance,
  }
}

function tickEventHorizon(hole: EventHorizonEffect, ctx: EffectTickContext): EffectTickResult {
  if (hole.elapsed >= hole.duration) {
    return passThroughTick(null, ctx)
  }

  const r = applyGravityWell(
    ctx.enemies,
    { pos: hole.pos, radius: hole.radius, pullStrength: hole.pullStrength, damage: hole.damage },
    ctx.dt,
    {
      particleColor: '#a060ff',
      banish: {
        coreRadius: hole.coreRadius,
        coreDamage: hole.coreDamage,
        banishDistance: hole.banishDistance,
        shipPos: ctx.ship.pos,
        worldSize: ctx.worldSize,
      },
    }
  )
  return {
    effect: hole,
    enemies: r.enemies,
    projectiles: ctx.projectiles,
    particles: r.particles,
    scoreGained: r.scoreGained,
    killedEnemies: r.killedEnemies,
  }
}

function renderEventHorizon(
  ctx: CanvasRenderingContext2D,
  hole: EventHorizonEffect,
  camera: Camera
): void {
  const screen = worldToScreen(hole.pos, camera)
  const fadeIn = Math.min(2, hole.duration * 0.25)
  const fadeOut = Math.min(6, hole.duration * 0.5)
  const fadeOutStart = hole.duration - fadeOut
  let alpha: number
  if (hole.elapsed < fadeIn) alpha = hole.elapsed / fadeIn
  else if (hole.elapsed > fadeOutStart)
    alpha = Math.max(0, (hole.duration - hole.elapsed) / fadeOut)
  else alpha = 1

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  // Outer pull field — violet, larger and brighter than a base black hole.
  const field = ctx.createRadialGradient(0, 0, 0, 0, 0, hole.radius)
  field.addColorStop(0, 'rgba(30, 0, 60, 0.95)')
  field.addColorStop(0.25, 'rgba(70, 20, 140, 0.6)')
  field.addColorStop(0.65, 'rgba(120, 60, 230, 0.25)')
  field.addColorStop(1, 'rgba(150, 90, 255, 0)')
  ctx.fillStyle = field
  ctx.beginPath()
  ctx.arc(0, 0, hole.radius, 0, Math.PI * 2)
  ctx.fill()

  // Accretion rings — faster swirl than the base hole sells the stronger pull.
  ctx.strokeStyle = 'rgba(180, 130, 255, 0.5)'
  ctx.lineWidth = 1.5
  for (let ring = 0; ring < 4; ring++) {
    const ringRadius = hole.radius * (0.25 + ring * 0.2)
    const rotAngle = hole.elapsed * (4 + ring * 1.5) + ring * 2
    ctx.beginPath()
    ctx.arc(0, 0, ringRadius, rotAngle, rotAngle + Math.PI * 1.3)
    ctx.stroke()
  }

  // Bright core — the banish zone.
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, hole.coreRadius * 1.5)
  core.addColorStop(0, 'rgba(230, 210, 255, 0.9)')
  core.addColorStop(0.5, 'rgba(160, 100, 255, 0.4)')
  core.addColorStop(1, 'rgba(120, 60, 230, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, hole.coreRadius * 1.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export const eventHorizonEffect: EffectDefinition = {
  tick: (effect, ctx) => tickEventHorizon(effect as EventHorizonEffect, ctx),
  renderBack: (ctx, effect, camera) =>
    renderEventHorizon(ctx, effect as EventHorizonEffect, camera),
}

export const eventHorizon: AbilityDefinition = {
  kind: AbilityKind.eventHorizon,
  ultimateOf: AbilityKind.blackHole,
  meta: { icon: IconName.blackHole, label: 'Event Horizon' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.eventHorizon,
    cooldown: BLACK_HOLE.cooldown,
    powerCost: BLACK_HOLE.powerCost * EVENT_HORIZON.costMultiplier,
    damage: BLACK_HOLE.damage,
    aoeRadius: BLACK_HOLE.radius * EVENT_HORIZON.radiusScale,
    duration: BLACK_HOLE.duration,
    force: BASE_PULL,
  }),
  effectFactory: (ability, pos) => [
    createEventHorizonEffect(
      pos,
      ability.aoeRadius,
      ability.force ?? BASE_PULL,
      ability.damage,
      ability.duration ?? BLACK_HOLE.duration
    ),
  ],
  applyUpgrades: composeUltimateUpgrades(blackHole, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? BLACK_HOLE.powerCost) * EVENT_HORIZON.costMultiplier,
    aoeRadius: (basePatch.aoeRadius ?? BLACK_HOLE.radius) * EVENT_HORIZON.radiusScale,
    force: applyTierSum(BASE_PULL, upgrades, pullUpgrade),
  })),
  modifierUpgrades: [pullUpgrade],
}
