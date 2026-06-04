import type { Camera } from './camera'
import { isWithinView } from './camera'
import { rng } from '../engine/math/random'

export type Star = {
  x: number
  y: number
  size: number
  brightness: number
  depth: number
}

export function generateStarfield(worldWidth: number, worldHeight: number, count: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rng.next() * worldWidth,
      y: rng.next() * worldHeight,
      size: 1 + Math.floor(rng.next() * 2.5),
      brightness: 0.3 + rng.next() * 0.7,
      depth: 0.3 + rng.next() * 0.7,
    })
  }
  return stars
}

export function renderStarfield(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  camera: Camera
): void {
  for (const star of stars) {
    const parallax = star.depth
    const sx = star.x - camera.x * parallax
    const sy = star.y - camera.y * parallax

    if (!isWithinView({ x: sx, y: sy }, camera, 10)) continue

    ctx.globalAlpha = star.brightness
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.floor(sx), Math.floor(sy), star.size, star.size)
  }
  ctx.globalAlpha = 1
}
