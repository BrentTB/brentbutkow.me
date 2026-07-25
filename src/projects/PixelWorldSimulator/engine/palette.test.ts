import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { MATERIALS } from './materials'
import { isEmissive, materialCss, writeCellRgb, writeHeatTint } from './palette'

describe('writeCellRgb', () => {
  it('writes an opaque colour within jitter range of the material', () => {
    const pixels = new Uint8ClampedArray(4)
    writeCellRgb(pixels, 0, MaterialId.sand, 0, 3, 9)

    const { color, jitter } = MATERIALS[MaterialId.sand]
    color.forEach((channel, i) => {
      expect(Math.abs(pixels[i] - channel)).toBeLessThanOrEqual(jitter)
    })
    expect(pixels[3]).toBe(255)
  })

  it('gives a jitter-free material its exact colour', () => {
    const pixels = new Uint8ClampedArray(4)
    writeCellRgb(pixels, 0, MaterialId.empty, 0, 12, 34)

    expect(Array.from(pixels)).toEqual([...MATERIALS[MaterialId.empty].color, 255])
  })

  it('depends only on the cell coordinates, so speckle stays put', () => {
    const first = new Uint8ClampedArray(4)
    const second = new Uint8ClampedArray(4)
    writeCellRgb(first, 0, MaterialId.stone, 0, 17, 5)
    writeCellRgb(second, 0, MaterialId.stone, 0, 17, 5)

    expect(Array.from(first)).toEqual(Array.from(second))
  })

  it('varies between neighbouring cells', () => {
    const pixels = new Uint8ClampedArray(8)
    writeCellRgb(pixels, 0, MaterialId.sand, 0, 0, 0)
    writeCellRgb(pixels, 4, MaterialId.sand, 0, 1, 0)

    expect(Array.from(pixels.slice(0, 3))).not.toEqual(Array.from(pixels.slice(4, 7)))
  })

  it('writes at the given offset only', () => {
    const pixels = new Uint8ClampedArray(8)
    writeCellRgb(pixels, 4, MaterialId.water, 0, 2, 2)

    expect(Array.from(pixels.slice(0, 4))).toEqual([0, 0, 0, 0])
    expect(pixels[7]).toBe(255)
  })
})

describe('flame drawing', () => {
  it('draws a burning cell as flame, not as its fuel', () => {
    const burning = new Uint8ClampedArray(4)
    const cold = new Uint8ClampedArray(4)
    writeCellRgb(burning, 0, MaterialId.wood, 40, 5, 5)
    writeCellRgb(cold, 0, MaterialId.wood, 0, 5, 5)

    expect(Array.from(burning)).not.toEqual(Array.from(cold))
    // Flame is warmer than wood in red and much brighter overall.
    expect(burning[0]).toBeGreaterThan(cold[0])
  })

  it('flickers as the burn timer counts down', () => {
    const early = new Uint8ClampedArray(4)
    const late = new Uint8ClampedArray(4)
    writeCellRgb(early, 0, MaterialId.wood, 40, 5, 5)
    writeCellRgb(late, 0, MaterialId.wood, 39, 5, 5)

    expect(Array.from(early)).not.toEqual(Array.from(late))
  })

  it('leaves a material that is not alight perfectly steady', () => {
    const first = new Uint8ClampedArray(4)
    const second = new Uint8ClampedArray(4)
    writeCellRgb(first, 0, MaterialId.sand, 0, 5, 5)
    writeCellRgb(second, 0, MaterialId.sand, 0, 5, 5)

    expect(Array.from(first)).toEqual(Array.from(second))
  })
})

describe('isEmissive', () => {
  it('picks out flames, lava, and burning fuel', () => {
    expect(isEmissive(MaterialId.fire, 0)).toBe(true)
    expect(isEmissive(MaterialId.lava, 0)).toBe(true)
    expect(isEmissive(MaterialId.wood, 30)).toBe(true)
    expect(isEmissive(MaterialId.wood, 0)).toBe(false)
    expect(isEmissive(MaterialId.water, 0)).toBe(false)
  })
})

describe('materialCss', () => {
  it('reads the same table the canvas paints from', () => {
    const [r, g, b] = MATERIALS[MaterialId.water].color
    expect(materialCss(MaterialId.water)).toBe(`rgb(${r} ${g} ${b})`)
  })
})

describe('writeHeatTint', () => {
  /** A one-cell overlay buffer. */
  function tintFor(temperature: number) {
    const pixels = new Uint8ClampedArray(4)
    const tinted = writeHeatTint(pixels, 0, temperature)
    return { tinted, r: pixels[0], g: pixels[1], b: pixels[2], alpha: pixels[3] }
  }

  it('writes nothing at room temperature', () => {
    const { tinted, alpha } = tintFor(AMBIENT_TEMPERATURE)

    expect(tinted).toBe(false)
    expect(alpha).toBe(0)
  })

  it('tints warm cells warmer the hotter they get', () => {
    const warm = tintFor(300)
    const hot = tintFor(1100)

    // What makes heating something visible before it crosses a threshold.
    expect(warm.tinted).toBe(true)
    expect(warm.r).toBeGreaterThan(warm.b)
    expect(hot.alpha).toBeGreaterThan(warm.alpha)
  })

  it('tints cold cells blue', () => {
    const cold = tintFor(-150)

    expect(cold.tinted).toBe(true)
    expect(cold.b).toBeGreaterThan(cold.r)
  })

  it('stops getting stronger past the ends of its range', () => {
    expect(tintFor(1200).alpha).toBe(tintFor(4000).alpha)
    expect(tintFor(-190).alpha).toBe(tintFor(-400).alpha)
  })
})
