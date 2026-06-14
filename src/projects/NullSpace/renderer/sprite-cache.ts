import {
  ANIMATION_MAP,
  SPRITE_MAP,
  type AnimationKey,
  type SpriteData,
  type SpriteKey,
} from './sprites'

const SCALE = 3

export type SpriteCache = Record<SpriteKey, OffscreenCanvas>
export type AnimationCache = Record<AnimationKey, OffscreenCanvas[]>

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
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to acquire 2D context for sprite rasterization')

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

export function buildAnimationCache(): AnimationCache {
  const cache = {} as AnimationCache
  for (const [key, anim] of Object.entries(ANIMATION_MAP)) {
    cache[key as AnimationKey] = anim.frames.map((f) => rasterizeSprite(f, SCALE))
  }
  return cache
}

// Frame index for a looping animation at `elapsed` seconds; wraps via modulo
// (negative elapsed is normalized first). Returns 0 for a single-frame anim.
export function pickFrame(frameCount: number, frameDuration: number, elapsed: number): number {
  if (frameCount <= 1 || frameDuration <= 0) return 0
  const total = frameCount * frameDuration
  const t = ((elapsed % total) + total) % total
  return Math.min(frameCount - 1, Math.floor(t / frameDuration))
}
