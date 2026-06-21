import type { Enemy, Vec2 } from '../../types'
import type { Camera } from '../../../renderer/camera'
import { worldToScreen } from '../../../renderer/camera'

// Dashed field ring at `radius` plus a fading line from `center` to every enemy
// inside it. Shared by Telekinesis (push) and Singularity (pull) — a line is a
// segment, so the push-vs-pull direction never changes the pixels; only the
// colour does. The caller owns ctx.save()/restore() and any extra layers (e.g.
// Singularity's charging core).
export function drawForceField(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  enemies: Enemy[],
  camera: Camera,
  colors: { ring: string; lineRgb: string }
): void {
  ctx.strokeStyle = colors.ring
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  for (const enemy of enemies) {
    const eScreen = worldToScreen(enemy.pos, camera)
    const dx = eScreen.x - center.x
    const dy = eScreen.y - center.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist >= radius) continue
    const alpha = (1 - dist / radius) * 0.6
    ctx.strokeStyle = `rgba(${colors.lineRgb}, ${alpha.toFixed(2)})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(center.x, center.y)
    ctx.lineTo(eScreen.x, eScreen.y)
    ctx.stroke()
  }
}
