import type { Camera } from './camera'
import type { Ship, Vec2 } from '../engine/types'

// Slingshot aim arrow, drawn in CSS-pixel space. It sets its OWN DPR-baseline
// transform rather than trusting whatever the world frame left behind — otherwise a
// world-layer renderer that leaks a transform (a boss/effect that only appears
// sometimes) would push the arrow off-screen: the flick still fires, but the arrow
// vanishes. Points from the ship toward the live drag; length, width, and colour
// read the charge, and it greys out while recharging or overheated — no fire yet.
export function drawSlingAim(
  ctx: CanvasRenderingContext2D,
  ship: Ship,
  camera: Camera,
  dragStart: Vec2,
  dragCurrent: Vec2,
  maxDragPx: number
): void {
  const dx = dragCurrent.x - dragStart.x
  const dy = dragCurrent.y - dragStart.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return

  const sx = (ship.pos.x - camera.x) * camera.zoom
  const sy = (ship.pos.y - camera.y) * camera.zoom
  const charge = Math.min(1, len / maxDragPx)
  const ux = dx / len
  const uy = dy / len
  const reach = 30 + charge * 90
  const ex = sx + ux * reach
  const ey = sy + uy * reach
  const head = 8 + charge * 6
  const angle = Math.atan2(uy, ux)
  const blocked = ship.slingCooldownRemaining > 0 || ship.slingOverheated

  ctx.save()
  // Pin the DPR baseline ourselves so the arrow is immune to any transform a
  // world-layer renderer may have left on the context.
  ctx.setTransform(camera.dpr, 0, 0, camera.dpr, 0, 0)
  ctx.globalAlpha = blocked ? 0.3 : 0.4 + charge * 0.5
  ctx.strokeStyle = blocked ? '#667788' : charge >= 1 ? '#ffcc33' : '#6ae8f5'
  ctx.lineWidth = 2 + charge * 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(ex, ey)
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - Math.cos(angle - 0.4) * head, ey - Math.sin(angle - 0.4) * head)
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex - Math.cos(angle + 0.4) * head, ey - Math.sin(angle + 0.4) * head)
  ctx.stroke()
  ctx.restore()
}
