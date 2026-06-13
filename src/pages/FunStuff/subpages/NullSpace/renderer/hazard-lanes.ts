import { HAZARD } from '../data'
import { isWithinView, worldToScreen } from './camera'
import type { Camera } from './camera'
import type { GameState } from '../engine/types'

// Draws hazard mines — a warning glow with a spiked core. Crossing one damages the
// ship (unless dashing through with Escape Mode).
export function renderHazardLanes(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  for (const h of state.hazards) {
    const s = worldToScreen(h.pos, camera)
    if (!isWithinView(s, camera, 40)) continue

    ctx.save()
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, h.radius * 1.6)
    glow.addColorStop(0, 'rgba(255, 120, 80, 0.5)')
    glow.addColorStop(1, 'rgba(214, 83, 58, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(s.x, s.y, h.radius * 1.6, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = HAZARD.color
    ctx.fillStyle = HAZARD.color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(s.x, s.y, h.radius * 0.5, 0, Math.PI * 2)
    ctx.fill()
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8
      ctx.beginPath()
      ctx.moveTo(s.x + Math.cos(a) * h.radius * 0.6, s.y + Math.sin(a) * h.radius * 0.6)
      ctx.lineTo(s.x + Math.cos(a) * h.radius, s.y + Math.sin(a) * h.radius)
      ctx.stroke()
    }
    ctx.restore()
  }
}
