import type { Camera } from './camera'
import { worldToScreenPx, pinDprTransform } from './camera'
import type { Vec2 } from '../engine/types'

export type TutorialFocusOpts = {
  reducedMotion: boolean
  // Wall-clock seconds for the ring pulse — NOT the sim clock, which freezes
  // while a beat is frozen (the ring should keep breathing then).
  pulseClock: number
}

// Radius (CSS px) of the clear spotlight centre; the dim fades in beyond it.
const HOLE_RADIUS = 70

// Tutorial spotlight: a vignette that's transparent over the focus target (the
// ship, or the enemy to hit) and darkens away from it, plus a pulsing ring. Drawn
// after the world frame; it sets its OWN DPR-baseline transform (like drawSlingAim)
// so a leaked transform from a world-layer renderer can't shove it off-screen.
// Positions are render-space × zoom. The dim is a single radial-gradient fill (NOT a
// dim + destination-out hole, which would erase the ship under it to transparent).
// No target → nothing drawn (the beat has no spotlight).
export function drawTutorialFocus(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  target: Vec2 | null,
  opts: TutorialFocusOpts
): void {
  if (!target) return

  const { x, y } = worldToScreenPx(target, camera)
  const pulse = opts.reducedMotion ? 0 : Math.sin(opts.pulseClock * 3) * 5
  const ringRadius = HOLE_RADIUS + 8 + pulse

  ctx.save()
  // Pin the DPR baseline so the spotlight is immune to any transform a world-layer
  // renderer may have left on the context.
  pinDprTransform(ctx, camera)

  // Clear at the focus, darkening to a dim surround — the ship/enemy stays fully
  // visible while everything else recedes.
  const dim = ctx.createRadialGradient(x, y, HOLE_RADIUS, x, y, HOLE_RADIUS * 2.4)
  dim.addColorStop(0, 'rgba(6, 8, 14, 0)')
  dim.addColorStop(1, 'rgba(6, 8, 14, 0.72)')
  ctx.fillStyle = dim
  ctx.fillRect(0, 0, camera.width, camera.height)

  // Pulsing accent ring (cyan, matching the slingshot aim arrow).
  ctx.strokeStyle = 'rgba(106, 232, 245, 0.9)'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}
