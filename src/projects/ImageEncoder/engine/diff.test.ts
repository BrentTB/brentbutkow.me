import { describe, expect, it } from 'vitest'
import { buildDiff } from './diff'
import { RasterImage } from '../image-encoder.types'

function solid(width: number, height: number, value: number): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = value
    data[i + 1] = value
    data[i + 2] = value
    data[i + 3] = 255
  }
  return { data, width, height }
}

describe('buildDiff', () => {
  it('reports no change and leaves untouched pixels exactly as they were', () => {
    const image = solid(4, 4, 120)
    const { raster, stats } = buildDiff(image, solid(4, 4, 120))
    expect(stats.changedChannels).toBe(0)
    expect(stats.changedPixels).toBe(0)
    expect(stats.totalChannels).toBe(4 * 4 * 3)
    // Unchanged pixels keep their original color, so the photo stays recognizable.
    expect(raster.data[0]).toBe(120)
    expect(raster.data[1]).toBe(120)
    expect(raster.data[2]).toBe(120)
  })

  it('tints touched pixels toward the accent while leaving the rest intact', () => {
    const before = solid(2, 1, 100)
    const after = solid(2, 1, 100)
    after.data[0] = 101 // nudge the first pixel's red channel only

    const { raster, stats } = buildDiff(before, after)
    expect(stats.changedChannels).toBe(1)
    expect(stats.changedPixels).toBe(1)
    // The touched pixel shifts off its original value and leans warm (gold).
    expect(raster.data[0]).not.toBe(100)
    expect(raster.data[0]).toBeGreaterThan(raster.data[2])
    // The untouched pixel is preserved exactly.
    expect(raster.data[4]).toBe(100)
    expect(raster.data[5]).toBe(100)
    expect(raster.data[6]).toBe(100)
  })
})
