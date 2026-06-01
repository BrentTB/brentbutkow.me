import { SPRITE_MAP, type SpriteData, type SpriteKey } from './sprites'

const SCALE = 3

export type SpriteCache = Record<SpriteKey, OffscreenCanvas>

export function buildSpriteCache(): SpriteCache {
  const cache = {} as SpriteCache
  for (const [key, data] of Object.entries(SPRITE_MAP)) {
    cache[key as SpriteKey] = rasterizeSprite(data, SCALE)
  }
  return cache
}

function rasterizeSprite(data: SpriteData, scale: number): OffscreenCanvas {
  const h = data.length
  const w = data[0].length
  const canvas = new OffscreenCanvas(w * scale, h * scale)
  const ctx = canvas.getContext('2d')!

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const color = data[y][x]
      if (color) {
        ctx.fillStyle = color
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }

  return canvas
}

export function getSpriteSize(key: SpriteKey): { w: number; h: number } {
  const data = SPRITE_MAP[key]
  return { w: data[0].length * SCALE, h: data.length * SCALE }
}
