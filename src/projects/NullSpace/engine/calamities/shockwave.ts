import { CALAMITY } from '../../data'
import { uid } from '../entities/entity-creator'
import { EffectKind } from '../types'
import type { ShockwaveEffect, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'

export function createShockwaveEffect(pos: Vec2): ShockwaveEffect {
  return {
    id: uid(),
    kind: EffectKind.shockwave,
    pos: { ...pos },
    elapsed: 0,
    duration: CALAMITY.shockwaveDelay + CALAMITY.shockwaveGrowDuration,
    delay: CALAMITY.shockwaveDelay,
    startRadius: CALAMITY.shockwaveStartRadius,
    maxRadius: CALAMITY.shockwaveMaxRadius,
    growDuration: CALAMITY.shockwaveGrowDuration,
    baseDamage: CALAMITY.shockwaveBaseDamage,
  }
}

// Radius of the expanding front at a given elapsed time: 0 through the telegraph
// delay, then linear from startRadius to maxRadius over growDuration. The main
// loop samples this at the current and previous frame to damage the annulus the
// front swept this tick, so each entity is hit once as the ring passes it.
export function shockwaveRadiusAt(effect: ShockwaveEffect, elapsed: number): number {
  const afterDelay = elapsed - effect.delay
  if (afterDelay <= 0) return 0
  const t = effect.growDuration > 0 ? Math.min(1, afterDelay / effect.growDuration) : 1
  return effect.startRadius + (effect.maxRadius - effect.startRadius) * t
}

function tickShockwave(effect: ShockwaveEffect, ctx: EffectTickContext): EffectTickResult {
  // Lifetime only — the damage pass lives in the main loop (it needs ship +
  // allies, which the effect tick context doesn't carry).
  if (effect.elapsed >= effect.duration) return passThroughTick(null, ctx)
  return passThroughTick(effect, ctx)
}

function renderShockwave(
  ctx: CanvasRenderingContext2D,
  effect: ShockwaveEffect,
  camera: Camera
): void {
  const screen = worldToScreen(effect.pos, camera)

  // Telegraph: a dashed warning ring at the origin that brightens over the delay.
  if (effect.elapsed < effect.delay) {
    const progress = effect.elapsed / effect.delay
    ctx.save()
    ctx.globalAlpha = 0.25 + progress * 0.45
    ctx.strokeStyle = '#ffc04a'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, effect.maxRadius * (0.25 + progress * 0.12), 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    return
  }

  // Expanding front: a bright leading ring that thickens and fades as it spreads.
  const radius = shockwaveRadiusAt(effect, effect.elapsed)
  const t = (radius - effect.startRadius) / Math.max(1, effect.maxRadius - effect.startRadius)
  ctx.save()
  ctx.globalAlpha = (1 - t) * 0.8
  ctx.strokeStyle = '#ffd27a'
  ctx.lineWidth = 3 + (1 - t) * 4
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  // Inner glow trailing the leading edge.
  ctx.globalAlpha = (1 - t) * 0.3
  ctx.strokeStyle = '#ff9a3c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(screen.x, screen.y, radius * 0.82, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export const shockwaveEffect: EffectDefinition = {
  tick: (effect, ctx) => tickShockwave(effect as ShockwaveEffect, ctx),
  renderBack: (ctx, effect, camera) => renderShockwave(ctx, effect as ShockwaveEffect, camera),
}
