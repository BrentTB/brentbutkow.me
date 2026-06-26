// Builds a heatmap of what the encoder touched: the original is dimmed to a near
// charcoal backdrop, and any pixel whose channels moved glows in the accent gold,
// brighter the more it shifted. This is the "look how little changed" reveal.

import { RasterImage } from '../image-encoder.types'

// Mirrors --accent so the heatmap reads as part of the site's palette.
const ACCENT: readonly [number, number, number] = [233, 184, 114]
const BACKDROP_DIM = 0.22

export interface DiffStats {
  changedPixels: number
  changedChannels: number
  totalChannels: number
}

export function buildDiff(
  original: RasterImage,
  stego: RasterImage
): { raster: RasterImage; stats: DiffStats } {
  const { data: before, width, height } = original
  const after = stego.data
  const out = new Uint8ClampedArray(before.length)
  let changedPixels = 0
  let changedChannels = 0

  for (let i = 0; i < before.length; i += 4) {
    const dr = Math.abs(before[i] - after[i])
    const dg = Math.abs(before[i + 1] - after[i + 1])
    const db = Math.abs(before[i + 2] - after[i + 2])
    const delta = dr + dg + db
    changedChannels += (dr > 0 ? 1 : 0) + (dg > 0 ? 1 : 0) + (db > 0 ? 1 : 0)

    const backdrop = (0.299 * before[i] + 0.587 * before[i + 1] + 0.114 * before[i + 2]) * BACKDROP_DIM
    if (delta > 0) {
      changedPixels++
      const glow = Math.min(1, 0.45 + delta * 0.14)
      out[i] = backdrop * (1 - glow) + ACCENT[0] * glow
      out[i + 1] = backdrop * (1 - glow) + ACCENT[1] * glow
      out[i + 2] = backdrop * (1 - glow) + ACCENT[2] * glow
    } else {
      out[i] = backdrop
      out[i + 1] = backdrop
      out[i + 2] = backdrop
    }
    out[i + 3] = 255
  }

  return {
    raster: { data: out, width, height },
    stats: { changedPixels, changedChannels, totalChannels: (before.length / 4) * 3 },
  }
}
