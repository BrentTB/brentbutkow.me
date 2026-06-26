// Builds a "what changed" view of the encode. The original image shows through
// at full color so it stays recognizable; any pixel the encoder touched is
// tinted toward the accent gold, stronger the more its channels moved. Untouched
// pixels are left exactly as they were, so the carrier region reads as a gold
// wash over the real picture rather than a solid block.

import { RasterImage } from '../image-encoder.types'

// Mirrors --accent so the tint reads as part of the site's palette.
const ACCENT: readonly [number, number, number] = [233, 184, 114]
// A touched pixel keeps at least this much of itself, so the photo stays visible.
const MIN_TINT = 0.2
const MAX_TINT = 0.5
const TINT_PER_STEP = 0.12

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

    if (delta > 0) {
      changedPixels++
      const tint = Math.min(MAX_TINT, MIN_TINT + delta * TINT_PER_STEP)
      out[i] = before[i] * (1 - tint) + ACCENT[0] * tint
      out[i + 1] = before[i + 1] * (1 - tint) + ACCENT[1] * tint
      out[i + 2] = before[i + 2] * (1 - tint) + ACCENT[2] * tint
    } else {
      out[i] = before[i]
      out[i + 1] = before[i + 1]
      out[i + 2] = before[i + 2]
    }
    out[i + 3] = 255
  }

  return {
    raster: { data: out, width, height },
    stats: { changedPixels, changedChannels, totalChannels: (before.length / 4) * 3 },
  }
}
