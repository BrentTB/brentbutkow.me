import { NEBULA } from '../../data'
import { uid } from '../entities/entity-creator'
import { toroidalDistance, wrapPosition } from '../math/toroid'
import { EffectKind, NebulaVariant } from '../types'
import type { ActiveEffect, NebulaEffect, Vec2 } from '../types'
import { nebulaRadiusAt } from './nebula-vision'
import type { SightCircle } from './nebula-vision'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'

// rgb triples (for rgba() composition) — one murk colour per variant.
const VARIANT_COLOR: Record<NebulaVariant, string> = {
  [NebulaVariant.fog]: NEBULA.fogColor,
  [NebulaVariant.slow]: NEBULA.slowColor,
  [NebulaVariant.haze]: NEBULA.hazeColor,
}

export function createNebula(variant: NebulaVariant, pos: Vec2, vel: Vec2): NebulaEffect {
  return {
    id: uid(),
    kind: EffectKind.nebula,
    variant,
    pos: { ...pos },
    vel: { ...vel },
    elapsed: 0,
    duration: NEBULA.duration,
    startRadius: NEBULA.startRadius,
    maxRadius: NEBULA.maxRadius,
    growDuration: NEBULA.growDuration,
  }
}

// Opacity envelope: fade in over growDuration, hold, fade out over the last second.
export function nebulaAlphaAt(n: NebulaEffect, elapsed: number): number {
  const fadeIn = Math.min(1, elapsed / Math.max(n.growDuration, 0.001))
  const fadeOut = Math.min(1, Math.max(0, n.duration - elapsed))
  return Math.min(fadeIn, fadeOut)
}

// Lifetime + drift only. The zone's modifier (conceal / slow / haze) acts on ship +
// enemies + allies, so it's applied in the main loop's AI/movement passes.
function tickNebula(n: NebulaEffect, ctx: EffectTickContext): EffectTickResult {
  if (n.elapsed >= n.duration) return passThroughTick(null, ctx)
  const drifted: NebulaEffect = {
    ...n,
    pos: wrapPosition({ x: n.pos.x + n.vel.x * ctx.dt, y: n.pos.y + n.vel.y * ctx.dt }),
  }
  return passThroughTick(drifted, ctx)
}

type CloudPuff = { dx: number; dy: number; r: number; a: number }

// A clutch of soft puffs at deterministic offsets (seeded by the nebula id, so each
// cloud's silhouette is stable frame-to-frame and differs between nebulas) spread
// over the disc to build an irregular, billowy shape rather than a clean circle. A
// slow per-puff breathe keeps it alive; the whole cloud drifts via the nebula pos.
function cloudPuffs(n: NebulaEffect, radius: number): CloudPuff[] {
  let seed = 0
  for (let i = 0; i < n.id.length; i++) seed = (Math.imul(seed, 31) + n.id.charCodeAt(i)) | 0
  seed >>>= 0
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904859) >>> 0
    return seed / 0x100000000
  }
  const puffs: CloudPuff[] = []
  for (let i = 0; i < NEBULA.cloudPuffs; i++) {
    const ang = rand() * Math.PI * 2
    const dist = Math.sqrt(rand()) * radius * 0.85 // area-uniform, fills the disc
    const breathe = 1 + Math.sin(n.elapsed * 0.7 + i) * 0.08
    puffs.push({
      dx: Math.cos(ang) * dist,
      dy: Math.sin(ang) * dist,
      r: radius * (0.4 + rand() * 0.3) * breathe,
      a: 0.3 + rand() * 0.2,
    })
  }
  return puffs
}

// How much a puff at `pos` survives the fog's clear sight-bubbles: 0 in the inner
// core of any bubble, ramping to 1 at the bubble's rim — so the fog parts softly
// around the ship + allies instead of cutting a hard hole.
function clearingFade(pos: Vec2, clearings: SightCircle[]): number {
  let f = 1
  for (const c of clearings) {
    const t = toroidalDistance(pos, c.center) / c.radius
    f = Math.min(f, Math.max(0, (t - 0.45) / 0.55))
  }
  return f
}

// Draws a nebula as an irregular billowy cloud. `clearings` (fog only) thin the
// puffs near the sight bubbles so concealed enemies stay hidden behind the murk
// while the area around the ship reads clear.
export function drawNebulaCloud(
  ctx: CanvasRenderingContext2D,
  n: NebulaEffect,
  camera: Camera,
  clearings?: SightCircle[]
): void {
  const baseAlpha = nebulaAlphaAt(n, n.elapsed)
  if (baseAlpha <= 0) return
  const s = worldToScreen(n.pos, camera)
  const radius = nebulaRadiusAt(n, n.elapsed)
  const rgb = VARIANT_COLOR[n.variant]

  ctx.save()
  ctx.translate(s.x, s.y)
  for (const p of cloudPuffs(n, radius)) {
    let alpha = baseAlpha * p.a
    if (clearings && clearings.length > 0) {
      alpha *= clearingFade({ x: n.pos.x + p.dx, y: n.pos.y + p.dy }, clearings)
    }
    if (alpha <= 0.002) continue
    const grad = ctx.createRadialGradient(p.dx, p.dy, 0, p.dx, p.dy, p.r)
    grad.addColorStop(0, `rgba(${rgb}, ${alpha})`)
    grad.addColorStop(0.7, `rgba(${rgb}, ${alpha * 0.5})`)
    grad.addColorStop(1, `rgba(${rgb}, 0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(p.dx, p.dy, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// The live fog nebulas — the renderer draws these over the entities (occluding the
// concealed ones) rather than beneath, so it pulls them out here.
export function fogNebulasOf(effects: ActiveEffect[]): NebulaEffect[] {
  return effects.filter(
    (e): e is NebulaEffect => e.kind === EffectKind.nebula && e.variant === NebulaVariant.fog
  )
}

// renderBack draws the slow + haze clouds beneath entities (atmosphere you fight
// inside). Fog draws nothing here — it renders OVER entities in the loop's fog pass
// so concealed enemies sit behind the cloud.
function renderNebulaBack(ctx: CanvasRenderingContext2D, n: NebulaEffect, camera: Camera): void {
  if (n.variant === NebulaVariant.fog) return
  drawNebulaCloud(ctx, n, camera)
}

export const nebulaEffect: EffectDefinition = {
  tick: (effect, ctx) => tickNebula(effect as NebulaEffect, ctx),
  renderBack: (ctx, effect, camera) => renderNebulaBack(ctx, effect as NebulaEffect, camera),
}
