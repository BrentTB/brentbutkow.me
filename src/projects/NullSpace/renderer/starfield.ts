import type { Camera } from './camera'
import { isWithinView, worldToScreen } from './camera'
import { rng } from '../engine/math/random'

export type Star = {
  x: number
  y: number
  size: number
  brightness: number
}

export function generateStarfield(worldWidth: number, worldHeight: number, count: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng.next() * worldWidth,
      y: rng.next() * worldHeight,
      size: 1 + Math.floor(rng.next() * 2.5),
      brightness: 0.3 + rng.next() * 0.7,
    })
  }
  return stars
}

// Stars are locked to the world and drawn via worldToScreen, so they wrap with
// the torus seamlessly (no parallax — a depth-scaled scroll would tear at the
// camera-wrap seam).
export function renderStarfield(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  camera: Camera
): void {
  for (const star of stars) {
    const s = worldToScreen({ x: star.x, y: star.y }, camera)
    if (!isWithinView(s, camera, 10)) continue

    ctx.globalAlpha = star.brightness
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), star.size, star.size)
  }
  ctx.globalAlpha = 1
}
