import type { Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'

// The geometry every dome effect (Shield, Force Field, Repulse) shares — a
// circle at a world position that fades with its lifetime.
export type DomeShape = { pos: Vec2; radius: number; elapsed: number; duration: number }

// Per-ability look. `fadeIn` is optional so a dome can pop in at full strength
// (Repulse). Fade durations are a fraction of the effect's lifetime, capped.
// `rim.color` is an `r, g, b` triplet — its alpha is `alpha * pulse`.
export type DomeStyle = {
  fadeIn?: { cap: number; frac: number }
  fadeOut: { cap: number; frac: number }
  pulseFreq: number
  // Radial-gradient fill stops, inner → outer: [offset, css-color].
  fillStops: [number, string][]
  rim: { color: string; alpha: number; width: number }
}

// Draws the dome's fill + pulsing rim, translated to the dome's screen position
// with lifetime fade applied. `extra` runs inside the same transform/alpha (the
// Shield's shimmer band rides here) and receives the current pulse value.
export function renderDome(
  ctx: CanvasRenderingContext2D,
  dome: DomeShape,
  camera: Camera,
  style: DomeStyle,
  extra?: (ctx: CanvasRenderingContext2D, dome: DomeShape, pulse: number) => void
): void {
  const screen = worldToScreen(dome.pos, camera)
  const fadeIn = style.fadeIn ? Math.min(style.fadeIn.cap, dome.duration * style.fadeIn.frac) : 0
  const fadeOut = Math.min(style.fadeOut.cap, dome.duration * style.fadeOut.frac)
  const fadeOutStart = dome.duration - fadeOut
  let alpha: number
  if (dome.elapsed < fadeIn) alpha = dome.elapsed / fadeIn
  else if (dome.elapsed > fadeOutStart)
    alpha = Math.max(0, (dome.duration - dome.elapsed) / fadeOut)
  else alpha = 1

  const pulse = 0.85 + Math.sin(dome.elapsed * style.pulseFreq) * 0.15
  const r = dome.radius

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  for (const [offset, color] of style.fillStops) gradient.addColorStop(offset, color)
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = `rgba(${style.rim.color}, ${style.rim.alpha * pulse})`
  ctx.lineWidth = style.rim.width
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()

  extra?.(ctx, dome, pulse)

  ctx.restore()
}
