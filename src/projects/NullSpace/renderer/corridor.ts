import { worldToScreen } from './camera'
import type { Camera } from './camera'
import type { GameState } from '../engine/types'

// Spacing between the faint cross-lane "rungs" that scroll past as the ship advances.
const RUNG_SPACING = 400

// Draws the sector corridor: glowing side walls plus regularly-spaced rungs that
// slide past with the camera, selling the sense of a bounded lane scrolling by.
export function renderCorridor(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  const { worldSize } = state
  const topLeft = worldToScreen({ x: 0, y: 0 }, camera)
  const bottomRight = worldToScreen({ x: worldSize.x, y: worldSize.y }, camera)
  const height = bottomRight.y - topLeft.y

  ctx.save()

  // Walls — translucent strips just inside each edge, with a bright inner line.
  // All four edges (sides + entry/far) get the same treatment so the corridor
  // reads as a fully bounded box.
  const wallW = 14
  const width = bottomRight.x - topLeft.x
  ctx.fillStyle = 'rgba(90, 110, 180, 0.1)'
  ctx.fillRect(topLeft.x, topLeft.y, wallW, height) // left
  ctx.fillRect(bottomRight.x - wallW, topLeft.y, wallW, height) // right
  ctx.fillRect(topLeft.x, topLeft.y, width, wallW) // far (top)
  ctx.fillRect(topLeft.x, bottomRight.y - wallW, width, wallW) // entry (bottom)
  ctx.strokeStyle = 'rgba(120, 150, 230, 0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(topLeft.x, topLeft.y)
  ctx.lineTo(topLeft.x, bottomRight.y)
  ctx.moveTo(bottomRight.x, topLeft.y)
  ctx.lineTo(bottomRight.x, bottomRight.y)
  ctx.moveTo(topLeft.x, topLeft.y)
  ctx.lineTo(bottomRight.x, topLeft.y)
  ctx.moveTo(topLeft.x, bottomRight.y)
  ctx.lineTo(bottomRight.x, bottomRight.y)
  ctx.stroke()

  // Rungs across the lane at regular world-Y intervals (only the visible band).
  ctx.strokeStyle = 'rgba(120, 150, 230, 0.08)'
  ctx.lineWidth = 1
  const viewBottom = camera.y + camera.height / camera.zoom + RUNG_SPACING
  for (
    let y = Math.floor(camera.y / RUNG_SPACING) * RUNG_SPACING;
    y < viewBottom;
    y += RUNG_SPACING
  ) {
    if (y < 0 || y > worldSize.y) continue
    const s = worldToScreen({ x: 0, y }, camera)
    const e = worldToScreen({ x: worldSize.x, y }, camera)
    ctx.beginPath()
    ctx.moveTo(s.x, s.y)
    ctx.lineTo(e.x, e.y)
    ctx.stroke()
  }

  ctx.restore()
}
