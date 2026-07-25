import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { MATERIALS } from './materials'
import { materialCss, writeCellRgb } from './palette'

describe('writeCellRgb', () => {
  it('writes an opaque colour within jitter range of the material', () => {
    const pixels = new Uint8ClampedArray(4)
    writeCellRgb(pixels, 0, MaterialId.sand, 3, 9)

    const { color, jitter } = MATERIALS[MaterialId.sand]
    color.forEach((channel, i) => {
      expect(Math.abs(pixels[i] - channel)).toBeLessThanOrEqual(jitter)
    })
    expect(pixels[3]).toBe(255)
  })

  it('gives a jitter-free material its exact colour', () => {
    const pixels = new Uint8ClampedArray(4)
    writeCellRgb(pixels, 0, MaterialId.empty, 12, 34)

    expect(Array.from(pixels)).toEqual([...MATERIALS[MaterialId.empty].color, 255])
  })

  it('depends only on the cell coordinates, so speckle stays put', () => {
    const first = new Uint8ClampedArray(4)
    const second = new Uint8ClampedArray(4)
    writeCellRgb(first, 0, MaterialId.stone, 17, 5)
    writeCellRgb(second, 0, MaterialId.stone, 17, 5)

    expect(Array.from(first)).toEqual(Array.from(second))
  })

  it('varies between neighbouring cells', () => {
    const pixels = new Uint8ClampedArray(8)
    writeCellRgb(pixels, 0, MaterialId.sand, 0, 0)
    writeCellRgb(pixels, 4, MaterialId.sand, 1, 0)

    expect(Array.from(pixels.slice(0, 3))).not.toEqual(Array.from(pixels.slice(4, 7)))
  })

  it('writes at the given offset only', () => {
    const pixels = new Uint8ClampedArray(8)
    writeCellRgb(pixels, 4, MaterialId.water, 2, 2)

    expect(Array.from(pixels.slice(0, 4))).toEqual([0, 0, 0, 0])
    expect(pixels[7]).toBe(255)
  })
})

describe('materialCss', () => {
  it('reads the same table the canvas paints from', () => {
    const [r, g, b] = MATERIALS[MaterialId.water].color
    expect(materialCss(MaterialId.water)).toBe(`rgb(${r} ${g} ${b})`)
  })
})
