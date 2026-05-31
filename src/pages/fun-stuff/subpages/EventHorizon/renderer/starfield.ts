import type { Camera } from './camera'

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
    const seed = hashSeed(i)
    stars.push({
      x: seededRandom(seed) * worldWidth,
      y: seededRandom(seed + 1) * worldHeight,
      size: 1 + Math.floor(seededRandom(seed + 2) * 2.5),
      brightness: 0.3 + seededRandom(seed + 3) * 0.7,
      depth: 0.3 + seededRandom(seed + 4) * 0.7,
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

    if (sx < -10 || sx > camera.width + 10 || sy < -10 || sy > camera.height + 10) continue

    ctx.globalAlpha = star.brightness
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(Math.floor(sx), Math.floor(sy), star.size, star.size)
  }
  ctx.globalAlpha = 1
}

function hashSeed(i: number): number {
  return ((i * 2654435761) >>> 0) % 2147483647
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
