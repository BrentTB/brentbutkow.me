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
  it('reports no change and a flat backdrop for identical images', () => {
    const image = solid(4, 4, 200)
    const { raster, stats } = buildDiff(image, solid(4, 4, 200))
    expect(stats.changedChannels).toBe(0)
    expect(stats.changedPixels).toBe(0)
    expect(stats.totalChannels).toBe(4 * 4 * 3)
    // Unchanged pixels render as neutral grey (r === g === b).
    expect(raster.data[0]).toBe(raster.data[1])
    expect(raster.data[1]).toBe(raster.data[2])
  })

  it('glows on the channels that moved', () => {
    const before = solid(2, 1, 100)
    const after = solid(2, 1, 100)
    after.data[0] = 101 // nudge the first pixel's red channel only

    const { raster, stats } = buildDiff(before, after)
    expect(stats.changedChannels).toBe(1)
    expect(stats.changedPixels).toBe(1)
    // The touched pixel takes on the accent tint, so it is no longer neutral grey.
    expect(raster.data[0]).not.toBe(raster.data[1])
    // The untouched pixel stays neutral.
    expect(raster.data[4]).toBe(raster.data[5])
  })
})
