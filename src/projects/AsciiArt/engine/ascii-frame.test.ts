import { describe, it, expect } from 'vitest'
import { buildAsciiGrid, gridRows } from './ascii-frame'
import { Charset } from '../data'

describe('gridRows', () => {
  it('keeps proportions while halving for the tall monospace cell', () => {
    // 100 cols, square source -> 100 * 1 * 0.5 = 50 rows.
    expect(gridRows(100, 200, 200)).toBe(50)
    // Wider-than-tall source -> fewer rows.
    expect(gridRows(100, 400, 100)).toBe(13)
  })

  it('returns 0 for a source with no dimensions', () => {
    expect(gridRows(100, 0, 0)).toBe(0)
  })
})

describe('buildAsciiGrid', () => {
  it('maps a black and a white pixel to the ramp ends, carrying RGB', () => {
    // Two pixels (RGBA): black then white.
    const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const grid = buildAsciiGrid(pixels, 2, 1, { ramp: Charset.classic, invert: false })

    expect(grid.cols).toBe(2)
    expect(grid.rows).toBe(1)
    expect(grid.cells).toHaveLength(2)
    expect(grid.cells[0].char).toBe(Charset.classic[0])
    expect(grid.cells[1].char).toBe(Charset.classic[Charset.classic.length - 1])
    expect(grid.cells[1]).toMatchObject({ r: 255, g: 255, b: 255 })
  })
})
